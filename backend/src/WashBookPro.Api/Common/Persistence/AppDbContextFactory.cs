using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace WashBookPro.Api.Common.Persistence;

public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=washbookpro;Username=washbook;Password=localdev123")
            .Options;

        return new AppDbContext(options, new NullTenantContext());
    }
}

internal sealed class NullTenantContext : ITenantContext
{
    public Guid? TenantId => null;
}
