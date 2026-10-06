using WashBookPro.Api.Common.Persistence;
using Microsoft.EntityFrameworkCore;

public static class ReservationSeed
{
    public static async Task SeedAsync(AppDbContext db, Guid tenantId)
    {
        if (await db.Services
        .IgnoreQueryFilters()
        .Where(s => s.TenantId == tenantId)
        .AnyAsync())
            return;

        var services = new List<Service>
        {
           new() { Id = Guid.Parse("5e000000-0000-4000-8000-000000000001"), TenantId = tenantId, Name = "Automobil — obično pranje",   VehicleCategory = "Car", ServiceType = "Basic", DurationMinutes = 30,  PriceRsd = 800 },
            new() { Id = Guid.Parse("5e000000-0000-4000-8000-000000000002"), TenantId = tenantId, Name = "Automobil — dubinsko pranje", VehicleCategory = "Car", ServiceType = "Deep",  DurationMinutes = 90,  PriceRsd = 2500 },
            new() { Id = Guid.Parse("5e000000-0000-4000-8000-000000000003"), TenantId = tenantId, Name = "SUV — obično pranje",         VehicleCategory = "SUV", ServiceType = "Basic", DurationMinutes = 45,  PriceRsd = 1100 },
            new() { Id = Guid.Parse("5e000000-0000-4000-8000-000000000004"), TenantId = tenantId, Name = "SUV — dubinsko pranje",       VehicleCategory = "SUV", ServiceType = "Deep",  DurationMinutes = 120, PriceRsd = 3500 },
            new() { Id = Guid.Parse("5e000000-0000-4000-8000-000000000005"), TenantId = tenantId, Name = "Kombi — obično pranje",       VehicleCategory = "Van", ServiceType = "Basic", DurationMinutes = 60,  PriceRsd = 1400 },
            new() { Id = Guid.Parse("5e000000-0000-4000-8000-000000000006"), TenantId = tenantId, Name = "Kombi — dubinsko pranje",     VehicleCategory = "Van", ServiceType = "Deep",  DurationMinutes = 150, PriceRsd = 4500 },

        };

        await db.Services.AddRangeAsync(services);
        await db.SaveChangesAsync();
    }
}