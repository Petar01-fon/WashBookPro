using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Entities;
using WashBookPro.Api.Modules.Reservations.Entities;
using WashBookPro.Api.Modules.Tenants.Entities;

namespace WashBookPro.Api.Tests.Infrastructure;

// Writes test data straight into the database through the app's own DbContext.
// Every test gets its own tenant, so nothing here depends on dev seed IDs.
public sealed class TestData(PostgresFixture fixture)
{
    private static int _phoneSequence;

    // Opening hours default to 08:00–18:00 (TimeOnly? cannot be a default parameter value,
    // so the default lives in this overload). Pass nulls explicitly to test the fallback.
    public Task<Tenant> CreateTenantAsync() =>
        CreateTenantAsync(new TimeOnly(8, 0), new TimeOnly(18, 0));

    public async Task<Tenant> CreateTenantAsync(TimeOnly? opening, TimeOnly? closing)
    {
        var slug = "t-" + Guid.NewGuid().ToString("N")[..12];
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Slug = slug,
            Name = "Test " + slug,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            OpeningTime = opening,
            ClosingTime = closing,
        };

        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();
        return tenant;
    }

    public async Task<Bay> CreateBayAsync(Guid tenantId, string name, bool isActive = true)
    {
        var bay = new Bay
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = name,
            IsActive = isActive,
        };

        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Bays.Add(bay);
        await db.SaveChangesAsync();
        return bay;
    }

    public async Task<Service> CreateServiceAsync(Guid tenantId, int durationMinutes, bool isActive = true)
    {
        var service = new Service
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Test service",
            VehicleCategory = "Car",
            ServiceType = "Basic",
            DurationMinutes = durationMinutes,
            PriceRsd = 1000,
            IsActive = isActive,
        };

        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Services.Add(service);
        await db.SaveChangesAsync();
        return service;
    }

    // Inserts a new Customer and a Reservation for them. EndsAt is passed explicitly
    // (not derived from the service) so a test can block a whole day if it needs to.
    public async Task<Reservation> CreateReservationAsync(
        Guid tenantId,
        Guid bayId,
        Guid serviceId,
        DateTime startsAtUtc,
        DateTime endsAtUtc,
        ReservationStatus status = ReservationStatus.Confirmed)
    {
        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = "Seed",
            Phone = "06" + Interlocked.Increment(ref _phoneSequence).ToString("D8"),
        };

        var reservation = new Reservation
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            BayId = bayId,
            ServiceId = serviceId,
            CustomerId = customer.Id,
            StartsAt = startsAtUtc,
            EndsAt = endsAtUtc,
            Status = status,
            CreatedBy = ReservationCreatedBy.Customer,
            CreatedAt = DateTime.UtcNow,
        };

        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Customers.Add(customer);
        await db.SaveChangesAsync();
        db.Reservations.Add(reservation);
        await db.SaveChangesAsync();
        return reservation;
    }

    public async Task<string> CreateUserAsync(Guid tenantId, string role)
    {
        var email = $"{role}-{Guid.NewGuid():N}@tests.local";
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test123!"),
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return email;
    }

    public async Task<string> LoginAsync(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/auth/login", new { email, password = "Test123!" });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<LoginResult>();
        return body!.AccessToken;
    }

    // IgnoreQueryFilters: this scope has no HTTP request, so the tenant filter would hide every row.
    public async Task<Reservation?> GetReservationAsync(Guid id)
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Reservations.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.Id == id);
    }

    private sealed record LoginResult(string AccessToken);
}
