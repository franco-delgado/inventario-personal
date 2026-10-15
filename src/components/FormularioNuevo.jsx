import { useState, useEffect } from "react";
import { CapturaFoto } from "./CapturaFoto.jsx";
import "./componentes.css";

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
      <h3>Registrar producto</h3>
      <form onSubmit={handleSubmit} className="inputs-registro">
        <div className="form-campo">
          <label htmlFor="nuevo-cb">Código de barras</label>
          <div className="contenInputs">
            <input
              id="nuevo-cb"
              name="cb"
              placeholder="Escribilo o escanealo"
              value={producto.cb}
              onChange={handleChange}
            />
            <button
              type="button"
              className="btn-escaneo"
              onClick={() => onAbrirScanner("nuevo")}
            >
              Escanear
            </button>
          </div>
        </div>

        <div className="form-campo">
          <label htmlFor="nuevo-nombre">Nombre del producto</label>
          <input
            id="nuevo-nombre"
            name="nombre"
            value={producto.nombre}
            onChange={handleChange}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="nuevo-registro">Número de registro o serie</label>
          <input
            id="nuevo-registro"
            name="registro"
            value={producto.registro}
            onChange={handleChange}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="nuevo-contenido">Contenido</label>
          <input
            id="nuevo-contenido"
            name="contenido"
            placeholder="Ej: 500 ml"
            value={producto.contenido}
            onChange={handleChange}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="nuevo-stock">Stock inicial</label>
          <input
            id="nuevo-stock"
            name="stock"
            type="number"
            value={producto.stock}
            onChange={handleChange}
          />
        </div>

        <div className="form-campo">
          <label htmlFor="nuevo-vto">Vencimiento</label>
          <input
            id="nuevo-vto"
            name="fechaVto"
            type="date"
            value={producto.fechaVto}
            onChange={handleChange}
          />
        </div>

        <div className="form-campo">
          <label>Foto del envase (opcional)</label>
          {fotoPendiente && (
            <img
              src={fotoPendiente.foto}
              alt="Foto del envase"
              className="formulario-foto-previa"
            />
          )}
          <div className="foto-botones">
            <button type="button" onClick={() => setCapturandoFoto(true)}>
              {fotoPendiente ? "Cambiar foto" : "Agregar foto"}
            </button>
            {fotoPendiente && (
              <button
                type="button"
                className="btn-quitar-foto"
                onClick={() => setFotoPendiente(null)}
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>

        <div className="botones-acciones">
          <button type="button" className="btn-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="btn-guardar">
            Guardar producto
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
