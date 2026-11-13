// Loader: tapa la pantalla hasta que la sala está lista (todo cargado junto).
export default function Loader({ visible }) {
  return (
    <div className={`loader${visible ? '' : ' loader--fuera'}`} role="status" aria-live="polite" aria-hidden={!visible}>
      <h1 className="loader__nombre">Antonio Carrizo</h1>
      <div className="loader__linea" />
      <p className="loader__texto">Encendiendo las luces de la sala…</p>
    </div>
  );
}
