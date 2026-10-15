import { useState } from "react";
import { DetalleProducto } from "./DetalleProducto";
import { Scanner } from "./Scanner";
import { ReconocedorProducto } from "./ReconocedorProducto";
import { useParams } from "react-router-dom";
import { FormularioNuevo } from "./FormularioNuevo";
import { estadoVencimiento, formatearFecha } from "../utils/vencimiento.js";
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
  const [mostrandoReconocedor, setMostrandoReconocedor] = useState(false);

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

      {mostrandoReconocedor && (
        <ReconocedorProducto
          onClose={() => setMostrandoReconocedor(false)}
          onVerFicha={(producto) => {
            setMostrandoReconocedor(false);
            setProductoSeleccionado(producto);
          }}
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
        <button type="button" onClick={() => setCategoriaSeleccionada(null)}>
          ← Categorías
        </button>
        <h1>{categoriaSeleccionada}</h1>
      </div>

      {!mostrandoFormularioNuevo ? (
        <div className="pantalla-productos">
          {/* Panel de Búsqueda */}
          <div className="contenedor-busqueda">
            <button
              type="button"
              className="btn-reconocer-envase"
              onClick={() => setMostrandoReconocedor(true)}
            >
              Reconocer producto con la cámara
            </button>

            <input
              className="buscador buscador-principal"
              placeholder="Buscar por nombre"
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
                  placeholder="Código"
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
                  aria-label="Escanear código de barras"
                  onClick={() => {
                    setScaneando(true);
                    setInputDestino("busqueda");
                  }}
                >
                  Escanear
                </button>
              </div>

              <input
                className="buscador"
                placeholder="Registro"
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
                        <th>Nombre</th>
                        <th>Registro</th>
                        <th className="col-stock">Stock</th>
                        <th>Vencimiento</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosAMostrar
                        .filter((prod) => prod && typeof prod.nombre === "string")
                        .map((prod) => {
                          const fechaVto = prod.fechaVto || prod.fecha;
                          const estado = estadoVencimiento(fechaVto);
                          return (
                            <tr
                              key={prod.id || prod.nombre}
                              onClick={() => setProductoSeleccionado(prod)}
                              className="fila-producto"
                            >
                              <td data-label="Nombre" className="col-nombre">
                                {prod.nombre}
                              </td>
                              <td data-label="Registro">{prod.registro || "-"}</td>
                              <td data-label="Stock" className="col-stock">
                                {prod.stock ?? prod.cantidad ?? 0}
                              </td>
                              <td data-label="Vencimiento">{formatearFecha(fechaVto)}</td>
                              <td data-label="Estado">
                                {estado ? (
                                  <span className={`badge ${estado.clase}`}>{estado.texto}</span>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mensaje-vacio">
                  No hay productos que coincidan con la búsqueda.
                </p>
              )
            ) : (
              <p className="mensaje-inicial">
                Escribí algo para buscar o tocá <strong>Mostrar lista</strong> para ver
                todos los productos de esta categoría.
              </p>
            )}
          </div>

          <button
            className="btn-nuevo"
            onClick={() => setMostrandoFormularioNuevo(true)}
          >
            Nuevo producto
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