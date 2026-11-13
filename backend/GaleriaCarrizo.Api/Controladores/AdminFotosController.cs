using GaleriaCarrizo.Api.Datos;
using GaleriaCarrizo.Api.Dtos;
using GaleriaCarrizo.Api.Modelos;
using GaleriaCarrizo.Api.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GaleriaCarrizo.Api.Controladores;

/// <summary>Panel: alta, edición, orden y baja de fotos. Requiere sesión.</summary>
[ApiController, Route("api/admin/fotos"), Authorize]
public class AdminFotosController(
    GaleriaContext db, IAlmacenamiento almacen, ProcesadorImagenes procesador, OpcionesImagenes opciones,
    ILogger<AdminFotosController> log) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<FotoAdmin>> Listar(CancellationToken ct)
    {
        var fotos = await db.Fotos.AsNoTracking().Include(f => f.Relato).OrderBy(f => f.Orden).ThenBy(f => f.Id).ToListAsync(ct);
        return fotos.Select(f => f.AAdmin(almacen));
    }

    /// <summary>Sube una foto: guarda la original en privado y genera mediana (con marca de agua) y miniatura.</summary>
    [HttpPost, RequestSizeLimit(60 * 1024 * 1024)]
    public async Task<ActionResult<FotoAdmin>> Crear([FromForm] FotoNueva datos, CancellationToken ct)
    {
        if (await Validar(datos, ct) is { } error) return error;
        var foto = new Foto { Slug = await SlugLibre(datos.Titulo, null, ct), Orden = (await db.Fotos.MaxAsync(f => (int?)f.Orden, ct) ?? 0) + 1 };
        Aplicar(foto, datos);
        if (await GuardarImagen(foto, datos.Archivo!, ct) is { } falla) return falla;
        db.Fotos.Add(foto);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Listar), foto.AAdmin(almacen));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<FotoAdmin>> Editar(int id, FotoDatos datos, CancellationToken ct)
    {
        var foto = await db.Fotos.Include(f => f.Relato).FirstOrDefaultAsync(f => f.Id == id, ct);
        if (foto is null) return NotFound();
        if (await Validar(datos, ct) is { } error) return error;
        Aplicar(foto, datos);
        foto.Actualizada = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return foto.AAdmin(almacen);
    }

    /// <summary>Cambia el archivo de una foto ya cargada (por ejemplo, por un escaneo mejor).</summary>
    [HttpPut("{id:int}/imagen"), RequestSizeLimit(60 * 1024 * 1024)]
    public async Task<ActionResult<FotoAdmin>> CambiarImagen(int id, IFormFile archivo, CancellationToken ct)
    {
        var foto = await db.Fotos.Include(f => f.Relato).FirstOrDefaultAsync(f => f.Id == id, ct);
        if (foto is null) return NotFound();
        string[] viejas = [foto.ClaveOriginal, foto.ClaveMediana, foto.ClaveMiniatura];
        if (await GuardarImagen(foto, archivo, ct) is { } falla) return falla;
        foto.Actualizada = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await BorrarArchivos(viejas[0], viejas[1], viejas[2]);
        return foto.AAdmin(almacen);
    }

    /// <summary>Recibe los ids en el orden nuevo (de izquierda a derecha en la sala).</summary>
    [HttpPut("orden")]
    public async Task<IActionResult> Ordenar(int[] ids, CancellationToken ct)
    {
        var fotos = await db.Fotos.ToListAsync(ct);
        var puesto = ids.Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i + 1);
        foreach (var f in fotos) f.Orden = puesto.TryGetValue(f.Id, out var o) ? o : ids.Length + f.Orden;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Borrar(int id, CancellationToken ct)
    {
        var foto = await db.Fotos.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (foto is null) return NotFound();
        db.Fotos.Remove(foto);
        await db.SaveChangesAsync(ct);
        await BorrarArchivos(foto.ClaveOriginal, foto.ClaveMediana, foto.ClaveMiniatura);
        return NoContent();
    }

    // ───────────── ayudas ─────────────
    private async Task<ActionResult?> Validar(FotoDatos d, CancellationToken ct)
    {
        if (!await db.EstilosMarco.AnyAsync(m => m.Id == d.Marco && m.Activo, ct)) ModelState.AddModelError(nameof(d.Marco), "Ese marco no existe.");
        if (d.ColeccionId is { } c && !await db.Colecciones.AnyAsync(x => x.Id == c, ct)) ModelState.AddModelError(nameof(d.ColeccionId), "Esa colección no existe.");
        return ModelState.IsValid ? null : ValidationProblem(ModelState);
    }

    private static void Aplicar(Foto f, FotoDatos d)
    {
        f.Titulo = d.Titulo.Trim();
        f.Anio = d.Anio;
        f.Lugar = d.Lugar?.Trim() ?? "";
        f.Gancho = d.Gancho?.Trim() ?? "";
        f.Alt = d.Alt?.Trim() ?? "";
        f.Credito = string.IsNullOrWhiteSpace(d.Credito) ? null : d.Credito.Trim();
        f.MarcoId = d.Marco;
        f.ColeccionId = d.ColeccionId;
        f.Publicada = d.Publicada;
        f.Relato ??= new Relato();
        f.Relato.Texto = d.Relato?.Trim() ?? "";
        f.Relato.Actualizado = DateTime.UtcNow;
    }

    private async Task<string> SlugLibre(string titulo, int? propioId, CancellationToken ct)
    {
        var baseSlug = Texto.Slug(titulo);
        var slug = baseSlug;
        for (var n = 2; await db.Fotos.AnyAsync(f => f.Slug == slug && f.Id != propioId, ct); n++) slug = $"{baseSlug}-{n}";
        return slug;
    }

    private async Task<ActionResult?> GuardarImagen(Foto foto, IFormFile archivo, CancellationToken ct)
    {
        if (archivo.Length == 0) return BadRequest(new { mensaje = "El archivo está vacío." });
        if (archivo.Length > opciones.PesoMaximoBytes)
            return BadRequest(new { mensaje = $"La foto pesa demasiado. El máximo es {opciones.PesoMaximoBytes / 1024 / 1024} MB." });

        await using var original = new MemoryStream();
        await archivo.CopyToAsync(original, ct);
        original.Position = 0;
        ImagenProcesada img;
        try { img = await Task.Run(() => procesador.Procesar(original), ct); }   // trabajo pesado: fuera del hilo del pedido
        catch (ImagenInvalidaException e) { return BadRequest(new { mensaje = e.Message }); }

        // nombres al azar: nadie puede adivinar una URL a partir de otra
        var id = Guid.NewGuid().ToString("N");
        var extension = Path.GetExtension(archivo.FileName).ToLowerInvariant();
        if (extension.Length is 0 or > 6) extension = ".bin";
        var (claveOriginal, claveMediana, claveMini) = ($"originales/{id}{extension}", $"fotos/{id}-m.webp", $"fotos/{id}-s.webp");

        original.Position = 0;
        await almacen.GuardarPrivadoAsync(claveOriginal, original, archivo.ContentType, ct);
        await using (img.Mediana) await almacen.GuardarPublicoAsync(claveMediana, img.Mediana, "image/webp", ct);
        await using (img.Miniatura) await almacen.GuardarPublicoAsync(claveMini, img.Miniatura, "image/webp", ct);

        (foto.ClaveOriginal, foto.ClaveMediana, foto.ClaveMiniatura) = (claveOriginal, claveMediana, claveMini);
        (foto.Ancho, foto.Alto, foto.ColorMedio) = (img.Ancho, img.Alto, img.ColorMedio);
        return null;
    }

    private async Task BorrarArchivos(string original, string mediana, string mini)
    {
        try
        {
            if (original != "") await almacen.BorrarPrivadoAsync(original);
            if (mediana != "") await almacen.BorrarPublicoAsync(mediana);
            if (mini != "") await almacen.BorrarPublicoAsync(mini);
        }
        catch (Exception e) { log.LogWarning(e, "No se pudieron borrar archivos viejos del almacén"); }
    }
}
