using GaleriaCarrizo.Api.Datos;
using GaleriaCarrizo.Api.Dtos;
using GaleriaCarrizo.Api.Modelos;
using GaleriaCarrizo.Api.Servicios;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GaleriaCarrizo.Api.Controladores;

/// <summary>Panel: bandeja de consultas.</summary>
[ApiController, Route("api/admin/consultas"), Authorize]
public class AdminConsultasController(GaleriaContext db, IAlmacenamiento almacen) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<ConsultaAdmin>> Listar([FromQuery] string? estado, CancellationToken ct)
    {
        var q = db.Consultas.AsNoTracking().Include(c => c.Foto).AsQueryable();
        if (!string.IsNullOrEmpty(estado)) q = q.Where(c => c.Estado == estado);
        var lista = await q.OrderByDescending(c => c.Creada).Take(500).ToListAsync(ct);
        return lista.Select(c => new ConsultaAdmin(
            c.Id, c.FotoTitulo, c.FotoCodigo, c.Foto?.Slug, c.Foto is null ? null : almacen.UrlPublica(c.Foto.ClaveMiniatura),
            c.Nombre, c.Apellido, c.Telefono, c.Email, c.Uso, UsoPrevisto.Todos.GetValueOrDefault(c.Uso, c.Uso),
            c.Mensaje, c.Estado, c.Creada));
    }

    [HttpGet("resumen")]
    public async Task<object> Resumen(CancellationToken ct)
        => new { nuevas = await db.Consultas.CountAsync(c => c.Estado == EstadoConsulta.Nueva, ct) };

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> CambiarEstado(int id, CambioEstado cambio, CancellationToken ct)
    {
        if (!EstadoConsulta.Todos.Contains(cambio.Estado)) return BadRequest(new { mensaje = "Estado desconocido." });
        var consulta = await db.Consultas.FindAsync([id], ct);
        if (consulta is null) return NotFound();
        consulta.Estado = cambio.Estado;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Borrar(int id, CancellationToken ct)
    {
        var consulta = await db.Consultas.FindAsync([id], ct);
        if (consulta is null) return NotFound();
        db.Consultas.Remove(consulta);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

/// <summary>Panel: colecciones (grupos de fotos).</summary>
[ApiController, Route("api/admin/colecciones"), Authorize]
public class AdminColeccionesController(GaleriaContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IEnumerable<ColeccionDto>> Listar(CancellationToken ct)
        => await db.Colecciones.AsNoTracking().OrderBy(c => c.Orden).ThenBy(c => c.Nombre)
            .Select(c => new ColeccionDto(c.Id, c.Nombre, c.Slug, c.Descripcion, c.Orden, c.Fotos.Count)).ToListAsync(ct);

    [HttpPost]
    public async Task<ActionResult<ColeccionDto>> Crear(ColeccionDatos d, CancellationToken ct)
    {
        var slug = Texto.Slug(d.Nombre);
        if (await db.Colecciones.AnyAsync(c => c.Slug == slug, ct)) return Conflict(new { mensaje = "Ya hay una colección con ese nombre." });
        var c = new Coleccion { Nombre = d.Nombre.Trim(), Slug = slug, Descripcion = d.Descripcion?.Trim(), Orden = (await db.Colecciones.MaxAsync(x => (int?)x.Orden, ct) ?? 0) + 1 };
        db.Colecciones.Add(c);
        await db.SaveChangesAsync(ct);
        return new ColeccionDto(c.Id, c.Nombre, c.Slug, c.Descripcion, c.Orden, 0);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Editar(int id, ColeccionDatos d, CancellationToken ct)
    {
        var c = await db.Colecciones.FindAsync([id], ct);
        if (c is null) return NotFound();
        var slug = Texto.Slug(d.Nombre);
        if (await db.Colecciones.AnyAsync(x => x.Slug == slug && x.Id != id, ct)) return Conflict(new { mensaje = "Ya hay una colección con ese nombre." });
        (c.Nombre, c.Slug, c.Descripcion) = (d.Nombre.Trim(), slug, d.Descripcion?.Trim());
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Borra la colección; sus fotos quedan en la galería, sin colección.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Borrar(int id, CancellationToken ct)
    {
        var c = await db.Colecciones.FindAsync([id], ct);
        if (c is null) return NotFound();
        db.Colecciones.Remove(c);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
