import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { Html5QrcodeScanner } from "html5-qrcode";
import "./App.css";

// --- COMPONENTE DEL ESCÁNER (MODAL) ---
function Scanner({ onScanSuccess, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 30, // Máxima velocidad para detección instantánea
      qrbox: { width: 300, height: 150 }, // Caja rectangular, ideal para barras
      aspectRatio: 1.0,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
      formatsToSupport: [
        6,  // EAN_13
        7,  // EAN_8
        12, // CODE_128
        8,  // CODE_39
      ],
    });

    scanner.render(
      (text) => {
        console.log("Código detectado:", text);
        onScanSuccess(text);
        scanner.clear(); 
      },
      (err) => { /* Errores de lectura ignorados */ }
    );

    return () => {
      scanner.clear().catch((error) => console.error("Error al limpiar", error));
    };
  }, [onScanSuccess]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px", width: "90%" }}>
        <h3 style={{ marginBottom: "10px" }}>Escaneando Automáticamente...</h3>
        <p style={{ fontSize: "13px", color: "#555", marginBottom: "15px" }}>
          Ubique las barras dentro del recuadro blanco.
        </p>
        <div id="reader" style={{ width: "100%" }}></div>
        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "10px",
            backgroundColor: "#333",
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
  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrandoFormularioNuevo, setMostrandoFormularioNuevo] = useState(false);
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

  const categorias = ["CAPILARES", "FEMENINAS", "DESODORANTES", "COLORACION", "HELADERAS", "BUCALES"];

  // --- BÚSQUEDA DINÁMICA ---
  useEffect(() => {
    const buscarEnSupabase = async () => {
      if (busqueda.trim().length === 0) {
        setResultadosBusqueda([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("productos-farmacia")
          .select("*")
          .ilike("nombre", `%${busqueda}%`)
          .eq("categoria", categoriaSeleccionada);

        if (error) throw error;
        setResultadosBusqueda(data || []);
      } catch (err) {
        console.error("Error buscando:", err.message);
      }
    };

    const timer = setTimeout(() => buscarEnSupabase(), 400);
    return () => clearTimeout(timer);
  }, [busqueda, categoriaSeleccionada]);

  // --- LÓGICA DE ESCANEO ---
  const handleScanSuccess = (codigo) => {
    if (inputDestino === "busqueda") {
      setBusqueda(codigo);
    } else if (inputDestino === "nuevo") {
      setNuevoProducto((prev) => ({ ...prev, cb: codigo }));
    }
    setScaneando(false);
    alert("Código leído: " + codigo);
  };

  // --- ELIMINAR ---
  const handleEliminar = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Deseas eliminar este producto?")) return;
    try {
      const { error } = await supabase.from("productos-farmacia").delete().eq("id", id);
      if (error) throw error;
      alert("Eliminado con éxito");
      setResultadosBusqueda(resultadosBusqueda.filter((p) => p.id !== id));
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  // --- GUARDAR ---
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
      registro: nuevoProducto.registro || null,
      contenido: nuevoProducto.contenido || null,
      fechaVto: nuevoProducto.fechaVto || null,
    };

    try {
      const { error } = await supabase.from("productos-farmacia").insert([datosAEnviar]);
      if (error) throw error;
      alert("¡Producto guardado!");
      setNuevoProducto({ cb: "", registro: "", nombre: "", contenido: "", stock: "", fechaVto: "" });
      setMostrandoFormularioNuevo(false);
      setBusqueda("");
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
          <p><strong>CB:</strong> {productoSeleccionado.cb}</p>
          <p><strong>Nombre:</strong> {productoSeleccionado.nombre}</p>
          <p><strong>Stock:</strong> {productoSeleccionado.stock}</p>
          <p><strong>Vto:</strong> {productoSeleccionado.fechaVto || "N/A"}</p>
          <button className="btn-cerrar" onClick={() => setProductoSeleccionado(null)}>CERRAR</button>
        </div>
      </div>
    );
  };

  if (categoriaSeleccionada) {
    return (
      <div className="content-principal">
        {renderDetalleProducto()}
        {scaneando && <Scanner onScanSuccess={handleScanSuccess} onClose={() => setScaneando(false)} />}
        
        <button onClick={() => { setCategoriaSeleccionada(null); setBusqueda(""); }}>
          ← Volver atrás
        </button>

        <h1>{categoriaSeleccionada}</h1>

        {!mostrandoFormularioNuevo ? (
          <div className="pantalla-productos">
            <div className="content-input" style={{ display: "flex", gap: "10px" }}>
              <input
                className="buscador"
                placeholder="BUSCAR PRODUCTO..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <button onClick={() => { setScaneando(true); setInputDestino("busqueda"); }}>📸</button>
            </div>

            <div className="lista-resultados" style={{ marginTop: "20px" }}>
              {resultadosBusqueda.map((prod) => (
                <div key={prod.id} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button className="btn-resultado" style={{ flex: 1, textAlign: "left", padding: "12px" }} onClick={() => setProductoSeleccionado(prod)}>
                    <strong>{prod.nombre}</strong> <br />
                    <small>Stock: {prod.stock} | CB: {prod.cb}</small>
                  </button>
                  <button onClick={(e) => handleEliminar(prod.id, e)} style={{ backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "5px", padding: "0 15px", cursor: "pointer" }}>🗑️</button>
                </div>
              ))}
            </div>
            <button className="btn-nuevo" onClick={() => setMostrandoFormularioNuevo(true)} style={{ marginTop: "20px" }}>+ AGREGAR NUEVO</button>
          </div>
        ) : (
          <div className="formulario-nuevo">
            <h3>Registrar</h3>
            <div className="inputs-registro">
              <div style={{ display: "flex", gap: "5px" }}>
                <input placeholder="Código de Barras" value={nuevoProducto.cb} onChange={(e) => setNuevoProducto({ ...nuevoProducto, cb: e.target.value })} />
                <button onClick={() => { setScaneando(true); setInputDestino("nuevo"); }}>📸</button>
              </div>
              <input placeholder="Nombre" value={nuevoProducto.nombre} onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} />
              <input placeholder="Contenido" value={nuevoProducto.contenido} onChange={(e) => setNuevoProducto({ ...nuevoProducto, contenido: e.target.value })} />
              <input placeholder="Stock" type="number" value={nuevoProducto.stock} onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })} />
              <input type="date" value={nuevoProducto.fechaVto} onChange={(e) => setNuevoProducto({ ...nuevoProducto, fechaVto: e.target.value })} />
            </div>
            <div className="botones-acciones">
              <button className="btn-guardar" onClick={handleGuardar}>GUARDAR</button>
              <button className="btn-cancelar" onClick={() => setMostrandoFormularioNuevo(false)}>CANCELAR</button>
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
          <button key={cat} className="btn-categoria" onClick={() => setCategoriaSeleccionada(cat)}>{cat}</button>
        ))}
      </div>
    </div>
  );
}

export default App;