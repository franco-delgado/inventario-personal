import * as XLSX from "xlsx";

export const exportarVencimientosAExcel = (productos) => {
  if (!productos || productos.length === 0) {
    return alert("No hay productos cargados en la base de datos.");
  }

  // 1. Solicitamos el rango de fechas en formato DD-MM-YYYY
  const fechaInicioStr = prompt("Ingrese la fecha de INICIO (DD-MM-YYYY):", "01-01-2026");
  if (!fechaInicioStr) return;

  const fechaFinStr = prompt("Ingrese la fecha FIN (DD-MM-YYYY):", "31-12-2026");
  if (!fechaFinStr) return;

  // Convierte cadenas DD-MM-YYYY a Date real de JS sin problemas de zona horaria
  const parseFechaPrompt = (str) => {
    if (!str) return null;
    const partes = str.trim().split(/[-/]/);
    if (partes.length !== 3) return null;
    const [dia, mes, anio] = partes.map((num) => parseInt(num, 10));
    return new Date(anio, mes - 1, dia, 0, 0, 0);
  };

  // Parsea fechas guardadas en Firebase (soporta YYYY-MM-DD y DD-MM-YYYY)
  const parseFechaProducto = (str) => {
    if (!str) return null;
    const partes = str.trim().split(/[-/]/);
    if (partes.length !== 3) return null;

    // Si el primer elemento tiene 4 dígitos -> YYYY-MM-DD
    if (partes[0].length === 4) {
      const [anio, mes, dia] = partes.map((n) => parseInt(n, 10));
      return new Date(anio, mes - 1, dia, 0, 0, 0);
    }
    // Si no -> DD-MM-YYYY
    const [dia, mes, anio] = partes.map((n) => parseInt(n, 10));
    return new Date(anio, mes - 1, dia, 0, 0, 0);
  };

  const fechaInicio = parseFechaPrompt(fechaInicioStr);
  const fechaFin = parseFechaPrompt(fechaFinStr);

  if (!fechaInicio || !fechaFin || isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
    return alert("Formato de fecha inválido. Debe ser DD-MM-YYYY.");
  }

  // Ajustamos el límite fin al final del día
  fechaFin.setHours(23, 59, 59, 999);

  // 2. Filtramos TODOS los productos recibidos en el rango seleccionado
  const productosFiltrados = productos.filter((p) => {
    if (!p.fechaVto) return false;
    const fVto = parseFechaProducto(p.fechaVto);
    if (!fVto || isNaN(fVto.getTime())) return false;
    return fVto >= fechaInicio && fVto <= fechaFin;
  });

  if (productosFiltrados.length === 0) {
    return alert(`No se encontraron productos que venzan entre ${fechaInicioStr} y ${fechaFinStr}.`);
  }

  // Ordenar de menor a mayor por fecha de vencimiento
  productosFiltrados.sort((a, b) => {
    const fA = parseFechaProducto(a.fechaVto);
    const fB = parseFechaProducto(b.fechaVto);
    return fA - fB;
  });

  // Convierte cualquier formato a DD-MM-YYYY para la columna del Excel
  const formatearFechaLatino = (fechaVtoStr) => {
    const f = parseFechaProducto(fechaVtoStr);
    if (!f || isNaN(f.getTime())) return fechaVtoStr || "N/A";
    const dia = String(f.getDate()).padStart(2, "0");
    const mes = String(f.getMonth() + 1).padStart(2, "0");
    const anio = f.getFullYear();
    return `${dia}-${mes}-${anio}`;
  };

  // 3. Formateamos las columnas del Excel
  const datosExcel = productosFiltrados.map((item) => ({
    "Registro": item.registro || "N/A",
    "Producto": item.nombre || "Sin Nombre",
    "Stock": item.stock || 0,
    "Fecha Vencimiento": formatearFechaLatino(item.fechaVto),
  }));

  // 4. Generamos y descargamos el Excel
  const hoja = XLSX.utils.json_to_sheet(datosExcel);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Vencimientos");

  XLSX.writeFile(libro, `Vencimientos_${fechaInicioStr}_a_${fechaFinStr}.xlsx`);
};