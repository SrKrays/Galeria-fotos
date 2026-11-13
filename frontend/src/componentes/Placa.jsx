// Placa — metal oscuro con borde dorado, debajo de cada cuadro.
export default function Placa({ foto, indice, alAbrir }) {
  return (
    <button type="button" className="placa" onClick={() => alAbrir?.(indice)} tabIndex={-1} aria-hidden="true">
      <span className="placa__titulo">{foto.titulo}</span>
      <span className="placa__dato">{foto.anio} · {foto.lugar}</span>
      <span className="placa__gancho">“{foto.gancho}”</span>
      <span className="placa__leer" style={{ animationDelay: `${(indice % 4) * 1.7}s` }}>Leer historia <span aria-hidden="true">›</span></span>
    </button>
  );
}
