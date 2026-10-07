using WashBookPro.Api.Tests.Infrastructure;
using Xunit;

namespace WashBookPro.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class CorsTests(PostgresFixture fixture)
{
    // Deliberately not localhost: proves the value comes from configuration.
    public const string AllowedOrigin = "https://washbook.test";

    [Fact]
    public async Task Preflight_from_configured_origin_is_allowed()
    {
        var response = await SendPreflightAsync(AllowedOrigin);

        Assert.True(response.IsSuccessStatusCode);
        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Equal(AllowedOrigin, Assert.Single(values));
    }

    [Fact]
    public async Task Preflight_from_other_origin_is_not_allowed()
    {
        var response = await SendPreflightAsync("https://evil.example");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Localhost_is_not_allowed_unless_configured()
    {
        var response = await SendPreflightAsync("http://localhost:3000");

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private async Task<HttpResponseMessage> SendPreflightAsync(string origin)
    {
        using var client = fixture.Factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Options, "/reservations");
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");

        return await client.SendAsync(request, TestContext.Current.CancellationToken);
    }
}
