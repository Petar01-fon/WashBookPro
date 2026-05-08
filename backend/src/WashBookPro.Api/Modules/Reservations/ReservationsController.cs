using Microsoft.AspNetCore.Mvc;
using WashBookPro.Api.Common.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WashBookPro.Api.Modules.Tenants.Entities;
using WashBookPro.Api.Common.Email;
using WashBookPro.Api.Modules.Reservations.Entities;

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

    // GET /availability?date=2026-05-01&serviceId=...
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

        var opening = tenant.OpeningTime ?? new TimeOnly(8, 0);
        var closing = tenant.ClosingTime ?? new TimeOnly(18, 0);
        if (tenant.OpeningTime is null || tenant.ClosingTime is null)
            _logger.LogWarning("Tenant {TenantId} has no OpeningTime/ClosingTime — falling back to 08:00/18:00", tenant.Id);

        var dayStart = date.ToDateTime(opening, DateTimeKind.Utc);
        var dayEnd   = date.ToDateTime(closing, DateTimeKind.Utc);

        var existingReservations = await _db.Reservations
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenant.Id &&
                        r.StartsAt >= dayStart && r.EndsAt <= dayEnd &&
                        r.Status != ReservationStatus.Cancelled)
            .ToListAsync();

        var slots = new List<object>();
        var slotStart = dayStart;

        while (slotStart.AddMinutes(service.DurationMinutes) <= dayEnd)
        {
            var slotEnd = slotStart.AddMinutes(service.DurationMinutes);

            var freeBay = bays.FirstOrDefault(bay =>
                !existingReservations.Any(r =>
                    r.BayId == bay.Id &&
                    r.StartsAt < slotEnd &&
                    r.EndsAt > slotStart));

            if (freeBay != null)
            {
                slots.Add(new
                {
                    bayId = freeBay.Id,
                    bayName = freeBay.Name,
                    startsAt = slotStart,
                    endsAt = slotEnd
                });
            }

            slotStart = slotEnd;
        }

        return Ok(slots);
    }

    // POST /reservations — public, guest/customer booking
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
    {
        var tenant = await ResolveTenantAsync(request.TenantSlug);
        if (tenant is null)
            return NotFound("Tenant not found");

        var reservation = await CreateReservationCoreAsync(
            tenantId: tenant.Id,
            serviceId: request.ServiceId,
            bayId: request.BayId,
            startsAt: request.StartsAt,
            customerName: request.CustomerName,
            customerPhone: request.CustomerPhone,
            customerEmail: request.CustomerEmail,
            notes: request.Notes,
            status: ReservationStatus.Pending,
            createdBy: ReservationCreatedBy.Customer);

        if (reservation is null) return Conflict("The selected time slot is no longer available");
        return StatusCode(201, new { id = reservation.Id, status = (int)reservation.Status });
    }

    // POST /reservations/walk-in — authorized, worker/owner terminal
    [HttpPost("walk-in")]
    [Authorize(Roles = "Worker,Owner")]
    public async Task<IActionResult> CreateWalkIn([FromBody] WalkInRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var reservation = await CreateReservationCoreAsync(
            tenantId: tenantId.Value,
            serviceId: request.ServiceId,
            bayId: request.BayId,
            startsAt: request.StartsAt,
            customerName: request.CustomerName,
            customerPhone: request.CustomerPhone,
            customerEmail: request.CustomerEmail,
            notes: request.Notes,
            status: ReservationStatus.Confirmed,
            createdBy: ReservationCreatedBy.Worker);

        if (reservation is null) return Conflict("The selected time slot is no longer available");
        return StatusCode(201, new { id = reservation.Id, status = (int)reservation.Status });
    }

    private async Task<Reservation?> CreateReservationCoreAsync(
        Guid tenantId,
        Guid serviceId,
        Guid bayId,
        DateTime startsAt,
        string customerName,
        string customerPhone,
        string customerEmail,
        string? notes,
        ReservationStatus status,
        ReservationCreatedBy createdBy)
    {
        var service = await _db.Services
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.TenantId == tenantId);
        if (service == null) return null;

        var bay = await _db.Bays
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(b => b.Id == bayId && b.TenantId == tenantId);
        if (bay == null) return null;

        var endsAt = startsAt.AddMinutes(service.DurationMinutes);

        var conflict = await _db.Reservations
            .IgnoreQueryFilters()
            .AnyAsync(r =>
                r.BayId == bayId &&
                r.Status != ReservationStatus.Cancelled &&
                r.StartsAt < endsAt &&
                r.EndsAt > startsAt);
        if (conflict) return null;

        var customer = await _db.Customers
            .IgnoreQueryFilters()
            .Where(c => c.Phone == customerPhone && c.TenantId == tenantId)
            .FirstOrDefaultAsync();

        if (customer is null)
        {
            customer = new Customer
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = customerName,
                Phone = customerPhone,
                Email = customerEmail
            };
            _db.Customers.Add(customer);
        }

        var reservation = new Reservation
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BayId = bayId,
            ServiceId = serviceId,
            Customer = customer,
            StartsAt = startsAt,
            EndsAt = endsAt,
            Status = status,
            Notes = notes,
            CreatedBy = createdBy,
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        try
        {
            await _emailService.SendBookingConfirmationAsync(
                toEmail: customerEmail,
                customerName: customerName,
                serviceName: service.Name,
                date: DateOnly.FromDateTime(startsAt),
                timeSlot: startsAt.ToString("HH:mm"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send booking confirmation email for reservation {ReservationId}", reservation.Id);
        }

        return reservation;
    }

    // GET /reservations
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

    // GET /reservations/stats?date=2026-05-01
    [HttpGet("/reservations/stats")]
    [Authorize(Roles = "Owner")]
    public async Task<IActionResult> GetStats([FromQuery] DateOnly date)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var dayStart = date.ToDateTime(new TimeOnly(0, 0), DateTimeKind.Utc);
        var dayEnd = date.ToDateTime(new TimeOnly(23, 59, 59), DateTimeKind.Utc);

        var monthStart = new DateTime(date.Year, date.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddSeconds(-1);

        var todayReservations = await _db.Reservations
            .Include(r => r.Service)
            .Where(r => r.StartsAt >= dayStart && r.StartsAt <= dayEnd)
            .ToListAsync();

        var monthReservations = await _db.Reservations
            .Include(r => r.Service)
            .Where(r => r.StartsAt >= monthStart && r.StartsAt <= monthEnd)
            .ToListAsync();

        var todayCompleted = todayReservations.Where(r => r.Status == ReservationStatus.Completed);
        var monthCompleted = monthReservations.Where(r => r.Status == ReservationStatus.Completed);

        return Ok(new
        {
            today = new
            {
                total = todayReservations.Count,
                completed = todayCompleted.Count(),
                cancelled = todayReservations.Count(r => r.Status == ReservationStatus.Cancelled),
                pending = todayReservations.Count(r => r.Status == ReservationStatus.Pending),
                revenueRsd = todayCompleted.Sum(r => r.Service.PriceRsd)
            },
            month = new
            {
                total = monthReservations.Count,
                completed = monthCompleted.Count(),
                revenueRsd = monthCompleted.Sum(r => r.Service.PriceRsd)
            }
        });
    }

    private async Task<Tenant?> ResolveTenantAsync(string tenantSlug)
    {
        return await _db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == tenantSlug);
    }
}
