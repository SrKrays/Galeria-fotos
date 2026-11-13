using System.Threading.RateLimiting;
using GaleriaCarrizo.Api.Datos;
using GaleriaCarrizo.Api.Modelos;
using GaleriaCarrizo.Api.Servicios;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ───────────── configuración ─────────────
// Todo lo secreto llega por variables de entorno (ver backend/.env.example). Nada de eso va al repositorio.
var jwt = config.GetSection("Jwt").Get<OpcionesJwt>() ?? new();
if (jwt.Clave.Length < 32)
    throw new InvalidOperationException("Falta Jwt__Clave (mínimo 32 caracteres). Ver backend/.env.example.");
var almacen = config.GetSection("Almacenamiento").Get<OpcionesAlmacenamiento>() ?? new();
var imagenes = config.GetSection("Imagenes").Get<OpcionesImagenes>() ?? new();

builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton(almacen);
builder.Services.AddSingleton(imagenes);
builder.Services.AddSingleton<Seguridad>();
builder.Services.AddSingleton<ProcesadorImagenes>();
if (almacen.Tipo.Equals("r2", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<IAlmacenamiento, AlmacenamientoR2>();
else
    builder.Services.AddSingleton<IAlmacenamiento, AlmacenamientoLocal>();

builder.Services.AddDbContext<GaleriaContext>(o => o.UseNpgsql(CadenaDeConexion(config)));
builder.Services.AddControllers();
builder.Services.AddProblemDetails();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = jwt.Emisor, ValidAudience = jwt.Emisor, IssuerSigningKey = jwt.Firma,
        ValidateIssuerSigningKey = true, ClockSkew = TimeSpan.FromMinutes(1),
    };
});
builder.Services.AddAuthorization();

// solo el sitio de la galería puede llamar a la API desde un navegador
var origenes = (config["Cors:Origenes"] ?? "http://localhost:5173").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));

// freno a abusos: pocos intentos de ingreso y pocas consultas por persona
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    static string Ip(HttpContext c) => c.Connection.RemoteIpAddress?.ToString() ?? "desconocida";
    o.AddPolicy("ingreso", c => RateLimitPartition.GetFixedWindowLimiter(Ip(c), _ => new() { PermitLimit = 6, Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("consultas", c => RateLimitPartition.GetFixedWindowLimiter(Ip(c), _ => new() { PermitLimit = 5, Window = TimeSpan.FromMinutes(10) }));
});

// Render pone un proxy delante: así se conoce la IP real de quien llama
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear(); o.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

// desarrollo: las derivadas se sirven desde la carpeta local. Las originales (privado/) NO se sirven nunca.
if (app.Services.GetRequiredService<IAlmacenamiento>() is AlmacenamientoLocal local)
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(local.CarpetaPublica), RequestPath = "/archivos",
        OnPrepareResponse = c => c.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable",
    });
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await PrepararBase(app);
app.Run();

// ───────────── ayudas ─────────────

// Acepta la cadena clásica de Npgsql o la URL que entrega Render (postgres://usuario:clave@host:puerto/base)
static string CadenaDeConexion(IConfiguration config)
{
    var valor = config["DATABASE_URL"] ?? config.GetConnectionString("Galeria")
        ?? throw new InvalidOperationException("Falta la base de datos: DATABASE_URL o ConnectionStrings__Galeria.");
    if (!valor.StartsWith("postgres://") && !valor.StartsWith("postgresql://")) return valor;
    var uri = new Uri(valor);
    var partes = uri.UserInfo.Split(':', 2);
    return $"Host={uri.Host};Port={(uri.Port > 0 ? uri.Port : 5432)};Database={uri.AbsolutePath.TrimStart('/')};" +
           $"Username={Uri.UnescapeDataString(partes[0])};Password={Uri.UnescapeDataString(partes.ElementAtOrDefault(1) ?? "")};" +
           "SSL Mode=Prefer;Trust Server Certificate=true";
}

// Crea o actualiza las tablas y, si todavía no hay ningún administrador, crea el primero
static async Task PrepararBase(WebApplication app)
{
    using var ambito = app.Services.CreateScope();
    var db = ambito.ServiceProvider.GetRequiredService<GaleriaContext>();
    await db.Database.MigrateAsync();

    if (await db.Administradores.AnyAsync()) return;
    var usuario = app.Configuration["Admin:Usuario"]?.Trim().ToLowerInvariant();
    var clave = app.Configuration["Admin:Clave"];
    if (string.IsNullOrEmpty(usuario) || string.IsNullOrEmpty(clave) || clave.Length < 10)
    {
        app.Logger.LogWarning("No hay administrador. Definí Admin__Usuario y Admin__Clave (10 caracteres o más) y reiniciá.");
        return;
    }
    var admin = new Administrador { Usuario = usuario };
    admin.ClaveHash = ambito.ServiceProvider.GetRequiredService<Seguridad>().Hash(admin, clave);
    db.Administradores.Add(admin);
    await db.SaveChangesAsync();
    app.Logger.LogInformation("Administrador '{Usuario}' creado.", usuario);
}
