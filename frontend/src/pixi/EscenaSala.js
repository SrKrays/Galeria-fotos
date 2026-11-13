/**
 * EscenaSala.js — la sala del museo dibujada con Pixi.
 *
 * Dos lienzos, un solo bucle de animación:
 *   · fondo  (detrás del HTML):   pared + luces vivas + polvo + piso reflectante
 *   · vidrio (delante del HTML):  reflejo diagonal sobre el vidrio de cada cuadro
 * Los marcos, placas y textos son HTML y van ENTRE los dos lienzos.
 *
 * Carga todo junto: imagen base + imagen de máscaras. `iniciar()` recién
 * resuelve cuando las dos texturas están listas y hay un cuadro dibujado.
 *
 * Unidad de posición: el "foco". El foco n está en x = n; `scroll` es el foco
 * (puede ser fraccionario) que queda en el centro de la pantalla.
 * Todos los números del look vienen de pixiConfig.js.
 */
import { Application, Assets, Container, Geometry, Mesh, Shader, Sprite, Texture } from 'pixi.js';
import vertice from './shaders/pantalla.vert?raw';
import fragSala from './shaders/sala.frag?raw';
import fragVidrio from './shaders/vidrio.frag?raw';
import meta from './salaMeta.json';
import { pixiConfig } from './pixiConfig.js';
import { bajarNivel, calidadForzada, detectarCalidad, movimientoReducido, soportaWebGL } from './calidad.js';

const MAX_VIDRIOS = 6;
const MAX_CUADROS = 6;
const TABLA_FOCOS = 8;
const DOS_PI = Math.PI * 2;

const fract = (x) => x - Math.floor(x);
const azar = (n, semilla) => fract(Math.sin(n * 127.1 + semilla * 311.7) * 43758.5453); // estable por foco
const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function rectanguloPantalla() {
  return new Geometry({
    attributes: {
      aPosition: [-1, -1, 1, -1, 1, 1, -1, 1],
      aUV: [0, 1, 1, 1, 1, 0, 0, 0],
    },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  });
}

function texturaMota() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const d = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  d.addColorStop(0, 'rgba(255,236,200,1)');
  d.addColorStop(0.35, 'rgba(255,224,170,0.55)');
  d.addColorStop(1, 'rgba(255,210,150,0)');
  g.fillStyle = d;
  g.fillRect(0, 0, 32, 32);
  return Texture.from(c);
}

export class EscenaSala {
  constructor(config = pixiConfig) {
    this.cfg = config;
    this.meta = meta;
    this.calidad = detectarCalidad();
    this.reducido = movimientoReducido();
    this.sinWebGL = false;
    this.lista = false;

    // estado que maneja la interfaz
    this.scroll = 0;
    this.focoActivo = null;
    this.relato = false;
    this.zoom = 1;
    this.zoomDesde = [0.5, 0.5];    // punto de la sala que se toma (0..1)…
    this.zoomHasta = [0.5, 0.5];    // …y a qué punto de la pantalla va a parar
    this.vidrios = [];              // [{x, y, ancho, alto, intensidad, mouse}] en px CSS
    this.cuadros = [];              // [{x, medioAncho, color:[r,g,b], foco}] para el reflejo en el piso
    this.giro = 0;                  // inclinación del celular, -1..1
    this.exposicion = 1;            // 1 = normal, 0 = sala a oscuras (transiciones)

    // estado interno
    this._t = 0;
    this._scrollPrevio = 0;
    this._scrollPiso = 0;
    this._vel = 0;
    this._ambiente = config.luces.ambiente;
    this._focos = new Map();        // índice -> {k, parpadeo}
    this._ganancias = new Map();
    this._motas = [];
    this._fps = { suma: 0, cuadros: 0 };
    this._alCambiarCalidad = null;
    this._cuadro = this._cuadro.bind(this);
  }

  /** px de pantalla entre un foco y el siguiente */
  get pxPorFoco() {
    return this.meta.aspecto * 0.5 * this.alto * this.zoom;
  }

  /** x en pantalla (px CSS) del eje del foco n */
  xDeFoco(n) {
    const x0 = this.ancho / 2 + (n - this.scroll) * (this.pxPorFoco / this.zoom);   // sin zoom
    return (x0 - this.zoomDesde[0] * this.ancho) * this.zoom + this.zoomHasta[0] * this.ancho;
  }

