using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Tenants.Entities;

namespace WashBookPro.Api.Modules.Reservations;

[ApiController]
[Route("[controller]")]
public class BaysController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public BaysController(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    // GET /bays?tenantSlug= — javno (već postoji u ReservationsController, ovaj je za Owner)
    [HttpGet]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> GetAllBays()
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var bays = await _db.Bays
            .Where(b => b.TenantId == tenantId)
            .OrderBy(b => b.Name)
            .Select(b => new { b.Id, b.Name, b.IsActive })
            .ToListAsync();

        return Ok(bays);
    }

    // GET /bays/public?tenantSlug= — javno, za terminal i booking flow
    [HttpGet("public")]
    public async Task<IActionResult> GetPublicBays([FromQuery] string tenantSlug)
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == tenantSlug);

        if (tenant is null) return NotFound("Tenant not found");

        var bays = await _db.Bays
            .IgnoreQueryFilters()
            .Where(b => b.TenantId == tenant.Id && b.IsActive)
            .OrderBy(b => b.Name)
            .Select(b => new { b.Id, b.Name })
            .ToListAsync();

        return Ok(bays);
    }

    // POST /bays
    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> CreateBay([FromBody] CreateBayRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var bay = new Bay
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId.Value,
            Name = request.Name,
            IsActive = true
        };

        _db.Bays.Add(bay);
        await _db.SaveChangesAsync();

        return Ok(new { bay.Id, bay.Name, bay.IsActive });
    }

    // PATCH /bays/{id}
    [HttpPatch("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> UpdateBay(Guid id, [FromBody] UpdateBayRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var bay = await _db.Bays
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId);

        if (bay is null) return NotFound();

        if (request.Name is not null) bay.Name = request.Name;
        if (request.IsActive is not null) bay.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();
        return Ok(new { bay.Id, bay.Name, bay.IsActive });
    }

    // DELETE /bays/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> DeleteBay(Guid id)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var bay = await _db.Bays
            .FirstOrDefaultAsync(b => b.Id == id && b.TenantId == tenantId);

        if (bay is null) return NotFound();

        bay.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateBayRequest(string Name);
public record UpdateBayRequest(string? Name, bool? IsActive);