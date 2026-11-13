// Antesala — primera pantalla: la pared con los focos, sin cuadros, y el nombre en letras gigantes.
// Toda la pantalla es un botón: clic, toque, Enter o Espacio para entrar.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const NOMBRE = ['ANTONIO', 'CARRIZO'];

function Letras({ refs }) {
  let n = 0;
  return NOMBRE.map((palabra) => (
    <span className="antesala__palabra" key={palabra}>
      {[...palabra].map((letra, i) => {
        const k = n++;
        return <span className="antesala__letra" key={i} ref={refs ? (el) => { refs.current[k] = el; } : undefined}>{letra}</span>;
      })}
    </span>
  ));
}

export default function Antesala({ lista, saliendo, alEntrar }) {
  const letras = useRef([]);
  const raiz = useRef(null);
  const tactil = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;

  // secuencia de aparición: las letras se encienden de a una, después el resto
  useEffect(() => {
    if (!lista) return undefined;
    const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (reducido) { gsap.set('.antesala__letra, .antesala__sub, .antesala__entrar, .antesala__reflejo', { opacity: 1 }); return; }
      gsap.timeline({ delay: 0.45 })
        .fromTo(letras.current, { opacity: 0, y: 26, filter: 'blur(10px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.25, ease: 'power3.out', stagger: 0.055 })
        .fromTo('.antesala__reflejo', { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power1.out' }, 0.5)
        .fromTo('.antesala__sub', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, 0.95)
        .fromTo('.antesala__entrar', { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power1.out' }, 1.7);
    }, raiz);
    return () => ctx.revert();
  }, [lista]);

  return (
    <button
      type="button"
      ref={raiz}
      className={`antesala${saliendo ? ' antesala--saliendo' : ''}`}
      onClick={alEntrar}
      aria-label="Antonio Carrizo, galería de fotos. Entrar a la galería."
      autoFocus
    >
      <span className="antesala__bloque" aria-hidden="true">
        <span className="antesala__nombre"><Letras refs={letras} /></span>
        <span className="antesala__sub"><i />Galería de fotos<i /></span>
      </span>
      {/* el piso pulido devuelve el nombre, tenue */}
      <span className="antesala__reflejo" aria-hidden="true"><Letras /></span>
      <span className="antesala__entrar" aria-hidden="true">{tactil ? 'Tocá para entrar' : 'Clic para entrar'}</span>
    </button>
  );
}
