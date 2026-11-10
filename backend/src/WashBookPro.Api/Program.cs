using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using WashBookPro.Api.Common.Email;
using WashBookPro.Api.Common.Extensions;
using WashBookPro.Api.Common.Middleware;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Services;
using Microsoft.AspNetCore.Authentication.Google;
using WashBookPro.Api.Modules.Tenants;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// Structured logs (Serilog). Levels come from the "Serilog" config section.
// Console always; Seq only when Seq:ServerUrl is set (dev compose sets it),
// so without Seq the app logs exactly as before, just to the console.
builder.Services.AddSerilog((services, logger) =>
{
    logger.ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(outputTemplate:
            "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj} {TenantId} {UserId} {RequestId}{NewLine}{Exception}");

    var seqUrl = builder.Configuration["Seq:ServerUrl"];
    if (!string.IsNullOrWhiteSpace(seqUrl))
        logger.WriteTo.Seq(seqUrl);

    // Error and higher become Sentry events; Information and higher ride along
    // as breadcrumbs. The SDK itself is initialized by UseSentry below.
    logger.WriteTo.Sentry(o =>
    {
        o.InitializeSdk = false;
        o.MinimumEventLevel = LogEventLevel.Error;
        o.MinimumBreadcrumbLevel = LogEventLevel.Information;
    });
});

// Error tracking (ADR-030). DSN from Sentry:Dsn (compose: Sentry__Dsn).
// The SDK throws at startup on a null DSN and is disabled only by an empty
// one, so a missing value becomes "": dev and tests run without Sentry.
// No personal data: no user from the JWT, no request bodies (booking requests
// carry name, phone and email).
builder.WebHost.UseSentry(options =>
{
    options.Dsn ??= string.Empty;
    options.SendDefaultPii = false;
    options.MaxRequestBodySize = Sentry.Extensibility.RequestSize.None;
});

// Allowed browser origins come from configuration (Cors:AllowedOrigins), never
// from code: localhost:3000 in appsettings.Development.json, the real web
// domain via Cors__AllowedOrigins__0 in production (ADR-009).
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (corsOrigins.Length == 0)
    throw new InvalidOperationException("Cors:AllowedOrigins is not configured.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, HttpContextTenantContext>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddScoped<IAuthService, AuthService>();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero,
        };
    })
    .AddCookie("ExternalCookie")
    .AddGoogle(options =>
    {
        options.ClientId = builder.Configuration["Google:ClientId"] ?? string.Empty;
        options.ClientSecret = builder.Configuration["Google:ClientSecret"] ?? string.Empty;
        options.CallbackPath = "/auth/google/callback";
        options.SignInScheme = "ExternalCookie";
    });

// Email
builder.Services.AddHttpClient("Resend", client =>
{
    client.BaseAddress = new Uri("https://api.resend.com/");
    client.DefaultRequestHeaders.Authorization = 
        new System.Net.Http.Headers.AuthenticationHeaderValue(
            "Bearer", builder.Configuration["Resend:ApiKey"]);
});

builder.Services.AddTransient<IEmailService, ResendEmailService>();

builder.Services.AddAuthorization();

builder.Services.AddWashBookRateLimiting(builder.Configuration);

builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database");
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// One-off production setup: `docker compose run --rm backend bootstrap-tenant`.
// Creates the first tenant + owner + worker from the Bootstrap config section,
// then exits without starting the web server.
if (args.Length > 0 && args[0] == "bootstrap-tenant")
{
    using var bootstrapScope = app.Services.CreateScope();
    var bootstrapLogger = bootstrapScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var options = TenantBootstrap.ReadOptions(app.Configuration, bootstrapLogger);
    var result = options is null
        ? TenantBootstrapResult.InvalidConfiguration
        : await TenantBootstrap.RunAsync(
            bootstrapScope.ServiceProvider.GetRequiredService<AppDbContext>(), options, bootstrapLogger);
    Environment.ExitCode = (int)result;
    return;
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

// First in the pipeline, so every response is logged once, including 429s and
// short-circuited CORS preflights. Health probes (uptime monitor) stay out of
// the logs unless they fail.
app.UseSerilogRequestLogging(options =>
{
    options.GetLevel = (httpContext, _, exception) =>
        exception is not null || httpContext.Response.StatusCode >= 500
            ? LogEventLevel.Error
            : httpContext.Request.Path.StartsWithSegments("/health")
                ? LogEventLevel.Verbose
                : LogEventLevel.Information;
});

app.UseHttpsRedirection();
app.UseCors("Default");
// After CORS, so a 429 still carries CORS headers and the browser can read it.
app.UseRateLimiter();
app.UseAuthentication();
// After authentication, so TenantId/UserId from the JWT reach the logs.
app.UseMiddleware<LogEnrichmentMiddleware>();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    if (app.Environment.IsDevelopment())
    {
        try
        {
            await db.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to apply database migrations.");
            throw;
        }

        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var devTenantId = Guid.Parse(config["DevTenantId"]!);

        try
        {
            await ReservationSeed.SeedAsync(db, devTenantId);
            await DevDataSeed.SeedAsync(db, devTenantId, isDevelopment: true);
            logger.LogInformation("Dev seed completed.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Dev seed failed; continuing startup without seed.");
        }
    }
}

app.Run();
