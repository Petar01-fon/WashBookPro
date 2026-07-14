using System.Reflection;
using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Modules.Auth.Entities;
using WashBookPro.Api.Modules.Customers.Entities;
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
    public DbSet<User> Users => Set<User>();
    public DbSet<CustomerAccount> CustomerAccounts => Set<CustomerAccount>();
    public DbSet<Bay> Bays => Set<Bay>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Reservation> Reservations => Set<Reservation>();

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
            b.Property(t => t.Address).HasMaxLength(500);
        });

        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(u => u.Id);
            b.Property(u => u.Email).IsRequired().HasMaxLength(256);
            b.Property(u => u.PasswordHash).IsRequired();
            b.Property(u => u.Role).IsRequired().HasMaxLength(50);
            b.Property(u => u.RefreshToken).HasMaxLength(512);
            b.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();
        });

        modelBuilder.Entity<CustomerAccount>(b =>
        {
            b.HasKey(c => c.Id);
            b.Property(c => c.Email).IsRequired().HasMaxLength(256);
            b.Property(c => c.FirstName).IsRequired().HasMaxLength(100);
            b.Property(c => c.LastName).IsRequired().HasMaxLength(100);
            b.Property(c => c.PhoneNumber).HasMaxLength(50);
            b.Property(c => c.GoogleId).HasMaxLength(128);
            b.Property(c => c.RefreshToken).HasMaxLength(512);
            b.HasIndex(c => c.Email).IsUnique();
            b.HasIndex(c => c.GoogleId).IsUnique().HasFilter("\"GoogleId\" IS NOT NULL");
        });

        modelBuilder.Entity<Reservation>(b =>
        {
            b.HasIndex(r => new { r.BayId, r.StartsAt });
            b.Property(r => r.PlateNumber).HasMaxLength(16);
        });
    }

    private void ApplyTenantFilter<T>(ModelBuilder modelBuilder) where T : class, ITenantScoped
    {
        modelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantContext.TenantId);
    }
}
