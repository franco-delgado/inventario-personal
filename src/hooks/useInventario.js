import { useState, useEffect, useCallback } from "react";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase.js";

/**
 * Hook personalizado para la gestión de productos por categoría y filtros.
 */
export function useInventario(usuario, categoriaSeleccionada) {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [modoListaCompleta, setModoListaCompleta] = useState(false);

  const [busqueda, setBusqueda] = useState({
    nombre: "",
    cb: "",
    registro: "",
    fecha: "",
  });

  // Determina si hay algún filtro de texto activo
  const hayFiltrosActivos = Boolean(
    busqueda.nombre.trim() || busqueda.cb.trim() || busqueda.registro.trim()
  );

  // Consulta desacoplada a Firebase
  const cargarProductos = useCallback(async () => {
    if (!usuario || !categoriaSeleccionada) {
      setProductos([]);
      return;
    }

    try {
      setCargando(true);
      const prodRef = ref(db, "productos-farmacia");
      const snapshot = await get(prodRef);

      if (!snapshot.exists()) {
        setProductos([]);
        return;
      }

      const data = snapshot.val();
      const listaGlobal = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));

      // 1. Filtrar primero obligatoriamente por Usuario y Categoría actual
      let resultado = listaGlobal.filter(
        (p) =>
          p.usuario &&
          p.usuario.toString().toUpperCase() === usuario.toUpperCase() &&
          p.categoria === categoriaSeleccionada
      );

      // 2. Aplicar los filtros de texto solo si existen
      if (busqueda.nombre.trim()) {
        resultado = resultado.filter((p) =>
          p.nombre?.toLowerCase().includes(busqueda.nombre.toLowerCase())
        );
      }
      if (busqueda.cb.trim()) {
        resultado = resultado.filter(
          (p) => p.cb && p.cb.toString() === busqueda.cb.toString()
        );
      }
      if (busqueda.registro.trim()) {
        resultado = resultado.filter((p) =>
          p.registro?.toLowerCase().includes(busqueda.registro.toLowerCase())
        );
      }

      setProductos(resultado);
    } catch (err) {
      console.error("Error al obtener los datos de Firebase:", err.message);
    } finally {
      setCargando(false);
    }
  }, [usuario, categoriaSeleccionada, busqueda]);

  // Se dispara automáticamente si cambian los campos o la categoría
  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  // Si el usuario empieza a escribir, desactivamos el forzado de lista completa
  const actualizarBusqueda = (nuevosFiltros) => {
    setModoListaCompleta(false);
    setBusqueda(nuevosFiltros);
  };

  // Acción para el botón "Mostrar lista"
  const activarListaCompleta = () => {
    setBusqueda({ nombre: "", cb: "", registro: "", fecha: "" });
    setModoListaCompleta(true);
  };

  return {
    productos,
    cargando,
    busqueda,
    setBusqueda: actualizarBusqueda,
    modoListaCompleta,
    activarListaCompleta,
    hayFiltrosActivos,
    refrescar: cargarProductos,
  };
}