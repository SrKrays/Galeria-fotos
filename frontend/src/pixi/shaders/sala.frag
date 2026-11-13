// sala.frag — pared, luces vivas y piso reflectante.
// GLSL ES 1.00 a propósito: corre igual en WebGL1 (celulares viejos) y WebGL2.
precision highp float;

varying vec2 vUV;                 // 0..1 en pantalla, origen arriba-izquierda

uniform sampler2D uBase;          // imagen base (mosaico horizontal)
uniform sampler2D uMasc;          // R conos · G piso · B vidrio

uniform vec2  uRes;               // tamaño del lienzo en px
uniform float uTiempo;
uniform float uAspectoBase;       // ancho/alto del mosaico
uniform vec2  uFoco0;             // x,y del primer foco dentro del mosaico (0..1)
uniform float uPisoY;             // dónde empieza el piso (0..1)

uniform float uScroll;            // posición de la cámara, en "focos"
uniform float uScrollPiso;        // lo mismo pero con retraso (reflejo húmedo)
uniform float uVelocidad;         // velocidad del desliz (focos/seg, con signo)
uniform float uZoom;
uniform vec2  uZoomDesde;         // punto de la sala que se toma…
uniform vec2  uZoomHasta;         // …y dónde queda en pantalla

uniform float uFocoBase;          // índice del primer foco de la tabla de ganancias
uniform vec4  uGanA;              // ganancia de los focos base+0..3
uniform vec4  uGanB;              // ganancia de los focos base+4..7
uniform float uAmbiente;
uniform float uCalidez;
uniform vec3  uColorLuz;
uniform float uExposicion;       // 1 normal · 0 a oscuras

uniform float uPisoFuerza;
uniform float uPisoSeguir;
uniform float uOnda;
uniform float uOndaDesliz;
uniform float uOndaFrec;
uniform float uOndaVel;

// reflejo de los cuadros en el piso (hasta 6 visibles)
uniform float uReflejoCuadro;
uniform vec4 uCua0; uniform vec4 uCua1; uniform vec4 uCua2;      // x centro, medio ancho (0..1 de pantalla), luz de su foco
uniform vec4 uCua3; uniform vec4 uCua4; uniform vec4 uCua5;
uniform vec3 uCuaCol0; uniform vec3 uCuaCol1; uniform vec3 uCuaCol2;
uniform vec3 uCuaCol3; uniform vec3 uCuaCol4; uniform vec3 uCuaCol5;

// mancha alargada y difusa bajo el cuadro: más ancha y más tenue cuanto más lejos
vec3 reflejoCuadro(vec4 q, vec3 col, float x, float prof) {
  if (q.z <= 0.0) return vec3(0.0);
  float d = abs(x - q.x) / q.y;
  float h = 1.0 - smoothstep(0.45, 1.25 + prof * 0.9, d);
  return col * h * q.z;
}

float ganancia(float i) {
  float j = i - uFocoBase;
  if (j < 0.5) return uGanA.x;
  if (j < 1.5) return uGanA.y;
  if (j < 2.5) return uGanA.z;
  if (j < 3.5) return uGanA.w;
  if (j < 4.5) return uGanB.x;
  if (j < 5.5) return uGanB.y;
  if (j < 6.5) return uGanB.z;
  return uGanB.w;
}

// ganancia del foco que ilumina la columna c (c entero = eje de un foco);
// entre dos focos se funde suave para que nunca haya un corte duro
float gananciaEn(float c) {
  float i = floor(c);
  float t = smoothstep(0.30, 0.70, c - i);
  return mix(ganancia(i), ganancia(i + 1.0), t);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  vec2 uv = (vUV - uZoomHasta) / uZoom + uZoomDesde;
  float xh = (uv.x - 0.5) * uRes.x / uRes.y;          // x en "altos de pantalla"
  float porFoco = uAspectoBase * 0.5;                 // un foco cada medio mosaico

  // columna de foco (continua) y coordenada dentro del mosaico
  float c = xh / porFoco + uScroll;
  vec2 t = vec2(fract(c * 0.5 + uFoco0.x), uv.y);

  float piso = texture2D(uMasc, t).g;
  vec3 color = vec3(0.0);

  if (piso < 0.999) {
    // ── pared: la máscara R dice cuánta luz de foco recibe cada punto ──
    vec3 base = texture2D(uBase, t).rgb;
    float cono = texture2D(uMasc, t).r;
    float g = gananciaEn(c);
    float mezcla = pow(cono, 0.55);
    color = base * mix(uAmbiente, g, mezcla);
    color += uColorLuz * cono * max(g - 1.0, 0.0) * uCalidez;
  }

  if (piso > 0.001) {
    // ── piso: profundidad 0 en el zócalo, 1 en el borde inferior ──
    float prof = clamp((uv.y - uPisoY) / (1.0 - uPisoY), 0.0, 1.0);
    float atraso = (uScrollPiso - uScroll) * prof;                  // llega tarde
    float amp = (uOnda + uOndaDesliz * min(abs(uVelocidad), 3.0)) * (0.25 + prof);
    float onda = sin(uv.y * uOndaFrec * 6.2832 - uTiempo * uOndaVel * 6.2832
                     + sin(c * 1.7) * 0.6) * amp;
    float cp = c + atraso + onda / porFoco;
    vec2 tp = vec2(fract(cp * 0.5 + uFoco0.x), uv.y);
    vec3 basePiso = texture2D(uBase, tp).rgb;

    // lo brillante del piso ES el reflejo del foco: respira con él
    float brillo = smoothstep(0.06, 0.45, luma(basePiso));
    float g = mix(1.0, gananciaEn(cp), uPisoSeguir);
    vec3 cPiso = basePiso * mix(mix(uAmbiente, 1.0, 0.35), g * uPisoFuerza, brillo);

    // cuadros reflejados: usan el mismo pulido del piso para no verse "pegados"
    float xs = vUV.x + (onda + atraso * porFoco) * uRes.y / uRes.x * uZoom;
    vec3 rc = reflejoCuadro(uCua0, uCuaCol0, xs, prof) + reflejoCuadro(uCua1, uCuaCol1, xs, prof)
            + reflejoCuadro(uCua2, uCuaCol2, xs, prof) + reflejoCuadro(uCua3, uCuaCol3, xs, prof)
            + reflejoCuadro(uCua4, uCuaCol4, xs, prof) + reflejoCuadro(uCua5, uCuaCol5, xs, prof);
    float caida = exp(-prof * 2.4) * smoothstep(0.0, 0.05, prof);
    cPiso += rc * caida * uReflejoCuadro * (0.16 + 2.4 * luma(basePiso));
    color = mix(color, cPiso, piso);
  }

  gl_FragColor = vec4(color * uExposicion, 1.0);
}
