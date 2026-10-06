using System.Net;
using System.Net.Http.Json;
using WashBookPro.Api.Tests.Infrastructure;
using Xunit;

namespace WashBookPro.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class AvailabilityTests(PostgresFixture fixture)
{
    // Belgrade is UTC+1 in winter and UTC+2 in summer. Both dates are far in the future,
    // so the same-day cutoff never applies to them.
    private static readonly DateOnly Winter = new(2030, 1, 15);
    private static readonly DateOnly Summer = new(2030, 7, 16);

    private readonly TestData _data = new(fixture);

    public sealed record Slot(Guid BayId, string BayName, DateTimeOffset StartsAt, DateTimeOffset EndsAt);

    [Fact]
    public async Task Winter_day_full_grid()
    {
        var tenant = await _data.CreateTenantAsync();
        await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(WinterFullGrid(), slots.Select(s => s.StartsAt).ToList());
        Assert.All(slots, s => Assert.Equal(s.StartsAt.AddMinutes(30), s.EndsAt));
        Assert.All(slots, s => Assert.Equal("A", s.BayName));
    }

    [Fact]
    public async Task Summer_day_shifts_with_dst()
    {
        var tenant = await _data.CreateTenantAsync();
        await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Summer, service.Id, tenant.Slug);

        Assert.Equal(SummerFullGrid(), slots.Select(s => s.StartsAt).ToList());
    }

    [Fact]
    public async Task Reservation_blocks_with_15_min_buffer_on_both_sides()
    {
        var tenant = await _data.CreateTenantAsync();
        var bay = await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        await _data.CreateReservationAsync(
            tenant.Id, bay.Id, service.Id,
            At(Winter, 9, 0).UtcDateTime, At(Winter, 9, 30).UtcDateTime,
            ReservationStatus.Confirmed);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(
            new List<DateTimeOffset>
            {
                At(Winter, 7, 0), At(Winter, 7, 45),
                At(Winter, 9, 45), At(Winter, 10, 30), At(Winter, 11, 15), At(Winter, 12, 0),
                At(Winter, 12, 45), At(Winter, 13, 30), At(Winter, 14, 15), At(Winter, 15, 0),
                At(Winter, 15, 45), At(Winter, 16, 30),
            },
            slots.Select(s => s.StartsAt).ToList());
    }

    [Fact]
    public async Task Cancelled_reservation_does_not_block()
    {
        var tenant = await _data.CreateTenantAsync();
        var bay = await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        await _data.CreateReservationAsync(
            tenant.Id, bay.Id, service.Id,
            At(Winter, 9, 0).UtcDateTime, At(Winter, 9, 30).UtcDateTime,
            ReservationStatus.Cancelled);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(WinterFullGrid(), slots.Select(s => s.StartsAt).ToList());
    }

    [Fact]
    public async Task Second_bay_offers_slots_when_first_is_full()
    {
        var tenant = await _data.CreateTenantAsync();
        var bayA = await _data.CreateBayAsync(tenant.Id, "A");
        var bayB = await _data.CreateBayAsync(tenant.Id, "B");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        await _data.CreateReservationAsync(
            tenant.Id, bayA.Id, service.Id,
            At(Winter, 7, 0).UtcDateTime, At(Winter, 17, 0).UtcDateTime,
            ReservationStatus.Confirmed);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(WinterFullGrid(), slots.Select(s => s.StartsAt).ToList());
        Assert.All(slots, s => Assert.Equal("B", s.BayName));
        Assert.All(slots, s => Assert.Equal(bayB.Id, s.BayId));
    }

    [Fact]
    public async Task Tenant_opening_hours_are_used()
    {
        var tenant = await _data.CreateTenantAsync(new TimeOnly(9, 0), new TimeOnly(12, 0));
        await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(
            new List<DateTimeOffset>
            {
                At(Winter, 8, 0), At(Winter, 8, 45), At(Winter, 9, 30), At(Winter, 10, 15),
            },
            slots.Select(s => s.StartsAt).ToList());
    }

    [Fact]
    public async Task Missing_opening_hours_fall_back_to_08_18()
    {
        var tenant = await _data.CreateTenantAsync(null, null);
        await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(WinterFullGrid(), slots.Select(s => s.StartsAt).ToList());
    }

    [Fact]
    public async Task Same_day_cutoff_is_30_minutes_from_now()
    {
        var tenant = await _data.CreateTenantAsync(new TimeOnly(0, 0), new TimeOnly(23, 55));
        await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 15);
        using var client = fixture.Factory.CreateClient();

        // Real clock, no TimeProvider. The request date must be "today in Belgrade".
        var before = DateTime.UtcNow;
        var beforeBelgrade = TimeZoneInfo.ConvertTimeFromUtc(before, TimeZoneInfo.FindSystemTimeZoneById("Europe/Belgrade"));
        var minutesOfDay = beforeBelgrade.Hour * 60 + beforeBelgrade.Minute;
        // Too close to midnight: the server may see another day, or there may be no room left.
        if (minutesOfDay >= 23 * 60 || minutesOfDay < 2)
            Assert.Skip("too close to Belgrade midnight");

        var slots = await GetSlotsAsync(client, DateOnly.FromDateTime(beforeBelgrade), service.Id, tenant.Slug);
        var after = DateTime.UtcNow;

        Assert.NotEmpty(slots);
        Assert.All(slots, s => Assert.True(s.StartsAt.UtcDateTime >= before.AddMinutes(30)));
        Assert.All(slots, s =>
        {
            var start = s.StartsAt.UtcDateTime;
            Assert.Equal(0, start.Second);
            Assert.Equal(0, start.Millisecond);
            Assert.Equal(0, start.Minute % 5);
        });
        Assert.True(slots[0].StartsAt.UtcDateTime <= RoundUpTo5Minutes(after.AddMinutes(30)));
    }

    [Fact]
    public async Task Inactive_bay_is_ignored()
    {
        var tenant = await _data.CreateTenantAsync();
        await _data.CreateBayAsync(tenant.Id, "A", isActive: false);
        var bayB = await _data.CreateBayAsync(tenant.Id, "B");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(WinterFullGrid(), slots.Select(s => s.StartsAt).ToList());
        Assert.All(slots, s => Assert.Equal("B", s.BayName));
        Assert.All(slots, s => Assert.Equal(bayB.Id, s.BayId));
    }

    [Fact]
    public async Task Unknown_tenant_returns_404()
    {
        using var client = fixture.Factory.CreateClient();

        var response = await GetAvailabilityAsync(client, Winter, Guid.NewGuid(), "does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Inactive_service_returns_404()
    {
        var tenant = await _data.CreateTenantAsync();
        await _data.CreateBayAsync(tenant.Id, "A");
        var service = await _data.CreateServiceAsync(tenant.Id, 30, isActive: false);
        using var client = fixture.Factory.CreateClient();

        var response = await GetAvailabilityAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task No_active_bays_returns_empty_list()
    {
        var tenant = await _data.CreateTenantAsync();
        await _data.CreateBayAsync(tenant.Id, "A", isActive: false);
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        using var client = fixture.Factory.CreateClient();

        var slots = await GetSlotsAsync(client, Winter, service.Id, tenant.Slug);

        Assert.Empty(slots);
    }

    private static DateTimeOffset At(DateOnly date, int hour, int minute) =>
        new(date.Year, date.Month, date.Day, hour, minute, 0, TimeSpan.Zero);

    // Winter 08:00–18:00 Belgrade = 07:00Z–17:00Z; 30 min service, 45 min step (30 + 15 buffer).
    private static List<DateTimeOffset> WinterFullGrid() =>
    [
        At(Winter, 7, 0), At(Winter, 7, 45), At(Winter, 8, 30), At(Winter, 9, 15),
        At(Winter, 10, 0), At(Winter, 10, 45), At(Winter, 11, 30), At(Winter, 12, 15),
        At(Winter, 13, 0), At(Winter, 13, 45), At(Winter, 14, 30), At(Winter, 15, 15),
        At(Winter, 16, 0),
    ];

    // Summer 08:00–18:00 Belgrade = 06:00Z–16:00Z, so the whole grid shifts 1 h earlier.
    private static List<DateTimeOffset> SummerFullGrid() =>
    [
        At(Summer, 6, 0), At(Summer, 6, 45), At(Summer, 7, 30), At(Summer, 8, 15),
        At(Summer, 9, 0), At(Summer, 9, 45), At(Summer, 10, 30), At(Summer, 11, 15),
        At(Summer, 12, 0), At(Summer, 12, 45), At(Summer, 13, 30), At(Summer, 14, 15),
        At(Summer, 15, 0),
    ];

    // Same rounding as RoundUpTo5Minutes in ReservationsController: up, never down.
    private static DateTime RoundUpTo5Minutes(DateTime dt)
    {
        var flooredToMinute = new DateTime(dt.Year, dt.Month, dt.Day, dt.Hour, dt.Minute, 0, DateTimeKind.Utc);
        if (dt.Second == 0 && dt.Millisecond == 0 && flooredToMinute.Minute % 5 == 0)
            return flooredToMinute;

        var remainder = flooredToMinute.Minute % 5;
        return flooredToMinute.AddMinutes(remainder == 0 ? 5 : 5 - remainder);
    }

    private static Task<HttpResponseMessage> GetAvailabilityAsync(
        HttpClient client, DateOnly date, Guid serviceId, string tenantSlug) =>
        client.GetAsync(
            $"/availability?date={date:yyyy-MM-dd}&serviceId={serviceId}&tenantSlug={tenantSlug}",
            TestContext.Current.CancellationToken);

    private static async Task<List<Slot>> GetSlotsAsync(
        HttpClient client, DateOnly date, Guid serviceId, string tenantSlug)
    {
        var response = await GetAvailabilityAsync(client, date, serviceId, tenantSlug);
        response.EnsureSuccessStatusCode();
        var slots = await response.Content.ReadFromJsonAsync<List<Slot>>(TestContext.Current.CancellationToken);
        return slots!;
    }
}
