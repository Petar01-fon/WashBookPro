using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;
using WashBookPro.Api.Common.Email;
using WashBookPro.Api.Common.Persistence;
using Xunit;

namespace WashBookPro.Api.Tests.Infrastructure;

public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine")
        .Build();

    public WebApplicationFactory<Program> Factory { get; private set; } = null!;
    public FakeEmailService Email { get; } = new();

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();

        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("ConnectionStrings:Default", _postgres.GetConnectionString());
            builder.UseSetting("Jwt:Secret", TestConstants.JwtSecret);
            builder.UseSetting("Jwt:Issuer", "washbook-tests");
            builder.UseSetting("Jwt:Audience", "washbook-tests");
            builder.UseSetting("Google:ClientId", "test-client-id");
            builder.UseSetting("Google:ClientSecret", "test-client-secret");
            builder.UseSetting("Cors:AllowedOrigins:0", CorsTests.AllowedOrigin);
            // All test requests share one rate-limit bucket (no remote IP), so the
            // shared factory gets limits no test run can reach. RateLimitingTests
            // builds its own factory with low limits.
            builder.UseSetting("RateLimiting:Reservations:PermitLimit", "100000");
            builder.UseSetting("RateLimiting:Login:PermitLimit", "100000");
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IEmailService>();
                services.AddSingleton<IEmailService>(Email);
            });
        });

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await Factory.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}
