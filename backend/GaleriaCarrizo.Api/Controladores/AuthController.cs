using GaleriaCarrizo.Api.Datos;
using GaleriaCarrizo.Api.Dtos;
using GaleriaCarrizo.Api.Servicios;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace GaleriaCarrizo.Api.Controladores;

[ApiController, Route("api/auth")]
public class AuthController(GaleriaContext db, Seguridad seguridad) : ControllerBase
{
    /// <summary>Ingreso al panel. Limitado a pocos intentos por minuto para frenar pruebas de contraseñas.</summary>
    [HttpPost("ingresar"), EnableRateLimiting("ingreso")]
    public async Task<ActionResult<Sesion>> Ingresar(Ingreso datos, CancellationToken ct)
    {
        var usuario = datos.Usuario.Trim().ToLowerInvariant();
        var admin = await db.Administradores.FirstOrDefaultAsync(a => a.Usuario == usuario, ct);
        // mismo mensaje si falla el usuario o la clave: no se revela cuál de los dos está mal
        if (admin is null || !seguridad.Verificar(admin, datos.Clave))
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });

        admin.UltimoIngreso = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        var (token, expira) = seguridad.CrearToken(admin);
        return new Sesion(token, expira, admin.Usuario);
    }
}
