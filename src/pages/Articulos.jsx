import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase.js"; // 👈 Cliente de Firebase
import { ref, get, push, set, remove } from "firebase/database";
import { VistaProductos } from "../components/VistaProductos.jsx";
import { exportarVencimientosAExcel } from "../utils/exportarExcel.js";
import { useInventario } from "../hooks/useInventario.js"; // 👈 Importación del Hook
import "./Articulos.css";

function Articulos() {
  // Capturamos el usuario desde la barra de direcciones de la URL
  const { usuario } = useParams();

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(true);

  // --- INTEGRACIÓN DEL HOOK DE INVENTARIO ---
  const {
    productos,
    cargando: cargandoProductos,
    busqueda,
    setBusqueda,
    modoListaCompleta,
    activarListaCompleta,
    refrescar: buscarEnFirebase,
  } = useInventario(usuario, categoriaSeleccionada);

  // --- 1. CARGAR CATEGORÍAS DESDE FIREBASE FILTRADAS POR USUARIO ---
  const fetchCategorias = async () => {
    if (!usuario) return;
    try {
      setCargandoCategorias(true);
      const catRef = ref(db, "categoria-farmacia");
      const snapshot = await get(catRef);

      if (snapshot.exists()) {
        const data = snapshot.val();

        const lista = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));

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
      const nuevaCatRef = push(catRef);

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

  // Estados para la funcionalidad de Vencimientos
  const [mostrandoVencimientos, setMostrandoVencimientos] = useState(false);
  const [productosVencimiento, setProductosVencimiento] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState({
    anio: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString().padStart(2, "0"),
  });

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [mostrandoFormularioNuevo, setMostrandoFormularioNuevo] = useState(false);
  const [scaneando, setScaneando] = useState(false);
  const [inputDestino, setInputDestino] = useState("");
  const [codigoEscaneado, setCodigoEscaneado] = useState("");

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

  // --- BUSCAR PRODUCTOS POR VENCIMIENTO EN PANTALLA ---
  const buscarVencimientos = async () => {
    if (!usuario) return;

    const anio = filtroFecha.anio;
    const mes = filtroFecha.mes.toString().padStart(2, "0");
    const prefijoFecha = `${anio}-${mes}`;

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

  // --- GENERAR EXCEL COMPLETO INDEPENDIENTE DE LA VISTA ---
  const generarExcelDirecto = async () => {
    if (!usuario) return;

    try {
      const prodRef = ref(db, "productos-farmacia");
      const snapshot = await get(prodRef);

      if (!snapshot.exists()) {
        alert("No hay productos cargados en la base de datos.");
        return;
      }

      const data = snapshot.val();
      const listaCompleta = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));

      const productosUsuario = listaCompleta.filter(
        (p) =>
          p.usuario &&
          p.usuario.toString().toUpperCase() === usuario.toUpperCase()
      );

      exportarVencimientosAExcel(productosUsuario);
    } catch (err) {
      alert("Error al obtener productos para el Excel: " + err.message);
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
                  "01", "02", "03", "04", "05", "06",
                  "07", "08", "09", "10", "11", "12",
                ].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button onClick={buscarVencimientos}>Buscar</button>
              <button onClick={generarExcelDirecto}>Crear Excel</button>

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
  return (
    <VistaProductos
      categoriaSeleccionada={categoriaSeleccionada}
      setCategoriaSeleccionada={setCategoriaSeleccionada}
      productoSeleccionado={productoSeleccionado}
      setProductoSeleccionado={setProductoSeleccionado}
      
      // Props que vienen del Hook `useInventario`
      resultadosBusqueda={productos}
      cargandoProductos={cargandoProductos}
      busqueda={busqueda}
      setBusqueda={setBusqueda}
      modoListaCompleta={modoListaCompleta}
      activarListaCompleta={activarListaCompleta}
      buscarEnSupabase={buscarEnFirebase}

      scaneando={scaneando}
      setScaneando={setScaneando}
      handleScanSuccess={handleScanSuccess}
      setInputDestino={setInputDestino}
      mostrandoFormularioNuevo={mostrandoFormularioNuevo}
      setMostrandoFormularioNuevo={setMostrandoFormularioNuevo}
      handleGuardar={handleGuardar}
      setCodigoEscaneado={setCodigoEscaneado}
      codigoEscaneado={codigoEscaneado}
    />
  );
}

export default Articulos;