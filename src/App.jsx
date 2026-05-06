import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.js"
import { Scanner } from "./components/Scanner";
import { DetalleProducto } from "./components/DetalleProducto";
import { FormularioNuevo } from "./components/FormularioNuevo";
import { VistaProductos } from "./components/VistaProductos";
import "./App.css";

function App() {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);

  // --- 1. CARGAR CATEGORÍAS DESDE SUPABASE ---
  const fetchCategorias = async () => {
    try {
      setCargandoCategorias(true);
      const { data, error } = await supabase
        .from("categoria-farmacia")
        .select("*")
        .order("categoria", { ascending: true }); // Ordenadas alfabéticamente

      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error("Error cargando categorías:", err.message);
    } finally {
      setCargandoCategorias(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  // --- 2. AGREGAR CATEGORÍA A SUPABASE ---
  const agregarCategoria = async () => {
    const nueva = prompt("Nombre de la nueva categoría:");
    if (!nueva) return;

    const categoriaLimpio = nueva.toUpperCase().trim();
    
    // Verificar si ya existe localmente para ahorrar una petición
    if (categorias.some(c => c.categoria === categoriaLimpio)) {
      return alert("La categoría ya existe.");
    }

    try {
      const { error } = await supabase
        .from("categoria-farmacia")
        .insert([{ categoria: categoriaLimpio }]);

      if (error) throw error;
      fetchCategorias(); // Recargar lista
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  // --- 3. ELIMINAR CATEGORÍA DE SUPABASE ---
  const eliminarCategoria = async (id, categoria, e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Seguro que quieres eliminar "${categoria}"?`)) return;

    try {
      const { error } = await supabase
        .from("categoria-farmacia")
        .delete()
        .eq("id", id);

      if (error) throw error;
      fetchCategorias(); // Recargar lista
    } catch (err) {
      alert("No se pudo eliminar: " + err.message);
    }
  };

  // --- ESTADOS DE PRODUCTOS ---
  const [busqueda, setBusqueda] = useState({ nombre: "", cb: "", registro: "", fecha: "" });
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrandoFormularioNuevo, setMostrandoFormularioNuevo] = useState(false);
  const [scaneando, setScaneando] = useState(false);
  const [inputDestino, setInputDestino] = useState("");
  const [codigoEscaneado, setCodigoEscaneado] = useState("");

  // --- BÚSQUEDA DE PRODUCTOS ---
  const buscarEnSupabase = async () => {
    if (!busqueda.nombre && !busqueda.cb && !busqueda.registro && !busqueda.fecha) {
      setResultadosBusqueda([]);
      return;
    }
    try {
      let query = supabase
        .from("productos-farmacia")
        .select("*")
        .eq("categoria", categoriaSeleccionada);
      
      if (busqueda.categoria) query = query.ilike("categoria", `%${busqueda.categoria}%`);
      if (busqueda.cb) query = query.eq("cb", busqueda.cb);
      if (busqueda.registro) query = query.ilike("registro", `%${busqueda.registro}%`);

      const { data, error } = await query;
      if (error) throw error;
      setResultadosBusqueda(data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(buscarEnSupabase, 100);
    return () => clearTimeout(timer);
  }, [busqueda, categoriaSeleccionada]);

  // --- HANDLERS ---
  const handleScanSuccess = (codigo) => {
    if (inputDestino === "busqueda") {
      setBusqueda({ nombre: "", cb: codigo, registro: "" });
    } else {
      setCodigoEscaneado(codigo);
    }
    setScaneando(false);
  };

  const handleGuardar = async (productoData) => {
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
      alert("Producto Guardado");
      setMostrandoFormularioNuevo(false);
      setBusqueda({ nombre: "", cb: "", registro: "" });
    } catch (err) {
      alert(err.message);
    }
  };

  // --- VISTA DE SELECCIÓN DE CATEGORÍA ---
  if (!categoriaSeleccionada) {
    return (
      <div className="content-principal">
        <h1>Inventario Farmacia</h1>
        {cargandoCategorias ? (
          <p>Cargando categorías...</p>
        ) : (
          <div className="content-categorias">
            {categorias.map((cat) => (
              <div key={cat.id} className="contenedor-btn-categoria">
                <button
                  className="btn-categoria"
                  onClick={() => setCategoriaSeleccionada(cat.categoria)}
                >
                  {cat.categoria}
                </button>
                <button 
                  className="btn-eliminar-cat" 
                  onClick={(e) => eliminarCategoria(cat.id, cat.categoria, e)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="btn-agregar-cat" onClick={agregarCategoria}>
              Nueva Categoría
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA DE PRODUCTOS ---
  if (categoriaSeleccionada) {
    return(
      <VistaProductos
      categoriaSeleccionada={categoriaSeleccionada}
      setCategoriaSeleccionada={setCategoriaSeleccionada}
      productoSeleccionado={productoSeleccionado}
      setProductoSeleccionado={setProductoSeleccionado}
      resultadosBusqueda={resultadosBusqueda}
      buscarEnSupabase={buscarEnSupabase}
      scaneando={scaneando}
      setScaneando={setScaneando}
      handleScanSuccess={handleScanSuccess}
      busqueda={busqueda}
      setBusqueda={setBusqueda}
      setInputDestino={setInputDestino}
      mostrandoFormularioNuevo={mostrandoFormularioNuevo}
      setMostrandoFormularioNuevo={setMostrandoFormularioNuevo}
      handleGuardar={handleGuardar}
      setCodigoEscaneado={setCodigoEscaneado}
      codigoEscaneado={codigoEscaneado}
    />
    )
  }
  
}

export default App;