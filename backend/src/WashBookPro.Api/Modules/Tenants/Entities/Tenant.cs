namespace WashBookPro.Api.Modules.Tenants.Entities;

public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // TODO: structurirati u Street/City/PostalCode kad dođu B2B/multi-location features
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public TimeOnly? OpeningTime { get; set; }
    public TimeOnly? ClosingTime { get; set; }
}
