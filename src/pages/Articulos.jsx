import { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // 👈 AGREGO IMPORTACIÓN: Clave para capturar el usuario
import { supabase } from "../lib/supabase.js";
import { VistaProductos } from "../components/VistaProductos.jsx";
import "./Articulos.css";

function Articulos() {
  // Capturamos el usuario desde la barra de direcciones de la URL
  const { usuario } = useParams();

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);

  // --- 1. CARGAR CATEGORÍAS DESDE SUPABASE FILTRADAS POR USUARIO ---
  const fetchCategorias = async () => {
    if (!usuario) return;
    try {
      setCargandoCategorias(true);
      const { data, error } = await supabase
        .from("categoria-farmacia")
        .select("*")
        .eq("usuario", usuario.toUpperCase()) // 👈 AISLAMIENTO: Trae solo las categorías de este usuario
        .order("categoria", { ascending: true });

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
  }, [usuario]);

  // --- 2. AGREGAR CATEGORÍA A SUPABASE ASOCIADA AL USUARIO ---
  const agregarCategoria = async () => {
    if (!usuario) return;
    const nueva = prompt("Nombre de la nueva categoría:");
    if (!nueva) return;

    const categoriaLimpio = nueva.toUpperCase().trim();

    if (categorias.some((c) => c.categoria === categoriaLimpio)) {
      return alert("La categoría ya existe.");
    }

    try {
      const { error } = await supabase.from("categoria-farmacia").insert([
        {
          categoria: categoriaLimpio,
          usuario: usuario.toUpperCase(), // 👈 Vincula la nueva categoría a tu usuario
        },
      ]);

      if (error) throw error;
      fetchCategorias();
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
      fetchCategorias();
    } catch (err) {
      alert("No se pudo eliminar: " + err.message);
    }
  };

  // --- ESTADOS DE PRODUCTOS ---
  const [busqueda, setBusqueda] = useState({
    nombre: "",
    cb: "",
    registro: "",
    fecha: "",
  });
  // Estados para la funcionalidad de Vencimientos
const [mostrandoVencimientos, setMostrandoVencimientos] = useState(false);
const [productosVencimiento, setProductosVencimiento] = useState([]);
const [filtroFecha, setFiltroFecha] = useState({ 
  anio: new Date().getFullYear(), 
  mes: (new Date().getMonth() + 1).toString().padStart(2, '0') 
});

  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrandoFormularioNuevo, setMostrandoFormularioNuevo] =
    useState(false);
  const [scaneando, setScaneando] = useState(false);
  const [inputDestino, setInputDestino] = useState("");
  const [codigoEscaneado, setCodigoEscaneado] = useState("");

  // --- BÚSQUEDA DE PRODUCTOS ULTRA FILTRADA POR USUARIO Y CATEGORÍA ---
  const buscarEnSupabase = async () => {
    if (!usuario) return;

    // Si los campos de búsqueda están vacíos, traemos todos los artículos de esta categoría de forma segura
    let query = supabase
      .from("productos-farmacia")
      .select("*")
      .eq("categoria", categoriaSeleccionada)
      .eq("usuario", usuario.toUpperCase()); // 👈 CLAVE CENTRAL: Trae solo lo que le pertenece al usuario logueado

    if (busqueda.nombre) query = query.ilike("nombre", `%${busqueda.nombre}%`);
    if (busqueda.cb) query = query.eq("cb", busqueda.cb);
    if (busqueda.registro)
      query = query.ilike("registro", `%${busqueda.registro}%`);

    try {
      const { data, error } = await query;
      if (error) throw error;
      setResultadosBusqueda(data || []);
    } catch (err) {
      console.error(err.message);
    }
  };

  // Efecto que dispara la búsqueda al tipear o cambiar de categoría
  useEffect(() => {
    buscarEnSupabase();
  }, [busqueda, categoriaSeleccionada, usuario]);

  // --- HANDLERS ---
  const handleScanSuccess = (codigo) => {
    if (inputDestino === "busqueda") {
      setBusqueda({ nombre: "", cb: codigo, registro: "", fecha: "" });
    } else {
      setCodigoEscaneado(codigo);
    }
    setScaneando(false);
  };

  const handleGuardar = async (productoData) => {
    if (!usuario) return;
    try {
      const { error } = await supabase.from("productos-farmacia").insert([
        {
          ...productoData,
          nombre: productoData.nombre.toUpperCase().trim(),
          categoria: categoriaSeleccionada,
          stock: parseInt(productoData.stock) || 0,
          usuario: usuario.toUpperCase(), // 👈 Vincula el nuevo producto de por vida al usuario activo
        },
      ]);
      if (error) throw error;
      alert("Producto Guardado");
      setMostrandoFormularioNuevo(false);
      setBusqueda({ nombre: "", cb: "", registro: "", fecha: "" });
      buscarEnSupabase(); // Recarga la lista actual
    } catch (err) {
      alert(err.message);
    }
  };

  //NUEVA FUNCION DE BUSQUEDA POR FECHA
const buscarVencimientos = async () => {
  if (!usuario) return;

  // Calculamos el inicio del mes seleccionado
  const inicioMes = `${filtroFecha.anio}-${filtroFecha.mes}-01`;
  
  // Calculamos el inicio del mes siguiente para el límite superior
  let siguienteMes = parseInt(filtroFecha.mes) + 1;
  let anioSiguiente = parseInt(filtroFecha.anio);
  if (siguienteMes > 12) {
    siguienteMes = 1;
    anioSiguiente += 1;
  }
  const finMes = `${anioSiguiente}-${siguienteMes.toString().padStart(2, '0')}-01`;

  try {
    const { data, error } = await supabase
      .from("productos-farmacia")
      .select("*")
      .eq("usuario", usuario.toUpperCase()) // Importante: solo del usuario
      .gte("fechaVto", inicioMes)
      .lt("fechaVto", finMes)
      .order("fechaVto", { ascending: true });

    if (error) throw error;
    setProductosVencimiento(data || []);
  } catch (err) {
    alert("Error al buscar vencimientos: " + err.message);
  }
};
  // --- VISTA DE SELECCIÓN DE CATEGORÍA ---
  if (!categoriaSeleccionada) {
    return (
      <div className="content-principal">
        <h1>Articulos</h1>
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
        <div className="busquedaVTO">
          <button className="botonVTOgeneral" onClick={() => setMostrandoVencimientos(!mostrandoVencimientos)}>
            {mostrandoVencimientos ? "Volver al Inventario" : "Próximos a vencer"}
          </button>
          {mostrandoVencimientos && (
            <div className="panel-vencimientos">
              <h3>Filtrar por Vencimiento</h3>
                <input 
                  type="number" value={filtroFecha.anio} 
                  onChange={(e) => setFiltroFecha({...filtroFecha, anio: e.target.value})} 
                />
              <select value={filtroFecha.mes} onChange={(e) => setFiltroFecha({...filtroFecha, mes: e.target.value})}>
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => 
                  <option key={m} value={m}>{m}</option>
                )}
              </select>
                <button onClick={buscarVencimientos}>Buscar</button>
                <ul>
                  {productosVencimiento.map(p => (
                    <li key={p.id}>
                      {p.nombre} - <strong>Vence: {p.fechaVto}</strong>
                    </li>
                  ))}
                  {productosVencimiento.length === 0 && <p>No hay productos que venzan en esta fecha.</p>}
                </ul>
        </div>
)}
        </div>
      </div>
    );
  }

  // --- VISTA DE PRODUCTOS ---
  if (categoriaSeleccionada) {
    return (
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
    );
  }
}

export default Articulos;
