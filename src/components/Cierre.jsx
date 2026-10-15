import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";
import "./Cierre.css";

const Cierre = () => {
  const navigate = useNavigate();
  const { sesion, cerrarSesion } = useAuth();

  const handleLogout = () => {
    cerrarSesion();
    navigate("/login");
  };

  return (
    <header className="cierre-navbar">
      <div className="navbar-inner">
        <NavLink to={`/articulos/${sesion.usuario}`} className="navbar-brand">
          <span className="navbar-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="navbar-title">Inventario de farmacia</span>
        </NavLink>

        <nav className="navbar-links" aria-label="Principal">
          <NavLink to={`/articulos/${sesion.usuario}`} className="navbar-link">
            Artículos
          </NavLink>
          {sesion.esAdmin && (
            <NavLink to="/admin/usuarios" className="navbar-link">
              Usuarios
            </NavLink>
          )}
        </nav>

        <div className="navbar-acciones">
          <span className="navbar-usuario" title={sesion.esAdmin ? "Administrador" : "Usuario"}>
            <span className="navbar-avatar">{sesion.usuario.charAt(0).toUpperCase()}</span>
            <span className="navbar-usuario-nombre">{sesion.usuario}</span>
          </span>
          <ThemeToggle />
          <button type="button" onClick={handleLogout} className="navbar-logout-btn">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
};

export default Cierre;
