/**
 * Registro de estilos de marco.
 *
 * Para sumar un estilo nuevo (quinto, sexto…):
 *   1. creá `src/marcos/<id>.css` con la clase `.marco--<id>`
 *   2. agregá una entrada acá abajo e importá el CSS
 * No hay que tocar nada más: la sala, el vidrio y el reflejo del piso
 * leen todo de este registro.
 *
 * Medidas en fracción del ALTO de la sala (así escalan igual en cualquier pantalla):
 *   grosor    ancho de la moldura
 *   paspartu  ancho del paspartú (0 = sin paspartú)
 *   reflejo   color [r,g,b] con que el marco tiñe su reflejo en el piso
 */
import './base.css';
import './dorado.css';
import './negro.css';
import './madera.css';
import './plateado.css';

export const MARCOS = {
  dorado:   { nombre: 'Dorado ornamentado clásico', uso: 'Fotos históricas, las más importantes',
              grosor: 0.036, paspartu: 0,     reflejo: [0.95, 0.66, 0.24] },
  negro:    { nombre: 'Negro minimalista',          uso: 'Paisajes urbanos y fotos de época',
              grosor: 0.011, paspartu: 0.036, reflejo: [0.62, 0.58, 0.50] },
  madera:   { nombre: 'Madera oscura',              uso: 'Escenas de gente y plaza',
              grosor: 0.024, paspartu: 0.011, reflejo: [0.70, 0.36, 0.16] },
  plateado: { nombre: 'Plateado fino moderno',      uso: 'Retratos',
              grosor: 0.012, paspartu: 0.032, reflejo: [0.70, 0.68, 0.64] },
};

export const MARCO_POR_DEFECTO = 'negro';

export function marcoDe(id) {
  return MARCOS[id] ?? MARCOS[MARCO_POR_DEFECTO];
}

/**
 * Medidas en px de un cuadro para una sala de `alto` × `ancho` px.
 * La misma cuenta la usan el HTML, el vidrio del shader y el reflejo del piso.
 */
export function medidasCuadro(foto, alto, ancho) {
  const m = marcoDe(foto.marco);
  // lado largo de la foto: las apaisadas mandan por ancho, las verticales por alto
  let fotoAncho = foto.aspecto >= 1 ? 0.33 * alto : 0.27 * alto * foto.aspecto;
  let fotoAlto = fotoAncho / foto.aspecto;
  let grosor = m.grosor * alto;
  let paspartu = m.paspartu * alto;
  // en pantallas angostas el cuadro nunca pasa del 84 % del ancho
  const total = fotoAncho + 2 * (grosor + paspartu);
  const k = Math.min(1, (0.84 * ancho) / total);
  fotoAncho *= k; fotoAlto *= k; grosor *= k; paspartu *= k;
  const anchoExt = fotoAncho + 2 * (grosor + paspartu);
  const altoExt = fotoAlto + 2 * (grosor + paspartu);
  return {
    fotoAncho, fotoAlto, grosor, paspartu, anchoExt, altoExt,
    arriba: 0.425 * alto - altoExt / 2,           // el centro del cuadro va al 42,5 % del alto
    vidrio: { dx: grosor, dy: grosor, ancho: anchoExt - 2 * grosor, alto: altoExt - 2 * grosor },
  };
}
