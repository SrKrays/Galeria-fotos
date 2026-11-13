using GaleriaCarrizo.Api.Modelos;
using Microsoft.EntityFrameworkCore;

namespace GaleriaCarrizo.Api.Datos;

public class GaleriaContext(DbContextOptions<GaleriaContext> opciones) : DbContext(opciones)
{
    public DbSet<Foto> Fotos => Set<Foto>();
    public DbSet<Relato> Relatos => Set<Relato>();
    public DbSet<Coleccion> Colecciones => Set<Coleccion>();
    public DbSet<EstiloMarco> EstilosMarco => Set<EstiloMarco>();
    public DbSet<Consulta> Consultas => Set<Consulta>();
    public DbSet<Administrador> Administradores => Set<Administrador>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<Foto>(e =>
        {
            e.ToTable("fotos");
            e.HasIndex(f => f.Slug).IsUnique();
            e.HasIndex(f => new { f.Publicada, f.Orden });
            e.Property(f => f.Slug).HasMaxLength(120);
            e.Property(f => f.Titulo).HasMaxLength(160);
            e.Property(f => f.Lugar).HasMaxLength(120);
            e.Property(f => f.Gancho).HasMaxLength(200);
            e.Property(f => f.Alt).HasMaxLength(400);
            e.Property(f => f.Credito).HasMaxLength(160);
            e.Property(f => f.ColorMedio).HasMaxLength(16);
            e.Ignore(f => f.Codigo);
            e.HasOne(f => f.Marco).WithMany().HasForeignKey(f => f.MarcoId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.Coleccion).WithMany(c => c.Fotos).HasForeignKey(f => f.ColeccionId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(f => f.Relato).WithOne(r => r.Foto).HasForeignKey<Relato>(r => r.FotoId).OnDelete(DeleteBehavior.Cascade);
        });
        m.Entity<Relato>(e => { e.ToTable("relatos"); e.HasIndex(r => r.FotoId).IsUnique(); });
        m.Entity<Coleccion>(e =>
        {
            e.ToTable("colecciones");
            e.HasIndex(c => c.Slug).IsUnique();
            e.Property(c => c.Nombre).HasMaxLength(120);
            e.Property(c => c.Slug).HasMaxLength(120);
        });
        m.Entity<EstiloMarco>(e =>
        {
            e.ToTable("estilos_marco");
            e.Property(x => x.Id).HasMaxLength(40);
            e.Property(x => x.Nombre).HasMaxLength(80);
            // los cuatro marcos que existen en el frontend
            e.HasData(
                new EstiloMarco { Id = "dorado", Nombre = "Dorado ornamentado clásico", Uso = "Fotos históricas, las más importantes", Orden = 1 },
                new EstiloMarco { Id = "plateado", Nombre = "Plateado fino moderno", Uso = "Retratos", Orden = 2 },
                new EstiloMarco { Id = "madera", Nombre = "Madera oscura", Uso = "Escenas de gente y plaza", Orden = 3 },
                new EstiloMarco { Id = "negro", Nombre = "Negro minimalista", Uso = "Paisajes urbanos y fotos de época", Orden = 4 });
        });
        m.Entity<Consulta>(e =>
        {
            e.ToTable("consultas");
            e.HasIndex(c => new { c.Estado, c.Creada });
            e.Property(c => c.Nombre).HasMaxLength(80);
            e.Property(c => c.Apellido).HasMaxLength(80);
            e.Property(c => c.Telefono).HasMaxLength(40);
            e.Property(c => c.Email).HasMaxLength(160);
            e.Property(c => c.Uso).HasMaxLength(20);
            e.Property(c => c.Estado).HasMaxLength(20);
            e.Property(c => c.Mensaje).HasMaxLength(1500);
            e.Property(c => c.FotoTitulo).HasMaxLength(160);
            e.Property(c => c.FotoCodigo).HasMaxLength(20);
            e.HasOne(c => c.Foto).WithMany().HasForeignKey(c => c.FotoId).OnDelete(DeleteBehavior.SetNull);
        });
        m.Entity<Administrador>(e =>
        {
            e.ToTable("administradores");
            e.HasIndex(a => a.Usuario).IsUnique();
            e.Property(a => a.Usuario).HasMaxLength(60);
        });
    }
}
