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
    // Matches the (naive-local-tagged-as-Utc) coordinate space dayStart/dayEnd
    // already use in GetAvailability — see the "sub-30-min cutoff" comment there.
    private static readonly TimeZoneInfo BelgradeTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Belgrade");

    // Gap between consecutive slot starts, on top of the service duration — worker
    // breather / cushion for running late. Not part of Reservation.EndsAt (that stays
    // pure wash duration) and not part of the overlap check — it only spaces out
    // candidate slot starts in GetAvailability's loop.
    private const int SlotBufferMinutes = 15;

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

        // Deterministic order: when two bays offer the same candidate start, the
        // dedup below keeps whichever bay is iterated first — without an explicit
        // order that "first" was DB-dependent and effectively random.
        var bays = await _db.Bays
            .IgnoreQueryFilters()
            .Where(b => b.IsActive && b.TenantId == tenant.Id)
            .OrderBy(b => b.Name)
            .ToListAsync();

        var opening = tenant.OpeningTime ?? new TimeOnly(8, 0);
        var closing = tenant.ClosingTime ?? new TimeOnly(18, 0);
        if (tenant.OpeningTime is null || tenant.ClosingTime is null)
            _logger.LogWarning("Tenant {TenantId} has no OpeningTime/ClosingTime — falling back to 08:00/18:00", tenant.Id);

        // Opening/closing are Belgrade wall-clock hours. Build them as Unspecified,
        // then convert through the zone's DST rules to get a true UTC instant —
        // dayStart/dayEnd/slotStart must live in the same real-timeline space as
        // Reservation.StartsAt (a genuine UTC instant, see WalkInDialog.tsx's
        // .toISOString()), otherwise the free-window check below compares two
        // clocks running up to 2 hours apart.
        var dayStartLocal = date.ToDateTime(opening, DateTimeKind.Unspecified);
        var dayEndLocal   = date.ToDateTime(closing, DateTimeKind.Unspecified);
        var dayStart = TimeZoneInfo.ConvertTimeToUtc(dayStartLocal, BelgradeTimeZone);
        var dayEnd   = TimeZoneInfo.ConvertTimeToUtc(dayEndLocal, BelgradeTimeZone);

        // Customer must book at least 30 minutes ahead. "Today" is a local-calendar
        // question (does the requested date match Belgrade's current date), so
        // todayBelgrade stays in local space. The cutoff instant itself now lives in
        // true UTC — same space as dayStart/slotStart above — so no zone conversion
        // is needed for the comparison itself.
        var nowUtc = DateTime.UtcNow;
        var nowBelgrade = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, BelgradeTimeZone);
        var todayBelgrade = DateOnly.FromDateTime(nowBelgrade);
        DateTime? earliestBookable = date == todayBelgrade ? nowUtc.AddMinutes(30) : null;

        // Widened by SlotBufferMinutes on both ends versus the raw [dayStart, dayEnd]
        // overlap: a reservation ending exactly at dayStart still has an inflated end
        // (dayStart + buffer) that must block the first slot of the day, and
        // symmetrically a reservation starting exactly at dayEnd has an inflated start
        // that must block the last slot. The plain overlap condition misses both.
        var existingReservations = await _db.Reservations
            .IgnoreQueryFilters()
            .Where(r => r.TenantId == tenant.Id &&
                        r.StartsAt < dayEnd.AddMinutes(SlotBufferMinutes) &&
                        r.EndsAt > dayStart.AddMinutes(-SlotBufferMinutes) &&
                        r.Status != ReservationStatus.Cancelled)
            .ToListAsync();

        // Per-bay free windows, not one global 08:00-anchored grid: each bay's
        // occupied intervals are inflated ±SlotBufferMinutes, clamped to the day,
        // merged, and complemented — so a bay that frees up mid-morning is offered
        // from the moment it's actually free, not from wherever a single shared grid
        // next happens to land.
        var candidatesByStart = new SortedDictionary<DateTime, (Guid BayId, string BayName, DateTime EndsAt)>();
        foreach (var bay in bays)
        {
            var freeWindows = BuildFreeWindowsForBay(bay.Id, existingReservations, dayStart, dayEnd);
            freeWindows = ApplyCutoff(freeWindows, earliestBookable);

            foreach (var window in freeWindows)
            {
                foreach (var candidate in GenerateCandidates(window, service.DurationMinutes))
                {
                    // The customer picks a time, not a bay — only one bay is shown
                    // per start. First bay (in the deterministic Name order above)
                    // to reach a given start wins; later bays offering the same
                    // start are dropped.
                    if (!candidatesByStart.ContainsKey(candidate.Start))
                        candidatesByStart[candidate.Start] = (bay.Id, bay.Name, candidate.End);
                }
            }
        }

        var slots = candidatesByStart.Select(kv => new
        {
            bayId = kv.Value.BayId,
            bayName = kv.Value.BayName,
            startsAt = kv.Key,
            endsAt = kv.Value.EndsAt
        });

        return Ok(slots);
    }

    // Occupied intervals for this bay, inflated ±SlotBufferMinutes, clamped to
    // [dayStart, dayEnd], merged where touching/overlapping, then complemented —
    // the gaps between (and before the first / after the last) merged block are
    // this bay's free windows for the day. A bay with no reservations returns the
    // whole day as one window; a bay booked solid all day returns no windows.
    private static List<(DateTime Start, DateTime End)> BuildFreeWindowsForBay(
        Guid bayId,
        List<Reservation> reservationsForDay,
        DateTime dayStart,
        DateTime dayEnd)
    {
        var blocked = new List<(DateTime Start, DateTime End)>();
        foreach (var r in reservationsForDay)
        {
            if (r.BayId != bayId) continue;

            var inflatedStart = r.StartsAt.AddMinutes(-SlotBufferMinutes);
            var inflatedEnd = r.EndsAt.AddMinutes(SlotBufferMinutes);
            var clampedStart = inflatedStart < dayStart ? dayStart : inflatedStart;
            var clampedEnd = inflatedEnd > dayEnd ? dayEnd : inflatedEnd;

            // Drops entirely if clamping collapses it to zero/negative width — e.g.
            // a reservation whose inflated interval never actually touches the day.
            if (clampedStart < clampedEnd)
                blocked.Add((clampedStart, clampedEnd));
        }

        blocked.Sort((a, b) => a.Start.CompareTo(b.Start));

        var merged = new List<(DateTime Start, DateTime End)>();
        foreach (var interval in blocked)
        {
            if (merged.Count > 0 && interval.Start <= merged[^1].End)
            {
                var last = merged[^1];
                merged[^1] = (last.Start, interval.End > last.End ? interval.End : last.End);
            }
            else
            {
                merged.Add(interval);
            }
        }

        var windows = new List<(DateTime Start, DateTime End)>();
        var cursor = dayStart;
        foreach (var block in merged)
        {
            if (cursor < block.Start)
                windows.Add((cursor, block.Start));
            if (block.End > cursor)
                cursor = block.End;
        }
        if (cursor < dayEnd)
            windows.Add((cursor, dayEnd));

        return windows;
    }

    // Clamps each window's START (not the generated candidates) to the 30-min
    // cutoff — this must happen before candidate generation, not as a filter on
    // already-generated candidates. Filtering afterward would keep the window's
    // original start as the grid's anchor, reproducing the exact anchoring bug
    // this whole rework fixes, just one level down: a bay free since 08:00 with
    // "now" at 09:00 (cutoff 09:30) would still grid 08:00/09:15/10:30/... from
    // the old anchor and filter down to only 10:30, even though the bay has been
    // genuinely free since 09:30. Clamping the window's start first makes 09:30
    // (rounded) the new anchor instead.
    private static List<(DateTime Start, DateTime End)> ApplyCutoff(
        List<(DateTime Start, DateTime End)> windows,
        DateTime? earliestBookable)
    {
        if (earliestBookable is null)
            return windows;

        var result = new List<(DateTime Start, DateTime End)>();
        foreach (var window in windows)
        {
            var effectiveStart = window.Start > earliestBookable.Value ? window.Start : earliestBookable.Value;
            if (effectiveStart < window.End)
                result.Add((effectiveStart, window.End));
            // else: the whole window is already in the past — dropped entirely.
        }
        return result;
    }

    // Candidate starts inside one (already cutoff-clamped) free window. The buffer
    // is already baked into the window via BuildFreeWindowsForBay's inflation, so
    // "fits in the window" is the only check needed here — it is NOT added again.
    private static List<(DateTime Start, DateTime End)> GenerateCandidates(
        (DateTime Start, DateTime End) window,
        int durationMinutes)
    {
        var candidates = new List<(DateTime Start, DateTime End)>();
        var start = RoundUpTo5Minutes(window.Start);
        var step = durationMinutes + SlotBufferMinutes;

        while (start.AddMinutes(durationMinutes) <= window.End)
        {
            candidates.Add((start, start.AddMinutes(durationMinutes)));
            start = start.AddMinutes(step);
        }

        return candidates;
    }

    // Rounds up to the next 5-minute boundary, never down/backward — rounding
    // backward would land inside the buffer the candidate is supposed to respect.
    // Returns the same instant unchanged if it's already exactly on a 5-minute
    // boundary with zero seconds/milliseconds. Kind is preserved explicitly since
    // this always operates on true-UTC instants (dayStart or earliestBookable).
    private static DateTime RoundUpTo5Minutes(DateTime dt)
    {
        var flooredToMinute = new DateTime(dt.Year, dt.Month, dt.Day, dt.Hour, dt.Minute, 0, 0, dt.Kind);
        var alreadyOnBoundary = dt.Second == 0 && dt.Millisecond == 0 && flooredToMinute.Minute % 5 == 0;
        if (alreadyOnBoundary)
            return flooredToMinute;

        var remainder = flooredToMinute.Minute % 5;
        var minutesToNextBoundary = remainder == 0 ? 5 : 5 - remainder;
        return flooredToMinute.AddMinutes(minutesToNextBoundary);
    }

    // System.Text.Json tags "...Z" as Utc and "...+01:00" as Local (already shifted
    // into the server's zone, so ToUniversalTime is exact). A value with no zone at
    // all is Unspecified and genuinely ambiguous — rejected rather than guessed.
    private static bool TryNormalizeToUtc(DateTime value, out DateTime utc)
    {
        switch (value.Kind)
        {
            case DateTimeKind.Utc:
                utc = value;
                return true;
            case DateTimeKind.Local:
                utc = value.ToUniversalTime();
                return true;
            default:
                utc = default;
                return false;
        }
    }

    // POST /reservations — public, guest/customer booking
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
    {
        var tenant = await ResolveTenantAsync(request.TenantSlug);
        if (tenant is null)
            return NotFound("Tenant not found");

        if (!TryNormalizeToUtc(request.StartsAt, out var startsAtUtc))
            return BadRequest("startsAt must include a timezone offset (e.g. \"2026-12-15T08:00:00Z\")");

        var plateNumber = string.IsNullOrWhiteSpace(request.PlateNumber)
            ? null
            : request.PlateNumber.Trim().ToUpperInvariant();

        var reservation = await CreateReservationCoreAsync(
            tenantId: tenant.Id,
            serviceId: request.ServiceId,
            bayId: request.BayId,
            startsAt: startsAtUtc,
            plateNumber: plateNumber,
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

        if (!TryNormalizeToUtc(request.StartsAt, out var startsAtUtc))
            return BadRequest("startsAt must include a timezone offset (e.g. \"2026-12-15T08:00:00Z\")");

        var reservation = await CreateReservationCoreAsync(
            tenantId: tenantId.Value,
            serviceId: request.ServiceId,
            bayId: request.BayId,
            startsAt: startsAtUtc,
            plateNumber: null,
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
        string? plateNumber,
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
            PlateNumber = plateNumber,
            Notes = notes,
            CreatedBy = createdBy,
        };

        _db.Reservations.Add(reservation);
        await _db.SaveChangesAsync();

        try
        {
            // startsAt is a genuine UTC instant (see the GetAvailability comment on
            // dayStart/dayEnd above) but its Kind tag isn't guaranteed to say so —
            // System.Text.Json only sets Kind=Utc for a "...Z" suffixed request body
            // (what every current client sends via .toISOString()); a hypothetical
            // client sending an explicit "+02:00" offset instead would deserialize
            // to Kind=Local, which ConvertTimeFromUtc rejects with ArgumentException.
            // SpecifyKind pins it to Utc regardless of the tag, matching the actual
            // domain invariant, so the conversion below can't throw on Kind alone.
            var startsAtBelgrade = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.SpecifyKind(startsAt, DateTimeKind.Utc), BelgradeTimeZone);

            // Neither caller (Create, CreateWalkIn) has the full Tenant loaded at
            // this point — Create resolves one via ResolveTenantAsync but only
            // threads tenant.Id through, and CreateWalkIn only ever has the Guid
            // from ITenantContext. Queried here instead of widening either caller's
            // signature, consistent with how Service/Bay/Customer are already
            // fetched locally in this method.
            var tenant = await _db.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            await _emailService.SendBookingConfirmationAsync(new BookingConfirmationEmail(
                ToEmail: customerEmail,
                CustomerName: customerName,
                ServiceName: service.Name,
                PriceRsd: service.PriceRsd,
                PlateNumber: plateNumber,
                StartsAtBelgrade: startsAtBelgrade,
                TenantName: tenant?.Name ?? "WashBookPro",
                TenantAddress: tenant?.Address,
                TenantPhone: tenant?.Phone));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send booking confirmation email for reservation {ReservationId}", reservation.Id);
        }

        return reservation;
    }

    // GET /reservations
    [HttpGet("/reservations")]
    [Authorize(Roles = "Worker,Owner")]
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
    [Authorize(Roles = "Worker,Owner")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var reservation = await _db.Reservations
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);
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
    [Authorize(Roles = "Worker,Owner")]
    public async Task<IActionResult> CancelReservation(Guid id)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId is null) return Unauthorized();

        var reservation = await _db.Reservations
            .FirstOrDefaultAsync(r => r.Id == id && r.TenantId == tenantId);
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
