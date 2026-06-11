import React from "react";
import { useNavigate } from "react-router-dom";

const Cierre = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Limpiar el almacenamiento local (tokens, datos de usuario, etc.)
    localStorage.removeItem("token");
    localStorage.removeItem("user_role"); // Por si manejas roles (admin, farmacéutico)

    // Si usas sessionStorage en lugar de localStorage, descomenta la siguiente línea:
    // sessionStorage.clear();

    // 2. Redireccionar al usuario a la pantalla de inicio de sesión inmediatamente
    navigate("/login");
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.brand}>📦 Inventario de farmacia</div>
      <button onClick={handleLogout} style={styles.logoutButton}>
        Cerrar Sesión
      </button>
    </nav>
  );
};

// Estilos rápidos de ejemplo
const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "#db1e9c", // Verde farmacéutico/médico
    color: "#fff",
  },
  brand: {
    alignItem: "center",
    fontSize: "28px",
    fontWeight: "bold",
  },
  logoutButton: {
    backgroundColor: "#c4c3c3",
    color: "black",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Cierre;
