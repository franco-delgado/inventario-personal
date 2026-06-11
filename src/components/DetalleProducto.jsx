import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useParams } from "react-router-dom"; // 👈 AGREGA ESTO: Para capturar el usuario de la URL
import "./componentes.css";

export function DetalleProducto({
  producto,
  onClose,
  todosLosProductos,
  onActualizar,
}) {
  // Capturamos el usuario de la URL silenciosamente para aislar las búsquedas
  const { usuario } = useParams();

  // Estado local para los inputs
  const [datosEditados, setDatosEditados] = useState({
    registro: producto?.registro || "",
    stock: producto?.stock || 0,
    fechaVto: producto?.fechaVto || "",
  });

  // Actualizar el estado local si el producto cambia
  useEffect(() => {
    if (producto) {
      setDatosEditados({
        registro: producto.registro || "",
        stock: producto.stock || 0,
        fechaVto: producto.fechaVto || "",
      });
    }
  }, [producto]);

  if (!producto) return null;

  // LÓGICA DE ARTÍCULOS RELACIONADOS PROTEGIDA Y FILTRADA POR USUARIO
  const nombreBase = producto?.nombre
    ? producto.nombre.split(" ").slice(0, 2).join(" ").toLowerCase()
    : "";

  const relacionados = Array.isArray(todosLosProductos)
    ? todosLosProductos.filter((item) => {
        // 1. Verifica estrictamente que el ítem sea válido y posea la propiedad nombre
        if (!item || !item.nombre) return false;

        // 2. FILTRO DE USUARIO: Compara contra la columna 'usuario' de la base de datos para no mezclar las cosas
        const usuarioActual = usuario ? usuario.trim().toUpperCase() : "";
        const usuarioProducto = item.usuario
          ? item.usuario.trim().toUpperCase()
          : "";

        if (usuarioActual && usuarioProducto !== usuarioActual) {
          return false; // Descarta si pertenece a otra cuenta
        }

        // Evita duplicar el producto actual en la lista de relacionados
        return (
          item.nombre.toLowerCase().includes(nombreBase) &&
          item.id !== producto.id
        );
      })
    : [];

  // Función para actualizar un solo campo
  const actualizarCampoUnico = async (nombreColumna, valor) => {
    try {
      const valorFinal = nombreColumna === "stock" ? parseInt(valor) : valor;

      const { error } = await supabase
        .from("productos-farmacia") // Nombre de tu tabla de medicamentos
        .update({ [nombreColumna]: valorFinal })
        .eq("id", producto.id);

      if (error) throw error;

      alert(`${nombreColumna.toUpperCase()} actualizado correctamente`);
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
        <h2>Detalle del Producto</h2>
        <hr />

        <div className="infoPrincipal">
          <p>
            <strong>Nombre:</strong> {producto.nombre}
          </p>

          {/* CAMPO REGISTRO */}
          <div
            className="campo-edicion-fila"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <label style={{ minWidth: "80px" }}>Registro: </label>
            <input
              type="text"
              className="buscador"
              value={datosEditados.registro}
              onChange={(e) =>
                setDatosEditados({ ...datosEditados, registro: e.target.value })
              }
              style={{ flex: 1 }}
            />
            {datosEditados.registro !== producto.registro && (
              <button
                className="btn-guardar"
                onClick={() =>
                  actualizarCampoUnico("registro", datosEditados.registro)
                }
                style={{ padding: "5px 10px", fontSize: "12px" }}
              >
                ✓
              </button>
            )}
          </div>

          {/* CAMPO STOCK */}
          <div
            className="campo-edicion-fila"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <label style={{ minWidth: "80px" }}>Stock: </label>
            <input
              type="number"
              className="buscador"
              value={datosEditados.stock}
              onChange={(e) =>
                setDatosEditados({ ...datosEditados, stock: e.target.value })
              }
              style={{ flex: 1 }}
            />
            {parseInt(datosEditados.stock) !== parseInt(producto.stock) && (
              <button
                className="btn-guardar"
                onClick={() =>
                  actualizarCampoUnico("stock", datosEditados.stock)
                }
                style={{ padding: "5px 10px", fontSize: "12px" }}
              >
                ✓
              </button>
            )}
          </div>

          {/* CAMPO VENCIMIENTO */}
          <div
            className="campo-edicion-fila"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <label style={{ minWidth: "80px" }}>Vto: </label>
            <input
              type="date"
              className="buscador"
              value={datosEditados.fechaVto}
              onChange={(e) =>
                setDatosEditados({ ...datosEditados, fechaVto: e.target.value })
              }
              style={{ flex: 1 }}
            />
            {datosEditados.fechaVto !== (producto.fechaVto || "") && (
              <button
                className="btn-guardar"
                onClick={() =>
                  actualizarCampoUnico("fechaVto", datosEditados.fechaVto)
                }
                style={{ padding: "5px 10px", fontSize: "12px" }}
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
            style={{
              background: "#ff4d4d",
              width: "100%",
              color: "white",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            ELIMINAR PRODUCTO
          </button>
        </div>

        {relacionados.length > 0 && (
          <div
            className="seccion-relacionados"
            style={{
              marginTop: "20px",
              borderTop: "1px solid #444",
              paddingTop: "10px",
            }}
          >
            <p
              className="art-relacionado"
              style={{ fontWeight: "bold", marginBottom: "5px" }}
            >
              Artículos relacionados:
            </p>
            {relacionados
              .filter((rel) => rel && rel.nombre)
              .map((rel) => (
                <div key={rel.id || Math.random()} className="art-en-ventana">
                  • {rel.nombre} / Stock: {rel.stock} / VTO:{" "}
                  {rel.fechaVto || "N/A"}
                </div>
              ))}
          </div>
        )}

        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            background: "#444",
            color: "white",
            padding: "10px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          CERRAR VENTANA
        </button>
      </div>
    </div>
  );
}
