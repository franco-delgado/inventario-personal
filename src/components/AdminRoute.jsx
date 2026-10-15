import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/** Solo el administrador puede entrar; cualquier otro vuelve a su inventario */
const AdminRoute = () => {
  const { sesion } = useAuth();

  if (!sesion?.esAdmin) {
    return <Navigate to={sesion ? `/articulos/${sesion.usuario}` : "/"} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
