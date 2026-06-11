import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase"; // Verifica que la ruta a tu cliente sea correcta
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
      // Consultamos la tabla "usuarios-farmacia"
      // .toUpperCase() asegura la coincidencia si en la base de datos está en mayúsculas
      const { data, error } = await supabase
        .from("usuarios-farmacia")
        .select("*")
        .eq("usuario", user.trim().toUpperCase())
        .eq("contraseña", pass.trim())
        .maybeSingle(); // Maneja de forma segura si no encuentra ninguna fila

      if (error) {
        console.error(error);
        setErrorMsg("Error al conectar con la base de datos.");
      } else if (!data) {
        setErrorMsg("Usuario o contraseña incorrectos.");
      } else {
        // 1. CREAMOS LA SESIÓN MANUALMENTE (Guardamos una marca en el localStorage)
        // Guardamos un texto cualquiera (puede ser un "true" o el mismo id del usuario)
        localStorage.setItem("token", "sesion_activa_farmacia");
        
        // Guardamos también el nombre por si lo necesitas en otros componentes
        localStorage.setItem("usuario", data.usuario.toLowerCase());

        // 2. Login exitoso: Redirige a articulos pasando el usuario en la URL
        navigate(`/articulos/${data.usuario.toLowerCase()}`);
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
