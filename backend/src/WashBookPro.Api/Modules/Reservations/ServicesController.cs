using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Common.Persistence;

[ApiController]
[Route("services")]
public class ServicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public ServicesController(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    // Public — booking flow
    [HttpGet]
    public async Task<IActionResult> GetPublic([FromQuery] string tenantSlug)
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == tenantSlug);

        if (tenant == null) return NotFound();

        var services = await _db.Services
            .IgnoreQueryFilters()
            .Where(s => s.TenantId == tenant.Id && s.IsActive)
            .Select(s => new ServiceResponse(
                s.Id, s.Name, s.VehicleCategory,
                s.ServiceType, s.DurationMinutes, s.PriceRsd, s.IsActive))
            .ToListAsync();

        return Ok(services);
    }

    // Owner — sve usluge (aktivne + neaktivne)
    [HttpGet("manage")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> GetAll()
    {
        var tenantId = _tenantContext.TenantId;

       var services = await _db.Services
            .OrderBy(s => s.VehicleCategory)
            .ThenBy(s => s.ServiceType)
            .Select(s => new ServiceResponse(
                s.Id, s.Name, s.VehicleCategory,
                s.ServiceType, s.DurationMinutes, s.PriceRsd, s.IsActive))
            .ToListAsync();

        return Ok(services);
    }

    // Owner — nova usluga
    [HttpPost]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Create([FromBody] CreateServiceRequest req)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var service = new Service
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId.Value,
            Name = req.Name,
            VehicleCategory = req.VehicleCategory,
            ServiceType = req.ServiceType,
            DurationMinutes = req.DurationMinutes,
            PriceRsd = req.PriceRsd,
            IsActive = true
        };

        _db.Services.Add(service);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new ServiceResponse(
            service.Id, service.Name, service.VehicleCategory,
            service.ServiceType, service.DurationMinutes, service.PriceRsd, service.IsActive));
    }

    // Owner — izmena usluge
    [HttpPatch("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateServiceRequest req)
    {
        var tenantId = _tenantContext.TenantId;

        var service = await _db.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);

        if (service == null) return NotFound();

        if (req.Name != null) service.Name = req.Name;
        if (req.VehicleCategory != null) service.VehicleCategory = req.VehicleCategory;
        if (req.ServiceType != null) service.ServiceType = req.ServiceType;
        if (req.DurationMinutes != null) service.DurationMinutes = req.DurationMinutes.Value;
        if (req.PriceRsd != null) service.PriceRsd = req.PriceRsd.Value;
        if (req.IsActive != null) service.IsActive = req.IsActive.Value;

        await _db.SaveChangesAsync();

        return Ok(new ServiceResponse(
            service.Id, service.Name, service.VehicleCategory,
            service.ServiceType, service.DurationMinutes, service.PriceRsd, service.IsActive));
    }

    // Owner — soft delete
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var tenantId = _tenantContext.TenantId;

        var service = await _db.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.TenantId == tenantId);

        if (service == null) return NotFound();

        service.IsActive = false;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}