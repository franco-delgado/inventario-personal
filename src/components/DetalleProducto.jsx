import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ref, update, remove } from "firebase/database";
import { db } from "../lib/firebase.js";
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
    </div>
  );
}