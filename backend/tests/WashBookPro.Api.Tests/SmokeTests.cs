using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Tests.Infrastructure;
using Xunit;

namespace WashBookPro.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class SmokeTests(PostgresFixture fixture)
{
    [Fact]
    public async Task Health_returns_200()
    {
        using var client = fixture.Factory.CreateClient();

        var response = await client.GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Health_returns_503_when_database_is_unreachable()
    {
        // Same app, pointed at a port where nothing listens. Startup does not touch
        // the database outside Development, so only the health check sees it.
        await using var factory = fixture.Factory.WithWebHostBuilder(builder =>
            builder.UseSetting(
                "ConnectionStrings:Default",
                "Host=127.0.0.1;Port=1;Database=none;Username=none;Password=none;Timeout=2"));
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task Migrations_are_applied()
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var pending = await db.Database.GetPendingMigrationsAsync(TestContext.Current.CancellationToken);

        Assert.Empty(pending);
    }
}
