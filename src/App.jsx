import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { Scanner } from "./components/Scanner";
import { DetalleProducto } from "./components/DetalleProducto";
import { FormularioNuevo } from "./components/FormularioNuevo"; // Importación necesaria
import "./App.css";

function App() {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
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
  const [codigoEscaneado, setCodigoEscaneado] = useState("");
  const [productosRelacionados, setProductosRelacionados] = useState([]);
  // Eliminamos el estado 'nuevoProducto' de aquí porque ahora vive dentro de FormularioNuevo

  const categorias = [
    "CAPILARES",
    "FEMENINAS",
    "DESODORANTES",
    "COLORACION",
    "HELADERAS",
    "BUCALES",
  ];

  // --- BÚSQUEDA ---
  const buscarEnSupabase = async () => {
    if (!busqueda.nombre && !busqueda.cb && !busqueda.registro) {
      setResultadosBusqueda([]);
      return;
    }
    try {
      let query = supabase
        .from("productos-farmacia")
        .select("*")
        .eq("categoria", categoriaSeleccionada);
      if (busqueda.nombre)
        query = query.ilike("nombre", `%${busqueda.nombre}%`);
      if (busqueda.cb) query = query.eq("cb", busqueda.cb);
      if (busqueda.registro)
        query = query.ilike("registro", `%${busqueda.registro}%`);

      const { data, error } = await query;
      if (error) throw error;
      setResultadosBusqueda(data || []);
    } catch (err) {
      console.error(err.message);
    }
  };
  // 2. El useEffect ahora solo se encarga de disparar la búsqueda con el timer
  useEffect(() => {
    const timer = setTimeout(buscarEnSupabase, 400);
    return () => clearTimeout(timer);
  }, [busqueda, categoriaSeleccionada]);

  // --- HANDLERS ---
  const handleScanSuccess = (codigo) => {
    if (inputDestino === "busqueda") {
      setBusqueda({ nombre: "", cb: codigo, registro: "" });
    } else {
      setCodigoEscaneado(codigo);
      // Este evento se manejará a través de la prop que reciba el componente Formulario si es necesario,
      // pero por ahora lo mantenemos simple para que funcione con tu lógica de 'inputDestino'
      //  window.dispatchEvent(new CustomEvent("scan-nuevo", { detail: codigo }));
    }
    setScaneando(false);
  };

  const handleGuardar = async (productoData) => {
    // Ahora recibe los datos desde el componente
    try {
      const { error } = await supabase.from("productos-farmacia").insert([
        {
          ...productoData,
          nombre: productoData.nombre.toUpperCase().trim(),
          categoria: categoriaSeleccionada,
          stock: parseInt(productoData.stock) || 0,
        },
      ]);
      if (error) throw error;
      alert("Guardado");
      setMostrandoFormularioNuevo(false);
      setBusqueda({ nombre: "", cb: "", registro: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  if (!categoriaSeleccionada) {
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

  return (
    <div className="content-principal">
      <DetalleProducto
        producto={productoSeleccionado}
        onClose={() => setProductoSeleccionado(null)}
        todosLosProductos={resultadosBusqueda} // <--- ¡Asegúrate de que esta variable tenga datos!
        onActualizar={buscarEnSupabase} // <-- Esto hará que la lista se actualice sola al editar/borrar
        lista
        completa
        aquí
      />

      {scaneando && (
        <Scanner
          onScanSuccess={handleScanSuccess}
          onClose={() => setScaneando(false)}
        />
      )}

      <button onClick={() => setCategoriaSeleccionada(null)}>← Volver</button>
      <h1>{categoriaSeleccionada}</h1>

      {!mostrandoFormularioNuevo ? (
        <div className="pantalla-productos">
          <div
            className="contenedor-busqueda"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <input
              className="buscador"
              placeholder="NOMBRE..."
              value={busqueda.nombre}
              onChange={(e) =>
                setBusqueda({ nombre: e.target.value, cb: "", registro: "" })
              }
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                className="buscador"
                placeholder="CB..."
                value={busqueda.cb}
                onChange={(e) =>
                  setBusqueda({ nombre: "", cb: e.target.value, registro: "" })
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
              <input
                className="buscador"
                placeholder="REGISTRO..."
                value={busqueda.registro}
                onChange={(e) =>
                  setBusqueda({ nombre: "", cb: "", registro: e.target.value })
                }
              />
            </div>
          </div>

          <div className="lista-resultados">
            {resultadosBusqueda.map((prod) => (
              <button
                key={prod.id}
                className="btn-resultado"
                onClick={() => {
                  // 1. Seteamos el producto principal para el detalle
                  setProductoSeleccionado(prod);
                  // 2. Lógica para encontrar similares:
                  // Tomamos las primeras dos palabras (ej: "ELVIVE KERA") para que la búsqueda sea precisa
                  const palabrasNombre = prod.nombre.split(" ");
                  const baseBusqueda = palabrasNombre
                    .slice(0, 2)
                    .join(" ")
                    .toLowerCase();
                }}
              >
                {prod.nombre} - Reg: {prod.registro || "N/A"}
              </button>
            ))}
          </div>
          <button
            className="btn-nuevo"
            onClick={() => setMostrandoFormularioNuevo(true)}
          >
            + NUEVO
          </button>
        </div>
      ) : (
        /* AQUÍ VA EL CAMBIO PRINCIPAL */
        <FormularioNuevo
          onGuardar={handleGuardar}
          onCancelar={() => setMostrandoFormularioNuevo(false)}
          onAbrirScanner={() => {
            setScaneando(true);
            setInputDestino("nuevo");
            setCodigoEscaneado(""); // Limpiar el código escaneado antes de abrir el scanner
          }}
        />
      )}
    </div>
  );
}

export default App;