  get ancho() { return this.contenedor.clientWidth; }
  get alto() { return this.contenedor.clientHeight; }

  // ─────────────────────────── arranque ───────────────────────────
  async iniciar(contenedor, { capaVidrio = contenedor } = {}) {
    this.contenedor = contenedor;
    const { recursos } = this.cfg;

    if (!soportaWebGL()) return this._respaldo();

    try {
      const q = this.cfg.calidad[this.calidad];
      const resolucion = Math.min(window.devicePixelRatio || 1, q.resolucionMax);
      const comun = { resizeTo: contenedor, resolution: resolucion, autoDensity: true, antialias: false,
                      preference: 'webgl', powerPreference: 'high-performance' };

      this.fondo = new Application();
      this.vidrio = new Application();
      const rutaBase = q.baseMovil ? recursos.baseMovil : recursos.base;

      // TODO JUNTO: los dos renderers y las dos texturas, en una sola espera
      const [, , texturas] = await Promise.all([
        this.fondo.init({ ...comun, background: 0x050403 }),
        this.vidrio.init({ ...comun, backgroundAlpha: 0, autoStart: false }),
        Assets.load([rutaBase, recursos.mascaras]),
      ]);
      if (this._destruida) return this._soltar();
      const base = texturas[rutaBase];
      const mascaras = texturas[recursos.mascaras];
      for (const t of [base, mascaras]) {
        t.source.scaleMode = 'linear';
        t.source.addressMode = 'clamp-to-edge';   // el mosaico se repite en el shader (sirve en WebGL1)
      }

      this._armarFondo(base, mascaras);
      this._armarVidrio(mascaras);

      for (const [app, capa, z] of [[this.fondo, contenedor, 0], [this.vidrio, capaVidrio, 3]]) {
        Object.assign(app.canvas.style, { position: 'absolute', inset: '0', zIndex: z, pointerEvents: 'none' });
        app.canvas.setAttribute('aria-hidden', 'true');
        capa.appendChild(app.canvas);
      }
      this.vidrio.canvas.style.display = q.vidrio ? '' : 'none';

      this._limitarFps(q.fps);
      this._crearMotas();
      this._cuadro({ deltaMS: 16 });               // primer cuadro ya dibujado antes de mostrar
      this.fondo.ticker.add(this._cuadro);
      this.lista = true;
      return { webgl: true, calidad: this.calidad };
    } catch (error) {
      console.warn('[sala] WebGL falló, uso imagen de respaldo:', error);
      this._soltar();
      return this._respaldo();
    }
  }

  _respaldo() {
    // sin WebGL: la misma sala, quieta
    this.sinWebGL = true;
    this.lista = true;
    return new Promise((resolver) => {
      const img = new Image();
      const listo = () => {
        Object.assign(this.contenedor.style, {
          backgroundImage: `url(${this.cfg.recursos.respaldo})`,
          backgroundSize: 'auto 100%', backgroundPosition: 'center', backgroundColor: '#050403',
        });
        resolver({ webgl: false, calidad: 'respaldo' });
      };
      img.onload = listo;
      img.onerror = listo;
      img.src = this.cfg.recursos.respaldo;
    });
  }

