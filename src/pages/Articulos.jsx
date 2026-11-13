import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase.js"; // 👈 Cliente de Firebase
import { ref, get, push, set, remove } from "firebase/database";
import { VistaProductos } from "../components/VistaProductos.jsx";
import { exportarVencimientosAExcel } from "../utils/exportarExcel.js";
import { useInventario } from "../hooks/useInventario.js"; // 👈 Importación del Hook
import { guardarFotoProducto } from "../lib/fotos.js";
import { estadoVencimiento, formatearFecha } from "../utils/vencimiento.js";
import { imprimirEtiquetas, parsearPrecio, formatearPrecio } from "../utils/imprimirEtiquetas.js";
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

  // Impresión de etiquetas de precio (precios y descuento se cargan a mano)
  const [preciosEtiqueta, setPreciosEtiqueta] = useState({}); // { [id]: "texto" }
  const [descuentoEtiqueta, setDescuentoEtiqueta] = useState(""); // descuento general
  const [descuentosEtiqueta, setDescuentosEtiqueta] = useState({}); // { [id]: "texto" } individual
  const [seleccionEtiqueta, setSeleccionEtiqueta] = useState({}); // { [id]: true }
  const [tamanoEtiqueta, setTamanoEtiqueta] = useState(() => {
    try {
      const g = JSON.parse(localStorage.getItem("tamanoEtiqueta"));
      if (g && g.alto) return { alto: g.alto };
    } catch {}
    return { alto: "40" };
  });
  const cambiarTamano = (nuevo) => {
    setTamanoEtiqueta(nuevo);
    try { localStorage.setItem("tamanoEtiqueta", JSON.stringify(nuevo)); } catch {}
  };
  const descuentoDe = (id) => {
    const txt = descuentosEtiqueta[id];
    const v = parseFloat(String(txt !== undefined && txt !== "" ? txt : descuentoEtiqueta).replace(",", "."));
    return v;
  };

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

  // --- IMPRIMIR ETIQUETAS DE PRECIO ---
  const imprimirPrecios = () => {
    const alto = parseFloat(String(tamanoEtiqueta.alto).replace(",", "."));
    if (!(alto >= 15) || alto > 297) {
      return alert("Ingresá un alto de etiqueta válido en mm (entre 15 y 297).");
    }

    const elegidos = productosVencimiento.filter((p) => seleccionEtiqueta[p.id]);
    if (elegidos.length === 0) {
      return alert("Marcá al menos un producto para imprimir.");
    }

    const items = [];
    for (const p of elegidos) {
      const precio = parsearPrecio(preciosEtiqueta[p.id]);
      const descuento = descuentoDe(p.id);
      if (isNaN(precio) || precio <= 0) {
        return alert(`Falta el precio de "${p.nombre}".`);
      }
      if (isNaN(descuento) || descuento < 0 || descuento >= 100) {
        return alert(`Descuento inválido (0 a 99) en "${p.nombre}".`);
      }
      items.push({ ...p, precio, descuento });
    }
    imprimirEtiquetas(items, { alto });
  };

  // --- IR AL ARTÍCULO DESDE LA LISTA DE VENCIMIENTOS ---
  // Entra a la categoría del producto, filtra la lista por su nombre y abre su ficha.
  const abrirArticulo = (p) => {
    if (!p.categoria) {
      alert("Este producto no tiene categoría asignada, no se puede abrir.");
      return;
    }
    setBusqueda({ nombre: p.nombre || "", cb: "", registro: "", fecha: "" });
    setCategoriaSeleccionada(p.categoria);
    setProductoSeleccionado(p);
  };

  // Al volver a las categorías, refresca la lista de vencimientos
  // (por si se editó el stock, la fecha o se eliminó el producto)
  useEffect(() => {
    if (!categoriaSeleccionada && mostrandoVencimientos) {
      buscarVencimientos();
    }
  }, [categoriaSeleccionada]);

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
                <>
                <ul className="lista-vencimientos">
                  {productosVencimiento.map((p) => {
                    const estado = estadoVencimiento(p.fechaVto);
                    return (
                      <li
                        key={p.id}
                        className="vto-item"
                        role="button"
                        tabIndex={0}
                        title="Abrir artículo"
                        onClick={() => abrirArticulo(p)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            abrirArticulo(p);
                          }
                        }}
                      >
                        <div className="vto-fila-principal">
                          <span className="vto-nombre">{p.nombre}</span>
                          {estado && <span className={`badge ${estado.clase}`}>{estado.texto}</span>}
                        </div>
                        <dl className="vto-datos">
                          <div><dt>Vence</dt><dd>{formatearFecha(p.fechaVto)}</dd></div>
                          <div><dt>Registro</dt><dd>{p.registro || "-"}</dd></div>
                          <div><dt>Stock</dt><dd>{p.stock ?? 0}</dd></div>
                          <div><dt>Código</dt><dd>{p.cb || "-"}</dd></div>
                          <div><dt>Contenido</dt><dd>{p.contenido || "-"}</dd></div>
                          <div><dt>Categoría</dt><dd>{p.categoria || "-"}</dd></div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>

                <div className="vto-imprimir">
                  <h4>Imprimir etiquetas de precio</h4>

                  <div className="vto-imprimir-config">
                    <label>
                      Alto (mm)
                      <input
                        type="number"
                        min="15"
                        step="any"
                        inputMode="decimal"
                        value={tamanoEtiqueta.alto}
                        onChange={(e) => cambiarTamano({ alto: e.target.value })}
                      />
                    </label>
                    <label>
                      Descuento general (%)
                      <input
                        type="number"
                        min="0"
                        max="99"
                        step="any"
                        inputMode="decimal"
                        value={descuentoEtiqueta}
                        onChange={(e) => setDescuentoEtiqueta(e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="vto-imprimir-todos">
                    <input
                      type="checkbox"
                      checked={
                        productosVencimiento.length > 0 &&
                        productosVencimiento.every((p) => seleccionEtiqueta[p.id])
                      }
                      onChange={(e) => {
                        const nuevo = {};
                        if (e.target.checked) productosVencimiento.forEach((p) => (nuevo[p.id] = true));
                        setSeleccionEtiqueta(nuevo);
                      }}
                    />
                    Seleccionar todos
                  </label>

                  <ul className="vto-imprimir-lista">
                    {productosVencimiento.map((p) => {
                      const base = parsearPrecio(preciosEtiqueta[p.id]);
                      const pct = descuentoDe(p.id);
                      const final =
                        !isNaN(base) && !isNaN(pct)
                          ? formatearPrecio(Math.round(base * (1 - pct / 100) * 100) / 100)
                          : null;
                      return (
                        <li key={p.id} className={seleccionEtiqueta[p.id] ? "sel" : ""}>
                          <label className="vto-imprimir-nombre">
                            <input
                              type="checkbox"
                              checked={!!seleccionEtiqueta[p.id]}
                              onChange={(e) =>
                                setSeleccionEtiqueta({ ...seleccionEtiqueta, [p.id]: e.target.checked })
                              }
                            />{" "}
                            {p.nombre}
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Precio sin desc."
                            aria-label={`Precio sin descuento de ${p.nombre}`}
                            value={preciosEtiqueta[p.id] || ""}
                            onChange={(e) =>
                              setPreciosEtiqueta({ ...preciosEtiqueta, [p.id]: e.target.value })
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            max="99"
                            step="any"
                            inputMode="decimal"
                            className="vto-imprimir-pct"
                            placeholder={descuentoEtiqueta ? `${descuentoEtiqueta} %` : "% desc."}
                            aria-label={`Descuento (%) de ${p.nombre}`}
                            value={descuentosEtiqueta[p.id] || ""}
                            onChange={(e) =>
                              setDescuentosEtiqueta({ ...descuentosEtiqueta, [p.id]: e.target.value })
                            }
                          />
                          {final && <span className="vto-imprimir-final">→ {final}</span>}
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" className="btn-primary" onClick={imprimirPrecios}>
                    Imprimir seleccionados (
                    {productosVencimiento.filter((p) => seleccionEtiqueta[p.id]).length})
                  </button>
                </div>
                </>
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