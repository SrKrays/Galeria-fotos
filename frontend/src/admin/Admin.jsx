// Panel de administración — /admin
// Pensado para que lo use Antonio sin ayuda: pocas pantallas, botones grandes y textos claros.
//   Fotos       subir, editar datos y relato, elegir marco, ordenar, publicar u ocultar, borrar
//   Consultas   leer lo que llega, marcar como leída o respondida, contestar por WhatsApp o mail
//   Colecciones agrupar fotos
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiAdmin, modoDemostracion, sesion, SesionVencida, urlArchivo } from '../servicios/api.js';
import './admin.css';

export default function Admin() {
  const [s, setS] = useState(() => sesion.leer());
  useEffect(() => { document.title = 'Panel · Antonio Carrizo'; }, []);
  const salir = useCallback(() => { sesion.cerrar(); setS(null); }, []);

  if (modoDemostracion) {
    return (
      <main className="adm adm--centro">
        <div className="adm__tarjeta">
          <h1>Panel de la galería</h1>
          <p>Todavía no hay un servidor conectado. Definí <code>VITE_API_URL</code> en <code>frontend/.env</code> con la dirección del backend y recargá.</p>
          <a className="adm__enlace" href="/">Volver a la galería</a>
        </div>
      </main>
    );
  }
  return s ? <Panel sesionActual={s} alSalir={salir} /> : <Ingreso alIngresar={(x) => { sesion.guardar(x); setS(x); }} />;
}

// ═════════════ ingreso ═════════════
function Ingreso({ alIngresar }) {
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true); setError('');
    try { alIngresar(await apiAdmin.ingresar(usuario, clave)); }
    catch (er) { setError(er.message); setEnviando(false); }
  };

  return (
    <main className="adm adm--centro">
      <form className="adm__tarjeta" onSubmit={enviar}>
        <h1>Panel de la galería</h1>
        <label className="adm__campo"><span>Usuario</span>
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" autoCapitalize="none" required autoFocus />
        </label>
        <label className="adm__campo"><span>Contraseña</span>
          <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="adm__error" role="alert">{error}</p>}
        <button className="adm__boton adm__boton--principal" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
        <a className="adm__enlace" href="/">Volver a la galería</a>
      </form>
    </main>
  );
}

