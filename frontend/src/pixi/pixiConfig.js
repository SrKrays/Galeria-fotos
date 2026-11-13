/**
 * pixiConfig.js — TODOS los números del look de la sala viven acá.
 * Cambiá un valor, guardá, y Vite recarga solo. No hace falta tocar shaders.
 * Qué hace cada valor: ver docs/AJUSTES-PIXI.md
 */
export const pixiConfig = {
  // ───────────── recursos (se cargan todos juntos) ─────────────
  recursos: {
    base: '/sala/sala-base.webp',
    baseMovil: '/sala/sala-base-movil.webp',
    mascaras: '/sala/sala-mascaras.webp',
    respaldo: '/sala/sala-respaldo.jpg',
  },

  // ───────────── 1) luces ─────────────
  luces: {
    intensidad: 1.0,          // brillo general de todos los focos
    ambiente: 1.0,            // brillo de la pared fuera de los conos
    calidez: 0.06,            // dorado extra que suma la luz al subir
    color: [1.0, 0.72, 0.38], // tinte de ese dorado (RGB 0..1)
    respiracion: {
      amplitud: 0.07,         // cuánto sube y baja (0.07 = ±7 %)
      velocidad: 0.22,        // ciclos lentos por segundo
      irregularidad: 0.45,    // 0 = onda perfecta, 1 = muy irregular
    },
    parpadeo: {
      cadaSegundos: 38,       // promedio entre parpadeos de UN foco
      profundidad: 0.10,      // cuánto cae la luz (0.10 = 10 %)
      duracion: 0.28,         // segundos
    },
    foco: {
      realce: 0.30,           // cuánto sube el foco del cuadro activo
      atenuarOtros: 0.14,     // cuánto bajan los demás
      suavidad: 3.2,          // velocidad del cambio (más = más rápido)
    },
    // vista de relato: el resto de la sala se apaga
    relato: { ambiente: 0.30, otrosFocos: 0.35, realce: 0.45 },
  },

  // ───────────── polvo en los haces ─────────────
  polvo: {
    porFoco: { alto: 34, medio: 20, bajo: 8 }, // partículas por foco visible
    tamano: [0.6, 1.9],       // px mínimo y máximo
    brillo: 0.55,             // opacidad máxima
    velocidad: 0.006,         // deriva vertical (fracción del alto por segundo)
    vaiven: 0.004,            // balanceo horizontal
    aperturaCono: 0.44,       // qué tan rápido se abre el haz hacia abajo
    anchoArriba: 0.03,        // medio ancho del haz a la altura de la lámpara
    centelleo: 0.35,          // variación de brillo de cada partícula
  },

  // ───────────── 2) reflejo del piso ─────────────
  piso: {
    fuerza: 1.0,              // brillo de los reflejos dorados
    seguirLuz: 1.0,           // cuánto copia la respiración del foco
    ondulacion: 0.0012,       // amplitud de la onda en reposo
    ondulacionAlDeslizar: 0.0035, // amplitud extra según la velocidad
    frecuencia: 9.0,          // cantidad de ondas hacia el fondo
    velocidadOnda: 0.35,
    retraso: 0.10,            // segundos que el reflejo "llega tarde" al deslizar
    reflejoCuadro: 0.85,      // opacidad del reflejo de cada cuadro (paso 4)
  },

  // ───────────── 3) reflejo del vidrio ─────────────
  vidrio: {
    brillo: 0.20,             // opacidad máxima del reflejo (sutil: 0.15–0.25)
    deriva: 0.012,            // velocidad del paseo diagonal en reposo
    recorridoDeriva: 0.10,    // cuánto se mueve en ese paseo
    porDesliz: 0.22,          // cuánto se corre al deslizar la galería
    porMouse: 0.16,           // cuánto se corre con el mouse encima
    porGiro: 0.20,            // celular: cuánto se corre al inclinarlo
    velo: 0.035,              // brillo parejo muy leve de todo el vidrio
    calmaEnRelato: 0.35,      // multiplicador del brillo en la vista de relato
    color: [1.0, 0.96, 0.88],
  },

  // ───────────── cámara / transiciones ─────────────
  camara: {
    duracionEntrada: 1.2,     // segundos de la transición antesala -> sala
    zoomEntrada: 1.16,        // cuánto avanza la cámara hacia la pared
    oscuridadPaso: 0.08,      // qué tan oscuro queda el instante del "paso" (0 = negro)
  },

  // ───────────── desliz de la galería (GSAP) ─────────────
  desliz: {
    planeo: 0.28,             // segundos de impulso que conserva al soltar (más = llega más lejos)
    duracionMin: 0.5,         // el acomodo final nunca dura menos que esto…
    duracionMax: 1.3,         // …ni más que esto
    duracionFlecha: 0.8,      // segundos por paso con flechas o teclado
    resistencia: 0.35,        // qué tanto "cede" al tirar más allá de la primera o la última foto
    inercia: 0.92, iman: 0.08, // solo para el banco de pruebas (?prueba=1)
  },

  // ───────────── vista de relato ─────────────
  relato: {
    duracionAbrir: 0.95,      // segundos del zoom al cuadro
    duracionCerrar: 0.8,
    zoomMax: 2.6,             // tope de cuánto crece el cuadro
  },

  // ───────────── calidad ─────────────
  calidad: {
    alto:  { resolucionMax: 2.0,  fps: 60, vidrio: true,  baseMovil: false },
    medio: { resolucionMax: 1.25, fps: 60, vidrio: true,  baseMovil: false },
    bajo:  { resolucionMax: 0.85, fps: 30, vidrio: false, baseMovil: true  },
    // si los FPS promedio caen por debajo de esto durante `ventana` segundos, baja:
    // primero la resolución (de a `paso`, hasta `factorMin`), recién después el nivel de calidad
    autoBajar: { fpsMinimo: 42, ventana: 2.5, calentamiento: 2.5, paso: 0.8, factorMin: 0.6 },
  },

  // movimiento reducido (prefers-reduced-motion): multiplicadores
  movimientoReducido: { respiracion: 0.25, parpadeo: 0, polvo: 0.2, ondulacion: 0, derivaVidrio: 0 },
};

export default pixiConfig;
