using GaleriaCarrizo.Api.Datos;
using GaleriaCarrizo.Api.Dtos;
using GaleriaCarrizo.Api.Modelos;
using GaleriaCarrizo.Api.Servicios;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace GaleriaCarrizo.Api.Controladores;

/// <summary>Lo que usa el sitio público: ver las fotos y enviar una consulta. No requiere sesión.</summary>
[ApiController, Route("api")]
public class PublicoController(GaleriaContext db, IAlmacenamiento almacen, ILogger<PublicoController> log) : ControllerBase
{
    [HttpGet("salud")]
    public IActionResult Salud() => Ok(new { ok = true });

    /// <summary>Las fotos publicadas, en el orden en que cuelgan en la sala.</summary>
    [HttpGet("fotos")]
    public async Task<IEnumerable<FotoPublica>> Fotos(CancellationToken ct)
    {
        var fotos = await db.Fotos.AsNoTracking()
            .Include(f => f.Relato).Include(f => f.Coleccion)
            .Where(f => f.Publicada).OrderBy(f => f.Orden).ThenBy(f => f.Id)
            .ToListAsync(ct);
        return fotos.Select(f => f.APublica(almacen));
    }

    [HttpGet("marcos")]
    public async Task<IEnumerable<EstiloMarco>> Marcos(CancellationToken ct)
        => await db.EstilosMarco.AsNoTracking().Where(m => m.Activo).OrderBy(m => m.Orden).ToListAsync(ct);

    [HttpPost("consultas"), EnableRateLimiting("consultas")]
    public async Task<IActionResult> Consultar(ConsultaNueva c, CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(c.Sitio)) return StatusCode(201);        // bot: se le dice que sí y no se guarda nada
        if (string.IsNullOrWhiteSpace(c.Telefono) && string.IsNullOrWhiteSpace(c.Email))
            ModelState.AddModelError("contacto", "Dejá un teléfono o un email para poder responderte.");
        // el email es opcional: solo se revisa si vino con algo
        if (!string.IsNullOrWhiteSpace(c.Email) && !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(c.Email.Trim()))
            ModelState.AddModelError(nameof(c.Email), "El email no parece válido.");
        if (!UsoPrevisto.Todos.ContainsKey(c.Uso)) ModelState.AddModelError(nameof(c.Uso), "Elegí para qué necesitás la foto.");
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var foto = await db.Fotos.FirstOrDefaultAsync(f => f.Slug == c.FotoId && f.Publicada, ct);
        if (foto is null) return NotFound(new { mensaje = "Esa foto ya no está en la galería." });

        db.Consultas.Add(new Consulta
        {
            FotoId = foto.Id, FotoTitulo = foto.Titulo, FotoCodigo = foto.Codigo,
            Nombre = c.Nombre.Trim(), Apellido = c.Apellido.Trim(),
            Telefono = c.Telefono?.Trim() ?? "", Email = c.Email?.Trim() ?? "",
            Uso = c.Uso, Mensaje = c.Mensaje?.Trim() ?? "",
        });
        await db.SaveChangesAsync(ct);
        log.LogInformation("Consulta nueva por {Codigo}", foto.Codigo);
        return StatusCode(201, new { ok = true });
    }
}
