namespace WashBookPro.Api.Common.Persistence;

public interface ITenantContext
{
    Guid? TenantId { get; }
}
