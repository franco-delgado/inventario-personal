import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./componentes.css";

export function DetalleProducto({
  producto,
  onClose,
  todosLosProductos,
  onActualizar,
}) {
  const [editando, setEditando] = useState(false);
  const [datosEditados, setDatosEditados] = useState({
    stock: producto?.stock || 0,
    fechaVto: producto?.fechaVto || "",
  });

  if (!producto) return null;

  const nombreBase = producto.nombre
    ? producto.nombre.split(" ").slice(0, 2).join(" ").toLowerCase()
    : "";
  const relacionados = (todosLosProductos || []).filter(
    (item) =>
      item.nombre.toLowerCase().includes(nombreBase) && item.id !== producto.id,
  );

  const handleGuardarCambios = async () => {
    try {
      const { error } = await supabase
        .from("productos-farmacia")
        .update({
          stock: parseInt(datosEditados.stock),
          fechaVto: datosEditados.fechaVto,
        })
        .eq("id", producto.id);

      if (error) throw error;
      alert("Datos actualizados");
      setEditando(false);
      if (onActualizar) onActualizar();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleEliminar = async () => {
    if (window.confirm(`¿Eliminar ${producto.nombre}?`)) {
      try {
        const { error } = await supabase
          .from("productos-farmacia")
          .delete()
          .eq("id", producto.id);

        if (error) throw error;
        onClose();
        if (onActualizar) onActualizar();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{editando ? "Editar Datos" : "Detalle"}</h2>
        <hr />

        <div className="infoPrincipal">
          <p>
            <strong>Nombre:</strong> {producto.nombre}
          </p>
          <p>
            <strong>Registro:</strong> {producto.registro || "N/A"}
          </p>

          <div className="campo-edicion">
            <label>Stock: </label>
            {editando ? (
              <input
                type="number"
                value={datosEditados.stock}
                onChange={(e) =>
                  setDatosEditados({ ...datosEditados, stock: e.target.value })
                }
              />
            ) : (
              <span>{producto.stock}</span>
            )}
          </div>

          <div className="campo-edicion">
            <label>Vto: </label>
            {editando ? (
              <input
                type="date"
                value={datosEditados.fechaVto}
                onChange={(e) =>
                  setDatosEditados({
                    ...datosEditados,
                    fechaVto: e.target.value,
                  })
                }
              />
            ) : (
              <span>{producto.fechaVto || "N/A"}</span>
            )}
          </div>
        </div>

        <div
          className="botones-accion"
          style={{ display: "flex", gap: "10px", marginTop: "15px" }}
        >
          {editando ? (
            <>
              <button className="btn-guardar" onClick={handleGuardarCambios}>
                GUARDAR
              </button>
              <button
                className="btn-cancelar"
                onClick={() => setEditando(false)}
              >
                CANCELAR
              </button>
            </>
          ) : (
            <>
              <button className="btn-editar" onClick={() => setEditando(true)}>
                EDITAR
              </button>
              <button
                className="btn-eliminar"
                onClick={handleEliminar}
                style={{ background: "#ff4d4d" }}
              >
                ELIMINAR
              </button>
            </>
          )}
        </div>

        {!editando && relacionados.length > 0 && (
          <div
            className="seccion-relacionados"
            style={{ marginTop: "20px", borderTop: "1px solid #444" }}
          >
            <p style={{ fontSize: "0.85rem", color: "#888" }}>
              Artículos relacionados:
            </p>
            {relacionados.map((rel) => (
              <div key={rel.id} className="art-en-ventana">
                • {rel.nombre} / Stock: {rel.stock} / VTO:{" "}
                {rel.fechaVto || "N/A"}
              </div>
            ))}
          </div>
        )}

        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{ marginTop: "20px", width: "100%" }}
        >
          CERRAR VENTANA
        </button>
      </div>
    </div>
  );
}
