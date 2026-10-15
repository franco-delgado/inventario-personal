import { useTheme } from "../context/ThemeContext.jsx";
import "./ThemeToggle.css";

const Sol = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const Luna = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

/** Botón para alternar entre tema claro y oscuro (afecta solo al usuario actual) */
export function ThemeToggle({ className = "" }) {
  const { esOscuro, alternarTema } = useTheme();
  const etiqueta = esOscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      className={`btn-icon theme-toggle ${className}`}
      onClick={alternarTema}
      aria-label={etiqueta}
      title={etiqueta}
    >
      {esOscuro ? <Sol /> : <Luna />}
    </button>
  );
}
