import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";

/**
 * Tema claro/oscuro POR USUARIO.
 * La preferencia se guarda con una clave propia de cada usuario
 * ("tema:franco", "tema:ana"...), así que cambiar el tema de uno nunca
 * modifica el de otro, ni siquiera si comparten el mismo dispositivo.
 * Antes de iniciar sesión se usa la clave "tema:invitado".
 */

const ThemeContext = createContext(null);

const claveTema = (usuario) => `tema:${usuario || "invitado"}`;

const leer = (clave) => {
  try {
    const v = localStorage.getItem(clave);
    return v === "claro" || v === "oscuro" ? v : null;
  } catch {
    return null;
  }
};

const preferenciaDelSistema = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "oscuro"
    : "claro";

// Tema que corresponde a un usuario: el suyo, o el del invitado, o el del sistema
const temaInicial = (usuario) =>
  leer(claveTema(usuario)) || leer(claveTema(null)) || preferenciaDelSistema();

export function ThemeProvider({ children }) {
  const { sesion } = useAuth();
  const usuario = sesion?.usuario || null;

  // Guardamos a qué usuario pertenece el tema, para recalcularlo al cambiar de sesión
  const [estado, setEstado] = useState(() => ({
    usuario,
    tema: temaInicial(usuario),
  }));

  let tema = estado.tema;
  if (estado.usuario !== usuario) {
    tema = temaInicial(usuario);
    setEstado({ usuario, tema });
  }

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", tema === "oscuro" ? "dark" : "light");
    document.documentElement.style.colorScheme = tema === "oscuro" ? "dark" : "light";
  }, [tema]);

  const cambiarTema = useCallback(
    (nuevo) => {
      try {
        localStorage.setItem(claveTema(usuario), nuevo);
      } catch {
        /* el cambio vale para esta sesión aunque no se pueda guardar */
      }
      setEstado({ usuario, tema: nuevo });
    },
    [usuario]
  );

  const alternarTema = useCallback(
    () => cambiarTema(tema === "oscuro" ? "claro" : "oscuro"),
    [cambiarTema, tema]
  );

  const valor = useMemo(
    () => ({ tema, esOscuro: tema === "oscuro", cambiarTema, alternarTema }),
    [tema, cambiarTema, alternarTema]
  );

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
};
