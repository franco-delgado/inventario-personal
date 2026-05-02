import { useState } from "react";

export function FormularioNuevo({ onGuardar, onCancelar, onAbrirScanner }) {
  const [producto, setProducto] = useState({
    cb: "",
    registro: "",
    nombre: "",
    contenido: "",
    stock: "",
    fechaVto: "",
  });

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
    onGuardar(producto);
  };

  return (
    <div className="formulario-nuevo">
      <h3>Registrar Producto</h3>
      <form onSubmit={handleSubmit} className="inputs-registro">
        {/* Código de Barras con botón de Scanner */}
        <div style={{ display: "flex", gap: "5px" }}>
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

        <div className="botones-acciones" style={{ marginTop: "15px" }}>
          <button type="submit" className="btn-guardar">
            GUARDAR
          </button>
          <button type="button" className="btn-cancelar" onClick={onCancelar}>
            CANCELAR
          </button>
        </div>
      </form>
    </div>
  );
}