  _armarFondo(base, mascaras) {
    const { luces, piso } = this.cfg;
    this.uSala = {
      uRes: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
      uTiempo: { value: 0, type: 'f32' },
      uAspectoBase: { value: this.meta.aspecto, type: 'f32' },
      uFoco0: { value: new Float32Array([this.meta.focos[0].x, this.meta.focos[0].y]), type: 'vec2<f32>' },
      uPisoY: { value: this.meta.pisoY, type: 'f32' },
      uScroll: { value: 0, type: 'f32' },
      uScrollPiso: { value: 0, type: 'f32' },
      uVelocidad: { value: 0, type: 'f32' },
      uZoom: { value: 1, type: 'f32' },
      uZoomDesde: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
      uZoomHasta: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
      uFocoBase: { value: 0, type: 'f32' },
      uGanA: { value: new Float32Array([1, 1, 1, 1]), type: 'vec4<f32>' },
      uGanB: { value: new Float32Array([1, 1, 1, 1]), type: 'vec4<f32>' },
      uAmbiente: { value: luces.ambiente, type: 'f32' },
      uCalidez: { value: luces.calidez, type: 'f32' },
      uColorLuz: { value: new Float32Array(luces.color), type: 'vec3<f32>' },
      uPisoFuerza: { value: piso.fuerza, type: 'f32' },
      uPisoSeguir: { value: piso.seguirLuz, type: 'f32' },
      uOnda: { value: piso.ondulacion, type: 'f32' },
      uOndaDesliz: { value: piso.ondulacionAlDeslizar, type: 'f32' },
      uOndaFrec: { value: piso.frecuencia, type: 'f32' },
      uOndaVel: { value: piso.velocidadOnda, type: 'f32' },
      uReflejoCuadro: { value: piso.reflejoCuadro, type: 'f32' },
      uExposicion: { value: 1, type: 'f32' },
    };
    for (let i = 0; i < MAX_CUADROS; i++) {
      this.uSala[`uCua${i}`] = { value: new Float32Array(4), type: 'vec4<f32>' };
      this.uSala[`uCuaCol${i}`] = { value: new Float32Array(3), type: 'vec3<f32>' };
    }
    const shader = Shader.from({
      gl: { vertex: vertice, fragment: fragSala },
      resources: { uBase: base.source, uMasc: mascaras.source, sala: this.uSala },
    });
    // Pixi copia los valores a su propio grupo: desde acá se escribe SIEMPRE en ese grupo
    this.uSala = shader.resources.sala.uniforms;
    this.mallaSala = new Mesh({ geometry: rectanguloPantalla(), shader });
    this.capaPolvo = new Container();
    this.capaPolvo.blendMode = 'add';
    this.fondo.stage.addChild(this.mallaSala, this.capaPolvo);
    this._mota = texturaMota();
  }

  _armarVidrio(mascaras) {
    const { vidrio } = this.cfg;
    this.uVidrio = {
      uTinte: { value: new Float32Array(vidrio.color), type: 'vec3<f32>' },
      uBrillo: { value: vidrio.brillo, type: 'f32' },
      uVelo: { value: vidrio.velo, type: 'f32' },
    };
    for (let i = 0; i < MAX_VIDRIOS; i++) {
      this.uVidrio[`uRect${i}`] = { value: new Float32Array(4), type: 'vec4<f32>' };
      this.uVidrio[`uPar${i}`] = { value: new Float32Array(4), type: 'vec4<f32>' };
    }
    const shader = Shader.from({
      gl: { vertex: vertice, fragment: fragVidrio },
      resources: { uMasc: mascaras.source, vidrio: this.uVidrio },
    });
    this.uVidrio = shader.resources.vidrio.uniforms;
    this.mallaVidrio = new Mesh({ geometry: rectanguloPantalla(), shader });
    this.vidrio.stage.addChild(this.mallaVidrio);
  }

  // ─────────────────────────── polvo ───────────────────────────
  _crearMotas() {
    for (const m of this._motas) m.sprite.destroy();
    this._motas = [];
    const porFoco = this.cfg.polvo.porFoco[this.calidad] ?? 0;
    this._columnas = Math.ceil(this.ancho / Math.max(1, this.pxPorFoco / this.zoom)) + 2;
    const [tMin, tMax] = this.cfg.polvo.tamano;
    for (let col = 0; col < this._columnas; col++) {
      for (let j = 0; j < porFoco; j++) {
        const sprite = new Sprite(this._mota);
        sprite.anchor.set(0.5);
        const lado = (Math.random() + Math.random() + Math.random()) / 1.5 - 1;   // -1..1, más denso al centro
        this._motas.push({
          sprite, col, lado,
          y: Math.random(),
          vy: (Math.random() - 0.5) * 2,
          fase: Math.random() * DOS_PI,
          ritmo: 0.5 + Math.random(),
          tam: tMin + Math.random() * (tMax - tMin),
        });
        this.capaPolvo.addChild(sprite);
      }
    }
  }

