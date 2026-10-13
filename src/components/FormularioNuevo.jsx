import { useState, useEffect } from "react";
import { CapturaFoto } from "./CapturaFoto.jsx";

export function FormularioNuevo({
  onGuardar,
  onCancelar,
  onAbrirScanner,
  codigoEscaneado,
}) {
  const [producto, setProducto] = useState({
    cb: "",
    registro: "",
    nombre: "",
    contenido: "",
    stock: "",
    fechaVto: "",
  });

  // La foto va en un estado APARTE: nunca se mezcla con los datos del producto
  const [fotoPendiente, setFotoPendiente] = useState(null); // { foto, firma }
  const [capturandoFoto, setCapturandoFoto] = useState(false);

  // Este efecto detecta cuando llega un código desde el Scanner en el padre
  useEffect(() => {
    if (codigoEscaneado) {
      setProducto((prev) => ({ ...prev, cb: codigoEscaneado }));
    }
  }, [codigoEscaneado]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!producto.cb || !producto.nombre) {
      alert("CB y Nombre son obligatorios");
      return;
    }
    // Envía el producto formateado hacia el handler de guardar en Firebase (Padre)
    // La foto viaja como segundo argumento, separada del producto
    onGuardar(
      {
        ...producto,
        stock: parseInt(producto.stock) || 0,
      },
      fotoPendiente
    );
  };

  return (
    <div className="formulario-nuevo">
      <h3>Registrar Producto</h3>
      <form onSubmit={handleSubmit} className="inputs-registro">
        {/* Código de Barras con botón de Scanner */}
        <div className="contenInputs">
          <input
            name="cb"
            placeholder="Código de Barras"
            value={producto.cb}
            onChange={handleChange}
          />
          <button type="button" onClick={() => onAbrirScanner("nuevo")}>
            📸
          </button>
        </div>

        <input
          name="nombre"
          placeholder="Nombre del Producto"
          value={producto.nombre}
          onChange={handleChange}
        />

        <input
          name="registro"
          placeholder="Nro. de Registro / Serie"
          value={producto.registro}
          onChange={handleChange}
        />

        <input
          name="contenido"
          placeholder="Contenido (ej: 500ml)"
          value={producto.contenido}
          onChange={handleChange}
        />

        <input
          name="stock"
          type="number"
          placeholder="Stock Inicial"
          value={producto.stock}
          onChange={handleChange}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>
            Vencimiento:
          </label>
          <input
            name="fechaVto"
            type="date"
            value={producto.fechaVto}
            onChange={handleChange}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <label style={{ fontSize: "12px", color: "#666" }}>
            Foto del envase (opcional):
          </label>
          {fotoPendiente && (
            <img
              src={fotoPendiente.foto}
              alt="Foto del envase"
              style={{ maxWidth: "100%", maxHeight: "120px", borderRadius: "6px" }}
            />
          )}
          <button type="button" onClick={() => setCapturandoFoto(true)}>
            {fotoPendiente ? "📷 Cambiar foto" : "📷 Agregar foto"}
          </button>
          {fotoPendiente && (
            <button type="button" onClick={() => setFotoPendiente(null)}>
              Quitar foto
            </button>
          )}
        </div>

        <div className="botones-acciones" style={{ marginTop: "15px" }}>
          <button type="submit" className="btn-guardar">
            GUARDAR
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancelar}>
            CANCELAR
          </button>
        </div>
      </form>

      {capturandoFoto && (
        <CapturaFoto
          onConfirmar={(captura) => {
            setFotoPendiente(captura);
            setCapturandoFoto(false);
          }}
          onCancelar={() => setCapturandoFoto(false)}
        />
      )}
    </div>
  );
}