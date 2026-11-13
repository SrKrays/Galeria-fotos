# Backend — Galería Antonio Carrizo

API REST en .NET 10 con PostgreSQL. Guarda fotos, relatos, colecciones y consultas, y procesa las imágenes al subirlas.

## Correr en tu PC

Necesitás el SDK de .NET 10 y PostgreSQL.

1. Creá una base vacía llamada `galeria`.
2. Copiá `.env.example` como `.env` y completá la clave de Postgres, `Jwt__Clave` y `Admin__Clave`.
3. Desde `backend/GaleriaCarrizo.Api`, cargá las variables y corré.

PowerShell:

```powershell
Get-Content ..\.env | Where-Object { $_ -match '^[^#].*=' } | ForEach-Object { $k, $v = $_ -split '=', 2; Set-Item "Env:$k" $v }
dotnet run --urls http://localhost:5080
```

Al arrancar crea las tablas solo y, si no hay ningún usuario, crea el administrador con `Admin__Usuario` y `Admin__Clave`.

4. En `frontend/.env` poné `VITE_API_URL=http://localhost:5080` y corré `npm run dev`. El panel queda en `http://localhost:5173/admin`.

## Qué hace con cada foto

| Versión | Dónde queda | Quién la ve |
|---|---|---|
| Original, tal cual se subió | Almacén privado | Nadie desde el sitio. No tiene URL pública. |
| Mediana: 1800 px, marca de agua, WebP | Almacén público | El sitio, en los cuadros y el relato |
| Miniatura: 480 px, WebP | Almacén público | El sitio en pantallas chicas y el panel |

A las versiones públicas se les quitan los metadatos (cámara, fecha, GPS). Acepta JPG, PNG, WebP y TIFF de hasta 40 MB.

## Rutas

Públicas:

| Ruta | Qué hace |
|---|---|
| `GET /api/fotos` | Fotos publicadas, en orden |
| `GET /api/marcos` | Estilos de marco |
| `POST /api/consultas` | Recibe una consulta (máximo 5 cada 10 minutos por persona) |
| `GET /api/salud` | Para saber si el servicio está vivo |

Del panel (requieren sesión):

| Ruta | Qué hace |
|---|---|
| `POST /api/auth/ingresar` | Devuelve el pase de sesión (dura 12 horas) |
| `GET, POST /api/admin/fotos` | Listar y subir |
| `PUT, DELETE /api/admin/fotos/{id}` | Editar datos y borrar |
| `PUT /api/admin/fotos/{id}/imagen` | Cambiar el archivo |
| `PUT /api/admin/fotos/orden` | Reordenar |
| `GET, PATCH, DELETE /api/admin/consultas` | Bandeja de consultas |
| `GET, POST, PUT, DELETE /api/admin/colecciones` | Colecciones |

## Tablas

`fotos`, `relatos`, `colecciones`, `estilos_marco`, `consultas`, `administradores`. Los cambios de estructura se hacen con migraciones:

```
dotnet ef migrations add NombreDelCambio -o Datos/Migraciones
```

## Subir a Render

1. Creá una base PostgreSQL en Render.
2. Creá un Web Service con Docker, carpeta raíz `backend`.
3. Cargá las variables de `.env.example`: `DATABASE_URL` (la Internal Database URL), `Jwt__Clave`, `Admin__Usuario`, `Admin__Clave`, `Cors__Origenes` (la dirección del sitio en Vercel) y las de `Almacenamiento__*` con `Tipo=r2`.
4. En Vercel, definí `VITE_API_URL` con la dirección del servicio de Render.

## Cloudflare R2

Dos buckets: uno privado para las originales y uno público para las versiones con marca de agua. Al público se le conecta un dominio (o la dirección `r2.dev`) y esa dirección va en `Almacenamiento__UrlPublica`. El token de R2 necesita permiso de lectura y escritura sobre los dos.

## Librerías

- Magick.NET (Apache 2.0) para las imágenes.
- AWSSDK.S3 para hablar con R2.
- La tipografía de la marca de agua es Cormorant Garamond (licencia OFL, incluida en `Recursos/`).
