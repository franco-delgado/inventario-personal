import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import Cierre  from "./Cierre.jsx";

const ProtectedRoute = () => {
  // Tu lógica actual para verificar si hay token...
  const isAuthenticated = localStorage.getItem("token"); 

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <Cierre /> {/* Se muestra la barra de navegación fija arriba */}
      <Outlet /> {/* Aquí adentro se va a renderizar automáticamente Articulos o cualquier ruta hija */}
    </>
  );
};

export default ProtectedRoute;
