# Rendimiento, celulares y accesibilidad (paso 8)

## Cómo se adapta sola la sala a cada equipo
1. **Arranque:** `calidad.js` elige `alto`, `medio` o `bajo` según núcleos, memoria, si es celular y si el navegador tiene activado "ahorro de datos". Si el equipo ya tuvo que bajar de nivel en una visita anterior, arranca directamente ahí (se recuerda 14 días).
2. **Mientras anda:** si el promedio de FPS cae por debajo del mínimo (`pixiConfig.calidad.autoBajar`), baja **primero la resolución** (×0,8 cada vez, hasta 0,6) y **después** el nivel. Nunca decide en los primeros 2,5 s (compilación de shaders) ni con la pestaña oculta, y un tirón aislado de más de 250 ms no cuenta.
3. **Nivel `bajo`:** imagen base chica, sin reflejo de vidrio en Pixi (queda uno liviano en CSS), piso sin onda ni reflejo de cuadros (`uLigero` en el shader), menos polvo, 30 FPS, marcos y placas con sombras simples, sin animaciones de texto.
4. **Sin WebGL, o si el celular le quita el contexto a la página:** la misma sala quieta (JPG de respaldo); si el contexto vuelve, Pixi retoma solo.
5. Forzar un nivel para probar: `?calidad=alto|medio|bajo`. Probar el respaldo: `?webgl=0`.

## Carga
- Entrada de JavaScript: ~35 kB (13,8 kB comprimido). Pixi, GSAP, Framer Motion y React van en trozos aparte, cacheados un año (`vercel.json`).
- La sala y Pixi se bajan **en paralelo** con la lista de fotos; el panel `/admin` solo se baja si se entra a `/admin`.
- Las tres primeras fotos (y la de la ruta, si se entra directo a `/foto/…`) cargan de entrada; el resto se baja 2,5 s después de que la sala está lista (no con "ahorro de datos").
- Con backend, cada cuadro pide la miniatura o la mediana según su tamaño en pantalla; al abrir el relato pide la mediana.
- La imagen de máscaras se precarga desde el `<head>`.

## Celulares
- Vertical: un cuadro grande al centro, flechas abajo (al alcance del pulgar), relato en el 52 % inferior con scroll propio, consulta como hoja inferior.
- Acostado: dos cuadros enteros y los vecinos asomando; relato a la derecha con letra y botones compactados.
- Respeta el notch y la barra de gestos (`env(safe-area-inset-*)`), no hace zoom al tocar un campo (18 px), no abre el menú "guardar imagen" en iPhone.
- Los cambios de tamaño (barra del navegador, rotación) se agrupan: una medición por cuadro y un reacomodo cada 120 ms.

## Accesibilidad
- Probado con axe-core (WCAG 2.1 AA + buenas prácticas) en antesala, sala, relato y consulta, en cuatro tamaños de pantalla, y en el ingreso del panel: sin violaciones.
- Teclado completo (Tab, flechas, Inicio/Fin, Esc), foco visible, los cuadros fuera de pantalla no se pueden enfocar mientras la antesala está abierta, un aviso para lectores de pantalla dice "Foto 2 de 6: …" al deslizar, y `prefers-reduced-motion` se respeta en todo.
- Mensaje de `<noscript>` si el navegador no tiene JavaScript.
