import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { esAdmin, normalizar } from "../lib/auth.js";

const AuthContext = createContext(null);

const leerSesion = () => {
  try {
    if (!localStorage.getItem("token")) return null;
    const usuario = normalizar(localStorage.getItem("usuario"));
    return usuario ? { usuario, esAdmin: esAdmin(usuario) } : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const iniciarSesion = useCallback((usuario) => {
    const u = normalizar(usuario);
    try {
      localStorage.setItem("token", "sesion_activa_farmacia");
      localStorage.setItem("usuario", u);
    } catch {
      /* sin almacenamiento: la sesión vive solo en memoria */
    }
    setSesion({ usuario: u, esAdmin: esAdmin(u) });
  }, []);

  const cerrarSesion = useCallback(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      localStorage.removeItem("user_role");
    } catch {
      /* nada que limpiar */
    }
    setSesion(null);
  }, []);

  const valor = useMemo(
    () => ({ sesion, iniciarSesion, cerrarSesion }),
    [sesion, iniciarSesion, cerrarSesion]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
};
