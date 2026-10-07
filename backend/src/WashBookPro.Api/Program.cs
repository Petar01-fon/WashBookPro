using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using WashBookPro.Api.Common.Email;
using WashBookPro.Api.Common.Middleware;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Services;
using Microsoft.AspNetCore.Authentication.Google;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddHealthChecks();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseCors("Default");
app.UseAuthentication();
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
