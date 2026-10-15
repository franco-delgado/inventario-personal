import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { validarCredenciales } from "../lib/auth.js";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import "./Login.css";

const Login = () => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const { sesion, iniciarSesion } = useAuth();

  // Si ya hay sesión, no tiene sentido mostrar el login
  if (sesion) {
    return <Navigate to={`/articulos/${sesion.usuario}`} replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (user.trim() === "" || pass.trim() === "") {
      setErrorMsg("Completá usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const resultado = await validarCredenciales(user, pass);
      if (!resultado) {
        setErrorMsg("Usuario o contraseña incorrectos.");
        return;
      }
      iniciarSesion(resultado.usuario);
      navigate(`/articulos/${resultado.usuario}`, { replace: true });
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setErrorMsg("No se pudo verificar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <ThemeToggle className="login-tema" />

      <div className="login-card">
        <div className="login-header">
          <span className="login-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <h1>Inventario de farmacia</h1>
          <p>Ingresá con tu usuario para continuar.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form" noValidate>
          {errorMsg && (
            <div className="aviso aviso-error" role="alert">
              {errorMsg}
            </div>
          )}

          <div className="input-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              disabled={loading}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
