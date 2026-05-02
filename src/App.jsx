import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./App.css";

// --- COMPONENTE DEL ESCÁNER (MODAL) ---
function Scanner({ onScanSuccess, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 30,
      qrbox: { width: 300, height: 150 },
      aspectRatio: 1.0,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      formatsToSupport: [6, 7, 12, 8],
    });

    scanner.render(
      (text) => {
        onScanSuccess(text);
        scanner.clear();
      },
      (err) => {},
    );

    return () => {
      scanner
        .clear()
        .catch((error) => console.error("Error al limpiar", error));
    };
  }, [onScanSuccess]);

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{ maxWidth: "500px", width: "90%" }}
      >
        <h3>Escaneando Automáticamente...</h3>
        <div id="reader" style={{ width: "100%" }}></div>
        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "10px",
            backgroundColor: "#333",
            color: "white",
          }}
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}

function App() {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);

  // --- ESTADO DE BÚSQUEDA COMO OBJETO ---
  const [busqueda, setBusqueda] = useState({
    nombre: "",
    cb: "",
    registro: "",
  });

  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrandoFormularioNuevo, setMostrandoFormularioNuevo] =
    useState(false);
  const [scaneando, setScaneando] = useState(false);
  const [inputDestino, setInputDestino] = useState("");

  const [nuevoProducto, setNuevoProducto] = useState({
    cb: "",
    registro: "",
    nombre: "",
    contenido: "",
    stock: "",
    fechaVto: "",
  });

  const categorias = [
    "CAPILARES",
    "FEMENINAS",
    "DESODORANTES",
    "COLORACION",
    "HELADERAS",
    "BUCALES",
  ];

  // --- BÚSQUEDA DINÁMICA MULTI-FILTRO ---
  useEffect(() => {
    const buscarEnSupabase = async () => {
      // Si todos los campos están vacíos, limpiar resultados
      if (!busqueda.nombre && !busqueda.cb && !busqueda.registro) {
        setResultadosBusqueda([]);
        return;
      }

      try {
        let query = supabase
          .from("productos-farmacia")
          .select("*")
          .eq("categoria", categoriaSeleccionada);

        // Aplicar filtros dinámicos
        if (busqueda.nombre)
          query = query.ilike("nombre", `%${busqueda.nombre}%`);
        if (busqueda.cb) query = query.eq("cb", busqueda.cb);
        if (busqueda.registro)
          query = query.ilike("registro", `%${busqueda.registro}%`);

        const { data, error } = await query;
        if (error) throw error;
        setResultadosBusqueda(data || []);
      } catch (err) {
        console.error("Error buscando:", err.message);
      }
    };

    const timer = setTimeout(() => buscarEnSupabase(), 400);
    return () => clearTimeout(timer);
  }, [busqueda, categoriaSeleccionada]);

  const handleScanSuccess = (codigo) => {
    if (inputDestino === "busqueda") {
      setBusqueda({ nombre: "", cb: codigo, registro: "" });
    } else if (inputDestino === "nuevo") {
      setNuevoProducto((prev) => ({ ...prev, cb: codigo }));
    }
    setScaneando(false);
  };

  const handleEliminar = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Deseas eliminar este producto?")) return;
    try {
      const { error } = await supabase
        .from("productos-farmacia")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setResultadosBusqueda(resultadosBusqueda.filter((p) => p.id !== id));
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  const handleGuardar = async () => {
    if (!nuevoProducto.cb || !nuevoProducto.nombre) {
      alert("CB y Nombre son obligatorios");
      return;
    }
    const datosAEnviar = {
      cb: String(nuevoProducto.cb).trim(),
      nombre: nuevoProducto.nombre.toUpperCase().trim(),
      categoria: categoriaSeleccionada,
      stock: parseInt(nuevoProducto.stock) || 0,
      registro: nuevoProducto.registro.trim() || null,
      contenido: nuevoProducto.contenido || null,
      fechaVto: nuevoProducto.fechaVto || null,
    };
    try {
      const { error } = await supabase
        .from("productos-farmacia")
        .insert([datosAEnviar]);
      if (error) throw error;
      alert("¡Producto guardado!");
      setNuevoProducto({
        cb: "",
        registro: "",
        nombre: "",
        contenido: "",
        stock: "",
        fechaVto: "",
      });
      setMostrandoFormularioNuevo(false);
      setBusqueda({ nombre: "", cb: "", registro: "" });
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  const renderDetalleProducto = () => {
    if (!productoSeleccionado) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Detalle</h2>
          <hr />
          <p>
            <strong>CB:</strong> {productoSeleccionado.cb}
          </p>
          <p>
            <strong>Nombre:</strong> {productoSeleccionado.nombre}
          </p>
          <p>
            <strong>Registro:</strong>{" "}
            {productoSeleccionado.registro || "Sin registro"}
          </p>
          <p>
            <strong>Stock:</strong> {productoSeleccionado.stock}
          </p>
          <p>
            <strong>Vto:</strong> {productoSeleccionado.fechaVto || "N/A"}
          </p>
          <button
            className="btn-cerrar"
            onClick={() => setProductoSeleccionado(null)}
          >
            CERRAR
          </button>
        </div>
      </div>
    );
  };

  if (categoriaSeleccionada) {
    return (
      <div className="content-principal">
        {renderDetalleProducto()}
        {scaneando && (
          <Scanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setScaneando(false)}
          />
        )}

        <button
          onClick={() => {
            setCategoriaSeleccionada(null);
            setBusqueda({ nombre: "", cb: "", registro: "" });
          }}
        >
          ← Volver atrás
        </button>

        <h1>{categoriaSeleccionada}</h1>

        {!mostrandoFormularioNuevo ? (
          <div className="pantalla-productos">
            {/* --- TRIPLE INPUT DE BÚSQUEDA --- */}
            <div
              className="contenedor-busqueda"
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              <input
                className="buscador"
                placeholder="BUSCAR POR NOMBRE..."
                value={busqueda.nombre}
                onChange={(e) =>
                  setBusqueda({ nombre: e.target.value, cb: "", registro: "" })
                }
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ display: "flex", flex: 1, gap: "5px" }}>
                  <input
                    className="buscador"
                    placeholder="POR CÓDIGO..."
                    value={busqueda.cb}
                    onChange={(e) =>
                      setBusqueda({
                        nombre: "",
                        cb: e.target.value,
                        registro: "",
                      })
                    }
                  />
                  <button
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
                  style={{ flex: 1 }}
                  placeholder="POR REGISTRO..."
                  value={busqueda.registro}
                  onChange={(e) =>
                    setBusqueda({
                      nombre: "",
                      cb: "",
                      registro: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="lista-resultados" style={{ marginTop: "20px" }}>
              {resultadosBusqueda.map((prod) => (
                <div
                  key={prod.id}
                  style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
                >
                  <button
                    className="btn-resultado"
                    style={{ flex: 1, textAlign: "left", padding: "12px" }}
                    onClick={() => setProductoSeleccionado(prod)}
                  >
                    <strong>{prod.nombre}</strong> <br />
                    <small>
                      Stock: {prod.stock} | Reg: {prod.registro || "N/A"}
                    </small>
                  </button>
                  <button
                    onClick={(e) => handleEliminar(prod.id, e)}
                    style={{
                      backgroundColor: "#ff4d4d",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      padding: "0 15px",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn-nuevo"
              onClick={() => setMostrandoFormularioNuevo(true)}
              style={{ marginTop: "20px" }}
            >
              + AGREGAR NUEVO
            </button>
          </div>
        ) : (
          <div className="formulario-nuevo">
            <h3>Registrar Producto</h3>
            <div className="inputs-registro">
              <div style={{ display: "flex", gap: "5px" }}>
                <input
                  placeholder="Código de Barras"
                  value={nuevoProducto.cb}
                  onChange={(e) =>
                    setNuevoProducto({ ...nuevoProducto, cb: e.target.value })
                  }
                />
                <button
                  onClick={() => {
                    setScaneando(true);
                    setInputDestino("nuevo");
                  }}
                >
                  📸
                </button>
              </div>
              <input
                placeholder="Nombre"
                value={nuevoProducto.nombre}
                onChange={(e) =>
                  setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })
                }
              />
              <input
                placeholder="Nro. Registro / Serie"
                value={nuevoProducto.registro}
                onChange={(e) =>
                  setNuevoProducto({
                    ...nuevoProducto,
                    registro: e.target.value,
                  })
                }
              />
              <input
                placeholder="Contenido"
                value={nuevoProducto.contenido}
                onChange={(e) =>
                  setNuevoProducto({
                    ...nuevoProducto,
                    contenido: e.target.value,
                  })
                }
              />
              <input
                placeholder="Stock"
                type="number"
                value={nuevoProducto.stock}
                onChange={(e) =>
                  setNuevoProducto({ ...nuevoProducto, stock: e.target.value })
                }
              />
              <input
                type="date"
                value={nuevoProducto.fechaVto}
                onChange={(e) =>
                  setNuevoProducto({
                    ...nuevoProducto,
                    fechaVto: e.target.value,
                  })
                }
              />
            </div>
            <div className="botones-acciones">
              <button className="btn-guardar" onClick={handleGuardar}>
                GUARDAR
              </button>
              <button
                className="btn-cancelar"
                onClick={() => setMostrandoFormularioNuevo(false)}
              >
                CANCELAR
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="content-principal">
      <h1>Inventario Farmacia</h1>
      <div className="content-categorias">
        {categorias.map((cat) => (
          <button
            key={cat}
            className="btn-categoria"
            onClick={() => setCategoriaSeleccionada(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
