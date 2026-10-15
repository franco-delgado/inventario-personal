import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase.js"; // 👈 Cliente de Firebase
import { ref, get, push, set, remove } from "firebase/database";
import { VistaProductos } from "../components/VistaProductos.jsx";
import { exportarVencimientosAExcel } from "../utils/exportarExcel.js";
import { useInventario } from "../hooks/useInventario.js"; // 👈 Importación del Hook
import { guardarFotoProducto } from "../lib/fotos.js";
import { estadoVencimiento, formatearFecha } from "../utils/vencimiento.js";
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
    ListaCompleta,
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

  const handleGuardar = async (productoData, foto) => {
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

      // La foto (si hay) se guarda en nodos aparte, con el id del producto recién creado.
      // Si falla, el producto igual queda guardado.
      let avisoFoto = "";
      if (foto) {
        try {
          await guardarFotoProducto(usuario, nuevoProdRef.key, foto);
        } catch (errFoto) {
          avisoFoto =
            "\n\nPero la foto no se pudo guardar (" +
            errFoto.message +
            "). Podés agregarla desde la ficha del producto.";
        }
      }

      alert("Producto Guardado" + avisoFoto);
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
        ...data[key],
        id: key,
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
        ...data[key],
        id: key,
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
      <main className="page">
        <div className="page-header">
          <h1>Artículos</h1>
          <p>Elegí una categoría para ver y cargar productos.</p>
        </div>

        {cargandoCategorias ? (
          <p className="estado-carga">Cargando categorías...</p>
        ) : (
          <div className="categorias-grid">
            {categorias.map((cat) => (
              <div key={cat.id} className="contenedor-btn-categoria">
                <button
                  type="button"
                  className="btn-categoria"
                  onClick={() => setCategoriaSeleccionada(cat.categoria)}
                >
                  {cat.categoria}
                </button>
                <button
                  type="button"
                  className="btn-eliminar-cat"
                  onClick={(e) => eliminarCategoria(cat.id, cat.categoria, e)}
                  aria-label={`Eliminar la categoría ${cat.categoria}`}
                  title="Eliminar categoría"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="btn-agregar-cat" onClick={agregarCategoria}>
              + Nueva categoría
            </button>
          </div>
        )}

        <div className="busquedaVTO">
          <button
            type="button"
            className="botonVTOgeneral"
            onClick={() => setMostrandoVencimientos(!mostrandoVencimientos)}
          >
            {mostrandoVencimientos ? "Ocultar vencimientos" : "Próximos a vencer"}
          </button>
          {mostrandoVencimientos && (
            <section className="card panel-vencimientos">
              <h3>Vencimientos por mes</h3>
              <div className="vto-filtros">
                <input
                  type="number"
                  aria-label="Año"
                  value={filtroFecha.anio}
                  onChange={(e) =>
                    setFiltroFecha({ ...filtroFecha, anio: e.target.value })
                  }
                />
                <select
                  aria-label="Mes"
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
                <button type="button" className="btn-primary" onClick={buscarVencimientos}>
                  Buscar
                </button>
                <button type="button" onClick={generarExcelDirecto}>
                  Descargar Excel
                </button>
              </div>

              {productosVencimiento.length > 0 ? (
                <ul className="lista-vencimientos">
                  {productosVencimiento.map((p) => {
                    const estado = estadoVencimiento(p.fechaVto);
                    return (
                      <li key={p.id}>
                        <span className="vto-nombre">{p.nombre}</span>
                        <span className="vto-detalle">
                          Vence {formatearFecha(p.fechaVto)} · Registro {p.registro || "-"}
                        </span>
                        {estado && <span className={`badge ${estado.clase}`}>{estado.texto}</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mensaje-vacio-vto">
                  No hay productos que venzan en esta fecha.
                </p>
              )}
            </section>
          )}
        </div>
      </main>
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
      ListaCompleta={ListaCompleta}
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