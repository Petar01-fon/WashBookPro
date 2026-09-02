using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashBookPro.Api.Common.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantPhone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "Tenants",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Phone",
                table: "Tenants");
        }
    }
}
