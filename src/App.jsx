import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./App.css";

// --- COMPONENTE DEL ESCÁNER (MODAL) ---
function Scanner({ onScanSuccess, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 150 },
    });

    scanner.render(
      (text) => {
        onScanSuccess(text);
        scanner.clear();
      },
      (err) => {
        /* Errores de lectura ignorados */
      },
    );

    return () => {
      scanner
        .clear()
        .catch((error) => console.error("Error al limpiar scanner", error));
    };
  }, [onScanSuccess]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Escaneando Código...</h3>
        <div id="reader"></div>
        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{ marginTop: "10px" }}
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}

function App() {
  // --- ESTADOS ---
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrandoFormularioNuevo, setMostrandoFormularioNuevo] =
    useState(false);

  // Estados para Escáner
  const [scaneando, setScaneando] = useState(false);
  const [inputDestino, setInputDestino] = useState(""); // "busqueda" o "nuevo"

  // Estado para Nuevo Producto
  const [nuevoProducto, setNuevoProducto] = useState({
    cb: "",
    id: "",
    nombre: "",
    contenido: "",
    stock: 0,
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

  // --- LÓGICA DE ESCANEO ---
  const handleScanSuccess = (codigo) => {
    if (inputDestino === "busqueda") {
      setBusqueda(codigo);
    } else if (inputDestino === "nuevo") {
      setNuevoProducto({ ...nuevoProducto, cb: codigo });
    }
    setScaneando(false);
  };

  // --- GUARDAR EN SUPABASE ---
  const handleGuardar = async () => {
    if (!nuevoProducto.cb || !nuevoProducto.nombre) {
      alert("Faltan datos críticos (CB y Nombre)");
      return;
    }

    try {
      const { error } = await supabase.from("productos-farmacia").insert([
        {
          cb: nuevoProducto.cb,
          id: nuevoProducto.id,
          nombre: nuevoProducto.nombre.toUpperCase(),
          contenido: nuevoProducto.contenido,
          stock: parseInt(nuevoProducto.stock),
          fechaVto: nuevoProducto.fechaVto,
          categoria: categoriaSeleccionada,
        },
      ]);

      if (error) throw error;

      alert("¡Producto guardado en Supabase!");
      setNuevoProducto({
        cb: "",
        id: "",
        nombre: "",
        contenido: "",
        stock: 0,
        fechaVto: "",
      });
      setMostrandoFormularioNuevo(false);
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  // --- MODAL DETALLE ---
  const renderDetalleProducto = () => {
    if (!productoSeleccionado) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Detalle del Producto</h2>
          <hr />
          <p>
            <strong>CB:</strong> {productoSeleccionado.cb}
          </p>
          <p>
            <strong>Nombre:</strong> {productoSeleccionado.nombre}
          </p>
          <p>
            <strong>Stock:</strong> {productoSeleccionado.stock}
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

  // --- PANTALLA 2: PRODUCTOS ---
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
            setBusqueda("");
            setMostrandoFormularioNuevo(false);
          }}
          style={{ marginBottom: "20px" }}
        >
          ← Volver atrás
        </button>

        <h1>Sección: {categoriaSeleccionada}</h1>

        {!mostrandoFormularioNuevo ? (
          <div className="pantalla-productos">
            <div
              className="content-input"
              style={{ display: "flex", gap: "10px", justifyContent: "center" }}
            >
              <input
                className="buscador"
                placeholder="BUSCAR PRODUCTO..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button
                onClick={() => {
                  setScaneando(true);
                  setInputDestino("busqueda");
                }}
                style={{ fontSize: "20px" }}
              >
                📸
              </button>
            </div>

            {busqueda.length > 0 && (
              <div className="opciones-productos">
                <button
                  onClick={() =>
                    setProductoSeleccionado({
                      cb: busqueda,
                      nombre: "RESULTADO DE BUSQUEDA",
                      stock: 5,
                    })
                  }
                >
                  VER: {busqueda}
                </button>
              </div>
            )}

            <div style={{ marginTop: "40px" }}>
              <p>¿No encuentras el producto?</p>
              <button
                className="btn-nuevo"
                onClick={() => setMostrandoFormularioNuevo(true)}
              >
                + AGREGAR NUEVO PRODUCTO
              </button>
            </div>
          </div>
        ) : (
          /* FORMULARIO PARA NUEVO PRODUCTO */
          <div className="formulario-nuevo">
            <h3>Registrar en {categoriaSeleccionada}</h3>
            <div className="inputs-registro">
              <div style={{ display: "flex", gap: "5px" }}>
                <input
                  type="text"
                  placeholder="Código de Barras (CB)"
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
                type="text"
                placeholder="ID / Registro"
                value={nuevoProducto.id}
                onChange={(e) =>
                  setNuevoProducto({ ...nuevoProducto, id: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Nombre del producto"
                value={nuevoProducto.nombre}
                onChange={(e) =>
                  setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })
                }
              />
              <input
                type="text"
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
                type="number"
                placeholder="Stock inicial"
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
                GUARDAR EN SUPABASE
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

  // --- PANTALLA 1: MENÚ PRINCIPAL ---
  return (
    <div className="content-principal">
      <h1>Inventario Farmacia</h1>
      <div className="content-categorias">
        {categorias.map((cat) => (
          <div className="categoria" key={cat}>
            <button
              className="btn-categoria"
              onClick={() => setCategoriaSeleccionada(cat)}
            >
              {cat}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
