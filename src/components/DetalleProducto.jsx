export function DetalleProducto({ producto, onClose }) {
  if (!producto) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Detalle</h2>
        <hr />
        <p>
          <strong>CB:</strong> {producto.cb}
        </p>
        <p>
          <strong>Nombre:</strong> {producto.nombre}
        </p>
        <p>
          <strong>Registro:</strong> {producto.registro || "Sin registro"}
        </p>
        <p>
          <strong>Stock:</strong> {producto.stock}
        </p>
        <p>
          <strong>Vto:</strong> {producto.fechaVto || "N/A"}
        </p>
        <button className="btn-cerrar" onClick={onClose}>
          CERRAR
        </button>
      </div>
    </div>
  );
}
