import { DetalleProducto } from "./DetalleProducto";
import { Scanner } from "./Scanner";
import { useParams } from "react-router-dom";
import { FormularioNuevo } from "./FormularioNuevo";
import "./VistaProductos.css";

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
  codigoEscaneado,
  ListaCompleta,
  modoListaCompleta,
}) {
  const { usuario } = useParams();

  const hayTextoEnBuscador = Boolean(
    (busqueda.nombre && busqueda.nombre.trim() !== "") ||
    (busqueda.cb && busqueda.cb.trim() !== "") ||
    (busqueda.registro && busqueda.registro.trim() !== "") ||
    (busqueda.fecha && busqueda.fecha.trim() !== "")
  );

  const productosAMostrar = Array.isArray(resultadosBusqueda)
    ? resultadosBusqueda.filter((prod) => {
        if (
          !prod ||
          typeof prod !== "object" ||
          !("nombre" in prod) ||
          typeof prod.nombre !== "string"
        ) {
          return false;
        }

        const usuarioLogueado = usuario ? usuario.trim().toUpperCase() : "";
        const duenoDelProducto = prod.usuario
          ? prod.usuario.trim().toUpperCase()
          : "";

        if (usuarioLogueado && duenoDelProducto !== usuarioLogueado) {
          return false;
        }

        if (!modoListaCompleta && hayTextoEnBuscador) {
          if (
            busqueda.nombre &&
            !prod.nombre.toLowerCase().includes(busqueda.nombre.toLowerCase())
          ) {
            return false;
          }

          if (busqueda.cb && !prod.cb?.toString().includes(busqueda.cb)) {
            return false;
          }

          if (
            busqueda.registro &&
            !prod.registro
              ?.toLowerCase()
              .includes(busqueda.registro.toLowerCase())
          ) {
            return false;
          }

          if (
            busqueda.fecha &&
            (!prod.fechaVto || !prod.fechaVto.startsWith(busqueda.fecha))
          ) {
            return false;
          }
        }

        return true;
      })
    : [];

  const mostrarLista = modoListaCompleta || hayTextoEnBuscador;

  return (
    <div className="content-principal">
      {scaneando && (
      <Scanner
      onScanSuccess={handleScanSuccess}
      onClose={() => setScaneando(false)}
      />
      )}
      
    {productoSeleccionado &&
    typeof productoSeleccionado.nombre === "string" && (
    <DetalleProducto
      producto={productoSeleccionado}
      onClose={() => setProductoSeleccionado(null)}
      todosLosProductos={productosAMostrar}
      onActualizar={async () => {
          // Refresca la lista general y limpia la selección vieja para forzar el re-render
        if (typeof buscarEnSupabase === "function") {
          await buscarEnSupabase();
        }
        setProductoSeleccionado(null);
      }}
    />
)}

      <div className="header-navegacion">
        <button onClick={() => setCategoriaSeleccionada(null)}>
          ← Categorías
        </button>
        <h1>{categoriaSeleccionada}</h1>
        {/* Elemento de contrapeso para un centrado perfecto */}
        <div className="header-spacer"></div>
      </div>

      {!mostrandoFormularioNuevo ? (
        <div className="pantalla-productos">
          {/* Panel de Búsqueda */}
          <div className="contenedor-busqueda">
            <input
              className="buscador buscador-principal"
              placeholder="NOMBRE..."
              value={busqueda.nombre || ""}
              onChange={(e) => {
                setBusqueda({
                  nombre: e.target.value,
                  cb: "",
                  registro: "",
                  fecha: "",
                });
              }}
            />

            <div className="grupo-filtros">
              <div className="input-con-boton">
                <input
                  className="buscador"
                  placeholder="CB..."
                  value={busqueda.cb || ""}
                  onChange={(e) => {
                    setBusqueda({
                      nombre: "",
                      cb: e.target.value,
                      registro: "",
                      fecha: "",
                    });
                  }}
                />
                <button
                  type="button"
                  className="btn-escaneo"
                  onClick={() => {
                    setScaneando(true);
                    setInputDestino("busqueda");
                  }}
                >
                  📸
                </button>
              </div>

              <input
                className="buscador"
                placeholder="REGISTRO..."
                value={busqueda.registro || ""}
                onChange={(e) => {
                  setBusqueda({
                    nombre: "",
                    cb: "",
                    registro: e.target.value,
                    fecha: "",
                  });
                }}
              />

              <input
                type="month"
                className="buscador input-fecha"
                value={
                  typeof busqueda.fecha === "string" &&
                  busqueda.fecha.length >= 7
                    ? busqueda.fecha
                    : ""
                }
                onChange={(e) => {
                  setBusqueda({
                    nombre: "",
                    cb: "",
                    registro: "",
                    fecha: e.target.value,
                  });
                }}
              />

              <button
                type="button"
                className="btn-mostrar-lista"
                onClick={() => {
                  if (typeof ListaCompleta === "function") {
                    ListaCompleta();
                  } else {
                    console.error("ListaCompleta no está definida.");
                  }
                }}
              >
                {modoListaCompleta ? "Ocultar lista" : "Mostrar lista"}
              </button>
            </div>
          </div>

          {/* Renderizado de la Tabla Responsiva */}
          <div className="lista-resultados">
            {mostrarLista ? (
              productosAMostrar.length > 0 ? (
                <div className="tabla-contenedor">
                  <table className="tabla-excel">
                    <thead>
                      <tr>
                        <th>Registro</th>
                        <th>Nombre</th>
                        <th>Stock</th>
                        <th>Fecha Vto.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosAMostrar
                        .filter((prod) => prod && typeof prod.nombre === "string")
                        .map((prod) => (
                          <tr
                            key={prod.id || Math.random()}
                            onClick={() => setProductoSeleccionado(prod)}
                            className="fila-producto"
                          >
                            <td data-label="Registro">
                              {prod.registro || "-"}
                            </td>
                            <td data-label="Nombre" className="col-nombre">
                              {prod.nombre}
                            </td>
                            <td data-label="Cantidad / Stock" className="col-stock">
                              {prod.stock ?? prod.cantidad ?? 0}
                            </td>
                            <td data-label="Fecha Vto.">
                              {prod.fechaVto || prod.fecha || "-"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mensaje-vacio">
                  No se encontraron productos en esta categoría.
                </p>
              )
            ) : (
              <p className="mensaje-inicial">
                Escribe algo para comenzar la búsqueda o presiona{" "}
                <strong>"Mostrar lista"</strong>...
              </p>
            )}
          </div>

          <button
            className="btn-nuevo"
            onClick={() => setMostrandoFormularioNuevo(true)}
          >
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