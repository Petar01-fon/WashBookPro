using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Entities;
using WashBookPro.Api.Modules.Tenants.Entities;

public static class DevDataSeed
{
    public static async Task SeedAsync(AppDbContext db, Guid tenantId, bool isDevelopment)
    {
        if (!isDevelopment)
            throw new InvalidOperationException("DevDataSeed must not run outside Development environment.");

        await SeedTenantAsync(db, tenantId);
        await SeedOwnerAsync(db, tenantId);
        await SeedWorkerAsync(db, tenantId);
        await SeedBayAsync(db, tenantId);
        await SeedTenantContactFieldsAsync(db, tenantId);
    }

    private static async Task SeedTenantAsync(AppDbContext db, Guid tenantId)
    {
        var exists = await db.Tenants
            .IgnoreQueryFilters()
            .AnyAsync(t => t.Id == tenantId);

        if (exists) return;

        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "dev-wash",
            Name = "Dev Wash",
            Address = "Sedmog jula, Niš",
            Phone = "018/123-456",
            OpeningTime = new TimeOnly(8, 0),
            ClosingTime = new TimeOnly(18, 0),
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync();
    }

    private static async Task SeedOwnerAsync(AppDbContext db, Guid tenantId)
    {
        var ownerEmail = "owner@devwash.local";

        var exists = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == tenantId && u.Email == ownerEmail);

        if (exists) return;

        db.Users.Add(new User
        {
            Id = Guid.Parse("a0000000-0000-4000-8000-000000000001"),
            TenantId = tenantId,
            Email = ownerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner123!"),
            Role = "Owner",
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync();
    }

    private static async Task SeedWorkerAsync(AppDbContext db, Guid tenantId)
    {
        var workerEmail = "worker@devwash.local";

        var exists = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == tenantId && u.Email == workerEmail);

        if (exists) return;

        db.Users.Add(new User
        {
            Id = Guid.Parse("a0000000-0000-4000-8000-000000000002"),
            TenantId = tenantId,
            Email = workerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker123!"),
            Role = "Worker",
            CreatedAt = DateTimeOffset.UtcNow,
        });

        await db.SaveChangesAsync();
    }

    private static async Task SeedBayAsync(AppDbContext db, Guid tenantId)
    {
        var exists = await db.Bays
            .IgnoreQueryFilters()
            .AnyAsync(b => b.TenantId == tenantId);

        if (exists) return;

        db.Bays.Add(new Bay
        {
            Id = Guid.Parse("b0000000-0000-4000-8000-000000000001"),
            TenantId = tenantId,
            Name = "Bay 1",
            IsActive = true,
        });

        await db.SaveChangesAsync();
    }

    private static async Task SeedTenantContactFieldsAsync(AppDbContext db, Guid tenantId)
    {
        var tenant = await db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == tenantId);

        if (tenant is null) return;

        if (tenant.Address is null)
            tenant.Address = "Sedmog jula, Niš";
        if (tenant.Phone is null)
            tenant.Phone = "018/123-456";
        if (!tenant.OpeningTime.HasValue)
            tenant.OpeningTime = new TimeOnly(8, 0);
        if (!tenant.ClosingTime.HasValue)
            tenant.ClosingTime = new TimeOnly(18, 0);

        await db.SaveChangesAsync();
    }
}
