// pantalla.vert — un rectángulo que cubre todo el lienzo.
attribute vec2 aPosition;         // -1..1
attribute vec2 aUV;               // 0..1, origen arriba-izquierda
varying vec2 vUV;

void main() {
  vUV = aUV;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
