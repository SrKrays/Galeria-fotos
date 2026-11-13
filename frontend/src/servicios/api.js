// api.js — llamadas al backend. La URL sale de VITE_API_URL (archivo .env).
// Sin esa variable el sitio corre en MODO DEMOSTRACIÓN: muestra las fotos de ejemplo
// de src/datos/fotos.js y las consultas no se envían a ningún lado.
const BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

export const modoDemostracion = !BASE;

export const USOS = [
  { valor: 'prensa', texto: 'Nota de prensa' },
  { valor: 'libro', texto: 'Libro' },
  { valor: 'comercial', texto: 'Uso comercial' },
  { valor: 'personal', texto: 'Uso personal' },
];

const SIN_CONEXION = 'No pudimos conectar con el servidor. Revisá tu conexión y probá de nuevo.';

// las imágenes guardadas en la carpeta local del backend llegan como "/archivos/…"
export const urlArchivo = (ruta) => (ruta?.startsWith('/') ? BASE + ruta : ruta);

/** Fotos publicadas, ya con el formato que usa la sala. */
export async function obtenerFotos() {
  let r;
  try { r = await fetch(`${BASE}/api/fotos`); } catch { throw new Error(SIN_CONEXION); }
  if (!r.ok) throw new Error('El servidor no pudo entregar las fotos. Probá de nuevo en un momento.');
  return (await r.json()).map((f) => ({ ...f, src: urlArchivo(f.src), miniatura: urlArchivo(f.miniatura) }));
}

/** Envía una consulta por una foto. Devuelve { ok, demo? } o lanza un Error con mensaje para mostrar. */
export async function enviarConsulta(consulta) {
  if (modoDemostracion) {
    await new Promise((r) => setTimeout(r, 800));
    console.info('[consulta · modo demostración] no se envió a ningún servidor:', consulta);
    return { ok: true, demo: true };
  }
  let r;
  try {
    r = await fetch(`${BASE}/api/consultas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consulta),
    });
  } catch {
    throw new Error('No pudimos conectar. Revisá tu conexión y probá de nuevo, o escribile por WhatsApp.');
  }
  if (r.status === 429) throw new Error('Enviaste varias consultas seguidas. Esperá unos minutos, o escribile por WhatsApp.');
  if (!r.ok) throw new Error('No pudimos enviar la consulta. Probá de nuevo en un momento, o escribile por WhatsApp.');
  return { ok: true };
}

/** Enlace de WhatsApp con el mensaje ya armado para una foto. */
export function enlaceWhatsApp(numero, foto) {
  const texto = `Hola Antonio, vi tu foto "${foto.titulo}" (ref. ${foto.codigo}) en tu galería y quiero hacerte una consulta.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

// ═════════════ panel de administración ═════════════
const CLAVE_SESION = 'galeria-sesion';

export const sesion = {
  leer() {
    try {
      const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION));
      return s && new Date(s.expira) > new Date() ? s : null;
    } catch { return null; }
  },
  guardar(s) { try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s)); } catch { /* sin almacenamiento: dura hasta recargar */ } },
  cerrar() { try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* nada que borrar */ } },
};

export class SesionVencida extends Error {}

// pedido autenticado; `cuerpo` puede ser un objeto (va como JSON) o un FormData (archivos)
async function admin(ruta, { metodo = 'GET', cuerpo, token } = {}) {
  const esForm = cuerpo instanceof FormData;
  let r;
  try {
    r = await fetch(`${BASE}/api${ruta}`, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(cuerpo && !esForm ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? (esForm ? cuerpo : JSON.stringify(cuerpo)) : undefined,
    });
  } catch { throw new Error(SIN_CONEXION); }
  if (r.status === 401 && token) throw new SesionVencida('La sesión venció. Ingresá de nuevo.');
  if (r.status === 204) return null;
  const datos = await r.json().catch(() => null);
  if (!r.ok) {
    // el backend manda { mensaje } o { errors: { campo: [mensajes] } }
    const detalle = datos?.mensaje ?? Object.values(datos?.errors ?? {}).flat().join(' ');
    throw new Error(detalle || (r.status === 429 ? 'Demasiados intentos. Esperá un minuto.' : 'El servidor rechazó el pedido.'));
  }
  return datos;
}

export const apiAdmin = {
  ingresar: (usuario, clave) => admin('/auth/ingresar', { metodo: 'POST', cuerpo: { usuario, clave } }),
  marcos: () => admin('/marcos'),
  fotos: (t) => admin('/admin/fotos', { token: t }),
  crearFoto: (t, form) => admin('/admin/fotos', { metodo: 'POST', cuerpo: form, token: t }),
  editarFoto: (t, id, datos) => admin(`/admin/fotos/${id}`, { metodo: 'PUT', cuerpo: datos, token: t }),
  cambiarImagen: (t, id, form) => admin(`/admin/fotos/${id}/imagen`, { metodo: 'PUT', cuerpo: form, token: t }),
  ordenarFotos: (t, ids) => admin('/admin/fotos/orden', { metodo: 'PUT', cuerpo: ids, token: t }),
  borrarFoto: (t, id) => admin(`/admin/fotos/${id}`, { metodo: 'DELETE', token: t }),
  consultas: (t) => admin('/admin/consultas', { token: t }),
  estadoConsulta: (t, id, estado) => admin(`/admin/consultas/${id}`, { metodo: 'PATCH', cuerpo: { estado }, token: t }),
  borrarConsulta: (t, id) => admin(`/admin/consultas/${id}`, { metodo: 'DELETE', token: t }),
  colecciones: (t) => admin('/admin/colecciones', { token: t }),
  crearColeccion: (t, datos) => admin('/admin/colecciones', { metodo: 'POST', cuerpo: datos, token: t }),
  editarColeccion: (t, id, datos) => admin(`/admin/colecciones/${id}`, { metodo: 'PUT', cuerpo: datos, token: t }),
  borrarColeccion: (t, id) => admin(`/admin/colecciones/${id}`, { metodo: 'DELETE', token: t }),
};
