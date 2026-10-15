import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Articulos from "./pages/Articulos";
import Usuarios from "./pages/Usuarios";
import { useAuth } from "./context/AuthContext.jsx";

/** "/dashboard" lleva al inventario del usuario con sesión */
function IrAMiInventario() {
  const { sesion } = useAuth();
  return <Navigate to={sesion ? `/articulos/${sesion.usuario}` : "/"} replace />;
}

function App() {
  return (
    <Routes>
      {/* Pública: inicio de sesión */}
      <Route path="/" element={<Login />} />
      <Route path="login" element={<Login />} />

      {/* Privadas: muestran la barra superior */}
      <Route element={<ProtectedRoute />}>
        <Route path="/articulos/:usuario" element={<Articulos />} />
        <Route path="/dashboard" element={<IrAMiInventario />} />

        {/* Solo el administrador (franco) */}
        <Route element={<AdminRoute />}>
          <Route path="/admin/usuarios" element={<Usuarios />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