// ═════════════ panel ═════════════
function Panel({ sesionActual, alSalir }) {
  const t = sesionActual.token;
  const [pestana, setPestana] = useState('fotos');
  const [fotos, setFotos] = useState(null);
  const [consultas, setConsultas] = useState(null);
  const [colecciones, setColecciones] = useState([]);
  const [marcos, setMarcos] = useState([]);
  const [aviso, setAviso] = useState(null);             // { tipo: 'ok' | 'error', texto }
  const reloj = useRef(0);

  const avisar = useCallback((texto, tipo = 'ok') => {
    setAviso({ texto, tipo });
    clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setAviso(null), tipo === 'ok' ? 3500 : 8000);
  }, []);

  // corre una acción del panel; si falla muestra el motivo, y si la sesión venció vuelve al ingreso
  const hacer = useCallback(async (accion, exito) => {
    try { const r = await accion(); if (exito) avisar(exito); return r ?? true; }
    catch (e) { if (e instanceof SesionVencida) alSalir(); else avisar(e.message, 'error'); return false; }
  }, [alSalir, avisar]);

  const recargar = useCallback(() => hacer(async () => {
    const [f, c, col, m] = await Promise.all([apiAdmin.fotos(t), apiAdmin.consultas(t), apiAdmin.colecciones(t), apiAdmin.marcos()]);
    setFotos(f); setConsultas(c); setColecciones(col); setMarcos(m);
  }), [hacer, t]);
  useEffect(() => { recargar(); }, [recargar]);

  const nuevas = consultas?.filter((c) => c.estado === 'nueva').length ?? 0;

  return (
    <div className="adm">
      <header className="adm__barra">
        <h1>Galería · Panel</h1>
        <nav className="adm__pestanas" aria-label="Secciones">
          {[['fotos', 'Fotos'], ['consultas', `Consultas${nuevas ? ` (${nuevas})` : ''}`], ['colecciones', 'Colecciones']].map(([id, texto]) => (
            <button key={id} type="button" className={pestana === id ? 'activa' : ''} aria-current={pestana === id ? 'page' : undefined} onClick={() => setPestana(id)}>{texto}</button>
          ))}
        </nav>
        <div className="adm__cuenta">
          <a href="/sala" target="_blank" rel="noreferrer">Ver la galería</a>
          <button type="button" onClick={alSalir}>Salir</button>
        </div>
      </header>

      {aviso && <p className={`adm__aviso adm__aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</p>}

      <main className="adm__cuerpo">
        {fotos === null ? <p className="adm__vacio">Cargando…</p> : (
          <>
            {pestana === 'fotos' && <Fotos {...{ t, fotos, marcos, colecciones, hacer, recargar }} />}
            {pestana === 'consultas' && <Consultas {...{ t, consultas, hacer, recargar }} />}
            {pestana === 'colecciones' && <Colecciones {...{ t, colecciones, hacer, recargar }} />}
          </>
        )}
      </main>
    </div>
  );
}

// botón que pide confirmar antes de borrar (sin ventanas emergentes del navegador)
function Borrar({ alConfirmar, texto = 'Borrar' }) {
  const [seguro, setSeguro] = useState(false);
  useEffect(() => { if (!seguro) return undefined; const id = setTimeout(() => setSeguro(false), 5000); return () => clearTimeout(id); }, [seguro]);
  return seguro
    ? <span className="adm__confirmar">¿Seguro? <button type="button" className="adm__boton adm__boton--peligro" onClick={alConfirmar}>Sí, borrar</button> <button type="button" className="adm__boton" onClick={() => setSeguro(false)}>No</button></span>
    : <button type="button" className="adm__boton adm__boton--tenue" onClick={() => setSeguro(true)}>{texto}</button>;
}

// ═════════════ fotos ═════════════
function Fotos({ t, fotos, marcos, colecciones, hacer, recargar }) {
  const [editando, setEditando] = useState(null);       // null | 'nueva' | foto
  const nombreMarco = useMemo(() => Object.fromEntries(marcos.map((m) => [m.id, m.nombre])), [marcos]);

  const mover = async (i, d) => {
    const ids = fotos.map((f) => f.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    if (await hacer(() => apiAdmin.ordenarFotos(t, ids))) recargar();
  };

  if (editando) {
    return <FormularioFoto {...{ t, marcos, colecciones, hacer }} foto={editando === 'nueva' ? null : editando}
                           alTerminar={(cambio) => { setEditando(null); if (cambio) recargar(); }} />;
  }
  return (
    <section>
      <div className="adm__encabezado">
        <h2>Fotos <small>{fotos.length} en total · {fotos.filter((f) => f.publicada).length} publicadas</small></h2>
        <button type="button" className="adm__boton adm__boton--principal" onClick={() => setEditando('nueva')}>+ Agregar foto</button>
      </div>
      {!fotos.length && <p className="adm__vacio">Todavía no hay fotos. Tocá “Agregar foto” para subir la primera.</p>}
      <ol className="adm__lista">
        {fotos.map((f, i) => (
          <li key={f.id} className="adm__fila">
            <img src={urlArchivo(f.miniatura)} alt="" loading="lazy" />
            <div className="adm__fila-texto">
              <strong>{f.titulo}</strong>
              <span>{[f.anio, f.lugar].filter(Boolean).join(' · ') || 'Sin año ni lugar'} · {nombreMarco[f.marco] ?? f.marco}</span>
              <span className={`adm__estado ${f.publicada ? 'adm__estado--si' : ''}`}>{f.publicada ? 'Publicada' : 'Oculta (borrador)'}</span>
              {!f.relato.trim() && <span className="adm__falta">Falta el relato</span>}
            </div>
            <div className="adm__fila-acciones">
              <button type="button" className="adm__boton adm__boton--icono" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Mover “${f.titulo}” antes`}>↑</button>
              <button type="button" className="adm__boton adm__boton--icono" disabled={i === fotos.length - 1} onClick={() => mover(i, 1)} aria-label={`Mover “${f.titulo}” después`}>↓</button>
              <button type="button" className="adm__boton" onClick={() => setEditando(f)}>Editar</button>
              <Borrar alConfirmar={async () => { if (await hacer(() => apiAdmin.borrarFoto(t, f.id), 'Foto borrada.')) recargar(); }} />
            </div>
          </li>
        ))}
      </ol>
      {fotos.length > 1 && <p className="adm__nota">El orden de esta lista es el orden en que cuelgan en la sala, de izquierda a derecha.</p>}
    </section>
  );
}

