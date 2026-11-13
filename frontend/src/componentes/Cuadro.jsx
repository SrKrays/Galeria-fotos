// Cuadro — un marco con su foto, su vidrio y su placa. Todo HTML y CSS:
// la foto no recibe ningún shader; el reflejo del vidrio lo pone Pixi por encima.
import { forwardRef } from 'react';
import { marcoDe, medidasCuadro } from '../marcos/index.js';
import Placa from './Placa.jsx';

const Cuadro = forwardRef(function Cuadro({ foto, indice, altoSala, anchoSala, paso, abierto, alAbrir, alCargarColor }, ref) {
  const marco = marcoDe(foto.marco);
  const m = medidasCuadro(foto, altoSala, anchoSala);

  // color medio de la foto: tiñe el reflejo del cuadro en el piso
  const alCargar = (e) => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 4;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(e.currentTarget, 0, 0, 4, 4);
      const d = g.getImageData(0, 0, 4, 4).data;
      let r = 0, v = 0, a = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; v += d[i + 1]; a += d[i + 2]; }
      alCargarColor?.(indice, [r / 4080, v / 4080, a / 4080]);
    } catch { /* imagen de otro dominio: queda el color del marco */ }
  };

  return (
    <article
      ref={ref}
      className={`cuadro${abierto ? ' cuadro--abierto' : ''}`}
      data-indice={indice}
      style={{ left: `${indice * paso}px`, '--u': `${altoSala}px`, '--g': `${m.grosor}px`, '--p': `${m.paspartu}px` }}
    >
      <button
        type="button"
        className="cuadro__boton"
        style={{ top: `${m.arriba}px`, width: `${m.anchoExt}px`, height: `${m.altoExt}px` }}
        onClick={() => alAbrir?.(indice)}
        aria-label={`${foto.titulo}, ${foto.anio}, ${foto.lugar}. Leer la historia de esta foto.`}
      >
        <div className={`marco marco--${foto.marco}${marco.paspartu > 0 ? ' marco--con-paspartu' : ''}`}>
          <div className="marco__interior">
            <div className="marco__foto" style={{ width: `${m.fotoAncho}px`, height: `${m.fotoAlto}px` }}>
              <img
                src={foto.src} alt={foto.alt} draggable="false" decoding="async"
                // con backend: miniatura para pantallas chicas, mediana para el resto y para el zoom del relato
                srcSet={foto.miniatura ? `${foto.miniatura} 480w, ${foto.src} 1800w` : undefined}
                sizes={foto.miniatura ? '(max-aspect-ratio: 9/10) 90vw, 50vw' : undefined}
                onLoad={foto.color ? undefined : alCargar}
              />
            </div>
            <div className="marco__vidrio-css" />
          </div>
        </div>
      </button>
      <Placa foto={foto} indice={indice} alAbrir={alAbrir} />
    </article>
  );
});

export default Cuadro;
