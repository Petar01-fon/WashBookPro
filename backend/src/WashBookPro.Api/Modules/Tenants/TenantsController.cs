using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Common.Persistence;

namespace WashBookPro.Api.Modules.Tenants;

[ApiController]
public class TenantsController(AppDbContext db) : ControllerBase
{
    [HttpGet("/tenants")]
    public async Task<IActionResult> GetTenants()
    {
        var tenants = await db.Tenants
            .IgnoreQueryFilters()
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name, t.Slug })
            .ToListAsync();

        return Ok(tenants);
    }

    [HttpGet("/tenants/by-slug/{slug}")]
    public async Task<IActionResult> GetTenantBySlug(string slug)
    {
        var tenant = await db.Tenants
            .IgnoreQueryFilters()
            .Where(t => t.Slug.ToLower() == slug.ToLower() && t.IsActive)
            .Select(t => new
            {
                t.Id,
                t.Name,
                t.Slug,
                t.Address,
                OpeningTime = t.OpeningTime.HasValue ? t.OpeningTime.Value.ToString("HH:mm") : (string?)null,
                ClosingTime = t.ClosingTime.HasValue ? t.ClosingTime.Value.ToString("HH:mm") : (string?)null,
            })
            .FirstOrDefaultAsync();

        if (tenant is null)
            return NotFound();

        return Ok(tenant);
    }
}
