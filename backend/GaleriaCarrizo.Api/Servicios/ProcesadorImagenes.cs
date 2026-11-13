using ImageMagick;
using ImageMagick.Drawing;

namespace GaleriaCarrizo.Api.Servicios;

public class OpcionesImagenes
{
    public string MarcaDeAgua { get; set; } = "© Antonio Carrizo";
    /// <summary>Opacidad de la marca repetida en diagonal (0..1). Tenue: 0.08 a 0.14.</summary>
    public double OpacidadMarca { get; set; } = 0.14;
    public uint LadoMediana { get; set; } = 1800;
    public uint LadoMiniatura { get; set; } = 480;
    public uint CalidadMediana { get; set; } = 82;
    public uint CalidadMiniatura { get; set; } = 76;
    public long PesoMaximoBytes { get; set; } = 40 * 1024 * 1024;
}

public record ImagenProcesada(int Ancho, int Alto, string ColorMedio, MemoryStream Mediana, MemoryStream Miniatura);

public class ImagenInvalidaException(string mensaje) : Exception(mensaje);

/// <summary>
/// De la original (que queda privada) saca las dos versiones que ve el público:
///   · mediana: lado mayor de 1800 px, con marca de agua, WebP
///   · miniatura: lado mayor de 480 px, WebP
/// A las dos se les quitan los metadatos (cámara, fecha, GPS).
/// Lee JPG, PNG, WebP y TIFF (los escaneos de negativos suelen venir en TIFF).
/// </summary>
public class ProcesadorImagenes(OpcionesImagenes o)
{
    private static readonly MagickFormat[] Permitidos =
        [MagickFormat.Jpeg, MagickFormat.Jpg, MagickFormat.Png, MagickFormat.WebP, MagickFormat.Tiff, MagickFormat.Tif];
    private readonly string _fuente = Path.Combine(AppContext.BaseDirectory, "Recursos", "CormorantGaramond-SemiBold.ttf");

    /// <summary>Lanza <see cref="ImagenInvalidaException"/> si el archivo no es una foto que se pueda leer.</summary>
    public ImagenProcesada Procesar(Stream original)
    {
        MagickImage imagen;
        try
        {
            // primero se mira qué es, sin decodificar: así no se abre cualquier formato raro
            var info = new MagickImageInfo(original);
            if (!Permitidos.Contains(info.Format)) throw new ImagenInvalidaException("Formato no admitido. Usá JPG, PNG, WebP o TIFF.");
            if ((long)info.Width * info.Height > 250_000_000) throw new ImagenInvalidaException("La imagen es demasiado grande (más de 250 megapíxeles).");
            original.Position = 0;
            imagen = new MagickImage(original);
        }
        catch (MagickException) { throw new ImagenInvalidaException("El archivo no es una imagen válida. Usá JPG, PNG, WebP o TIFF."); }

        using (imagen)
        {
            imagen.AutoOrient();                       // respeta la rotación que guardó la cámara
            imagen.Strip();                            // fuera metadatos (incluye GPS)
            imagen.ColorSpace = ColorSpace.sRGB;
            int ancho = (int)imagen.Width, alto = (int)imagen.Height;

            using var mediana = imagen.Clone();
            Achicar(mediana, o.LadoMediana);
            PonerMarca(mediana);
            var salidaMediana = AWebp(mediana, o.CalidadMediana);

            using var mini = imagen.Clone();
            Achicar(mini, o.LadoMiniatura);
            var salidaMini = AWebp(mini, o.CalidadMiniatura);

            return new ImagenProcesada(ancho, alto, ColorMedio(mini), salidaMediana, salidaMini);
        }
    }

    // lado mayor = `lado`; nunca agranda una foto chica
    private static void Achicar(IMagickImage<byte> img, uint lado)
    {
        if (img.Width <= lado && img.Height <= lado) return;
        img.FilterType = FilterType.Lanczos;
        img.Resize(new MagickGeometry(lado, lado) { Greater = true });
    }

    private static MemoryStream AWebp(IMagickImage<byte> img, uint calidad)
    {
        img.Format = MagickFormat.WebP;
        img.Quality = calidad;
        var salida = new MemoryStream();
        img.Write(salida);
        salida.Position = 0;
        return salida;
    }

    /// <summary>Marca repetida en diagonal, muy tenue, más una firma legible abajo a la derecha.</summary>
    private void PonerMarca(IMagickImage<byte> img)
    {
        if (string.IsNullOrWhiteSpace(o.MarcaDeAgua)) return;
        double lado = Math.Min(img.Width, img.Height);
        double cuerpo = Math.Max(14, lado * 0.042);
        byte alfa = (byte)Math.Clamp(o.OpacidadMarca * 255, 0, 255);

        // una baldosa transparente con el texto inclinado, que después se repite sobre toda la foto
        uint anchoBaldosa = (uint)(cuerpo * o.MarcaDeAgua.Length * 0.62), altoBaldosa = (uint)(cuerpo * 5.4);
        using var baldosa = new MagickImage(MagickColors.Transparent, anchoBaldosa, altoBaldosa);
        Texto(baldosa, cuerpo, anchoBaldosa / 2.0 + 1.5, altoBaldosa / 2.0 + 1.5, -24, new MagickColor(0, 0, 0, (byte)(alfa * 0.6)), TextAlignment.Center);
        Texto(baldosa, cuerpo, anchoBaldosa / 2.0, altoBaldosa / 2.0, -24, new MagickColor(255, 255, 255, alfa), TextAlignment.Center);
        img.Tile(baldosa, CompositeOperator.Over);

        // firma
        double chico = Math.Max(13, lado * 0.026), margen = lado * 0.028;
        Texto(img, chico, img.Width - margen + 1, img.Height - margen + 1, 0, new MagickColor(0, 0, 0, 115), TextAlignment.Right);
        Texto(img, chico, img.Width - margen, img.Height - margen, 0, new MagickColor(255, 255, 255, 160), TextAlignment.Right);
    }

    private void Texto(IMagickImage<byte> img, double cuerpo, double x, double y, double giro, MagickColor color, TextAlignment alineacion)
        => new Drawables()
            .Font(_fuente).FontPointSize(cuerpo).FillColor(color).StrokeColor(MagickColors.Transparent)
            .TextAlignment(alineacion).EnableTextAntialias()
            .Translation(x, y).Rotation(giro).Text(0, 0, o.MarcaDeAgua)
            .Draw(img);

    private static string ColorMedio(IMagickImage<byte> img)
    {
        using var punto = img.Clone();
        punto.Resize(new MagickGeometry(1, 1) { IgnoreAspectRatio = true });
        using var pixeles = punto.GetPixels();
        var c = pixeles.GetPixel(0, 0).ToColor()!;
        return $"{c.R},{c.G},{c.B}";
    }
}
