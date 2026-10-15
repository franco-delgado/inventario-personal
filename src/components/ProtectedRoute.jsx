import { Navigate, Outlet, useLocation } from "react-router-dom";
import Cierre from "./Cierre.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Exige sesión iniciada. Además, cada usuario solo puede ver su propio
 * inventario: si cambia el nombre en la URL, vuelve al suyo.
 */
const ProtectedRoute = () => {
  const { sesion } = useAuth();
  const { pathname } = useLocation();

  if (!sesion) {
    return <Navigate to="/" replace />;
  }

  const coincidencia = pathname.match(/^\/articulos\/([^/]+)/);
  if (coincidencia && decodeURIComponent(coincidencia[1]).toLowerCase() !== sesion.usuario) {
    return <Navigate to={`/articulos/${sesion.usuario}`} replace />;
  }

  return (
    <>
      <Cierre />
      <Outlet />
    </>
  );
};

export default ProtectedRoute;
