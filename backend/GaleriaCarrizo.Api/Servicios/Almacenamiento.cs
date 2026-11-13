using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace GaleriaCarrizo.Api.Servicios;

/// <summary>
/// Dónde viven los archivos. Hay dos zonas:
///   · privada: las ORIGINALES. Nunca tienen URL pública.
///   · pública: la mediana con marca de agua y la miniatura. Es lo único que ve el navegador.
/// </summary>
public interface IAlmacenamiento
{
    Task GuardarPrivadoAsync(string clave, Stream contenido, string tipo, CancellationToken ct = default);
    Task GuardarPublicoAsync(string clave, Stream contenido, string tipo, CancellationToken ct = default);
    Task BorrarPrivadoAsync(string clave, CancellationToken ct = default);
    Task BorrarPublicoAsync(string clave, CancellationToken ct = default);
    /// <summary>URL que puede abrir el navegador para un archivo público.</summary>
    string UrlPublica(string clave);
}

public class OpcionesAlmacenamiento
{
    /// <summary>"local" (carpeta en disco, para desarrollo) o "r2" (Cloudflare R2).</summary>
    public string Tipo { get; set; } = "local";
    public string CarpetaLocal { get; set; } = "almacen";
    // R2
    public string CuentaId { get; set; } = "";
    public string ClaveAcceso { get; set; } = "";
    public string ClaveSecreta { get; set; } = "";
    public string BucketPrivado { get; set; } = "";
    public string BucketPublico { get; set; } = "";
    /// <summary>Dominio público del bucket de derivadas, por ejemplo https://fotos.midominio.com</summary>
    public string UrlPublica { get; set; } = "";
}

/// <summary>Desarrollo: guarda en una carpeta. Solo "publico/" se sirve por HTTP (ver Program.cs).</summary>
public class AlmacenamientoLocal : IAlmacenamiento
{
    private readonly string _raiz;
    public AlmacenamientoLocal(OpcionesAlmacenamiento o, IWebHostEnvironment entorno)
    {
        _raiz = Path.IsPathRooted(o.CarpetaLocal) ? o.CarpetaLocal : Path.Combine(entorno.ContentRootPath, o.CarpetaLocal);
        Directory.CreateDirectory(CarpetaPublica);
        Directory.CreateDirectory(Path.Combine(_raiz, "privado"));
    }

    public string CarpetaPublica => Path.Combine(_raiz, "publico");

    private async Task Guardar(string zona, string clave, Stream contenido, CancellationToken ct)
    {
        var ruta = Path.Combine(_raiz, zona, clave);
        Directory.CreateDirectory(Path.GetDirectoryName(ruta)!);
        await using var archivo = File.Create(ruta);
        await contenido.CopyToAsync(archivo, ct);
    }
    private Task Borrar(string zona, string clave)
    {
        var ruta = Path.Combine(_raiz, zona, clave);
        if (File.Exists(ruta)) File.Delete(ruta);
        return Task.CompletedTask;
    }

    public Task GuardarPrivadoAsync(string clave, Stream c, string tipo, CancellationToken ct = default) => Guardar("privado", clave, c, ct);
    public Task GuardarPublicoAsync(string clave, Stream c, string tipo, CancellationToken ct = default) => Guardar("publico", clave, c, ct);
    public Task BorrarPrivadoAsync(string clave, CancellationToken ct = default) => Borrar("privado", clave);
    public Task BorrarPublicoAsync(string clave, CancellationToken ct = default) => Borrar("publico", clave);
    public string UrlPublica(string clave) => $"/archivos/{clave}";
}

/// <summary>Producción: Cloudflare R2 (compatible con S3). Dos buckets: uno privado y uno público.</summary>
public class AlmacenamientoR2 : IAlmacenamiento, IDisposable
{
    private readonly AmazonS3Client _s3;
    private readonly OpcionesAlmacenamiento _o;

    public AlmacenamientoR2(OpcionesAlmacenamiento o)
    {
        _o = o;
        _s3 = new AmazonS3Client(new BasicAWSCredentials(o.ClaveAcceso, o.ClaveSecreta), new AmazonS3Config
        {
            ServiceURL = $"https://{o.CuentaId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            AuthenticationRegion = "auto",
            // R2 no acepta las sumas de verificación que el SDK nuevo agrega por defecto
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED,
        });
    }

    private Task Guardar(string bucket, string clave, Stream contenido, string tipo, string? cache, CancellationToken ct)
    {
        var pedido = new PutObjectRequest
        {
            BucketName = bucket, Key = clave, InputStream = contenido, ContentType = tipo,
            DisablePayloadSigning = true, AutoCloseStream = false,
        };
        if (cache is not null) pedido.Headers.CacheControl = cache;
        return _s3.PutObjectAsync(pedido, ct);
    }

    public Task GuardarPrivadoAsync(string clave, Stream c, string tipo, CancellationToken ct = default)
        => Guardar(_o.BucketPrivado, clave, c, tipo, null, ct);
    // las derivadas llevan un nombre único, así que el navegador las puede guardar un año
    public Task GuardarPublicoAsync(string clave, Stream c, string tipo, CancellationToken ct = default)
        => Guardar(_o.BucketPublico, clave, c, tipo, "public, max-age=31536000, immutable", ct);
    public Task BorrarPrivadoAsync(string clave, CancellationToken ct = default) => _s3.DeleteObjectAsync(_o.BucketPrivado, clave, ct);
    public Task BorrarPublicoAsync(string clave, CancellationToken ct = default) => _s3.DeleteObjectAsync(_o.BucketPublico, clave, ct);
    public string UrlPublica(string clave) => $"{_o.UrlPublica.TrimEnd('/')}/{clave}";
    public void Dispose() => _s3.Dispose();
}
