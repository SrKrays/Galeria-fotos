// calidad.js — elige el nivel de calidad (alto / medio / bajo) según el dispositivo.
// Se puede forzar con ?calidad=alto|medio|bajo en la URL.

export const NIVELES = ['alto', 'medio', 'bajo'];

export function movimientoReducido() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function calidadForzada() {
  const forzada = new URLSearchParams(location.search).get('calidad');
  return NIVELES.includes(forzada) ? forzada : null;
}

const CLAVE = 'galeria.calidad';

/** Lo que el equipo ya demostró que aguanta: la próxima visita arranca ahí y no pasa por el tirón de bajar. */
export function recordarCalidad(nivel) {
  try { localStorage.setItem(CLAVE, JSON.stringify({ nivel, hasta: Date.now() + 14 * 864e5 })); } catch { /* modo privado */ }
}
function calidadRecordada() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    return g && NIVELES.includes(g.nivel) && g.hasta > Date.now() ? g.nivel : null;
  } catch { return null; }
}

export function detectarCalidad() {
  const forzada = calidadForzada();
  if (forzada) return forzada;

  const guardada = calidadRecordada();
  const aprox = ((navigator.connection || {}).saveData) ? 'bajo' : null;   // "ahorro de datos" activado
  const inicial = detectarPorEquipo();
  const peor = [guardada, aprox, inicial].filter(Boolean).sort((a, b) => NIVELES.indexOf(b) - NIVELES.indexOf(a))[0];
  return peor;
}

function detectarPorEquipo() {
  const nucleos = navigator.hardwareConcurrency || 4;
  const memoria = navigator.deviceMemory || 4;          // GB (solo Chrome/Android)
  const movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (memoria <= 2 || nucleos <= 2) return 'bajo';
  if (movil && (memoria <= 4 || nucleos <= 6)) return 'medio';
  if (!movil && nucleos >= 6) return 'alto';
  return 'medio';
}

/** pantalla táctil chica: el celular de siempre */
export function esCelular() {
  return typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function soportaWebGL() {
  if (new URLSearchParams(location.search).get('webgl') === '0') return false; // para probar el respaldo
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function bajarNivel(nivel) {
  const i = NIVELES.indexOf(nivel);
  return NIVELES[Math.min(i + 1, NIVELES.length - 1)];
}
