using Microsoft.AspNetCore.Mvc;
using WashBookPro.Api.Common.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WashBookPro.Api.Modules.Tenants.Entities;
using WashBookPro.Api.Common.Email;

namespace WashBookPro.Api.Modules.Reservations;

[ApiController]
[Route("[controller]")]
public partial class ReservationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IEmailService _emailService;
    private readonly ILogger<ReservationsController> _logger;

    public ReservationsController(AppDbContext db, ITenantContext tenantContext, IEmailService emailService, ILogger<ReservationsController> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _emailService = emailService;
        _logger = logger;
    }

    // GET /services
    [HttpGet("/services")]
    public async Task<IActionResult> GetServices([FromQuery] string tenantSlug)
    {
        var tenant = await ResolveTenantAsync(tenantSlug);
        if (tenant is null)
            return NotFound("Tenant not found");

        var services = await _db.Services
        .IgnoreQueryFilters()
        .Where(s => s.TenantId == tenant.Id && s.IsActive)
        .OrderBy(s => s.VehicleCategory)
        .ThenBy(s => s.ServiceType)
        .ToListAsync();

        return Ok(services);
    }

    // GET / availability?date=2026-05-01&serviceId=...
    [HttpGet("/availability")]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] DateOnly date,
        [FromQuery] Guid serviceId,
        [FromQuery] string tenantSlug)
    {
        var tenant = await ResolveTenantAsync(tenantSlug);
        if (tenant is null)
            return NotFound("Tenant not found");

        var service = await _db.Services
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.TenantId == tenant.Id);

        if (service == null)
            return NotFound("Service not found");

        var bays = await _db.Bays
        .IgnoreQueryFilters()
            .Where(b => b.IsActive && b.TenantId == tenant.Id)
            .ToListAsync();

        var dayStart = date.ToDateTime(new TimeOnly(8, 0), DateTimeKind.Utc); // 8:00 AM
        var dayEnd = date.ToDateTime(new TimeOnly(18, 0), DateTimeKind.Utc); // 6:00 PM

        var existingReservations = await _db.Reservations
            .Where(r => r.StartsAt >= dayStart && r.EndsAt <= dayEnd
            && r.Status != ReservationStatus.Cancelled)
            .ToListAsync();

        var slots = new List<object>();

        foreach (var bay in bays)
        {
            var slotStart = dayStart;

            while (slotStart.AddMinutes(service.DurationMinutes) <= dayEnd)
            {
                var slotEnd = slotStart.AddMinutes(service.DurationMinutes);

                var isOccupied = existingReservations.Any(r =>
                    r.BayId == bay.Id &&
                    r.StartsAt < slotEnd &&
                    r.EndsAt > slotStart);

                if (!isOccupied)
                {
                    slots.Add(new
                    {
                        BayId = bay.Id,
                        bayName = bay.Name,
                        startsAt = slotStart,
                        endsAt = slotEnd
                    });
                }

                slotStart = slotEnd;
            }
        }


        return Ok(slots);
    }



    // POST /reservations
    [HttpPost("/reservations")]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationRequest request)
    {

        Guid tenantId;

        if (request.CreatedBy == "Worker")
        {
            if (_tenantContext.TenantId is null)
                return Unauthorized();
            tenantId = _tenantContext.TenantId.Value;
        }
        else
        {
            if (string.IsNullOrEmpty(request.TenantSlug))
                return BadRequest("Tenant slug is required for customer reservations");

            var tenant = await ResolveTenantAsync(request.TenantSlug);
            if (tenant is null)
                return NotFound("Tenant not found");
            tenantId = tenant.Id;
        }


        var service = await _db.Services
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.TenantId == tenantId);

        if (service == null)
            return NotFound("Service not found");

        var bay = await _db.Bays
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.Id == request.BayId && b.TenantId == tenantId);
        if (bay == null)
            return NotFound("Bay not found");

        var endsAt = request.StartsAt.AddMinutes(service.DurationMinutes);

        var conflict = await _db.Reservations
            .IgnoreQueryFilters()
            .AnyAsync(r =>
                r.BayId == request.BayId &&
                r.Status != ReservationStatus.Cancelled &&
                r.StartsAt < endsAt &&
                r.EndsAt > request.StartsAt);

        if (conflict)
            return Conflict("The selected time slot is no longer available");

        var customer = await _db.Customers
            .Where(c => c.Phone == request.CustomerPhone && c.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (customer is null)
        {
            customer = new Customer
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = request.CustomerName,
                Phone = request.CustomerPhone,
                Email = request.CustomerEmail
            };
            _db.Customers.Add(customer);
        }

        var reservation = new Reservation
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BayId = request.BayId,
            ServiceId = request.ServiceId,
            Customer = customer,
            StartsAt = request.StartsAt,
            EndsAt = endsAt,
            Status = request.CreatedBy == "Worker" ? ReservationStatus.Confirmed : ReservationStatus.Pending,
            Notes = request.Notes,
            CreatedBy = request.CreatedBy ?? "Customer",
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        try
        {
            await _emailService.SendBookingConfirmationAsync(
                toEmail: request.CustomerEmail,
                customerName: request.CustomerName,
                serviceName: service.Name,
                date: DateOnly.FromDateTime(request.StartsAt),
                timeSlot: request.StartsAt.ToString("HH:mm"));
        }catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send booking confirmation email for reservation {ReservationId}", reservation.Id);
        }

        return CreatedAtAction(nameof(GetReservations),
            new { date = DateOnly.FromDateTime(reservation.StartsAt) },
            new { id = reservation.Id, reservation.Status });

    }



    [HttpGet("/reservations")]
    [Authorize]

    public async Task<IActionResult> GetReservations([FromQuery] DateOnly date)
    {
        var dayStart = date.ToDateTime(new TimeOnly(0, 0), DateTimeKind.Utc);
        var dayEnd = date.ToDateTime(new TimeOnly(23, 59, 59), DateTimeKind.Utc);


        var reservations = await _db.Reservations
            .Include(r => r.Bay)
            .Include(r => r.Service)
            .Include(r => r.Customer)
            .Where(r => r.StartsAt >= dayStart && r.StartsAt <= dayEnd)
            .OrderBy(r => r.StartsAt)
            .Select(r => new
            {
                r.Id,
                r.StartsAt,
                r.EndsAt,
                r.Status,
                r.Notes,
                r.CreatedBy,
                Bay = new { r.Bay.Id, r.Bay.Name },
                Service = new { r.Service.Id, r.Service.Name, r.Service.DurationMinutes, r.Service.PriceRsd },
                Customer = new { r.Customer.Id, r.Customer.Name, r.Customer.Phone }
            })
            .ToListAsync();

        return Ok(reservations);
    }

    // PATCH /reservations/{id}/status
    [HttpPatch("/reservations/{id}/status")]
    [Authorize]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var reservation = await _db.Reservations.FindAsync(id);
        if (reservation is null)
            return NotFound();

        if (reservation.Status == ReservationStatus.Completed)
            return BadRequest("Cannot change status of a completed reservation");

        reservation.Status = request.Status;
        await _db.SaveChangesAsync();
        return NoContent();

    }

    // DELETE /reservations/{id}
    [HttpDelete("/reservations/{id}")]
    [Authorize]
    public async Task<IActionResult> CancelReservation(Guid id)
    {
        var reservation = await _db.Reservations.FindAsync(id);
        if (reservation is null)
            return NotFound();

        if (reservation.Status == ReservationStatus.Completed)
            return BadRequest("Cannot cancel a completed reservation");

        reservation.Status = ReservationStatus.Cancelled;
        await _db.SaveChangesAsync();

        return NoContent();
    }



    private async Task<Tenant?> ResolveTenantAsync(string tenantSlug)
    {
        return await _db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == tenantSlug);
    }

}