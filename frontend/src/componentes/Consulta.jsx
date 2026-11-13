// Consulta — panel con dos caminos: WhatsApp (mensaje ya armado) o formulario dentro de la web.
// La foto queda asociada sola: quien consulta no tiene que escribir cuál es.
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { WHATSAPP } from '../datos/fotos.js';
import { enlaceWhatsApp, enviarConsulta, USOS } from '../servicios/api.js';

const VACIO = { nombre: '', apellido: '', telefono: '', email: '', uso: '', mensaje: '', sitio: '' };

function validar(d) {
  const e = {};
  if (!d.nombre.trim()) e.nombre = 'Escribí tu nombre.';
  if (!d.apellido.trim()) e.apellido = 'Escribí tu apellido.';
  if (!d.telefono.trim() && !d.email.trim()) e.contacto = 'Dejá un teléfono o un email para poder responderte.';
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Revisá el email: parece incompleto.';
  if (d.telefono.trim() && d.telefono.replace(/\D/g, '').length < 6) e.telefono = 'Revisá el teléfono: parece incompleto.';
  if (!d.uso) e.uso = 'Elegí para qué necesitás la foto.';
  return e;
}

export default function Consulta({ foto, alCerrar }) {
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [estado, setEstado] = useState('formulario');     // formulario | enviando | enviada
  const [fallo, setFallo] = useState('');
  const [demo, setDemo] = useState(false);
  const caja = useRef(null);
  const reducido = useReducedMotion();

  // foco adentro, Escape cierra, y el Tab no se escapa del panel
  useEffect(() => {
    const antes = document.activeElement;
    caja.current?.querySelector('[data-foco-inicial]')?.focus();
    const tecla = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); alCerrar(); return; }
      if (e.key !== 'Tab') return;
      const f = [...caja.current.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')];
      if (!f.length) return;
      const primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { ultimo.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { primero.focus(); e.preventDefault(); }
    };
    window.addEventListener('keydown', tecla, true);
    return () => { window.removeEventListener('keydown', tecla, true); antes?.focus?.(); };
  }, [alCerrar]);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setDatos((d) => ({ ...d, [name]: value }));
    if (errores[name] || errores.contacto) setErrores((er) => ({ ...er, [name]: undefined, contacto: undefined }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const er = validar(datos);
    setErrores(er);
    if (Object.keys(er).length) {
      const primero = Object.keys(er)[0] === 'contacto' ? 'telefono' : Object.keys(er)[0];
      caja.current?.querySelector(`[name="${primero}"]`)?.focus();
      return;
    }
    setEstado('enviando'); setFallo('');
    try {
      const r = await enviarConsulta({
        fotoId: foto.id, fotoCodigo: foto.codigo, fotoTitulo: foto.titulo,
        nombre: datos.nombre.trim(), apellido: datos.apellido.trim(),
        telefono: datos.telefono.trim(), email: datos.email.trim(),
        uso: datos.uso, mensaje: datos.mensaje.trim(), sitio: datos.sitio,
      });
      setDemo(!!r.demo);
      setEstado('enviada');
    } catch (error) {
      setFallo(error.message);
      setEstado('formulario');
    }
  };

  const campo = (nombre, etiqueta, extra = {}) => (
    <label className={`campo${errores[nombre] ? ' campo--error' : ''}`}>
      <span className="campo__etiqueta">{etiqueta}</span>
      <input name={nombre} value={datos[nombre]} onChange={cambiar} aria-invalid={!!errores[nombre]}
             aria-describedby={errores[nombre] ? `error-${nombre}` : undefined} {...extra} />
      {errores[nombre] && <span className="campo__error" id={`error-${nombre}`}>{errores[nombre]}</span>}
    </label>
  );

  return (
    <motion.div className="consulta__velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }} onPointerDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <motion.section
        ref={caja} className="consulta" role="dialog" aria-modal="true" aria-labelledby="consulta-titulo"
        initial={reducido ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.2, 0.7, 0.2, 1] } }}
        exit={{ opacity: 0, y: reducido ? 0 : 16, transition: { duration: 0.2 } }}
      >
        <button type="button" className="consulta__cerrar" onClick={alCerrar} aria-label="Cerrar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>
        </button>

        {/* la foto, ya asociada */}
        <div className="consulta__foto">
          <img src={foto.src} alt="" />
          <div>
            <p className="consulta__sobre">Consulta por</p>
            <h2 id="consulta-titulo">{foto.titulo}</h2>
            <p className="consulta__ref">{foto.anio} · {foto.lugar} · Ref. {foto.codigo}</p>
          </div>
        </div>

        {estado === 'enviada' ? (
          <div className="consulta__gracias" role="status">
            <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21" /><path d="M14 25l7 7 13-15" /></svg>
            <h3>Consulta enviada</h3>
            <p>Gracias, {datos.nombre.trim()}. Antonio recibió tu consulta por “{foto.titulo}” y te va a responder al contacto que dejaste.</p>
            {demo && <p className="consulta__demo">Modo demostración: todavía no hay servidor conectado, así que esta consulta no se guardó.</p>}
            <button type="button" className="boton boton--principal" data-foco-inicial onClick={alCerrar}>Volver a la historia</button>
          </div>
        ) : (
          <>
            <a className="boton boton--whatsapp" href={enlaceWhatsApp(WHATSAPP, foto)} target="_blank" rel="noopener noreferrer" data-foco-inicial>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z" /><path d="M8.5 11.5h7M8.5 14.5h4.5" /></svg>
              <span><b>Escribirle por WhatsApp</b><small>El mensaje ya va armado con la foto. Solo tocás enviar.</small></span>
            </a>

            <p className="consulta__o"><span>o dejá tus datos y te responde</span></p>

            <form className="consulta__form" onSubmit={enviar} noValidate>
              {/* campo trampa para bots: las personas no lo ven ni llegan con Tab */}
              <input className="consulta__trampa" name="sitio" value={datos.sitio} onChange={cambiar} tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="consulta__fila">
                {campo('nombre', 'Nombre', { autoComplete: 'given-name' })}
                {campo('apellido', 'Apellido', { autoComplete: 'family-name' })}
              </div>
              <div className="consulta__fila">
                {campo('telefono', 'Teléfono', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
                {campo('email', 'Email', { type: 'email', inputMode: 'email', autoComplete: 'email' })}
              </div>
              {errores.contacto
                ? <p className="campo__error campo__error--suelto">{errores.contacto}</p>
                : <p className="consulta__ayuda">Con uno de los dos alcanza.</p>}

              <label className={`campo${errores.uso ? ' campo--error' : ''}`}>
                <span className="campo__etiqueta">¿Para qué la necesitás?</span>
                <select name="uso" value={datos.uso} onChange={cambiar} aria-invalid={!!errores.uso}>
                  <option value="" disabled>Elegí una opción</option>
                  {USOS.map((u) => <option key={u.valor} value={u.valor}>{u.texto}</option>)}
                </select>
                {errores.uso && <span className="campo__error">{errores.uso}</span>}
              </label>

              <label className="campo">
                <span className="campo__etiqueta">Mensaje <i>(opcional)</i></span>
                <textarea name="mensaje" rows={3} value={datos.mensaje} onChange={cambiar} maxLength={1500} />
              </label>

              {fallo && <p className="consulta__fallo" role="alert">{fallo}</p>}
              <button type="submit" className="boton boton--principal" disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Enviando…' : 'Enviar consulta'}
              </button>
            </form>
          </>
        )}
      </motion.section>
    </motion.div>
  );
}
