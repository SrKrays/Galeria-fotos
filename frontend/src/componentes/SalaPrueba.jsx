// SalaPrueba — banco de pruebas del paso 3: la escena Pixi sin cuadros.
//   Arrastrar / rueda / flechas  -> desliza la pared (inercia + imán al foco)
//   Mouse sobre la pared         -> realza el foco más cercano
//   V  vidrios de prueba · R  modo relato · 1/2/3  calidad alto/medio/bajo
// En el paso 6 este componente se reemplaza por la sala definitiva.
import { useEffect, useRef, useState } from 'react';
import { EscenaSala } from '../pixi/EscenaSala.js';
import { pixiConfig } from '../pixi/pixiConfig.js';
import Loader from './Loader.jsx';

export default function SalaPrueba() {
  const salaRef = useRef(null);
  const htmlRef = useRef(null);
  const [lista, setLista] = useState(false);
  const [info, setInfo] = useState('');

  useEffect(() => {
    const sala = salaRef.current;
    const escena = new EscenaSala();
    const params = new URLSearchParams(location.search);
    let pos = Number(params.get('foco') ?? 0), vel = 0, arrastrando = false, ultimoX = 0, objetivo = null;
    let verVidrios = params.get('vidrios') === '1', mouse = null, vivo = true;
    const cajas = [];

    escena.iniciar(sala).then((estado) => {
      if (!vivo) return;
      if (params.get('relato') === '1') { escena.fijarRelato(true); escena.fijarFocoActivo(Math.round(pos)); }
      window.__escena = escena;                       // para inspeccionar desde la consola
      setLista(true);
      setInfo(estado.webgl ? '' : 'sin WebGL: imagen de respaldo');
      escena.antesDeCuadro(bucle);                    // un solo bucle: el de la escena
    });

    function bucle() {
      const { inercia, iman } = pixiConfig.desliz;
      if (objetivo !== null) {
        pos += (objetivo - pos) * 0.12;
        if (Math.abs(objetivo - pos) < 0.001) { pos = objetivo; objetivo = null; }
      } else if (!arrastrando) {
        pos += vel; vel *= inercia;
        if (Math.abs(vel) < 0.004) pos += (Math.round(pos) - pos) * iman;   // se alinea con su foco
      }
      escena.fijarScroll(pos);

      // foco activo: el más cercano al mouse (en celular, el del centro)
      if (!escena.relato) {
        if (mouse && mouse.y > 0.16 && mouse.y < 0.8) {
          escena.fijarFocoActivo(Math.round(pos + (mouse.x - sala.clientWidth / 2) / escena.pxPorFoco));
        } else {
          escena.fijarFocoActivo(matchMedia('(hover: none)').matches ? Math.round(pos) : null);
        }
      }

      // vidrios de prueba: uno bajo cada foco visible
      const vidrios = [];
      if (verVidrios) {
        const H = sala.clientHeight, alto = H * 0.3, ancho = alto * 0.78, y = H * 0.27;
        for (let n = Math.round(pos) - 2, i = 0; n <= Math.round(pos) + 2; n++, i++) {
          const x = escena.xDeFoco(n) - ancho / 2;
          const encima = mouse && mouse.x > x && mouse.x < x + ancho ? (mouse.x - x) / ancho - 0.5 : 0;
          vidrios.push({ x, y, ancho, alto, intensidad: 1, mouse: encima });
          cajas[i] ??= htmlRef.current.appendChild(Object.assign(document.createElement('div'), { className: 'prueba__vidrio' }));
          Object.assign(cajas[i].style, { display: '', left: `${x}px`, top: `${y}px`, width: `${ancho}px`, height: `${alto}px` });
        }
      } else cajas.forEach((c) => { c.style.display = 'none'; });
      escena.fijarVidrios(vidrios);
    }

    const abajo = (e) => { arrastrando = true; ultimoX = e.clientX; vel = 0; objetivo = null; sala.setPointerCapture(e.pointerId); };
    const mover = (e) => {
      const r = sala.getBoundingClientRect();
      mouse = e.pointerType === 'mouse' ? { x: e.clientX - r.left, y: (e.clientY - r.top) / r.height } : null;
      if (!arrastrando) return;
      const d = -(e.clientX - ultimoX) / escena.pxPorFoco;
      pos += d; vel = d; ultimoX = e.clientX;
    };
    const arriba = () => { arrastrando = false; };
    const fuera = () => { mouse = null; };
    const rueda = (e) => { vel += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.00035; objetivo = null; };
    const tecla = (e) => {
      if (e.key === 'ArrowRight') objetivo = Math.round(objetivo ?? pos) + 1;
      else if (e.key === 'ArrowLeft') objetivo = Math.round(objetivo ?? pos) - 1;
      else if (e.key === 'v') verVidrios = !verVidrios;
      else if (e.key === 'r') { escena.fijarRelato(!escena.relato); escena.fijarFocoActivo(escena.relato ? Math.round(pos) : null); }
      else if ('123'.includes(e.key)) escena.fijarCalidad(['alto', 'medio', 'bajo'][e.key - 1]);
    };
    const redim = () => escena.alRedimensionar();

    sala.addEventListener('pointerdown', abajo);
    sala.addEventListener('pointermove', mover);
    sala.addEventListener('pointerup', arriba);
    sala.addEventListener('pointercancel', arriba);
    sala.addEventListener('pointerleave', fuera);
    sala.addEventListener('wheel', rueda, { passive: true });
    window.addEventListener('keydown', tecla);
    window.addEventListener('resize', redim);
    const reloj = setInterval(() => {
      if (!escena.sinWebGL && escena.lista) setInfo(`calidad ${escena.calidad} · ${escena.fpsMedido ? escena.fpsMedido.toFixed(0) + ' fps' : '…'}${escena.reducido ? ' · movimiento reducido' : ''}`);
    }, 1000);

    return () => {
      vivo = false;
      clearInterval(reloj);
      sala.removeEventListener('pointerdown', abajo);
      sala.removeEventListener('pointermove', mover);
      sala.removeEventListener('pointerup', arriba);
      sala.removeEventListener('pointercancel', arriba);
      sala.removeEventListener('pointerleave', fuera);
      sala.removeEventListener('wheel', rueda);
      window.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', redim);
      cajas.forEach((c) => c.remove());
      escena.destruir();
    };
  }, []);

  return (
    <>
      <Loader visible={!lista} />
      <div className="sala" ref={salaRef}>
        <div className="sala__html" ref={htmlRef} />
        <div className="prueba__panel">
          {info || 'cargando…'}<br />
          ← → arrastrar · V vidrios · R relato · 1/2/3 calidad
        </div>
      </div>
    </>
  );
}
