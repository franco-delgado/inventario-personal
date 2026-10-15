import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_USUARIO,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  validarNuevoUsuario,
} from "../lib/auth.js";
import "./Usuarios.css";

/** Panel del administrador: alta y baja de usuarios */
function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorLista, setErrorLista] = useState("");

  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [aviso, setAviso] = useState("");

  const [aEliminar, setAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setErrorLista("");
      setUsuarios(await listarUsuarios());
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      setErrorLista("No se pudo cargar la lista de usuarios.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleAgregar = async (e) => {
    e.preventDefault();
    setAviso("");

    const problema = validarNuevoUsuario(nombre, password, usuarios);
    if (problema) {
      setErrorForm(problema);
      return;
    }
    setErrorForm("");

    try {
      setGuardando(true);
      await crearUsuario(nombre, password);
      setAviso(`Usuario "${nombre.trim().toUpperCase()}" creado correctamente.`);
      setNombre("");
      setPassword("");
      await cargar();
    } catch (err) {
      setErrorForm("No se pudo crear el usuario: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    try {
      setEliminando(true);
      await eliminarUsuario(aEliminar.id);
      setAviso(`Usuario "${aEliminar.usuario}" eliminado.`);
      setAEliminar(null);
      await cargar();
    } catch (err) {
      setAEliminar(null);
      setErrorLista("No se pudo eliminar el usuario: " + err.message);
    } finally {
      setEliminando(false);
    }
  };

  // Aunque exista una entrada "franco" en la base, el administrador no se puede quitar
  const visibles = usuarios.filter(
    (u) => u.usuario.toLowerCase() !== ADMIN_USUARIO
  );

  return (
    <main className="page usuarios-page">
      <div className="page-header">
        <h1>Usuarios</h1>
        <p>Agregá o quitá las personas que pueden usar el sistema.</p>
      </div>

      {aviso && (
        <div className="aviso aviso-ok usuarios-aviso" role="status">
          {aviso}
        </div>
      )}

      <div className="usuarios-grid">
        <section className="card usuarios-form-card">
          <h2>Nuevo usuario</h2>
          <form onSubmit={handleAgregar} className="usuarios-form" noValidate>
            {errorForm && (
              <div className="aviso aviso-error" role="alert">
                {errorForm}
              </div>
            )}

            <div className="campo">
              <label htmlFor="nuevo-usuario">Usuario</label>
              <input
                id="nuevo-usuario"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: MARIA"
                autoComplete="off"
                disabled={guardando}
              />
            </div>

            <div className="campo">
              <label htmlFor="nueva-password">Contraseña</label>
              <div className="campo-password">
                <input
                  id="nueva-password"
                  type={verPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  autoComplete="new-password"
                  disabled={guardando}
                />
                <button
                  type="button"
                  className="btn-ver"
                  onClick={() => setVerPassword((v) => !v)}
                >
                  {verPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={guardando}>
              {guardando ? "Guardando..." : "Agregar usuario"}
            </button>
          </form>
        </section>

        <section className="card usuarios-lista-card">
          <div className="usuarios-lista-encabezado">
            <h2>Usuarios registrados</h2>
            <span className="contador">{visibles.length}</span>
          </div>

          {errorLista && (
            <div className="aviso aviso-error" role="alert">
              {errorLista}
            </div>
          )}

          {cargando ? (
            <p className="usuarios-vacio">Cargando usuarios...</p>
          ) : (
            <ul className="usuarios-lista">
              <li className="usuario-fila usuario-admin">
                <span className="usuario-avatar">
                  {ADMIN_USUARIO.charAt(0).toUpperCase()}
                </span>
                <span className="usuario-nombre">{ADMIN_USUARIO.toUpperCase()}</span>
                <span className="etiqueta">Administrador</span>
              </li>

              {visibles.map((u) => (
                <li key={u.id} className="usuario-fila">
                  <span className="usuario-avatar">
                    {u.usuario.charAt(0).toUpperCase()}
                  </span>
                  <span className="usuario-nombre">{u.usuario}</span>
                  <button
                    type="button"
                    className="btn-danger-soft"
                    onClick={() => setAEliminar(u)}
                  >
                    Quitar
                  </button>
                </li>
              ))}

              {visibles.length === 0 && (
                <li className="usuarios-vacio">
                  Todavía no agregaste otros usuarios.
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {aEliminar && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content modal-confirmar">
            <h2>¿Quitar a {aEliminar.usuario}?</h2>
            <p className="texto-suave">
              Ya no podrá iniciar sesión. Sus productos y categorías no se
              borran: si volvés a crear el usuario con el mismo nombre, los
              recupera.
            </p>
            <div className="modal-acciones">
              <button
                type="button"
                className="btn-cancelar"
                onClick={() => setAEliminar(null)}
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmarEliminar}
                disabled={eliminando}
              >
                {eliminando ? "Quitando..." : "Sí, quitar usuario"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Usuarios;
