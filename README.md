# Galería Antonio Carrizo

Galería web tipo museo para el fotógrafo Antonio "Mono" Carrizo. Proyecto de VinPath.

## Estructura

```
referencias/            imágenes fuente (sala limpia, referencia con cuadros, muestras)
tools/                  scripts reproducibles (Python)
  generar_sala.py       genera base + máscaras + salaMeta.json + lámina de verificación
  preparar_muestras.py  arma las fotos de muestra (provisorias)
frontend/               React + Vite
  public/sala/          sala-base.webp, sala-base-movil.webp, sala-respaldo.jpg, sala-mascaras.webp
  public/fotos/         fotos de muestra
  src/datos/            fotos.js (títulos, placas y relatos de muestra)
  src/pixi/             pixiConfig.js, salaMeta.json, escena y shaders GLSL (luces, piso, vidrio)
  src/marcos/           un archivo por estilo de marco + registro
  src/componentes/      Cuadro, Placa, Flechas, Loader, PanelConsulta
  src/paginas/          Antesala, Sala, Relato, admin/
backend/                API REST .NET 10 + PostgreSQL (ver backend/README.md)
  src/admin/ (frontend)   panel de administración, en /admin
docs/                   AJUSTES-PIXI.md, investigacion-fotos.md, verificacion-sala.png
```

## Correr el frontend

```
cd frontend
npm install
npm run dev
```

Rutas: `/` antesala, `/sala` galería, `/foto/<id>` relato de una foto (enlace que se puede compartir), `/admin` panel.

Backend: con `VITE_API_URL` definido (ver `frontend/.env.example`) las fotos y las consultas van contra la API. Sin esa variable el sitio corre en modo demostración con las fotos de ejemplo. Cómo levantar el backend: `backend/README.md`.

Ajustes del look: `frontend/src/pixi/pixiConfig.js` (explicados en `docs/AJUSTES-PIXI.md`).

## Regenerar la sala

```
pip install pillow numpy
python tools/generar_sala.py
```

## Estado

- [x] 1. Estructura
- [x] 2. Imagen base y máscaras
- [x] 3. Escena Pixi (luces, piso, vidrio)
- [x] 4. Marcos, vidrio, sombras y placas
- [x] 5. Antesala y transición
- [x] 6. Desliz, flechas, relato y consultas
- [x] 7. Backend, base de datos y panel
- [x] 8. Rendimiento, celulares y accesibilidad (ver `docs/RENDIMIENTO.md`)
