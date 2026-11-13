// vidrio.frag — reflejo diagonal del vidrio de cada cuadro.
// Se dibuja en un lienzo transparente POR ENCIMA de los marcos HTML.
// El perfil del brillo sale del canal B de la textura de máscaras.
precision highp float;

varying vec2 vUV;                 // 0..1 en pantalla, origen arriba-izquierda

uniform sampler2D uMasc;
uniform vec3  uTinte;
uniform float uBrillo;            // opacidad máxima del reflejo
uniform float uVelo;              // brillo parejo muy leve

// hasta 6 vidrios visibles a la vez
uniform vec4 uRect0; uniform vec4 uRect1; uniform vec4 uRect2;   // x, y, ancho, alto (0..1 de pantalla)
uniform vec4 uRect3; uniform vec4 uRect4; uniform vec4 uRect5;
uniform vec4 uPar0;  uniform vec4 uPar1;  uniform vec4 uPar2;    // x: corrimiento · y: intensidad
uniform vec4 uPar3;  uniform vec4 uPar4;  uniform vec4 uPar5;

float vidrio(vec4 r, vec4 p) {
  if (r.z <= 0.0) return 0.0;
  vec2 l = (vUV - r.xy) / r.zw;                       // coordenada dentro del vidrio
  if (l.x < 0.0 || l.x > 1.0 || l.y < 0.0 || l.y > 1.0) return 0.0;
  // el reflejo se corre en diagonal, como cuando te movés frente a un vidrio
  float d = (l.x + l.y) * 0.5 - p.x;                   // posición sobre la diagonal
  float perfil = texture2D(uMasc, vec2(clamp(d, 0.0, 1.0))).b;
  perfil *= 0.30 + 0.70 * pow(1.0 - l.y, 1.4);         // más fuerte arriba, de donde viene la luz
  // se apaga suave contra los bordes: nunca un corte duro
  float borde = smoothstep(0.0, 0.04, l.x) * smoothstep(1.0, 0.96, l.x)
              * smoothstep(0.0, 0.04, l.y) * smoothstep(1.0, 0.96, l.y);
  float velo = uVelo * (1.0 - l.y) * (1.0 - l.y);
  return (perfil * uBrillo * borde + velo) * p.y;
}

void main() {
  float a = vidrio(uRect0, uPar0) + vidrio(uRect1, uPar1) + vidrio(uRect2, uPar2)
          + vidrio(uRect3, uPar3) + vidrio(uRect4, uPar4) + vidrio(uRect5, uPar5);
  a = min(a, uBrillo + uVelo);                        // tope: jamás tapa la foto
  gl_FragColor = vec4(uTinte * a, a);                 // alfa premultiplicado
}
