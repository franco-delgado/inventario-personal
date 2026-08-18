import React from "react";
import { useNavigate } from "react-router-dom";
import "./Cierre.css";

const Cierre = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Limpiar el almacenamiento local
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");

    // 2. Redireccionar al usuario a la pantalla de inicio de sesión
    navigate("/login");
  };

  return (
    <nav className="cierre-navbar">
      {/* Elemento vacío para hacer contrapeso y centrar el título con Grid */}
      <div className="navbar-spacer"></div>

      <div className="navbar-brand">📦 Inventario de farmacia</div>

      <button onClick={handleLogout} className="navbar-logout-btn">
        Cerrar Sesión
      </button>
    </nav>
  );
};

export default Cierre;