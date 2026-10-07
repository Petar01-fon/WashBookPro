using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Tenants;
using WashBookPro.Api.Tests.Infrastructure;
using Xunit;

namespace WashBookPro.Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class TenantBootstrapTests(PostgresFixture fixture)
{
    private readonly TestData _data = new(fixture);

    [Fact]
    public async Task Creates_tenant_owner_and_worker()
    {
        var options = NewOptions(openingTime: new TimeOnly(7, 0), closingTime: new TimeOnly(20, 0));

        var result = await RunAsync(options);

        Assert.Equal(TenantBootstrapResult.Created, result);

        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tenant = await db.Tenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Slug == options.TenantSlug, TestContext.Current.CancellationToken);

        Assert.NotNull(tenant);
        Assert.Equal(new TimeOnly(7, 0), tenant!.OpeningTime);
        Assert.Equal(new TimeOnly(20, 0), tenant.ClosingTime);
        Assert.True(tenant.IsActive);

        using var client = fixture.Factory.CreateClient();
        var ownerLogin = await client.PostAsJsonAsync(
            "/auth/login",
            new { email = options.OwnerEmail, password = options.OwnerPassword },
            TestContext.Current.CancellationToken);
        var workerLogin = await client.PostAsJsonAsync(
            "/auth/login",
            new { email = options.WorkerEmail, password = options.WorkerPassword },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, ownerLogin.StatusCode);
        Assert.Equal(HttpStatusCode.OK, workerLogin.StatusCode);
    }

    [Fact]
    public async Task Existing_slug_is_rejected()
    {
        var options = NewOptions();
        Assert.Equal(TenantBootstrapResult.Created, await RunAsync(options));

        var secondOptions = options with
        {
            OwnerEmail = NewEmail("owner2"),
            WorkerEmail = NewEmail("worker2"),
        };

        var result = await RunAsync(secondOptions);

        Assert.Equal(TenantBootstrapResult.TenantAlreadyExists, result);

        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var secondCallUsersExist = await db.Users.IgnoreQueryFilters()
            .AnyAsync(
                u => u.Email == secondOptions.OwnerEmail || u.Email == secondOptions.WorkerEmail,
                TestContext.Current.CancellationToken);

        Assert.False(secondCallUsersExist);
    }

    [Fact]
    public async Task Existing_email_is_rejected()
    {
        var existingTenant = await _data.CreateTenantAsync();
        var existingOwnerEmail = await _data.CreateUserAsync(existingTenant.Id, "Owner");

        var options = NewOptions() with { OwnerEmail = existingOwnerEmail };

        var result = await RunAsync(options);

        Assert.Equal(TenantBootstrapResult.EmailAlreadyExists, result);
        await AssertTenantNotCreatedAsync(options.TenantSlug);
    }

    [Fact]
    public async Task Short_password_is_rejected()
    {
        var options = NewOptions() with { WorkerPassword = "Short123" }; // 9 characters

        var result = await RunAsync(options);

        Assert.Equal(TenantBootstrapResult.InvalidConfiguration, result);
        await AssertNothingWrittenAsync(options);
    }

    [Fact]
    public async Task Opening_after_closing_is_rejected()
    {
        var options = NewOptions(openingTime: new TimeOnly(20, 0), closingTime: new TimeOnly(7, 0));

        var result = await RunAsync(options);

        Assert.Equal(TenantBootstrapResult.InvalidConfiguration, result);
        await AssertNothingWrittenAsync(options);
    }

    [Fact]
    public void ReadOptions_returns_null_when_key_missing()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Bootstrap:TenantName"] = "Test Wash",
                ["Bootstrap:TenantSlug"] = "test-wash-" + Guid.NewGuid().ToString("N")[..8],
                ["Bootstrap:OpeningTime"] = "08:00",
                ["Bootstrap:ClosingTime"] = "18:00",
                ["Bootstrap:OwnerEmail"] = NewEmail("owner"),
                ["Bootstrap:WorkerEmail"] = NewEmail("worker"),
                ["Bootstrap:WorkerPassword"] = "LongEnoughPassword1",
                // Bootstrap:OwnerPassword intentionally missing
            })
            .Build();

        var options = TenantBootstrap.ReadOptions(config, NullLogger.Instance);

        Assert.Null(options);
    }

    private static TenantBootstrapOptions NewOptions(TimeOnly? openingTime = null, TimeOnly? closingTime = null)
    {
        var suffix = Guid.NewGuid().ToString("N")[..12];
        return new TenantBootstrapOptions(
            TenantName: "Test Wash " + suffix,
            TenantSlug: "test-wash-" + suffix,
            Address: null,
            Phone: null,
            OpeningTime: openingTime ?? new TimeOnly(8, 0),
            ClosingTime: closingTime ?? new TimeOnly(18, 0),
            OwnerEmail: NewEmail("owner"),
            OwnerPassword: "LongEnoughPassword1",
            WorkerEmail: NewEmail("worker"),
            WorkerPassword: "LongEnoughPassword2");
    }

    private static string NewEmail(string role) => $"{role}-{Guid.NewGuid():N}@tests.local";

    private async Task<TenantBootstrapResult> RunAsync(TenantBootstrapOptions options)
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await TenantBootstrap.RunAsync(db, options, NullLogger.Instance, TestContext.Current.CancellationToken);
    }

    private async Task AssertTenantNotCreatedAsync(string slug)
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tenantExists = await db.Tenants.IgnoreQueryFilters()
            .AnyAsync(t => t.Slug == slug, TestContext.Current.CancellationToken);

        Assert.False(tenantExists);
    }

    private async Task AssertNothingWrittenAsync(TenantBootstrapOptions options)
    {
        using var scope = fixture.Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var tenantExists = await db.Tenants.IgnoreQueryFilters()
            .AnyAsync(t => t.Slug == options.TenantSlug, TestContext.Current.CancellationToken);
        var userExists = await db.Users.IgnoreQueryFilters()
            .AnyAsync(
                u => u.Email == options.OwnerEmail || u.Email == options.WorkerEmail,
                TestContext.Current.CancellationToken);

        Assert.False(tenantExists);
        Assert.False(userExists);
    }
}
