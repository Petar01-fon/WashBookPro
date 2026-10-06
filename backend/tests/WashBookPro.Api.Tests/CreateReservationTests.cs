using System.Net;
using System.Net.Http.Json;
using WashBookPro.Api.Modules.Reservations.Entities;
using WashBookPro.Api.Modules.Tenants.Entities;
using WashBookPro.Api.Tests.Infrastructure;
using Xunit;

namespace WashBookPro.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class CreateReservationTests(PostgresFixture fixture)
{
    private static readonly DateOnly Date = new(2030, 1, 15);

    private const string Nine = "2030-01-15T09:00:00Z";
    private const string NineFifteen = "2030-01-15T09:15:00Z";
    private const string Nine30 = "2030-01-15T09:30:00Z";

    private readonly TestData _data = new(fixture);

    public sealed record CreateResponse(Guid Id, int Status, bool EmailSent);

    // ---- POST /reservations (customer) --------------------------------------------

    [Fact]
    public async Task Free_slot_returns_201_pending_customer()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadCreateResponseAsync(response);
        Assert.Equal((int)ReservationStatus.Pending, body.Status);
        Assert.True(body.EmailSent);

        var reservation = await _data.GetReservationAsync(body.Id);
        Assert.NotNull(reservation);
        Assert.Equal(ReservationStatus.Pending, reservation.Status);
        Assert.Equal(ReservationCreatedBy.Customer, reservation.CreatedBy);
        Assert.Equal(At(9, 0).UtcDateTime, reservation.StartsAt);
        Assert.Equal(At(9, 30).UtcDateTime, reservation.EndsAt);
    }

    [Fact]
    public async Task Same_slot_returns_409()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        await ExistingNineAsync(tenant, bayA, service);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Partial_overlap_returns_409()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        await ExistingNineAsync(tenant, bayA, service);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayA.Id, NineFifteen));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Adjacent_slot_without_buffer_is_allowed()
    {
        // Creation intentionally has no buffer: the availability algorithm is the only buffer enforcer.
        var (tenant, bayA, _, service) = await ArrangeAsync();
        await ExistingNineAsync(tenant, bayA, service);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayA.Id, Nine30));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Same_time_other_bay_is_allowed()
    {
        var (tenant, bayA, bayB, service) = await ArrangeAsync();
        await ExistingNineAsync(tenant, bayA, service);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayB.Id, Nine));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Cancelled_reservation_does_not_conflict()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        await ExistingNineAsync(tenant, bayA, service, ReservationStatus.Cancelled);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_service_returns_404()
    {
        var (tenant, bayA, _, _) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, Guid.NewGuid(), bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Inactive_service_returns_404()
    {
        var (tenant, bayA, _, _) = await ArrangeAsync();
        var inactive = await _data.CreateServiceAsync(tenant.Id, 30, isActive: false);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, inactive.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_bay_returns_404()
    {
        var (tenant, _, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, Guid.NewGuid(), Nine));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Inactive_bay_returns_404()
    {
        var (tenant, _, _, service) = await ArrangeAsync();
        var inactive = await _data.CreateBayAsync(tenant.Id, "C", isActive: false);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, inactive.Id, Nine));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Unknown_tenant_returns_404()
    {
        var (_, bayA, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody("does-not-exist", service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Service_from_other_tenant_returns_404()
    {
        var (tenant, bayA, _, _) = await ArrangeAsync();
        var other = await _data.CreateTenantAsync();
        var otherService = await _data.CreateServiceAsync(other.Id, 30);
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, otherService.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task StartsAt_without_zone_returns_400()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(
            client, ReservationBody(tenant.Slug, service.Id, bayA.Id, "2030-01-15T09:00:00"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task StartsAt_with_offset_is_stored_as_utc()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(
            client, ReservationBody(tenant.Slug, service.Id, bayA.Id, "2030-01-15T10:00:00+01:00"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadCreateResponseAsync(response);
        var reservation = await _data.GetReservationAsync(body.Id);
        Assert.NotNull(reservation);
        Assert.Equal(At(9, 0).UtcDateTime, reservation.StartsAt);
    }

    [Fact]
    public async Task Email_rejected_returns_201_with_emailSent_false()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        fixture.Email.NextResult = false;
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadCreateResponseAsync(response);
        Assert.False(body.EmailSent);
    }

    [Fact]
    public async Task Email_exception_returns_201_with_emailSent_false()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        fixture.Email.ThrowNext = true;
        using var client = fixture.Factory.CreateClient();

        var response = await PostReservationAsync(client, ReservationBody(tenant.Slug, service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadCreateResponseAsync(response);
        Assert.False(body.EmailSent);
        Assert.NotNull(await _data.GetReservationAsync(body.Id));
    }

    [Fact]
    public async Task Missing_customer_name_returns_400()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();
        var body = ReservationBody(tenant.Slug, service.Id, bayA.Id, Nine);
        body.Remove("customerName");

        var response = await PostReservationAsync(client, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---- POST /reservations/walk-in (worker) --------------------------------------

    [Fact]
    public async Task Walk_in_without_token_returns_401()
    {
        var (_, bayA, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();

        var response = await PostWalkInAsync(client, WalkInBody(service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Walk_in_as_worker_returns_201_confirmed()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        using var client = fixture.Factory.CreateClient();
        await AuthenticateAsWorkerAsync(client, tenant);

        var response = await PostWalkInAsync(client, WalkInBody(service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadCreateResponseAsync(response);
        Assert.Equal((int)ReservationStatus.Confirmed, body.Status);

        var reservation = await _data.GetReservationAsync(body.Id);
        Assert.NotNull(reservation);
        Assert.Equal(ReservationCreatedBy.Worker, reservation.CreatedBy);
        Assert.Equal(tenant.Id, reservation.TenantId);
    }

    [Fact]
    public async Task Walk_in_conflict_returns_409()
    {
        var (tenant, bayA, _, service) = await ArrangeAsync();
        await ExistingNineAsync(tenant, bayA, service);
        using var client = fixture.Factory.CreateClient();
        await AuthenticateAsWorkerAsync(client, tenant);

        var response = await PostWalkInAsync(client, WalkInBody(service.Id, bayA.Id, Nine));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Walk_in_with_other_tenants_bay_returns_404()
    {
        var (tenant, _, _, service) = await ArrangeAsync();
        var other = await _data.CreateTenantAsync();
        var otherBay = await _data.CreateBayAsync(other.Id, "A");
        using var client = fixture.Factory.CreateClient();
        await AuthenticateAsWorkerAsync(client, tenant);

        var response = await PostWalkInAsync(client, WalkInBody(service.Id, otherBay.Id, Nine));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ---- helpers ------------------------------------------------------------------

    private async Task<(Tenant Tenant, Bay BayA, Bay BayB, Service Service)> ArrangeAsync()
    {
        var tenant = await _data.CreateTenantAsync();
        var bayA = await _data.CreateBayAsync(tenant.Id, "A");
        var bayB = await _data.CreateBayAsync(tenant.Id, "B");
        var service = await _data.CreateServiceAsync(tenant.Id, 30);
        return (tenant, bayA, bayB, service);
    }

    // The "existing" reservation every conflict test starts from: bay A, 09:00Z–09:30Z.
    private Task ExistingNineAsync(
        Tenant tenant, Bay bay, Service service, ReservationStatus status = ReservationStatus.Confirmed) =>
        _data.CreateReservationAsync(
            tenant.Id, bay.Id, service.Id,
            At(9, 0).UtcDateTime, At(9, 30).UtcDateTime, status);

    private async Task AuthenticateAsWorkerAsync(HttpClient client, Tenant tenant)
    {
        var email = await _data.CreateUserAsync(tenant.Id, "Worker");
        var token = await _data.LoginAsync(client, email);
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);
    }

    private static DateTimeOffset At(int hour, int minute) =>
        new(Date.Year, Date.Month, Date.Day, hour, minute, 0, TimeSpan.Zero);

    private static string NewPhone() => "06" + Random.Shared.Next(10_000_000, 100_000_000);

    // Walk-in body has no tenantSlug: the tenant comes from the JWT.
    private static Dictionary<string, object?> WalkInBody(Guid serviceId, Guid bayId, string startsAt) => new()
    {
        ["serviceId"] = serviceId,
        ["bayId"] = bayId,
        ["startsAt"] = startsAt,
        ["customerName"] = "Test Customer",
        ["customerPhone"] = NewPhone(),
        ["customerEmail"] = "customer@tests.local",
    };

    // Public customer body: same as the walk-in body plus the tenant slug.
    private static Dictionary<string, object?> ReservationBody(string tenantSlug, Guid serviceId, Guid bayId, string startsAt)
    {
        var body = WalkInBody(serviceId, bayId, startsAt);
        body["tenantSlug"] = tenantSlug;
        return body;
    }

    private static Task<HttpResponseMessage> PostReservationAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/reservations", body, TestContext.Current.CancellationToken);

    private static Task<HttpResponseMessage> PostWalkInAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/reservations/walk-in", body, TestContext.Current.CancellationToken);

    private static async Task<CreateResponse> ReadCreateResponseAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<CreateResponse>(TestContext.Current.CancellationToken);
        return body!;
    }
}
