using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Entities;

public static class DevDataSeed
{
    public static async Task SeedAsync(AppDbContext db, Guid tenantId)
    {
        await SeedWorkerAsync(db, tenantId);
        await SeedTenantContactFieldsAsync(db, tenantId);
    }

    private static async Task SeedWorkerAsync(AppDbContext db, Guid tenantId)
    {
        var workerEmail = "worker@devwash.local";

        var exists = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == tenantId && u.Email == workerEmail);

        if (exists) return;

        var worker = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Email = workerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Worker123!"),
            Role = "Worker",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Users.Add(worker);
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
        if (!tenant.OpeningTime.HasValue)
            tenant.OpeningTime = new TimeOnly(8, 0);
        if (!tenant.ClosingTime.HasValue)
            tenant.ClosingTime = new TimeOnly(18, 0);

        await db.SaveChangesAsync();
    }
}