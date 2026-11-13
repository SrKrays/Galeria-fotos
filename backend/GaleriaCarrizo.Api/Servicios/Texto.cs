using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace GaleriaCarrizo.Api.Servicios;

public static partial class Texto
{
    /// <summary>"Las tres manos del Papa" -> "las-tres-manos-del-papa"</summary>
    public static string Slug(string texto)
    {
        var sinAcentos = new StringBuilder();
        foreach (var c in texto.Normalize(NormalizationForm.FormD))
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) sinAcentos.Append(c);
        var slug = NoAlfanumerico().Replace(sinAcentos.ToString().ToLowerInvariant(), "-").Trim('-');
        return slug.Length == 0 ? "foto" : slug[..Math.Min(slug.Length, 100)];
    }

    /// <summary>Parte el relato en párrafos (separados por una o más líneas en blanco).</summary>
    public static string[] Parrafos(string? texto)
        => string.IsNullOrWhiteSpace(texto) ? [] : LineaEnBlanco().Split(texto.Trim()).Select(p => p.Trim()).Where(p => p.Length > 0).ToArray();

    [GeneratedRegex("[^a-z0-9]+")] private static partial Regex NoAlfanumerico();
    [GeneratedRegex(@"(\r?\n\s*){2,}")] private static partial Regex LineaEnBlanco();
}
