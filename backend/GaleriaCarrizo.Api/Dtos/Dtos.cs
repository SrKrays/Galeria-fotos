using System.ComponentModel.DataAnnotations;
using GaleriaCarrizo.Api.Modelos;
using GaleriaCarrizo.Api.Servicios;

namespace GaleriaCarrizo.Api.Dtos;

/// <summary>Lo que recibe el sitio público por cada foto. No incluye nada de la original.</summary>
public record FotoPublica(
    string Id, string Codigo, string Titulo, int? Anio, string Lugar, string Gancho, string Marco,
    string Src, string Miniatura, double Aspecto, string Alt, string? Credito, double[] Color,
    string[] Relato, string? Coleccion);

/// <summary>Lo que ve el panel: lo mismo más los datos de gestión.</summary>
public record FotoAdmin(
    int Id, string Slug, string Codigo, string Titulo, int? Anio, string Lugar, string Gancho, string Marco,
    string Src, string Miniatura, double Aspecto, string Alt, string? Credito, string Relato,
    int? ColeccionId, int Orden, bool Publicada, int Ancho, int Alto, DateTime Actualizada);

public class FotoDatos
{
    [Required(ErrorMessage = "Falta el título."), StringLength(160)] public string Titulo { get; set; } = "";
    [Range(1800, 2100, ErrorMessage = "El año no parece válido.")] public int? Anio { get; set; }
    [StringLength(120)] public string? Lugar { get; set; }
    [StringLength(200)] public string? Gancho { get; set; }
    [StringLength(400)] public string? Alt { get; set; }
    [StringLength(160)] public string? Credito { get; set; }
    [Required(ErrorMessage = "Elegí un marco.")] public string Marco { get; set; } = "negro";
    public int? ColeccionId { get; set; }
    public string? Relato { get; set; }
    public bool Publicada { get; set; }
}

public class FotoNueva : FotoDatos
{
    [Required(ErrorMessage = "Falta el archivo de la foto.")] public IFormFile? Archivo { get; set; }
}

public class ConsultaNueva
{
    /// <summary>Slug de la foto por la que se consulta.</summary>
    [Required] public string FotoId { get; set; } = "";
    [Required(ErrorMessage = "Falta el nombre."), StringLength(80)] public string Nombre { get; set; } = "";
    [Required(ErrorMessage = "Falta el apellido."), StringLength(80)] public string Apellido { get; set; } = "";
    [StringLength(40)] public string? Telefono { get; set; }
    [StringLength(160)] public string? Email { get; set; }
    [Required(ErrorMessage = "Falta el uso previsto.")] public string Uso { get; set; } = "";
    [StringLength(1500)] public string? Mensaje { get; set; }
    /// <summary>Campo trampa: las personas no lo ven; si llega con algo, lo escribió un bot.</summary>
    public string? Sitio { get; set; }
}

public record ConsultaAdmin(
    int Id, string FotoTitulo, string FotoCodigo, string? FotoSlug, string? FotoMiniatura, string Nombre, string Apellido,
    string Telefono, string Email, string Uso, string UsoTexto, string Mensaje, string Estado, DateTime Creada);

public record CambioEstado([Required] string Estado);
public record Ingreso([Required] string Usuario, [Required] string Clave);
public record Sesion(string Token, DateTime Expira, string Usuario);
public record ColeccionDatos([Required, StringLength(120)] string Nombre, string? Descripcion);
public record ColeccionDto(int Id, string Nombre, string Slug, string? Descripcion, int Orden, int Fotos);

public static class Mapas
{
    public static double[] Color(string rgb)
    {
        var p = rgb.Split(',');
        return p.Length == 3 && p.All(x => byte.TryParse(x, out _)) ? [.. p.Select(x => Math.Round(byte.Parse(x) / 255.0, 3))] : [0.5, 0.47, 0.41];
    }

    public static double Aspecto(Foto f) => f.Alto > 0 ? Math.Round((double)f.Ancho / f.Alto, 4) : 1;

    public static FotoPublica APublica(this Foto f, IAlmacenamiento a) => new(
        f.Slug, f.Codigo, f.Titulo, f.Anio, f.Lugar, f.Gancho, f.MarcoId,
        a.UrlPublica(f.ClaveMediana), a.UrlPublica(f.ClaveMiniatura), Aspecto(f), f.Alt,
        string.IsNullOrWhiteSpace(f.Credito) ? null : f.Credito, Color(f.ColorMedio),
        Texto.Parrafos(f.Relato?.Texto), f.Coleccion?.Slug);

    public static FotoAdmin AAdmin(this Foto f, IAlmacenamiento a) => new(
        f.Id, f.Slug, f.Codigo, f.Titulo, f.Anio, f.Lugar, f.Gancho, f.MarcoId,
        a.UrlPublica(f.ClaveMediana), a.UrlPublica(f.ClaveMiniatura), Aspecto(f), f.Alt, f.Credito,
        f.Relato?.Texto ?? "", f.ColeccionId, f.Orden, f.Publicada, f.Ancho, f.Alto, f.Actualizada);
}
