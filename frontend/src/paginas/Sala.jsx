// Sala — la galería entera sobre UNA sola escena Pixi:
//   "/"          antesala
//   "/sala"      la pared con los cuadros
//   "/foto/:id"  vista de relato (la cámara se acerca a ese cuadro)
// La escena nunca se vuelve a cargar al cambiar de pantalla: solo se mueve la cámara.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { EscenaSala } from '../pixi/EscenaSala.js';
import { pixiConfig } from '../pixi/pixiConfig.js';
import salaMeta from '../pixi/salaMeta.json';
import { marcoDe, medidasCuadro } from '../marcos/index.js';
import Antesala from '../componentes/Antesala.jsx';
import Cuadro from '../componentes/Cuadro.jsx';
import Loader from '../componentes/Loader.jsx';
import Relato from '../componentes/Relato.jsx';

const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
const TITULO = 'Antonio Carrizo · Galería';
const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const indiceDeRuta = (ruta, fotos) => {
  const m = ruta.match(/^\/foto\/([^/]+)/);
  return m ? fotos.findIndex((f) => f.id === decodeURIComponent(m[1])) : null;   // null = no es ruta de foto
};

// dónde y cuánto se acerca el cuadro en la vista de relato
function destinoRelato(m, W, H) {
  const { zoomMax } = pixiConfig.relato;
  if (W / H < 0.9) {                              // celular: foto arriba, relato abajo
    return { z: Math.min((0.88 * W) / m.anchoExt, (0.40 * H) / m.altoExt, zoomMax), x: W / 2, y: 0.255 * H };
  }
  return { z: Math.min((0.48 * W) / m.anchoExt, (0.78 * H) / m.altoExt, zoomMax), x: 0.29 * W, y: 0.47 * H };
}

