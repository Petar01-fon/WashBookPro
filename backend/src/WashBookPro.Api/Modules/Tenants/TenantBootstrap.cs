using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using WashBookPro.Api.Common.Persistence;
using WashBookPro.Api.Modules.Auth.Entities;
using WashBookPro.Api.Modules.Tenants.Entities;

namespace WashBookPro.Api.Modules.Tenants;

public sealed record TenantBootstrapOptions(
    string TenantName, string TenantSlug,
    string? Address, string? Phone,
    TimeOnly OpeningTime, TimeOnly ClosingTime,
    string OwnerEmail, string OwnerPassword,
    string WorkerEmail, string WorkerPassword);

public enum TenantBootstrapResult
{
    Created = 0,
    InvalidConfiguration = 1,
    TenantAlreadyExists = 2,
    EmailAlreadyExists = 3,
}

public static class TenantBootstrap
{
    private static readonly Regex SlugPattern = new(@"^[a-z0-9-]{3,100}$", RegexOptions.Compiled);

    // Reads the "Bootstrap" section (env: Bootstrap__TenantName, ...). Returns
    // null and logs which keys are missing or invalid — never their values.
    public static TenantBootstrapOptions? ReadOptions(IConfiguration config, ILogger logger)
    {
        var section = config.GetSection("Bootstrap");

        var tenantName = section["TenantName"];
        var tenantSlug = section["TenantSlug"];
        var address = section["Address"];
        var phone = section["Phone"];
        var openingTimeRaw = section["OpeningTime"];
        var closingTimeRaw = section["ClosingTime"];
        var ownerEmail = section["OwnerEmail"];
        var ownerPassword = section["OwnerPassword"];
        var workerEmail = section["WorkerEmail"];
        var workerPassword = section["WorkerPassword"];

        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(tenantName)) missing.Add("TenantName");
        if (string.IsNullOrWhiteSpace(tenantSlug)) missing.Add("TenantSlug");
        if (string.IsNullOrWhiteSpace(openingTimeRaw)) missing.Add("OpeningTime");
        if (string.IsNullOrWhiteSpace(closingTimeRaw)) missing.Add("ClosingTime");
        if (string.IsNullOrWhiteSpace(ownerEmail)) missing.Add("OwnerEmail");
        if (string.IsNullOrWhiteSpace(ownerPassword)) missing.Add("OwnerPassword");
        if (string.IsNullOrWhiteSpace(workerEmail)) missing.Add("WorkerEmail");
        if (string.IsNullOrWhiteSpace(workerPassword)) missing.Add("WorkerPassword");

        if (missing.Count > 0)
        {
            logger.LogError("Bootstrap configuration is missing required keys: {Keys}", string.Join(", ", missing));
            return null;
        }

        if (!TimeOnly.TryParseExact(openingTimeRaw, "HH:mm", out var openingTime))
        {
            logger.LogError("Bootstrap:OpeningTime must be in HH:mm format.");
            return null;
        }

        if (!TimeOnly.TryParseExact(closingTimeRaw, "HH:mm", out var closingTime))
        {
            logger.LogError("Bootstrap:ClosingTime must be in HH:mm format.");
            return null;
        }

        var options = new TenantBootstrapOptions(
            tenantName!, tenantSlug!,
            address, phone,
            openingTime, closingTime,
            ownerEmail!, ownerPassword!,
            workerEmail!, workerPassword!);

        return Validate(options, logger) ? options : null;
    }

    public static async Task<TenantBootstrapResult> RunAsync(
        AppDbContext db, TenantBootstrapOptions options, ILogger logger,
        CancellationToken cancellationToken = default)
    {
        if (!Validate(options, logger))
            return TenantBootstrapResult.InvalidConfiguration;

        var tenantExists = await db.Tenants
            .IgnoreQueryFilters()
            .AnyAsync(t => t.Slug == options.TenantSlug, cancellationToken);

        if (tenantExists)
        {
            logger.LogError("Tenant with slug {TenantSlug} already exists.", options.TenantSlug);
            return TenantBootstrapResult.TenantAlreadyExists;
        }

        var emailExists = await db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == options.OwnerEmail || u.Email == options.WorkerEmail, cancellationToken);

        if (emailExists)
        {
            logger.LogError("A user with the owner or worker email already exists.");
            return TenantBootstrapResult.EmailAlreadyExists;
        }

        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = options.TenantName,
            Slug = options.TenantSlug,
            Address = options.Address,
            Phone = options.Phone,
            OpeningTime = options.OpeningTime,
            ClosingTime = options.ClosingTime,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var owner = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = options.OwnerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(options.OwnerPassword),
            Role = "Owner",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        var worker = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenant.Id,
            Email = options.WorkerEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(options.WorkerPassword),
            Role = "Worker",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Tenants.Add(tenant);
        db.Users.AddRange(owner, worker);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Bootstrapped tenant {TenantId} ({TenantSlug}) with owner {OwnerUserId} ({OwnerEmail}) and worker {WorkerUserId} ({WorkerEmail}).",
            tenant.Id, tenant.Slug, owner.Id, owner.Email, worker.Id, worker.Email);

        return TenantBootstrapResult.Created;
    }

    private static bool Validate(TenantBootstrapOptions options, ILogger logger)
    {
        if (string.IsNullOrWhiteSpace(options.TenantName)
            || string.IsNullOrWhiteSpace(options.TenantSlug)
            || string.IsNullOrWhiteSpace(options.OwnerEmail)
            || string.IsNullOrWhiteSpace(options.OwnerPassword)
            || string.IsNullOrWhiteSpace(options.WorkerEmail)
            || string.IsNullOrWhiteSpace(options.WorkerPassword))
        {
            logger.LogError("Bootstrap options are missing one or more required values.");
            return false;
        }

        if (!SlugPattern.IsMatch(options.TenantSlug))
        {
            logger.LogError("Bootstrap:TenantSlug must match ^[a-z0-9-]{{3,100}}$.");
            return false;
        }

        if (options.OpeningTime >= options.ClosingTime)
        {
            logger.LogError("Bootstrap:OpeningTime must be before Bootstrap:ClosingTime.");
            return false;
        }

        if (!options.OwnerEmail.Contains('@') || !options.WorkerEmail.Contains('@'))
        {
            logger.LogError("Bootstrap:OwnerEmail and Bootstrap:WorkerEmail must be valid email addresses.");
            return false;
        }

        if (string.Equals(options.OwnerEmail, options.WorkerEmail, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogError("Bootstrap:OwnerEmail and Bootstrap:WorkerEmail must be different.");
            return false;
        }

        if (options.OwnerPassword.Length < 10 || options.WorkerPassword.Length < 10)
        {
            logger.LogError("Bootstrap:OwnerPassword and Bootstrap:WorkerPassword must be at least 10 characters.");
            return false;
        }

        return true;
    }
}