function FormularioFoto({ t, foto, marcos, colecciones, hacer, alTerminar }) {
  const [d, setD] = useState(() => ({
    titulo: foto?.titulo ?? '', anio: foto?.anio ?? '', lugar: foto?.lugar ?? '', gancho: foto?.gancho ?? '',
    alt: foto?.alt ?? '', credito: foto?.credito ?? '', marco: foto?.marco ?? 'negro',
    coleccionId: foto?.coleccionId ?? '', relato: foto?.relato ?? '', publicada: foto?.publicada ?? false,
  }));
  const [archivo, setArchivo] = useState(null);
  const [vista, setVista] = useState(foto ? urlArchivo(foto.miniatura) : null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (e) => setD((x) => ({ ...x, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    if (!archivo) return undefined;
    const url = URL.createObjectURL(archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const datos = { ...d, anio: d.anio === '' ? null : Number(d.anio), coleccionId: d.coleccionId === '' ? null : Number(d.coleccionId) };
    const ok = await hacer(async () => {
      if (!foto) {
        const form = new FormData();
        form.append('archivo', archivo);
        Object.entries(datos).forEach(([k, v]) => { if (v !== null) form.append(k, v); });
        await apiAdmin.crearFoto(t, form);
      } else {
        await apiAdmin.editarFoto(t, foto.id, datos);
        if (archivo) { const form = new FormData(); form.append('archivo', archivo); await apiAdmin.cambiarImagen(t, foto.id, form); }
      }
    }, foto ? 'Cambios guardados.' : 'Foto agregada.');
    setGuardando(false);
    if (ok) alTerminar(true);
  };

  return (
    <form className="adm__form" onSubmit={guardar}>
      <div className="adm__encabezado">
        <h2>{foto ? `Editar “${foto.titulo}”` : 'Agregar foto'}</h2>
        <button type="button" className="adm__boton" onClick={() => alTerminar(false)}>Cancelar</button>
      </div>

      <div className="adm__dos">
        <div className="adm__archivo">
          {vista ? <img src={vista} alt="Vista previa" /> : <div className="adm__sin-foto">Sin foto elegida</div>}
          <label className="adm__campo"><span>{foto ? 'Cambiar el archivo (opcional)' : 'Archivo de la foto'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/tiff,.tif,.tiff" required={!foto} onChange={(e) => setArchivo(e.target.files[0] ?? null)} />
          </label>
          <p className="adm__nota">JPG, PNG, WebP o TIFF, hasta 40 MB. Subí la de mejor calidad: el original queda guardado en privado y al público solo sale una versión con marca de agua.</p>
        </div>

        <div className="adm__campos">
          <label className="adm__campo"><span>Título</span><input name="titulo" value={d.titulo} onChange={cambiar} required maxLength={160} /></label>
          <div className="adm__par">
            <label className="adm__campo"><span>Año</span><input name="anio" type="number" min="1800" max="2100" value={d.anio} onChange={cambiar} /></label>
            <label className="adm__campo"><span>Lugar</span><input name="lugar" value={d.lugar} onChange={cambiar} maxLength={120} /></label>
          </div>
          <label className="adm__campo"><span>Frase de la placa <i>la que invita a leer la historia</i></span><input name="gancho" value={d.gancho} onChange={cambiar} maxLength={200} /></label>
          <label className="adm__campo"><span>Qué se ve en la foto <i>para quienes no pueden verla</i></span><input name="alt" value={d.alt} onChange={cambiar} maxLength={400} /></label>
          <label className="adm__campo"><span>Colección <i>opcional</i></span>
            <select name="coleccionId" value={d.coleccionId} onChange={cambiar}>
              <option value="">Sin colección</option>
              {colecciones.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        </div>
      </div>

      <fieldset className="adm__marcos">
        <legend>Marco</legend>
        {marcos.map((m) => (
          <label key={m.id} className={`adm__marco${d.marco === m.id ? ' adm__marco--elegido' : ''}`}>
            <input type="radio" name="marco" value={m.id} checked={d.marco === m.id} onChange={cambiar} />
            <span className={`adm__muestra adm__muestra--${m.id}`} aria-hidden="true" />
            <strong>{m.nombre}</strong>
            <small>{m.uso}</small>
          </label>
        ))}
      </fieldset>

      <label className="adm__campo"><span>La historia de la foto <i>dejá un renglón en blanco entre párrafo y párrafo</i></span>
        <textarea name="relato" value={d.relato} onChange={cambiar} rows={10} />
      </label>

      <label className="adm__check">
        <input type="checkbox" name="publicada" checked={d.publicada} onChange={cambiar} />
        <span><strong>Publicada</strong> Si está tildada, la foto se ve en la galería. Sin tildar queda guardada como borrador.</span>
      </label>

      <div className="adm__pie">
        <button className="adm__boton adm__boton--principal" disabled={guardando}>{guardando ? 'Guardando… (una foto grande puede tardar)' : 'Guardar'}</button>
        <button type="button" className="adm__boton" onClick={() => alTerminar(false)}>Cancelar</button>
      </div>
    </form>
  );
}

// ═════════════ consultas ═════════════
const fecha = (iso) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const soloNumeros = (tel) => tel.replace(/\D/g, '');

function Consultas({ t, consultas, hacer, recargar }) {
  const [filtro, setFiltro] = useState('pendientes');
  const lista = consultas.filter((c) => filtro === 'todas' || c.estado !== 'respondida');
  const cambiar = async (c, estado) => { if (await hacer(() => apiAdmin.estadoConsulta(t, c.id, estado))) recargar(); };

  return (
    <section>
      <div className="adm__encabezado">
        <h2>Consultas</h2>
        <div className="adm__filtro" role="group" aria-label="Qué consultas mostrar">
          <button type="button" className={filtro === 'pendientes' ? 'activa' : ''} onClick={() => setFiltro('pendientes')}>Sin responder</button>
          <button type="button" className={filtro === 'todas' ? 'activa' : ''} onClick={() => setFiltro('todas')}>Todas</button>
        </div>
      </div>
      {!lista.length && <p className="adm__vacio">{consultas.length ? 'No queda ninguna consulta sin responder.' : 'Todavía no llegó ninguna consulta.'}</p>}
      <ul className="adm__lista">
        {lista.map((c) => {
          const tel = soloNumeros(c.telefono);
          const saludo = encodeURIComponent(`Hola ${c.nombre}, soy Antonio Carrizo. Te escribo por tu consulta sobre la foto "${c.fotoTitulo}".`);
          return (
            <li key={c.id} className={`adm__consulta adm__consulta--${c.estado}`}>
              {c.fotoMiniatura && <img src={urlArchivo(c.fotoMiniatura)} alt="" loading="lazy" />}
              <div className="adm__consulta-texto">
                <p className="adm__consulta-foto">{c.fotoTitulo} <small>{c.fotoCodigo}</small> {c.estado === 'nueva' && <b>Nueva</b>}</p>
                <p><strong>{c.nombre} {c.apellido}</strong> · {c.usoTexto} · <time dateTime={c.creada}>{fecha(c.creada)}</time></p>
                {c.mensaje && <p className="adm__consulta-mensaje">{c.mensaje}</p>}
                <p className="adm__consulta-contacto">
                  {tel && <a href={`https://wa.me/${tel}?text=${saludo}`} target="_blank" rel="noreferrer">WhatsApp {c.telefono}</a>}
                  {tel && <a href={`tel:${tel}`}>Llamar</a>}
                  {c.email && <a href={`mailto:${c.email}?subject=${encodeURIComponent(`Tu consulta por "${c.fotoTitulo}"`)}`}>{c.email}</a>}
                </p>
              </div>
              <div className="adm__fila-acciones">
                {c.estado === 'nueva' && <button type="button" className="adm__boton" onClick={() => cambiar(c, 'leida')}>Marcar leída</button>}
                {c.estado !== 'respondida'
                  ? <button type="button" className="adm__boton adm__boton--principal" onClick={() => cambiar(c, 'respondida')}>Ya respondí</button>
                  : <button type="button" className="adm__boton" onClick={() => cambiar(c, 'leida')}>Volver a pendiente</button>}
                <Borrar alConfirmar={async () => { if (await hacer(() => apiAdmin.borrarConsulta(t, c.id), 'Consulta borrada.')) recargar(); }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ═════════════ colecciones ═════════════
function Colecciones({ t, colecciones, hacer, recargar }) {
  const [nombre, setNombre] = useState('');
  const crear = async (e) => {
    e.preventDefault();
    if (await hacer(() => apiAdmin.crearColeccion(t, { nombre }), 'Colección creada.')) { setNombre(''); recargar(); }
  };
  const renombrar = async (c, nuevo) => {
    if (nuevo.trim() && nuevo !== c.nombre && await hacer(() => apiAdmin.editarColeccion(t, c.id, { nombre: nuevo, descripcion: c.descripcion }), 'Nombre cambiado.')) recargar();
  };
  return (
    <section>
      <div className="adm__encabezado"><h2>Colecciones</h2></div>
      <p className="adm__nota">Sirven para agrupar fotos (por ejemplo “Deportes” o “Visita del Papa”). Por ahora ordenan tu archivo; la galería muestra todas las fotos publicadas juntas.</p>
      <form className="adm__linea" onSubmit={crear}>
        <label className="adm__campo"><span>Nueva colección</span><input value={nombre} onChange={(e) => setNombre(e.target.value)} required maxLength={120} /></label>
        <button className="adm__boton adm__boton--principal">Crear</button>
      </form>
      {!colecciones.length && <p className="adm__vacio">Todavía no hay colecciones.</p>}
      <ul className="adm__lista">
        {colecciones.map((c) => (
          <li key={c.id} className="adm__fila">
            <div className="adm__fila-texto">
              <input className="adm__renombrar" defaultValue={c.nombre} aria-label={`Nombre de la colección ${c.nombre}`} maxLength={120}
                     onBlur={(e) => renombrar(c, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
              <span>{c.fotos} {c.fotos === 1 ? 'foto' : 'fotos'}</span>
            </div>
            <div className="adm__fila-acciones">
              <Borrar alConfirmar={async () => { if (await hacer(() => apiAdmin.borrarColeccion(t, c.id), 'Colección borrada. Sus fotos siguen en la galería.')) recargar(); }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
