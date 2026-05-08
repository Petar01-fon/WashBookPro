using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashBookPro.Api.Common.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantContactFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Tenants",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "ClosingTime",
                table: "Tenants",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "OpeningTime",
                table: "Tenants",
                type: "time without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Address",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ClosingTime",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "OpeningTime",
                table: "Tenants");
        }
    }
}
