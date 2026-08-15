import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase.js"; // 👈 Cliente de Firebase
import { ref, get, push, set, remove } from "firebase/database";
import { VistaProductos } from "../components/VistaProductos.jsx";
import { exportarVencimientosAExcel } from "../utils/exportarExcel.js"; // Ajusta la ruta a tu carpeta
import "./Articulos.css";

function Articulos() {
  // Capturamos el usuario desde la barra de direcciones de la URL
  const { usuario } = useParams();

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);

  // --- 1. CARGAR CATEGORÍAS DESDE FIREBASE FILTRADAS POR USUARIO ---
  const fetchCategorias = async () => {
    if (!usuario) return;
    try {
      setCargandoCategorias(true);
      const catRef = ref(db, "categoria-farmacia");
      const snapshot = await get(catRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Convertimos el objeto/array de Firebase a un formato uniforme con ID
        const lista = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

        // Filtramos por usuario y ordenamos por nombre de categoría
        const filtradas = lista
          .filter(
            (c) =>
              c.usuario &&
              c.usuario.toString().toUpperCase() === usuario.toUpperCase()
          )
          .sort((a, b) =>
            (a.categoria || "").localeCompare(b.categoria || "")
          );

        setCategorias(filtradas);
      } else {
        setCategorias([]);
      }
    } catch (err) {
      console.error("Error cargando categorías:", err.message);
    } finally {
      setCargandoCategorias(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, [usuario]);

  // --- 2. AGREGAR CATEGORÍA A FIREBASE ASOCIADA AL USUARIO ---
  const agregarCategoria = async () => {
    if (!usuario) return;
    const nueva = prompt("Nombre de la nueva categoría:");
    if (!nueva) return;

    const categoriaLimpio = nueva.toUpperCase().trim();

    if (categorias.some((c) => c.categoria === categoriaLimpio)) {
      return alert("La categoría ya existe.");
    }

    try {
      const catRef = ref(db, "categoria-farmacia");
      const nuevaCatRef = push(catRef); // Genera una clave única automáticamente

      await set(nuevaCatRef, {
        categoria: categoriaLimpio,
        usuario: usuario.toUpperCase(),
      });

      fetchCategorias();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  // --- 3. ELIMINAR CATEGORÍA DE FIREBASE ---
  const eliminarCategoria = async (id, categoria, e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Seguro que quieres eliminar "${categoria}"?`)) return;

    try {
      const catRef = ref(db, `categoria-farmacia/${id}`);
      await remove(catRef);
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
    anio: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString().padStart(2, "0"),
  });

  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrandoFormularioNuevo, setMostrandoFormularioNuevo] = useState(false);
  const [scaneando, setScaneando] = useState(false);
  const [inputDestino, setInputDestino] = useState("");
  const [codigoEscaneado, setCodigoEscaneado] = useState("");

  // --- BÚSQUEDA DE PRODUCTOS FILTRADA POR USUARIO Y CATEGORÍA ---
  const buscarEnFirebase = async () => {
    if (!usuario || !categoriaSeleccionada) return;

    try {
      const prodRef = ref(db, "productos-farmacia");
      const snapshot = await get(prodRef);

      if (!snapshot.exists()) {
        setResultadosBusqueda([]);
        return;
      }

      const data = snapshot.val();
      const lista = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));

      // Filtramos en memoria por usuario y categoría seleccionada
      let filtrados = lista.filter(
        (p) =>
          p.usuario &&
          p.usuario.toString().toUpperCase() === usuario.toUpperCase() &&
          p.categoria === categoriaSeleccionada
      );

      // Filtros opcionales por campos de búsqueda
      if (busqueda.nombre) {
        filtrados = filtrados.filter(
          (p) =>
            p.nombre &&
            p.nombre.toLowerCase().includes(busqueda.nombre.toLowerCase())
        );
      }
      if (busqueda.cb) {
        filtrados = filtrados.filter(
          (p) => p.cb && p.cb.toString() === busqueda.cb.toString()
        );
      }
      if (busqueda.registro) {
        filtrados = filtrados.filter(
          (p) =>
            p.registro &&
            p.registro.toLowerCase().includes(busqueda.registro.toLowerCase())
        );
      }

      setResultadosBusqueda(filtrados);
    } catch (err) {
      console.error("Error buscando productos:", err.message);
    }
  };

  // Efecto que dispara la búsqueda al tipear o cambiar de categoría
  useEffect(() => {
    buscarEnFirebase();
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
      const prodRef = ref(db, "productos-farmacia");
      const nuevoProdRef = push(prodRef);

      await set(nuevoProdRef, {
        ...productoData,
        nombre: productoData.nombre.toUpperCase().trim(),
        categoria: categoriaSeleccionada,
        stock: parseInt(productoData.stock) || 0,
        usuario: usuario.toUpperCase(),
      });

      alert("Producto Guardado");
      setMostrandoFormularioNuevo(false);
      setBusqueda({ nombre: "", cb: "", registro: "", fecha: "" });
      buscarEnFirebase();
    } catch (err) {
      alert("Error guardando producto: " + err.message);
    }
  };

  // --- BUSCAR PRODUCTOS POR VENCIMIENTO ---
  const buscarVencimientos = async () => {
    if (!usuario) return;

    const anio = filtroFecha.anio;
    const mes = filtroFecha.mes.toString().padStart(2, "0");
    const prefijoFecha = `${anio}-${mes}`; // Coincide con YYYY-MM

    try {
      const prodRef = ref(db, "productos-farmacia");
      const snapshot = await get(prodRef);

      if (!snapshot.exists()) {
        setProductosVencimiento([]);
        return;
      }

      const data = snapshot.val();
      const lista = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));

      // Filtramos por usuario y si la fecha de vencimiento empieza con YYYY-MM
      const vtos = lista
        .filter(
          (p) =>
            p.usuario &&
            p.usuario.toString().toUpperCase() === usuario.toUpperCase() &&
            p.fechaVto &&
            p.fechaVto.startsWith(prefijoFecha)
        )
        .sort((a, b) => (a.fechaVto || "").localeCompare(b.fechaVto || ""));

      setProductosVencimiento(vtos);
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
          <button
            className="botonVTOgeneral"
            onClick={() => setMostrandoVencimientos(!mostrandoVencimientos)}
          >
            {mostrandoVencimientos ? "Volver al Inventario" : "Próximos a vencer"}
          </button>
          {mostrandoVencimientos && (
            <div className="panel-vencimientos">
              <h3>Filtrar por Vencimiento</h3>
              <input
                type="number"
                value={filtroFecha.anio}
                onChange={(e) =>
                  setFiltroFecha({ ...filtroFecha, anio: e.target.value })
                }
              />
              <select
                value={filtroFecha.mes}
                onChange={(e) =>
                  setFiltroFecha({ ...filtroFecha, mes: e.target.value })
                }
              >
                {[
                  "01",
                  "02",
                  "03",
                  "04",
                  "05",
                  "06",
                  "07",
                  "08",
                  "09",
                  "10",
                  "11",
                  "12",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button onClick={buscarVencimientos}>Buscar</button>

              {/* 👇 NUEVO BOTÓN DE EXCEL */}
            <button onClick={() => exportarVencimientosAExcel(productosVencimiento)}>
              Crear Excel
            </button>

              <ul>
                {productosVencimiento.map((p) => (
                  <li key={p.id}>
                    {p.nombre} - <strong>Vence: {p.fechaVto}</strong>
                  </li>
                ))}
                {productosVencimiento.length === 0 && (
                  <p>No hay productos que venzan en esta fecha.</p>
                )}
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
        buscarEnSupabase={buscarEnFirebase} // Mantenemos la prop con el handler de Firebase
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