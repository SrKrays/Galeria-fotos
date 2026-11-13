# Ajustes de la sala (Pixi)

Todos los números están en `frontend/src/pixi/pixiConfig.js`. Con `npm run dev` abierto, cambiás un valor, guardás y se recarga solo. No hace falta tocar los shaders.

## Luces (`luces`)

| Valor | Qué hace | Probá |
|---|---|---|
| `intensidad` | Brillo general de todos los focos. | 0.8 a 1.2 |
| `ambiente` | Brillo de la pared fuera de los conos. Menos = sala más dramática. | 0.7 a 1.1 |
| `calidez`, `color` | Dorado extra que aparece cuando un foco sube. | 0 a 0.15 |
| `respiracion.amplitud` | Cuánto sube y baja la luz. 0.07 = ±7 %. Casi no se tiene que notar. | 0.03 a 0.10 |
| `respiracion.velocidad` | Ciclos por segundo. | 0.15 a 0.35 |
| `respiracion.irregularidad` | 0 = onda perfecta; 1 = muy despareja. | 0.3 a 0.6 |
| `parpadeo.cadaSegundos` | Promedio de segundos entre parpadeos de un foco. Más alto = más raro. | 25 a 90 |
| `parpadeo.profundidad` | Cuánto cae la luz en el parpadeo. Más de 0.2 ya parece falla eléctrica. | 0.06 a 0.14 |
| `parpadeo.duracion` | Segundos que dura. | 0.2 a 0.4 |
| `foco.realce` | Cuánto sube el foco del cuadro activo (mouse encima o centrado en celular). | 0.2 a 0.45 |
| `foco.atenuarOtros` | Cuánto bajan los demás focos. | 0.08 a 0.25 |
| `foco.suavidad` | Velocidad del cambio. Más alto = más rápido. | 2 a 5 |
| `relato.*` | Vista de relato: brillo del resto de la sala, de los otros focos y realce del foco del cuadro abierto. | n/a |

## Polvo (`polvo`)

| Valor | Qué hace |
|---|---|
| `porFoco` | Partículas por foco visible, según calidad (alto / medio / bajo). |
| `tamano` | Tamaño mínimo y máximo en px. |
| `brillo` | Opacidad máxima. Subilo si no se ve; bajalo si distrae. |
| `velocidad` | Qué tan rápido suben y bajan. |
| `vaiven` | Balanceo lateral. |
| `aperturaCono`, `anchoArriba` | Forma del haz donde el polvo se ilumina. Solo tocar si cambia la imagen de la sala. |
| `centelleo` | Cuánto titila cada partícula. |

## Piso (`piso`)

| Valor | Qué hace |
|---|---|
| `fuerza` | Brillo de los reflejos dorados. |
| `seguirLuz` | 1 = el reflejo respira igual que su foco; 0 = queda quieto. |
| `ondulacion` | Onda del reflejo en reposo. 0 la apaga. |
| `ondulacionAlDeslizar` | Onda extra mientras se desliza la galería. |
| `frecuencia`, `velocidadOnda` | Cantidad de ondas y qué tan rápido corren. |
| `retraso` | Segundos que el reflejo "llega tarde" al deslizar (piso apenas húmedo). 0 = pegado. |
| `reflejoCuadro` | Fuerza del reflejo de cada cuadro en el piso. Toma el color de la foto y del marco. 0 lo apaga. |

El reflejo nunca invade la pared ni el zócalo: lo limita el canal G de la máscara.

## Vidrio (`vidrio`)

| Valor | Qué hace |
|---|---|
| `brillo` | Opacidad máxima del reflejo. Es además el tope: el reflejo nunca supera `brillo + velo`, así no tapa la foto. Sutil: 0.15 a 0.25. |
| `deriva`, `recorridoDeriva` | Paseo lento en diagonal cuando nadie toca nada: velocidad y distancia. |
| `porDesliz` | Cuánto se corre el reflejo al deslizar la galería. |
| `porMouse` | Cuánto se corre con el mouse encima del cuadro. |
| `porGiro` | Celular: cuánto se corre al inclinar el teléfono. |
| `velo` | Brillo parejo muy leve en la parte de arriba del vidrio. |
| `calmaEnRelato` | Multiplicador del brillo en la vista de relato. |
| `color` | Tinte del reflejo. |

La forma de las bandas del reflejo (posición, ancho) está en `tools/generar_sala.py`, en `BANDAS_VIDRIO`. Después de cambiarla, corré el script.

## Entrada desde la antesala (`camara`)

| Valor | Qué hace |
|---|---|
| `duracionEntrada` | Segundos que dura la transición al hacer clic. |
| `zoomEntrada` | Cuánto avanza la cámara hacia la pared. 1 = sin avance. |
| `oscuridadPaso` | Qué tan oscura queda la sala en el instante en que se "cruza" a la galería. |

## Desliz de la galería (`desliz`)

| Valor | Qué hace |
|---|---|
| `planeo` | Cuánto impulso conserva al soltar el dedo o el mouse. Más alto = llega más lejos. |
| `duracionMin`, `duracionMax` | Límites de cuánto tarda en acomodarse sobre un cuadro. |
| `duracionFlecha` | Segundos que tarda cada paso con las flechas, el teclado o la rueda. |
| `resistencia` | Qué tanto cede al tirar más allá de la primera o la última foto. |

## Vista de relato (`relato`)

| Valor | Qué hace |
|---|---|
| `duracionAbrir`, `duracionCerrar` | Segundos del zoom al cuadro y de la vuelta a la sala. |
| `zoomMax` | Tope de cuánto puede crecer el cuadro. |

Qué tan oscura queda la sala en relato está en `luces.relato`.

## Calidad (`calidad`)

| Nivel | Resolución máx. | FPS | Vidrio con shader | Base |
|---|---|---|---|---|
| `alto` | 2× | 60 | sí | completa |
| `medio` | 1.25× | 60 | sí | completa |
| `bajo` | 0.85× | 30 | no | liviana |

- El nivel se elige solo según núcleos, memoria y si es celular (`calidad.js`).
- `autoBajar`: si los FPS promedio quedan debajo de `fpsMinimo` durante `ventana` segundos, baja un nivel solo.
- Sin WebGL se muestra `sala-respaldo.jpg`, quieta.

## Movimiento reducido (`movimientoReducido`)

Multiplicadores que se aplican si el usuario tiene activada la preferencia del sistema: respiración al 25 %, sin parpadeo, polvo casi quieto, sin ondulación del piso y sin deriva del vidrio.

## Para probar

| URL | Efecto |
|---|---|
| `?calidad=alto` / `medio` / `bajo` | Fuerza un nivel (y desactiva la bajada automática). |
| `?webgl=0` | Simula un equipo sin WebGL. |
| `?vidrios=1` | Muestra vidrios de prueba bajo cada foco. |
| `?relato=1` | Arranca en modo relato. |

Teclas en la sala de prueba: flechas para deslizar, `V` vidrios, `R` relato, `1` `2` `3` calidad.

## Marcos

Los marcos no están en `pixiConfig.js` porque son HTML y CSS:

- Medidas (grosor de moldura, paspartú, color del reflejo en el piso): `frontend/src/marcos/index.js`.
- Aspecto de cada estilo: un archivo por marco en `frontend/src/marcos/` (`dorado.css`, `negro.css`, `madera.css`, `plateado.css`).
- Para sumar un estilo: crear `<id>.css` con la clase `.marco--<id>` y agregar una entrada en `index.js`.
