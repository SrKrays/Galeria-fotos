// Rutas:
//   "/"  "/sala"  "/foto/:id"   la galería (una sola escena; Sala.jsx decide qué mostrar)
//   "/admin"                    panel de administración (se descarga recién cuando se entra)
// Con ?prueba=1 se abre el banco de pruebas de la escena Pixi sin cuadros.
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SalaPrueba from './componentes/SalaPrueba.jsx';
import Loader from './componentes/Loader.jsx';
import { fotos as fotosDeMuestra } from './datos/fotos.js';
import { modoDemostracion, obtenerFotos } from './servicios/api.js';

const Admin = lazy(() => import('./admin/Admin.jsx'));
// Pixi, GSAP y la sala son la parte pesada: se bajan en paralelo con las fotos, y la pantalla de carga sale antes
const cargarSala = () => import('./paginas/Sala.jsx');
const Sala = lazy(cargarSala);
if (!/^\/admin/.test(location.pathname)) cargarSala();

// Carga las fotos ANTES de montar la sala: así la escena arranca sabiendo cuántos cuadros hay.
function Galeria() {
  const [estado, setEstado] = useState(modoDemostracion ? { fotos: fotosDeMuestra } : { cargando: true });

  const cargar = useCallback(() => {
    setEstado({ cargando: true });
    obtenerFotos().then((fotos) => setEstado({ fotos }), (e) => setEstado({ error: e.message }));
  }, []);
  useEffect(() => { if (!modoDemostracion) cargar(); }, [cargar]);

  if (estado.cargando) return <Loader visible />;
  if (estado.error) {
    return (
      <div className="aviso" role="alert">
        <h1>Antonio Carrizo</h1>
        <p>{estado.error}</p>
        <button type="button" className="boton boton--principal" onClick={cargar}>Reintentar</button>
      </div>
    );
  }
  if (!estado.fotos.length) {
    return (
      <div className="aviso">
        <h1>Antonio Carrizo</h1>
        <p>La galería se está armando. Volvé pronto.</p>
      </div>
    );
  }
  return <Suspense fallback={<Loader visible />}><Sala fotos={estado.fotos} /></Suspense>;
}

export default function App() {
  if (new URLSearchParams(location.search).get('prueba') === '1') return <SalaPrueba />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={<Loader visible />}><Admin /></Suspense>} />
        <Route path="/*" element={<Galeria />} />
      </Routes>
    </BrowserRouter>
  );
}