export default function Sala({ fotos }) {
  const salaRef = useRef(null);
  const htmlRef = useRef(null);
  const pistaRef = useRef(null);
  const cuadrosRef = useRef([]);
  const coloresRef = useRef([]);
  const controlRef = useRef(null);            // funciones del bucle que usa la interfaz
  const [tam, setTam] = useState({ ancho: 0, alto: 0 });
  const [lista, setLista] = useState(false);
  const [vidrioCss, setVidrioCss] = useState(false);
  const [extremo, setExtremo] = useState({ inicio: false, fin: false });

  // fase: 'antesala' -> 'entrando' -> 'sala'. Entrar directo a /sala o /foto/… saltea la antesala.
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const [fase, setFase] = useState(() => (ubicacion.pathname === '/' ? 'antesala' : 'sala'));
  const faseRef = useRef(fase);
  const ponerFase = (f) => { faseRef.current = f; setFase(f); };

  // cámara: la anima GSAP y la escena la lee cada cuadro
  //   zoom, expo: entrada desde la antesala · r: 0 = sala, 1 = relato abierto
  const camRef = useRef({ zoom: 1, expo: 1, r: 0 });
  const relatoRef = useRef(null);             // índice del cuadro al que apunta la cámara
  const [abierto, setAbierto] = useState(null);   // índice del relato visible (interfaz)

  const paso = salaMeta.aspecto * 0.5 * tam.alto;   // px entre un foco y el siguiente

  useLayoutEffect(() => {
    const medir = () => setTam({ ancho: salaRef.current.clientWidth, alto: salaRef.current.clientHeight });
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  // ═══════════════ escena, bucle y desliz ═══════════════
  useEffect(() => {
    const sala = salaRef.current;
    const escena = new EscenaSala();
    const ultimo = fotos.length - 1;
    const tactil = matchMedia('(hover: none)').matches;
    const cfg = pixiConfig.desliz;
    const cam = camRef.current;
    let vivo = true;
    let arrastre = null, encima = null, activoPrevio = -2, extremoPrevio = '', htmlMovido = false;
    let ruedaAcum = 0, ruedaHasta = 0, giro = 0;

    // Cuántos cuadros entran completos, dejando lugar a las flechas: 3, 2 o 1.
    // Con 2, la pared descansa a medio camino entre dos focos (desfase 0,5):
    // dos cuadros enteros al centro y los vecinos asomando cortados en los bordes.
    const desfase = () => {
      const W = sala.clientWidth, H = sala.clientHeight, px = salaMeta.aspecto * 0.5 * H;
      const cuadroMax = 0.42 * H, flechas = 180;
      if (W >= 2 * px + cuadroMax + flechas) return 0;
      if (W >= px + cuadroMax + flechas && ultimo > 0) return 0.5;
      return 0;
    };
    const minimo = () => desfase();
    const maximo = () => ultimo - desfase();
    const encajar = (x) => limitar(Math.round(x - desfase()) + desfase(), minimo(), maximo());
    // posición de descanso que deja el cuadro i a la vista moviendo lo mínimo
    const paraVer = (i, desde) => { const d = desfase(); return limitar(d ? (desde > i ? i + d : i - d) : i, minimo(), maximo()); };

    // `e.pos` = foco (puede ser fraccionario) que está en el centro de la pantalla. Lo mueve GSAP.
    const e = { pos: desfase() || (sala.clientWidth > sala.clientHeight * 1.2 ? Math.min(1, ultimo) : 0) };
    const posSala = e.pos;
    const posAntesala = Math.round(e.pos);                  // con un foco justo al centro
    const ind = indiceDeRuta(location.pathname, fotos);
    if (faseRef.current !== 'sala') e.pos = posAntesala;
    else if (ind !== null && ind >= 0) e.pos = paraVer(ind, e.pos);
    let destino = e.pos;                                    // a dónde va a quedar al terminar el movimiento

    const deslizarA = (x, duracion, ease = 'power3.out') => {
      destino = limitar(x, minimo(), maximo());
      gsap.to(e, { pos: destino, duration: movimientoReducido() ? 0.01 : duracion, ease, overwrite: true });
    };
    const saltarA = (x) => { gsap.killTweensOf(e); e.pos = destino = x; };
    const pasoFlecha = (d) => deslizarA(encajar(destino) + d, cfg.duracionFlecha, 'power2.inOut');

    controlRef.current = {
      escena,
      alEntrarASala: () => saltarA(posSala),
      alVolverAAntesala: () => saltarA(posAntesala),
      anterior: () => pasoFlecha(-1),
      siguiente: () => pasoFlecha(1),
      mostrar: (i, alInstante) => (alInstante ? saltarA(paraVer(i, e.pos)) : deslizarA(paraVer(i, e.pos), cfg.duracionFlecha, 'power2.inOut')),
      estaVisible: (i) => Math.abs(i - e.pos) <= sala.clientWidth / (salaMeta.aspecto * sala.clientHeight) - 0.35,
      frenar: () => saltarA(e.pos),
      fueArrastre: () => arrastre?.movido ?? false,
    };

    escena.alCambiarCalidad(() => setVidrioCss(!escena.vidrioConShader));
    escena.iniciar(sala).then(() => {
      if (!vivo) return;
      window.__escena = escena;
      setVidrioCss(!escena.vidrioConShader);
      setLista(true);
      if (escena.sinWebGL) { const id = setInterval(() => (vivo ? cuadro() : clearInterval(id)), 16); }
      else escena.antesDeCuadro(cuadro);
    });

    function cuadro() {
      const W = sala.clientWidth, H = sala.clientHeight;
      const px = salaMeta.aspecto * 0.5 * H;
      const pos = e.pos;
      escena.fijarExposicion(cam.expo);
      escena.fijarScroll(pos);
      giro += ((controlRef.current.giro ?? 0) - giro) * 0.08;
      escena.fijarGiro(giro);

      // antesala: pared quieta, sin cuadros
      if (faseRef.current !== 'sala') {
        escena.fijarZoom(cam.zoom);
        escena.fijarFocoActivo(null);
        escena.fijarVidrios([]);
        escena.fijarCuadros([]);
        pistaRef.current.style.transform = `translate3d(${W / 2 - posSala * px}px,0,0)`;
        return;
      }
      pistaRef.current.style.transform = `translate3d(${W / 2 - pos * px}px,0,0)`;

      // ── cámara del relato: lleva el centro del cuadro abierto a su lugar y lo agranda ──
      const iR = relatoRef.current;
      const r = iR === null ? 0 : cam.r;
      let T = null;                                          // transformación pantalla = (p - o) * z + d
      if (r > 0.0004) {
        const m = medidasCuadro(fotos[iR], H, W);
        const ox = W / 2 + (iR - pos) * px, oy = m.arriba + m.altoExt / 2;
        const fin = destinoRelato(m, W, H);
        T = { z: 1 + (fin.z - 1) * r, ox, oy, dx: ox + (fin.x - ox) * r, dy: oy + (fin.y - oy) * r };
        escena.fijarZoom(T.z, [ox / W, oy / H], [T.dx / W, T.dy / H]);
        const h = htmlRef.current.style;
        h.transition = 'none'; h.transformOrigin = '0 0';
        h.transform = `translate3d(${T.dx - ox * T.z}px,${T.dy - oy * T.z}px,0) scale(${T.z})`;
        htmlMovido = true;
      } else {
        escena.fijarZoom(cam.zoom);
        if (htmlMovido) { const h = htmlRef.current.style; h.transform = h.transformOrigin = h.transition = ''; htmlMovido = false; }
      }
      const tx = (x) => (T ? (x - T.ox) * T.z + T.dx : x);
      const ty = (y) => (T ? (y - T.oy) * T.z + T.dy : y);
      const tz = T ? T.z : 1;

      // ── cuadro activo: el abierto; si no, el del mouse; en celular, el del centro ──
      const centro = limitar(Math.round(pos), 0, ultimo);
      const activo = r > 0 ? iR : (encima ? encima.i : (tactil ? centro : null));
      escena.fijarFocoActivo(activo);
      if (activo !== activoPrevio) {
        cuadrosRef.current.forEach((el, i) => el?.classList.toggle('cuadro--activo', i === activo));
        activoPrevio = activo;
      }
      const enInicio = destino < minimo() + 0.5, enFin = destino > maximo() - 0.5;
      const ext = `${enInicio}${enFin}`;
      if (ext !== extremoPrevio) { extremoPrevio = ext; setExtremo({ inicio: enInicio, fin: enFin }); }

      // ── vidrios y reflejos de los cuadros visibles (cuentas, sin leer el DOM) ──
      const vidrios = [], reflejos = [];
      const alcance = W / px / 2 + 0.8;
      for (let i = Math.max(0, Math.ceil(pos - alcance)); i <= Math.min(ultimo, Math.floor(pos + alcance)); i++) {
        const foto = fotos[i];
        const m = medidasCuadro(foto, H, W);
        const xc = W / 2 + (i - pos) * px;
        const x0 = xc - m.anchoExt / 2;
        const apagado = r > 0 && i !== iR ? 1 - r * 0.9 : 1;   // en relato, los demás cuadros se apagan
        vidrios.push({
          x: tx(x0 + m.vidrio.dx), y: ty(m.arriba + m.vidrio.dy), ancho: m.vidrio.ancho * tz, alto: m.vidrio.alto * tz,
          intensidad: apagado, mouse: r === 0 && encima?.i === i ? encima.u : 0,
        });
        // el reflejo en el piso mezcla el color de la foto con el del marco
        const cm = marcoDe(foto.marco).reflejo, cf = foto.color ?? coloresRef.current[i] ?? cm;
        const k = apagado * (r > 0 && i === iR ? 1 - r * 0.5 : 1);
        reflejos.push({ x: tx(xc), medioAncho: (m.anchoExt / 2) * tz, foco: i,
                        color: [(cm[0] * 0.55 + cf[0] * 0.6) * k, (cm[1] * 0.55 + cf[1] * 0.6) * k, (cm[2] * 0.55 + cf[2] * 0.6) * k] });
      }
      escena.fijarVidrios(vidrios);
      escena.fijarCuadros(reflejos);
    }

    // ── entrada: dedo, mouse, rueda y teclado ──
    const libre = () => faseRef.current === 'sala' && relatoRef.current === null;
    const abajo = (ev) => {
      if (!libre() || ev.target.closest('.flecha')) return;
      arrastre = { x0: ev.clientX, x: ev.clientX, t: performance.now(), v: 0, id: ev.pointerId, movido: false };
    };
    const mover = (ev) => {
      const el = ev.pointerType === 'mouse' && libre() ? ev.target.closest?.('.cuadro__boton, .placa') : null;
      if (el) {
        const r = el.getBoundingClientRect();
        encima = { i: Number(el.parentElement.dataset.indice), u: el.matches('.placa') ? 0 : (ev.clientX - r.left) / r.width - 0.5 };
      } else encima = null;
      if (!arrastre) return;
      if (!arrastre.movido && Math.abs(ev.clientX - arrastre.x0) > 6) {
        arrastre.movido = true;
        gsap.killTweensOf(e);
        sala.setPointerCapture(arrastre.id);
        sala.classList.add('sala--arrastrando');
      }
      if (!arrastre.movido) return;
      const px = salaMeta.aspecto * 0.5 * sala.clientHeight;
      const ahora = performance.now();
      let d = -(ev.clientX - arrastre.x) / px;
      if (e.pos < minimo() || e.pos > maximo()) d *= cfg.resistencia;      // cede en las puntas
      e.pos += d;
      // velocidad en focos por segundo, suavizada
      const dt = Math.max(1, ahora - arrastre.t) / 1000;
      arrastre.v = arrastre.v * 0.6 + (d / dt) * 0.4;
      arrastre.x = ev.clientX; arrastre.t = ahora;
    };
    const arriba = () => {
      sala.classList.remove('sala--arrastrando');
      if (!arrastre?.movido) { arrastre = null; return; }
      // inercia: sigue el impulso y se acomoda en el cuadro más cercano a donde iba a parar
      const quieto = performance.now() - arrastre.t > 90;
      const v = quieto ? 0 : limitar(arrastre.v, -9, 9);
      const fin = encajar(e.pos + v * cfg.planeo);
      deslizarA(fin, limitar(0.45 + Math.abs(fin - e.pos) * 0.3, cfg.duracionMin, cfg.duracionMax));
      setTimeout(() => { arrastre = null; }, 0);            // el clic que sigue a un arrastre no abre el cuadro
    };
    const fuera = () => { encima = null; };
    const rueda = (ev) => {                                  // un "paso" de rueda = un cuadro
      if (!libre()) return;
      const ahora = performance.now();
      if (ahora < ruedaHasta) return;
      ruedaAcum += Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      if (Math.abs(ruedaAcum) > 50) { pasoFlecha(Math.sign(ruedaAcum)); ruedaAcum = 0; ruedaHasta = ahora + 420; }
    };
    const tecla = (ev) => {
      if (!libre() || ev.target.closest?.('input, textarea, select')) return;
      if (ev.key === 'ArrowRight') { pasoFlecha(1); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { pasoFlecha(-1); ev.preventDefault(); }
      else if (ev.key === 'Home') deslizarA(minimo(), 1.1, 'power2.inOut');
      else if (ev.key === 'End') deslizarA(maximo(), 1.1, 'power2.inOut');
    };
    const enfoque = (ev) => {                                // Tab: el cuadro enfocado viene a la vista
      const el = ev.target.closest?.('.cuadro');
      if (el && libre() && ev.target.matches(':focus-visible')) controlRef.current.mostrar(Number(el.dataset.indice));
    };
    const redim = () => { escena.alRedimensionar(); if (faseRef.current === 'sala') saltarA(encajar(e.pos)); };
    // celular: el reflejo del vidrio acompaña la inclinación (solo donde no hace falta pedir permiso)
    const inclinacion = (ev) => { if (ev.gamma != null) controlRef.current.giro = limitar(ev.gamma / 35, -1, 1); };
    const conGiro = tactil && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function';
    if (conGiro) window.addEventListener('deviceorientation', inclinacion);

    sala.addEventListener('pointerdown', abajo);
    sala.addEventListener('pointermove', mover);
    sala.addEventListener('pointerup', arriba);
    sala.addEventListener('pointercancel', arriba);
    sala.addEventListener('pointerleave', fuera);
    sala.addEventListener('wheel', rueda, { passive: true });
    sala.addEventListener('focusin', enfoque);
    window.addEventListener('keydown', tecla);
    window.addEventListener('resize', redim);

    return () => {
      vivo = false;
      gsap.killTweensOf(e);
      sala.removeEventListener('pointerdown', abajo);
      sala.removeEventListener('pointermove', mover);
      sala.removeEventListener('pointerup', arriba);
      sala.removeEventListener('pointercancel', arriba);
      sala.removeEventListener('pointerleave', fuera);
      sala.removeEventListener('wheel', rueda);
      sala.removeEventListener('focusin', enfoque);
      window.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', redim);
      if (conGiro) window.removeEventListener('deviceorientation', inclinacion);
      escena.destruir();
    };
  }, []);

  // ═══════════════ antesala -> sala ═══════════════
  // la cámara avanza, se cruza un instante oscuro y se encienden los cuadros
  const entrar = useCallback(() => {
    if (faseRef.current !== 'antesala') return;
    ponerFase('entrando');
    const cam = camRef.current;
    const { duracionEntrada: d, zoomEntrada, oscuridadPaso } = pixiConfig.camara;
    const cruzar = () => {
      cam.zoom = 1;
      controlRef.current?.alEntrarASala();
      ponerFase('sala');
      navegar('/sala');
    };
    gsap.killTweensOf(cam);
    const tl = gsap.timeline();
    if (movimientoReducido()) {
      tl.to(cam, { expo: oscuridadPaso, duration: 0.3 }).add(cruzar).to(cam, { expo: 1, duration: 0.4 });
    } else {
      tl.to(cam, { zoom: zoomEntrada, duration: d * 0.6, ease: 'power2.in' }, 0)
        .to(cam, { expo: oscuridadPaso, duration: d * 0.3, ease: 'power1.in' }, d * 0.3)
        .add(cruzar, d * 0.6)
        .to(cam, { expo: 1, duration: d * 0.4, ease: 'power2.out' }, d * 0.6);
    }
  }, [navegar]);

  // ═══════════════ la ruta manda: antesala, sala o relato ═══════════════
  // (así funcionan el botón "atrás" del navegador y los enlaces directos a una foto)
  useEffect(() => {
    const ruta = ubicacion.pathname;
    const cam = camRef.current;
    const c = controlRef.current;
    const ind = indiceDeRuta(ruta, fotos);
    if (ind === -1) { navegar('/sala', { replace: true }); return; }      // foto que no existe

    // antesala <-> sala
    if (ruta === '/' && faseRef.current === 'sala') {
      gsap.killTweensOf(cam);
      relatoRef.current = null; cam.r = 0; setAbierto(null); c?.escena.fijarRelato(false);
      gsap.timeline()
        .to(cam, { expo: pixiConfig.camara.oscuridadPaso, duration: 0.3 })
        .add(() => { c?.alVolverAAntesala(); ponerFase('antesala'); })
        .to(cam, { expo: 1, duration: 0.5 });
      return;
    }
    if (ruta !== '/' && faseRef.current === 'antesala') { c?.alEntrarASala(); ponerFase('sala'); }
    if (!lista || !c) return;

    // sala <-> relato
    const { duracionAbrir, duracionCerrar } = pixiConfig.relato;
    const rapido = movimientoReducido();
    if (ind !== null && relatoRef.current !== ind) {
      if (c.estaVisible(ind)) c.frenar(); else c.mostrar(ind, true);
      relatoRef.current = ind;
      setAbierto(ind);
      c.escena.fijarRelato(true);
      gsap.to(cam, { r: 1, duration: rapido ? 0.01 : duracionAbrir, ease: 'power3.inOut', overwrite: 'auto' });
      document.title = `${fotos[ind].titulo} · Antonio Carrizo`;
    } else if (ind === null && relatoRef.current !== null) {
      const cerrado = relatoRef.current;
      setAbierto(null);
      c.escena.fijarRelato(false);
      gsap.to(cam, {
        r: 0, duration: rapido ? 0.01 : duracionCerrar, ease: 'power3.inOut', overwrite: 'auto',
        onComplete: () => {
          if (relatoRef.current === cerrado) relatoRef.current = null;
          cuadrosRef.current[cerrado]?.querySelector('.cuadro__boton')?.focus({ preventScroll: true });
        },
      });
      document.title = TITULO;
    }
  }, [ubicacion.pathname, lista, navegar, fotos]);

  const abrir = useCallback((i) => {
    if (controlRef.current?.fueArrastre() || relatoRef.current !== null) return;
    navegar(`/foto/${fotos[i].id}`, { state: { desdeSala: true } });
  }, [navegar, fotos]);

  const volver = useCallback(() => {
    if (ubicacion.state?.desdeSala) navegar(-1); else navegar('/sala', { replace: true });
  }, [navegar, ubicacion.state]);

  const guardarColor = useCallback((i, color) => { coloresRef.current[i] = color; }, []);

  const enRelato = abierto !== null;
  const clases = `sala sala--fase-${fase}${enRelato ? ' sala--relato' : ''}${vidrioCss ? ' sala--vidrio-css' : ''}`;

  return (
    <>
      <Loader visible={!lista} />
      <main className={clases} ref={salaRef} aria-label="Galería de fotos de Antonio Carrizo">
        {fase !== 'sala' && <Antesala lista={lista} saliendo={fase === 'entrando'} alEntrar={entrar} />}

        <div className="sala__html" ref={htmlRef} inert={fase !== 'sala' || enRelato ? '' : undefined}>
          <div className="sala__pista" ref={pistaRef}>
            {tam.alto > 0 && fotos.map((foto, i) => (
              <Cuadro
                key={foto.id} foto={foto} indice={i} paso={paso}
                altoSala={tam.alto} anchoSala={tam.ancho} abierto={abierto === i}
                ref={(el) => { cuadrosRef.current[i] = el; }}
                alAbrir={abrir} alCargarColor={guardarColor}
              />
            ))}
          </div>
        </div>

        <header className="sala__titulo">
          <span className="sala__linea" aria-hidden="true" />
          <h1>Antonio Carrizo <span aria-hidden="true">·</span> Galería</h1>
          <span className="sala__linea sala__linea--der" aria-hidden="true" />
        </header>

        <button type="button" className="flecha flecha--izq" aria-label="Foto anterior"
                disabled={extremo.inicio || fase !== 'sala' || enRelato} onClick={() => controlRef.current?.anterior()}>
          <svg viewBox="0 0 24 40" aria-hidden="true"><path d="M19 3 4 20l15 17" /></svg>
        </button>
        <button type="button" className="flecha flecha--der" aria-label="Foto siguiente"
                disabled={extremo.fin || fase !== 'sala' || enRelato} onClick={() => controlRef.current?.siguiente()}>
          <svg viewBox="0 0 24 40" aria-hidden="true"><path d="M5 3l15 17L5 37" /></svg>
        </button>

        <Relato foto={enRelato ? fotos[abierto] : null} alVolver={volver} />
      </main>
    </>
  );
}
