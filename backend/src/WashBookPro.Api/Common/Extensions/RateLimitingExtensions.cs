using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace WashBookPro.Api.Common.Extensions;

// Per-IP fixed-window limits on anonymous endpoints that can be abused:
// public booking (spam reservations, Customer table growth) and login/register
// (password guessing). Limits come from the RateLimiting config section, so
// they can be tuned per environment without a code change.
public static class RateLimitingExtensions
{
    public const string PublicReservationsPolicy = "public-reservations";
    public const string LoginPolicy = "login";

    private const string RejectionMessage = "Previše pokušaja. Pokušajte ponovo za nekoliko minuta.";

    public static IServiceCollection AddWashBookRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        var reservations = ReadWindow(config, "RateLimiting:Reservations");
        var login = ReadWindow(config, "RateLimiting:Login");

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
                }

                await context.HttpContext.Response.WriteAsJsonAsync(
                    new { error = RejectionMessage }, cancellationToken);
            };

            options.AddPolicy(PublicReservationsPolicy, httpContext => FixedWindowPerIp(httpContext, reservations));
            options.AddPolicy(LoginPolicy, httpContext => FixedWindowPerIp(httpContext, login));
        });

        return services;
    }

    // Behind Caddy the real client IP comes from X-Forwarded-For
    // (ASPNETCORE_FORWARDEDHEADERS_ENABLED in docker-compose.prod.yml).
    // Requests without a remote IP (e.g. the test server) share one bucket.
    private static RateLimitPartition<string> FixedWindowPerIp(HttpContext httpContext, FixedWindowRateLimiterOptions window) =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => window);

    private static FixedWindowRateLimiterOptions ReadWindow(IConfiguration config, string section)
    {
        var permitLimit = config.GetValue<int?>($"{section}:PermitLimit")
            ?? throw new InvalidOperationException($"{section}:PermitLimit is not configured.");
        var windowMinutes = config.GetValue<int?>($"{section}:WindowMinutes")
            ?? throw new InvalidOperationException($"{section}:WindowMinutes is not configured.");

        return new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = TimeSpan.FromMinutes(windowMinutes),
            QueueLimit = 0,
        };
    }
}
