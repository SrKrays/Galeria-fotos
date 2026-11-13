// Relato — placa grande de exposición con la historia de la foto.
// La foto queda fija (es el cuadro de la sala, acercado por la cámara); acá solo va el texto.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Consulta from './Consulta.jsx';

export default function Relato({ foto, alVolver }) {
  return (
    <AnimatePresence>
      {foto && <PanelRelato key={foto.id} foto={foto} alVolver={alVolver} />}
    </AnimatePresence>
  );
}

function PanelRelato({ foto, alVolver }) {
  const [consultando, setConsultando] = useState(false);
  const cuerpo = useRef(null);
  const titulo = useRef(null);
  const reducido = useReducedMotion();
  const vertical = typeof matchMedia === 'function' && matchMedia('(max-aspect-ratio: 9/10)').matches;

  useEffect(() => { titulo.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape' && !consultando) { e.stopPropagation(); alVolver(); } };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [alVolver, consultando]);

  const entrada = reducido
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: vertical ? 0 : 46, y: vertical ? 46 : 0 },
        animate: { opacity: 1, x: 0, y: 0, transition: { delay: 0.5, duration: 0.65, ease: [0.2, 0.7, 0.2, 1] } },
        exit: { opacity: 0, x: vertical ? 0 : 30, y: vertical ? 30 : 0, transition: { duration: 0.28 } },
      };

  return (
    <>
      {/* fondo oscuro: tocarlo vuelve a la sala */}
      <motion.button
        type="button" className="relato__fondo" aria-label="Volver a la sala" tabIndex={-1} onClick={alVolver}
        initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.6 } }} exit={{ opacity: 0, transition: { duration: 0.4 } }}
      />
      <motion.div className="relato" role="dialog" aria-modal="false" aria-labelledby="relato-titulo" {...entrada}>
        <button type="button" className="relato__volver" onClick={alVolver}>
          <svg viewBox="0 0 24 40" aria-hidden="true"><path d="M19 3 4 20l15 17" /></svg>
          Volver a la sala
        </button>

        <div className="relato__cuerpo" ref={cuerpo}>
          <header className="relato__cabeza">
            <h2 id="relato-titulo" ref={titulo} tabIndex={-1}>{foto.titulo}</h2>
            <p className="relato__dato">{foto.anio} · {foto.lugar}</p>
            <p className="relato__gancho">“{foto.gancho}”</p>
          </header>
          {/* los párrafos van apareciendo a medida que se baja */}
          {foto.relato.map((parrafo, i) => (
            <motion.p
              key={i}
              className="relato__parrafo"
              initial={reducido ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ root: cuerpo, once: true, amount: 0.3 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: i < 2 ? 0.75 + i * 0.18 : 0.05 }}
            >
              {parrafo}
            </motion.p>
          ))}
          <p className="relato__ref">Ref. {foto.codigo} · {foto.credito ?? 'Fotografía de Antonio Carrizo'}</p>
        </div>

        <footer className="relato__pie">
          <button type="button" className="boton boton--principal" onClick={() => setConsultando(true)}>
            Consultar por esta foto
          </button>
        </footer>
      </motion.div>

      <AnimatePresence>
        {consultando && <Consulta foto={foto} alCerrar={() => setConsultando(false)} />}
      </AnimatePresence>
    </>
  );
}