  _moverMotas(dt) {
    const { polvo } = this.cfg;
    const red = this.reducido ? this.cfg.movimientoReducido.polvo : 1;
    const H = this.alto;
    const yLampara = this.meta.focos[0].y + 0.02;
    const yFin = this.meta.zocaloY - 0.02;
    const primera = Math.floor(this.scroll - this._columnas / 2) + 1;

    for (const m of this._motas) {
      // deriva lenta: sube o baja y vuelve a entrar por el otro extremo
      m.y += m.vy * polvo.velocidad * red * dt;
      if (m.y > 1) m.y -= 1; else if (m.y < 0) m.y += 1;
      const y = yLampara + m.y * (yFin - yLampara);

      const lado = m.lado + Math.sin(this._t * 0.13 * m.ritmo + m.fase) * 0.28 * red
                 + Math.sin(this._t * polvo.vaiven * 60 * m.ritmo + m.fase * 2) * 0.05 * red;
      const medioAncho = polvo.anchoArriba + polvo.aperturaCono * (y - yLampara);  // en "altos"

      // a qué foco pertenece ahora (las columnas se reciclan al deslizar)
      const foco = primera + ((((m.col - primera) % this._columnas) + this._columnas) % this._columnas);
      const x = this.xDeFoco(foco) + lado * medioAncho * H * this.zoom;
      const yPx = (y - this.zoomDesde[1]) * H * this.zoom + this.zoomHasta[1] * H;

      // brilla más al cruzar el centro del haz; se apaga cerca de la lámpara y del zócalo
      const haz = Math.exp(-2.2 * lado * lado);
      const vertical = suave(0, 0.08, m.y) * (1 - suave(0.55, 1, m.y) * 0.85);
      const chispa = 1 - polvo.centelleo * (0.5 + 0.5 * Math.sin(this._t * 1.7 * m.ritmo + m.fase));
      const g = this._ganancias.get(foco) ?? 1;

      m.sprite.position.set(x, yPx);
      m.sprite.scale.set((m.tam * this.zoom) / 16);
      m.sprite.alpha = Math.min(1, polvo.brillo * haz * vertical * chispa * g * g) * this.exposicion;
    }
  }

  // ─────────────────────────── luces ───────────────────────────
  _gananciaFoco(n, dt) {
    const { luces } = this.cfg;
    const red = this.reducido ? this.cfg.movimientoReducido : null;
    let e = this._focos.get(n);
    if (!e) {
      e = { k: 1, parpadeo: -1 };
      this._focos.set(n, e);
    }

    // respiración lenta e irregular (tres ondas desfasadas, distintas en cada foco)
    const r = luces.respiracion;
    const w = DOS_PI * r.velocidad * this._t;
    const f1 = azar(n, 1) * DOS_PI, f2 = azar(n, 2) * DOS_PI, f3 = azar(n, 3) * DOS_PI;
    const onda = (1 - r.irregularidad) * Math.sin(w + f1)
               + r.irregularidad * (0.6 * Math.sin(w * 1.73 + f2) + 0.4 * Math.sin(w * 0.41 + f3));
    const respira = 1 + r.amplitud * (red ? red.respiracion : 1) * onda;

    // parpadeo muy ocasional: una caída corta y suave, nunca un apagón
    const p = luces.parpadeo;
    let caida = 0;
    if (e.parpadeo < 0) {
      const permitido = !red || red.parpadeo > 0;
      if (permitido && n !== this.focoActivo && Math.random() < dt / p.cadaSegundos) e.parpadeo = 0;
    } else {
      e.parpadeo += dt / p.duracion;
      if (e.parpadeo >= 1) e.parpadeo = -1;
      else caida = p.profundidad * Math.sin(Math.PI * e.parpadeo) * (0.65 + 0.35 * Math.cos(e.parpadeo * 5 * Math.PI));
    }

    // realce del cuadro activo: sube gradual, los otros bajan un poco
    let meta_ = 1;
    if (this.focoActivo !== null) {
      if (n === this.focoActivo) meta_ = 1 + (this.relato ? luces.relato.realce : luces.foco.realce);
      else meta_ = this.relato ? luces.relato.otrosFocos : 1 - luces.foco.atenuarOtros;
    }
    e.k += (meta_ - e.k) * (1 - Math.exp(-luces.foco.suavidad * dt));

    return luces.intensidad * respira * (1 - caida) * e.k;
  }

