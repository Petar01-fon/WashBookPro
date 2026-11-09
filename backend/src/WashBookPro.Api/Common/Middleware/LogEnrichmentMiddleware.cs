using System.Security.Claims;
using Serilog;
using Serilog.Context;
using Serilog.Core;
using Serilog.Core.Enrichers;

namespace WashBookPro.Api.Common.Middleware;

// Adds RequestId, TenantId and UserId to every log event written while the request
// runs (LogContext) and to the request-completion event written by
// UseSerilogRequestLogging (IDiagnosticContext). Runs after UseAuthentication, so
// the JWT claims are known. Only IDs are logged, never email, phone or names.
// Public endpoints resolve the tenant by slug, not from a token, so their events
// carry no TenantId.
public sealed class LogEnrichmentMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IDiagnosticContext diagnosticContext)
    {
        var properties = new List<ILogEventEnricher>
        {
            new PropertyEnricher("RequestId", context.TraceIdentifier),
        };

        var tenantId = context.User.FindFirstValue("tenant_id");
        if (tenantId is not null)
            properties.Add(new PropertyEnricher("TenantId", tenantId));

        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is not null)
            properties.Add(new PropertyEnricher("UserId", userId));

        diagnosticContext.Set("RequestId", context.TraceIdentifier);
        if (tenantId is not null) diagnosticContext.Set("TenantId", tenantId);
        if (userId is not null) diagnosticContext.Set("UserId", userId);

        using (LogContext.Push(properties.ToArray()))
        {
            await next(context);
        }
    }
}
