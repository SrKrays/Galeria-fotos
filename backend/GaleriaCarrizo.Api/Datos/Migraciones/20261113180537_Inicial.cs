using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace GaleriaCarrizo.Api.Datos.Migraciones
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "administradores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Usuario = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    ClaveHash = table.Column<string>(type: "text", nullable: false),
                    Creado = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UltimoIngreso = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_administradores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "colecciones",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Descripcion = table.Column<string>(type: "text", nullable: true),
                    Orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_colecciones", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "estilos_marco",
                columns: table => new
                {
                    Id = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Uso = table.Column<string>(type: "text", nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_estilos_marco", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "fotos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Titulo = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Anio = table.Column<int>(type: "integer", nullable: true),
                    Lugar = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Gancho = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Alt = table.Column<string>(type: "character varying(400)", maxLength: 400, nullable: false),
                    Credito = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: true),
                    MarcoId = table.Column<string>(type: "character varying(40)", nullable: false),
                    ColeccionId = table.Column<int>(type: "integer", nullable: true),
                    Orden = table.Column<int>(type: "integer", nullable: false),
                    Publicada = table.Column<bool>(type: "boolean", nullable: false),
                    Ancho = table.Column<int>(type: "integer", nullable: false),
                    Alto = table.Column<int>(type: "integer", nullable: false),
                    ColorMedio = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    ClaveOriginal = table.Column<string>(type: "text", nullable: false),
                    ClaveMediana = table.Column<string>(type: "text", nullable: false),
                    ClaveMiniatura = table.Column<string>(type: "text", nullable: false),
                    Creada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Actualizada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_fotos_colecciones_ColeccionId",
                        column: x => x.ColeccionId,
                        principalTable: "colecciones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_fotos_estilos_marco_MarcoId",
                        column: x => x.MarcoId,
                        principalTable: "estilos_marco",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "consultas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FotoId = table.Column<int>(type: "integer", nullable: true),
                    FotoTitulo = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    FotoCodigo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Apellido = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Telefono = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Email = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Uso = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Mensaje = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    Estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Creada = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_consultas_fotos_FotoId",
                        column: x => x.FotoId,
                        principalTable: "fotos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "relatos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FotoId = table.Column<int>(type: "integer", nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Actualizado = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_relatos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_relatos_fotos_FotoId",
                        column: x => x.FotoId,
                        principalTable: "fotos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "estilos_marco",
                columns: new[] { "Id", "Activo", "Nombre", "Orden", "Uso" },
                values: new object[,]
                {
                    { "dorado", true, "Dorado ornamentado clásico", 1, "Fotos históricas, las más importantes" },
                    { "madera", true, "Madera oscura", 3, "Escenas de gente y plaza" },
                    { "negro", true, "Negro minimalista", 4, "Paisajes urbanos y fotos de época" },
                    { "plateado", true, "Plateado fino moderno", 2, "Retratos" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_administradores_Usuario",
                table: "administradores",
                column: "Usuario",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_colecciones_Slug",
                table: "colecciones",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_consultas_Estado_Creada",
                table: "consultas",
                columns: new[] { "Estado", "Creada" });

            migrationBuilder.CreateIndex(
                name: "IX_consultas_FotoId",
                table: "consultas",
                column: "FotoId");

            migrationBuilder.CreateIndex(
                name: "IX_fotos_ColeccionId",
                table: "fotos",
                column: "ColeccionId");

            migrationBuilder.CreateIndex(
                name: "IX_fotos_MarcoId",
                table: "fotos",
                column: "MarcoId");

            migrationBuilder.CreateIndex(
                name: "IX_fotos_Publicada_Orden",
                table: "fotos",
                columns: new[] { "Publicada", "Orden" });

            migrationBuilder.CreateIndex(
                name: "IX_fotos_Slug",
                table: "fotos",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_relatos_FotoId",
                table: "relatos",
                column: "FotoId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "administradores");

            migrationBuilder.DropTable(
                name: "consultas");

            migrationBuilder.DropTable(
                name: "relatos");

            migrationBuilder.DropTable(
                name: "fotos");

            migrationBuilder.DropTable(
                name: "colecciones");

            migrationBuilder.DropTable(
                name: "estilos_marco");
        }
    }
}
