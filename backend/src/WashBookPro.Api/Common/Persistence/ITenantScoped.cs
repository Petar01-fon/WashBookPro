namespace WashBookPro.Api.Common.Persistence;

/// <summary>
/// Marker interface for entities that belong to a specific tenant.
/// AppDbContext applies a global query filter on all implementors.
/// </summary>
public interface ITenantScoped
{
    Guid TenantId { get; }
}
