using WashBookPro.Api.Common.Persistence;

namespace WashBookPro.Api.Common.Middleware;

public class HttpContextTenantContext : ITenantContext
{
    public Guid? TenantId { get; }

    public HttpContextTenantContext(IHttpContextAccessor httpContextAccessor)
    {
        var claim = httpContextAccessor.HttpContext?.User.FindFirst("tenant_id");
        if (claim is not null && Guid.TryParse(claim.Value, out var id))
            TenantId = id;
    }
}
