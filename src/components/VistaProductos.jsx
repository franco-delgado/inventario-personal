import { DetalleProducto } from "./DetalleProducto";
import { Scanner } from "./Scanner";
import { FormularioNuevo } from "./FormularioNuevo";

export function VistaProductos({
  categoriaSeleccionada,
  setCategoriaSeleccionada,
  productoSeleccionado,
  setProductoSeleccionado,
  resultadosBusqueda,
  buscarEnSupabase,
  scaneando,
  setScaneando,
  handleScanSuccess,
  busqueda,
  setBusqueda,
  setInputDestino,
  mostrandoFormularioNuevo,
  setMostrandoFormularioNuevo,
  handleGuardar,
  setCodigoEscaneado,
  codigoEscaneado
}) {

  // --- LÓGICA DE FILTRADO LOCAL ---
  const productosAMostrar = Array.isArray(resultadosBusqueda) 
    ? resultadosBusqueda.filter((prod) => {
        // 1. Filtro por Nombre
        if (busqueda.nombre && !prod.nombre.toLowerCase().includes(busqueda.nombre.toLowerCase())) {
          return false;
        }
        // 2. Filtro por Código de Barras (cb)
        if (busqueda.cb && !prod.cb?.includes(busqueda.cb)) {
          return false;
        }
        // 3. Filtro por Registro
        if (busqueda.registro && !prod.registro?.toLowerCase().includes(busqueda.registro.toLowerCase())) {
          return false;
        }
        // 4. Filtro por Fecha (Mes: YYYY-MM)
        if (busqueda.fecha && (!prod.fechaVto || !prod.fechaVto.startsWith(busqueda.fecha))) {
          return false;
        }
        
        return true; // Si pasa todos los filtros activos
      })
    : [];

  return (
    <div className="content-principal">
      <DetalleProducto
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        todosLosProductos={productosAMostrar}
        onActualizar={buscarEnSupabase}
      />

      {scaneando && (
        <Scanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setScaneando(false)}
        />
      )}

      <div className="header-navegacion">
        <button onClick={() => setCategoriaSeleccionada(null)}>← Categorías</button>
        <h1>{categoriaSeleccionada}</h1>
      </div>

      {!mostrandoFormularioNuevo ? (
        <div className="pantalla-productos">
          <div className="contenedor-busqueda" style={{ background: '#2a2a2a', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
            <input
              className="buscador"
              placeholder="NOMBRE..."
              value={busqueda.nombre || ""}
              onChange={(e) => {
                setBusqueda({ nombre: e.target.value, cb: "", registro: "", fecha: "" });
              }}
              style={{ width: '100%', marginBottom: '10px' }}
            />
            
            <div style={{ display: "flex", gap: "10px", flexWrap: 'wrap' }}>
              <input
                className="buscador"
                placeholder="CB..."
                value={busqueda.cb || ""}
                onChange={(e) => {
                  setBusqueda({ nombre: "", cb: e.target.value, registro: "", fecha: "" });
                }}
                style={{ flex: 1 }}
              />
              <button onClick={() => { setScaneando(true); setInputDestino("busqueda"); }}>📸</button>
              
              <input
                className="buscador"
                placeholder="REGISTRO..."
                value={busqueda.registro || ""}
                onChange={(e) => {
                  setBusqueda({ nombre: "", cb: "", registro: e.target.value, fecha: "" });
                }}
                style={{ flex: 1 }}
              />

              <input
                type="month"
                className="buscador"
                value={typeof busqueda.fecha === "string" && busqueda.fecha.length >= 7 ? busqueda.fecha : ""}
                onChange={(e) => {
                  setBusqueda({ nombre: "", cb: "", registro: "", fecha: e.target.value });
                }}
                style={{ flex: 1, minWidth: '150px' }}
              />
            </div>
          </div>

          <div className="lista-resultados">
            {productosAMostrar.length > 0 ? (
              productosAMostrar.map((prod) => (
                <button
                  key={prod.id}
                  className="btn-resultado"
                  onClick={() => setProductoSeleccionado(prod)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span>{prod.nombre}</span>
                  </div>
                </button>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
                No se encontraron productos con esos filtros.
              </p>
            )}
          </div>

          <button className="btn-nuevo" onClick={() => setMostrandoFormularioNuevo(true)}>
            + NUEVO PRODUCTO
          </button>
        </div>
      ) : (
        <FormularioNuevo
          onGuardar={handleGuardar}
          onCancelar={() => setMostrandoFormularioNuevo(false)}
          onAbrirScanner={() => {
            setScaneando(true);
            setInputDestino("nuevo");
            setCodigoEscaneado("");
          }}
          codigoEscaneado={codigoEscaneado}
        />
      )}
    </div>
  );
}