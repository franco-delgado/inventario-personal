import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ref, update, remove } from "firebase/database";
import { db } from "../lib/firebase.js";
import {
  obtenerFotoProducto,
  guardarFotoProducto,
  eliminarFotoProducto,
} from "../lib/fotos.js";
import { CapturaFoto } from "./CapturaFoto.jsx";
import "./componentes.css";

export function DetalleProducto({
  producto,
  onClose,
  todosLosProductos,
  onActualizar,
}) {
  const { usuario } = useParams();

  const [datosEditados, setDatosEditados] = useState({
    registro: "",
    stock: 0,
    fechaVto: "",
  });

  useEffect(() => {
    if (producto) {
      setDatosEditados({
        registro: producto.registro || "",
        stock: producto.stock !== undefined ? producto.stock : 0,
        fechaVto: producto.fechaVto || "",
      });
    }
  }, [producto]);

  // Foto del envase: undefined = cargando, null = sin foto, texto = foto.
  // Se guarda aparte (fotos-farmacia): nunca forma parte del producto ni del Excel.
  const [fotoUrl, setFotoUrl] = useState(undefined);
  const [capturandoFoto, setCapturandoFoto] = useState(false);

  useEffect(() => {
    if (!producto?.id || !usuario) return;
    let vivo = true;
    obtenerFotoProducto(usuario, producto.id)
      .then((url) => {
        if (vivo) setFotoUrl(url);
      })
      .catch((err) => {
        console.error("Error cargando la foto:", err);
        if (vivo) setFotoUrl(null);
      });
    return () => {
      vivo = false;
    };
  }, [producto?.id, usuario]);

  if (!producto) return null;

  // Lógica de artículos relacionados
  const nombreBase = producto?.nombre
    ? producto.nombre.split(" ").slice(0, 2).join(" ").toLowerCase()
    : "";

  const relacionados = Array.isArray(todosLosProductos)
    ? todosLosProductos.filter((item) => {
        if (!item || !item.nombre) return false;
        const usuarioActual = usuario ? usuario.trim().toUpperCase() : "";
        const usuarioProducto = item.usuario ? item.usuario.trim().toUpperCase() : "";

        if (usuarioActual && usuarioProducto !== usuarioActual) return false;

        return (
          item.nombre.toLowerCase().includes(nombreBase) &&
          item.id !== producto.id
        );
      })
    : [];

  // FUNCIÓN PARA ACTUALIZAR EN FIREBASE
  const actualizarCampoUnico = async (nombreColumna, valor) => {
    try {
      if (!producto.id) {
        alert("Error: El producto no tiene una ID válida de Firebase.");
        return;
      }

      const valorFinal = nombreColumna === "stock" ? parseInt(valor) || 0 : valor;
      const prodRef = ref(db, `productos-farmacia/${producto.id}`);

      await update(prodRef, {
        [nombreColumna]: valorFinal,
      });

      alert(`${nombreColumna.toUpperCase()} actualizado correctamente`);
      
      if (onActualizar) onActualizar();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  };

  // GUARDAR / QUITAR LA FOTO DEL ENVASE
  const guardarFoto = async ({ foto, firma }) => {
    try {
      await guardarFotoProducto(usuario, producto.id, { foto, firma });
      setFotoUrl(foto);
      setCapturandoFoto(false);
    } catch (err) {
      alert("No se pudo guardar la foto: " + err.message);
    }
  };

  const quitarFoto = async () => {
    if (!window.confirm("¿Quitar la foto de este producto?")) return;
    try {
      await eliminarFotoProducto(usuario, producto.id);
      setFotoUrl(null);
    } catch (err) {
      alert("No se pudo quitar la foto: " + err.message);
    }
  };

  // FUNCIÓN PARA ELIMINAR EN FIREBASE
  const handleEliminar = async () => {
    if (window.confirm(`¿Eliminar ${producto.nombre}?`)) {
      try {
        if (!producto.id) {
          alert("Error: El producto no tiene una ID válida.");
          return;
        }

        const prodRef = ref(db, `productos-farmacia/${producto.id}`);
        await remove(prodRef);

        // La foto asociada también se borra (para que no quede huérfana)
        try {
          await eliminarFotoProducto(usuario, producto.id);
        } catch (errFoto) {
          console.error("No se pudo borrar la foto asociada:", errFoto);
        }

        onClose();
        if (onActualizar) onActualizar();
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Detalle del Producto</h2>
        <hr />

        <div className="infoPrincipal">
          <p>
            <strong>Nombre:</strong> {producto.nombre}
          </p>

          {/* REGISTRO */}
          <div className="campo-edicion-fila" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <label style={{ minWidth: "80px" }}>Registro: </label>
            <input
              type="text"
              className="buscador"
              value={datosEditados.registro}
              onChange={(e) => setDatosEditados({ ...datosEditados, registro: e.target.value })}
              style={{ flex: 1 }}
            />
            {datosEditados.registro !== (producto.registro || "") && (
              <button
                className="btn-guardar"
                onClick={() => actualizarCampoUnico("registro", datosEditados.registro)}
                style={{ padding: "5px 10px", fontSize: "12px", cursor: "pointer" }}
              >
                ✓
              </button>
            )}
          </div>

          {/* STOCK */}
          <div className="campo-edicion-fila" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <label style={{ minWidth: "80px" }}>Stock: </label>
            <input
              type="number"
              className="buscador"
              value={datosEditados.stock}
              onChange={(e) => setDatosEditados({ ...datosEditados, stock: e.target.value })}
              style={{ flex: 1 }}
            />
            {Number(datosEditados.stock) !== Number(producto.stock) && (
              <button
                className="btn-guardar"
                onClick={() => actualizarCampoUnico("stock", datosEditados.stock)}
                style={{ padding: "5px 10px", fontSize: "12px", cursor: "pointer" }}
              >
                ✓
              </button>
            )}
          </div>

          {/* VENCIMIENTO */}
          <div className="campo-edicion-fila" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <label style={{ minWidth: "80px" }}>Vto: </label>
            <input
              type="date"
              className="buscador"
              value={datosEditados.fechaVto}
              onChange={(e) => setDatosEditados({ ...datosEditados, fechaVto: e.target.value })}
              style={{ flex: 1 }}
            />
            {datosEditados.fechaVto !== (producto.fechaVto || "") && (
              <button
                className="btn-guardar"
                onClick={() => actualizarCampoUnico("fechaVto", datosEditados.fechaVto)}
                style={{ padding: "5px 10px", fontSize: "12px", cursor: "pointer" }}
              >
                ✓
              </button>
            )}
          </div>
        </div>

        {/* FOTO DEL ENVASE: se guarda aparte, no afecta a la lista ni al Excel */}
        <div className="seccion-foto">
          <p className="foto-titulo">Foto del envase</p>
          {fotoUrl === undefined && <p className="foto-estado">Cargando foto...</p>}
          {fotoUrl === null && (
            <p className="foto-estado">
              Sin foto. Agregá una para reconocerlo por cámara.
            </p>
          )}
          {fotoUrl && (
            <img
              src={fotoUrl}
              alt={`Foto de ${producto.nombre}`}
              className="foto-producto"
            />
          )}
          <div className="foto-botones">
            <button
              type="button"
              className="btn-guardar"
              onClick={() => setCapturandoFoto(true)}
            >
              {fotoUrl ? "📷 Cambiar foto" : "📷 Agregar foto"}
            </button>
            {fotoUrl && (
              <button type="button" className="btn-quitar-foto" onClick={quitarFoto}>
                Quitar foto
              </button>
            )}
          </div>
        </div>

        <div className="botones-accion" style={{ marginTop: "15px" }}>
          <button
            className="btn-eliminar"
            onClick={handleEliminar}
            style={{ background: "#100668", width: "100%", color: "white", padding: "10px", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            ELIMINAR PRODUCTO
          </button>
        </div>

        {relacionados.length > 0 && (
          <div className="seccion-relacionados" style={{ marginTop: "20px", borderTop: "1px solid #444", paddingTop: "10px" }}>
            <p className="art-relacionado" style={{ fontWeight: "bold", marginBottom: "5px" }}>
              Artículos relacionados:
            </p>
            {relacionados.map((rel) => (
              <div key={rel.id || Math.random()} className="art-en-ventana">
                • {rel.nombre} / Stock: {rel.stock} / VTO: {rel.fechaVto || "N/A"} / registro: {rel.registro}
              </div>
            ))}
          </div>
        )}

        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{ marginTop: "20px", width: "100%", background: "#444", color: "white", padding: "10px", border: "none", borderRadius: "5px", cursor: "pointer" }}
        >
          CERRAR VENTANA
        </button>
      </div>

      {capturandoFoto && (
        <CapturaFoto
          onConfirmar={guardarFoto}
          onCancelar={() => setCapturandoFoto(false)}
        />
      )}
    </div>
  );
}