using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace WashBookPro.Api.Common.Persistence;

// /health reports Unhealthy (503) when PostgreSQL is unreachable, so an uptime
// monitor sees a broken database, not only a running process.
public sealed class DatabaseHealthCheck(AppDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            return await db.Database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("Database is unreachable.");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database check failed.", ex);
        }
    }
}
