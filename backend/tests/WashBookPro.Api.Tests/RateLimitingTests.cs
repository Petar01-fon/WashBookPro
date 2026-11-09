using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using WashBookPro.Api.Tests.Infrastructure;
using Xunit;

namespace WashBookPro.Api.Tests;

// Each test builds its own factory, so it gets a fresh limiter with a low limit
// and does not share counters with the rest of the suite.
[Collection(ApiCollection.Name)]
public sealed class RateLimitingTests(PostgresFixture fixture)
{
    private const int Limit = 2;

    [Theory]
    [InlineData("/reservations")]
    [InlineData("/auth/login")]
    [InlineData("/auth/customer/login")]
    [InlineData("/auth/customer/register")]
    public async Task Request_over_the_limit_returns_429(string path)
    {
        await using var factory = WithLowLimits();
        using var client = factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;

        // The body does not matter: the limiter counts requests before the
        // controller runs, whatever the controller would answer.
        for (var i = 0; i < Limit; i++)
        {
            var allowed = await client.PostAsJsonAsync(path, new { }, ct);
            Assert.NotEqual(HttpStatusCode.TooManyRequests, allowed.StatusCode);
        }

        var rejected = await client.PostAsJsonAsync(path, new { }, ct);

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        var body = await rejected.Content.ReadFromJsonAsync<ErrorBody>(ct);
        Assert.False(string.IsNullOrWhiteSpace(body?.Error));
    }

    [Fact]
    public async Task Unlimited_endpoint_is_not_affected()
    {
        await using var factory = WithLowLimits();
        using var client = factory.CreateClient();
        var ct = TestContext.Current.CancellationToken;

        for (var i = 0; i < Limit + 3; i++)
        {
            var response = await client.GetAsync("/health", ct);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }

    private WebApplicationFactory<Program> WithLowLimits() =>
        fixture.Factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("RateLimiting:Reservations:PermitLimit", Limit.ToString());
            builder.UseSetting("RateLimiting:Login:PermitLimit", Limit.ToString());
        });

    private sealed record ErrorBody(string? Error);
}