  // ─────────────────────────── bucle ───────────────────────────
  _cuadro(ticker) {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    this._t += dt;
    // la interfaz mueve scroll, cuadros y vidrios ACÁ, en el mismo cuadro que se dibuja:
    // así el HTML y los dos lienzos nunca quedan desfasados
    this._antesDeCuadro?.(dt);
    const { luces, piso, vidrio } = this.cfg;
    const W = this.ancho, H = this.alto;
    const u = this.uSala;

    // desliz: velocidad suavizada y reflejo del piso que llega un poco tarde
    const velInst = (this.scroll - this._scrollPrevio) / Math.max(dt, 1e-3);
    this._scrollPrevio = this.scroll;
    this._vel += (velInst - this._vel) * Math.min(1, dt * 10);
    const sinOnda = this.reducido && this.cfg.movimientoReducido.ondulacion === 0;
    this._scrollPiso = sinOnda || piso.retraso <= 0
      ? this.scroll
      : this._scrollPiso + (this.scroll - this._scrollPiso) * (1 - Math.exp(-dt / piso.retraso));

    // luces: una ganancia por foco visible
    const baseFoco = Math.floor(this.scroll) - 3;
    for (let i = 0; i < TABLA_FOCOS; i++) {
      const g = this._gananciaFoco(baseFoco + i, dt);
      this._ganancias.set(baseFoco + i, g);
      (i < 4 ? u.uGanA : u.uGanB)[i % 4] = g;
    }
    for (const n of this._focos.keys()) {
      if (n < baseFoco - 4 || n > baseFoco + TABLA_FOCOS + 4) { this._focos.delete(n); this._ganancias.delete(n); }
    }
    const ambienteMeta = this.relato ? luces.relato.ambiente : luces.ambiente;
    this._ambiente += (ambienteMeta - this._ambiente) * (1 - Math.exp(-luces.foco.suavidad * dt));

    u.uRes[0] = W; u.uRes[1] = H;
    u.uTiempo = this._t;
    u.uScroll = this.scroll;
    u.uScrollPiso = this._scrollPiso;
    u.uVelocidad = this._vel;
    u.uZoom = this.zoom;
    u.uZoomDesde[0] = this.zoomDesde[0]; u.uZoomDesde[1] = this.zoomDesde[1];
    u.uZoomHasta[0] = this.zoomHasta[0]; u.uZoomHasta[1] = this.zoomHasta[1];
    u.uFocoBase = baseFoco;
    u.uAmbiente = this._ambiente;
    u.uExposicion = this.exposicion;
    // valores de ajuste: se releen cada cuadro, así un cambio en pixiConfig se ve al instante
    u.uCalidez = luces.calidez;
    u.uPisoFuerza = piso.fuerza;
    u.uPisoSeguir = piso.seguirLuz;
    u.uOnda = sinOnda ? 0 : piso.ondulacion;
    u.uOndaDesliz = sinOnda ? 0 : piso.ondulacionAlDeslizar;
    u.uOndaFrec = piso.frecuencia;
    u.uOndaVel = piso.velocidadOnda;

    // reflejo de cada cuadro en el piso (sigue la luz de su foco)
    u.uReflejoCuadro = piso.reflejoCuadro;
    for (let i = 0; i < MAX_CUADROS; i++) {
      const c = this.cuadros[i];
      const q = u[`uCua${i}`];
      if (!c) { q[2] = 0; continue; }
      q[0] = c.x / W; q[1] = c.medioAncho / W;
      q[2] = this._ganancias.get(c.foco) ?? 1;
      u[`uCuaCol${i}`].set(c.color);
    }

    this._moverMotas(dt);

    // vidrio: un reflejo por cuadro visible
    if (this.cfg.calidad[this.calidad].vidrio) {
      const v = this.uVidrio;
      const deriva = this.reducido && this.cfg.movimientoReducido.derivaVidrio === 0 ? 0 : 1;
      v.uBrillo = vidrio.brillo * (this.relato ? vidrio.calmaEnRelato : 1);
      v.uVelo = vidrio.velo;
      for (let i = 0; i < MAX_VIDRIOS; i++) {
        const r = this.vidrios[i];
        const rect = v[`uRect${i}`], par = v[`uPar${i}`];
        if (!r) { rect[2] = 0; continue; }
        rect[0] = r.x / W; rect[1] = r.y / H; rect[2] = r.ancho / W; rect[3] = r.alto / H;
        const centro = (r.x + r.ancho / 2) / W - 0.5;
        par[0] = Math.sin(this._t * vidrio.deriva * DOS_PI + i * 1.9) * vidrio.recorridoDeriva * deriva
               + centro * vidrio.porDesliz * (this.relato ? 0 : 1)
               + (r.mouse ?? 0) * vidrio.porMouse
               + this.giro * vidrio.porGiro;
        par[1] = r.intensidad ?? 1;
      }
      this.vidrio.render();
    }

    this._vigilarFps(ticker.deltaMS);
  }

