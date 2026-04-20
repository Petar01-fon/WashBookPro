using System.Reflection;
using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Modules.Tenants.Entities;

namespace WashBookPro.Api.Common.Persistence;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantScoped).IsAssignableFrom(entityType.ClrType))
            {
                typeof(AppDbContext)
                    .GetMethod(nameof(ApplyTenantFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType)
                    .Invoke(this, [modelBuilder]);
            }
        }

        modelBuilder.Entity<Tenant>(b =>
        {
            b.HasKey(t => t.Id);
            b.Property(t => t.Name).IsRequired().HasMaxLength(200);
            b.Property(t => t.Slug).IsRequired().HasMaxLength(100);
            b.HasIndex(t => t.Slug).IsUnique();
        });
    }

    private void ApplyTenantFilter<T>(ModelBuilder modelBuilder) where T : class, ITenantScoped
    {
        modelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantContext.TenantId);
    }
}
