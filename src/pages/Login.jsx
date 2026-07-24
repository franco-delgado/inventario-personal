import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/firebase"; // Importamos el cliente de Firebase
import { ref, get } from "firebase/database";
import "./Login.css"; // Importamos los estilos estéticos

const Login = () => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (user.trim() === "" || pass.trim() === "") {
      setErrorMsg("Por favor, completa todos los campos.");
      return;
    }

    setLoading(true);

    try {
      // Obtenemos la referencia al nodo "usuarios-farmacia"
      const usuariosRef = ref(db, "usuarios-farmacia");
      const snapshot = await get(usuariosRef);

      if (!snapshot.exists()) {
        setErrorMsg("Usuario o contraseña incorrectos.");
        setLoading(false);
        return;
      }

      const data = snapshot.val();
      
      // Firebase guarda datos como un Array o un Objeto según la estructura del JSON.
      // Convertimos los usuarios a una lista para buscar la coincidencia.
      const listaUsuarios = Array.isArray(data)
        ? data
        : Object.values(data);

      const usuarioIngresado = user.trim().toUpperCase();
      const passwordIngresada = pass.trim();

      // Buscamos coincidencia de usuario y contraseña
      const usuarioEncontrado = listaUsuarios.find(
        (u) =>
          u &&
          u.usuario &&
          u.usuario.toString().toUpperCase() === usuarioIngresado &&
          u.contraseña &&
          u.contraseña.toString() === passwordIngresada
      );

      if (!usuarioEncontrado) {
        setErrorMsg("Usuario o contraseña incorrectos.");
      } else {
        // 1. CREAMOS LA SESIÓN MANUALMENTE (Guardamos una marca en el localStorage)
        localStorage.setItem("token", "sesion_activa_farmacia");

        const nombreUsuario = usuarioEncontrado.usuario.toString().toLowerCase();
        // Guardamos también el nombre por si lo necesitas en otros componentes
        localStorage.setItem("usuario", nombreUsuario);

        // 2. Login exitoso: Redirige a articulos pasando el usuario en la URL
        navigate(`/articulos/${nombreUsuario}`);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
      setErrorMsg("Hubo un problema al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Sistema Farmacia</h2>
          <p>Introduce tus credenciales para ingresar</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          <div className="input-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              type="text"
              placeholder="Ej: FRANCO"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;