  // si el equipo no da, baja un nivel de calidad solo
  _vigilarFps(ms) {
    if (document.hidden) return;
    const fija = calidadForzada();                 // con ?calidad=… no se baja sola
    const { autoBajar } = this.cfg.calidad;
    this._fps.suma += ms; this._fps.cuadros++;
    if (this._fps.suma < autoBajar.ventana * 1000) return;
    const fps = (this._fps.cuadros * 1000) / this._fps.suma;
    this._fps = { suma: 0, cuadros: 0 };
    this.fpsMedido = fps;
    const tope = this.cfg.calidad[this.calidad].fps;
    if (fps < Math.min(autoBajar.fpsMinimo, tope * 0.7) && this.calidad !== 'bajo' && !fija) {
      this.fijarCalidad(bajarNivel(this.calidad));
    }
  }

  // ─────────────────────────── API para la interfaz ───────────────────────────
  fijarCalidad(nivel) {
    if (this.sinWebGL || nivel === this.calidad) return;
    this.calidad = nivel;
    const q = this.cfg.calidad[nivel];
    const resolucion = Math.min(window.devicePixelRatio || 1, q.resolucionMax);
    for (const app of [this.fondo, this.vidrio]) {
      app.renderer.resolution = resolucion;
      app.renderer.resize(this.ancho, this.alto);
    }
    this.vidrio.canvas.style.display = q.vidrio ? '' : 'none';
    this._limitarFps(q.fps);
    this._crearMotas();
    this._alCambiarCalidad?.(nivel);
  }

  // A 60 no se pone tope: el tope de Pixi, igual al refresco del monitor, saltea cuadros.
  _limitarFps(fps) { this.fondo.ticker.maxFPS = fps >= 60 ? 0 : fps; }

  /** true si el reflejo del vidrio lo dibuja el shader; false = lo hace el CSS (calidad baja o sin WebGL) */
  get vidrioConShader() { return !this.sinWebGL && this.cfg.calidad[this.calidad].vidrio; }

  fijarCuadros(lista) { this.cuadros = lista; }
  alCambiarCalidad(fn) { this._alCambiarCalidad = fn; }
  antesDeCuadro(fn) { this._antesDeCuadro = fn; }
  fijarScroll(x) { this.scroll = x; }
  fijarFocoActivo(n) { this.focoActivo = n; }
  fijarRelato(activo) { this.relato = activo; }
  /** zoom: el punto `desde` de la sala (0..1) queda en el punto `hasta` de la pantalla */
  fijarZoom(zoom, desde = [0.5, 0.5], hasta = desde) { this.zoom = zoom; this.zoomDesde = desde; this.zoomHasta = hasta; }
  fijarVidrios(lista) { this.vidrios = lista; }
  fijarExposicion(e) { this.exposicion = e; }
  fijarGiro(g) { this.giro = Math.max(-1, Math.min(1, g)); }
  alRedimensionar() { if (!this.sinWebGL && this.lista) this._crearMotas(); }

  _soltar() {
    for (const app of [this.fondo, this.vidrio]) {
      try { app?.destroy({ removeView: true }, { children: true }); } catch { /* ya destruida */ }
    }
    this.fondo = this.vidrio = null;
  }

  destruir() {
    this._destruida = true;
    this.lista = false;
    this.fondo?.ticker?.remove(this._cuadro);
    this._soltar();
  }
}
