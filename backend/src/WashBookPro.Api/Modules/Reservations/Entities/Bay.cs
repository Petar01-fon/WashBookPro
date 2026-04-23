using System.Text.Json.Serialization;
using WashBookPro.Api.Common.Persistence;

public class Bay : ITenantScoped
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    [JsonIgnore]
    public ICollection<Reservation> Reservations { get; set; } = [];


}
