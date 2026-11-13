using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GaleriaCarrizo.Api.Modelos;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace GaleriaCarrizo.Api.Servicios;

public class OpcionesJwt
{
    /// <summary>Texto secreto de al menos 32 caracteres. Va en variable de entorno, nunca en el repositorio.</summary>
    public string Clave { get; set; } = "";
    public string Emisor { get; set; } = "galeria-carrizo";
    public int HorasDeSesion { get; set; } = 12;

    public SymmetricSecurityKey Firma => new(Encoding.UTF8.GetBytes(Clave));
}

/// <summary>Contraseñas (guardadas con hash, nunca en texto) y pases de sesión del panel.</summary>
public class Seguridad(OpcionesJwt jwt)
{
    private readonly PasswordHasher<Administrador> _hasher = new();

    public string Hash(Administrador a, string clave) => _hasher.HashPassword(a, clave);

    public bool Verificar(Administrador a, string clave)
        => _hasher.VerifyHashedPassword(a, a.ClaveHash, clave) != PasswordVerificationResult.Failed;

    public (string Token, DateTime Expira) CrearToken(Administrador a)
    {
        var expira = DateTime.UtcNow.AddHours(jwt.HorasDeSesion);
        var token = new JwtSecurityToken(
            issuer: jwt.Emisor, audience: jwt.Emisor,
            claims: [new Claim(ClaimTypes.NameIdentifier, a.Id.ToString()), new Claim(ClaimTypes.Name, a.Usuario)],
            expires: expira,
            signingCredentials: new SigningCredentials(jwt.Firma, SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), expira);
    }
}
