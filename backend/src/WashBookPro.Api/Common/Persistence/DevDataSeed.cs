using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Entities;

public static class DevDataSeed
{
    public static async Task SeedAsync(AppDbContext db, Guid tenantId)
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
}