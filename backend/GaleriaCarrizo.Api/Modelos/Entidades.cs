namespace GaleriaCarrizo.Api.Modelos;

/// <summary>Una foto de la galería. La original es privada; al navegador solo salen las derivadas.</summary>
public class Foto
{
    public int Id { get; set; }
    /// <summary>Identificador para la URL: /foto/las-tres-manos-del-papa</summary>
    public string Slug { get; set; } = "";
    public string Titulo { get; set; } = "";
    public int? Anio { get; set; }
    public string Lugar { get; set; } = "";
    /// <summary>Frase corta de la placa.</summary>
    public string Gancho { get; set; } = "";
    /// <summary>Descripción de la imagen para lectores de pantalla.</summary>
    public string Alt { get; set; } = "";
    /// <summary>Pie del relato. Vacío = "Fotografía de Antonio Carrizo".</summary>
    public string? Credito { get; set; }

    public string MarcoId { get; set; } = "negro";
    public EstiloMarco? Marco { get; set; }
    public int? ColeccionId { get; set; }
    public Coleccion? Coleccion { get; set; }
    public Relato? Relato { get; set; }

    public int Orden { get; set; }
    public bool Publicada { get; set; }

    // imagen
    public int Ancho { get; set; }
    public int Alto { get; set; }
    /// <summary>Color medio "r,g,b" (0..255): tiñe el reflejo del cuadro en el piso.</summary>
    public string ColorMedio { get; set; } = "128,120,105";
    /// <summary>Clave de la original en el almacén PRIVADO. Nunca se expone.</summary>
    public string ClaveOriginal { get; set; } = "";
    public string ClaveMediana { get; set; } = "";
    public string ClaveMiniatura { get; set; } = "";

    public DateTime Creada { get; set; } = DateTime.UtcNow;
    public DateTime Actualizada { get; set; } = DateTime.UtcNow;

    public string Codigo => $"AC-{Id:0000}";
}

/// <summary>La historia de una foto. Los párrafos se separan con una línea en blanco.</summary>
public class Relato
{
    public int Id { get; set; }
    public int FotoId { get; set; }
    public Foto? Foto { get; set; }
    public string Texto { get; set; } = "";
    public DateTime Actualizado { get; set; } = DateTime.UtcNow;
}

public class Coleccion
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? Descripcion { get; set; }
    public int Orden { get; set; }
    public List<Foto> Fotos { get; set; } = [];
}

/// <summary>Estilo de marco. El Id coincide con el del frontend (src/marcos/index.js).</summary>
public class EstiloMarco
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Uso { get; set; } = "";
    public int Orden { get; set; }
    public bool Activo { get; set; } = true;
}

public static class EstadoConsulta
{
    public const string Nueva = "nueva", Leida = "leida", Respondida = "respondida";
    public static readonly string[] Todos = [Nueva, Leida, Respondida];
}

public static class UsoPrevisto
{
    public static readonly Dictionary<string, string> Todos = new()
    {
        ["prensa"] = "Nota de prensa", ["libro"] = "Libro", ["comercial"] = "Uso comercial", ["personal"] = "Uso personal",
    };
}

public class Consulta
{
    public int Id { get; set; }
    public int? FotoId { get; set; }
    public Foto? Foto { get; set; }
    // copia del título y el código: la consulta se entiende aunque después se borre la foto
    public string FotoTitulo { get; set; } = "";
    public string FotoCodigo { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Apellido { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Email { get; set; } = "";
    public string Uso { get; set; } = "";
    public string Mensaje { get; set; } = "";
    public string Estado { get; set; } = EstadoConsulta.Nueva;
    public DateTime Creada { get; set; } = DateTime.UtcNow;
}

public class Administrador
{
    public int Id { get; set; }
    public string Usuario { get; set; } = "";
    public string ClaveHash { get; set; } = "";
    public DateTime Creado { get; set; } = DateTime.UtcNow;
    public DateTime? UltimoIngreso { get; set; }
}
