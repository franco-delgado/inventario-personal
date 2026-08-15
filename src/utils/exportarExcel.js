import * as XLSX from "xlsx";

export const exportarVencimientosAExcel = (productos) => {
  if (!productos || productos.length === 0) {
    return alert("No hay productos cargados para exportar.");
  }

  // 1. Solicitamos el rango de fechas en formato DD-MM-YYYY
  const fechaInicioStr = prompt("Ingrese la fecha de INICIO (DD-MM-YYYY):", "01-01-2026");
  if (!fechaInicioStr) return;

  const fechaFinStr = prompt("Ingrese la fecha FIN (DD-MM-YYYY):", "31-12-2026");
  if (!fechaFinStr) return;

  // Convierte DD-MM-YYYY a un objeto Date real para poder comparar
  const parseFecha = (str) => {
    const partes = str.split("-");
    if (partes.length !== 3) return null;
    const [dia, mes, anio] = partes;
    return new Date(`${anio}-${mes}-${dia}T00:00:00`);
  };

  const fechaInicio = parseFecha(fechaInicioStr);
  const fechaFin = parseFecha(fechaFinStr);

  if (!fechaInicio || !fechaFin || isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
    return alert("Formato de fecha inválido. Debe ser DD-MM-YYYY.");
  }

  // Ajustamos la hora fin al último segundo del día
  fechaFin.setHours(23, 59, 59);

  // 2. Filtramos los productos que caen dentro del rango
  const productosFiltrados = productos.filter((p) => {
    if (!p.fechaVto) return false;
    // Convierte p.fechaVto (que viene de Firebase como YYYY-MM-DD) a Date
    const fVto = new Date(`${p.fechaVto}T00:00:00`);
    return fVto >= fechaInicio && fVto <= fechaFin;
  });

  if (productosFiltrados.length === 0) {
    return alert("No se encontraron productos que venzan dentro del rango seleccionado.");
  }

  // Función auxiliar para convertir YYYY-MM-DD (Firebase) a DD-MM-YYYY
  const formatearFechaLatino = (fechaVtoStr) => {
    if (!fechaVtoStr) return "N/A";
    const partes = fechaVtoStr.split("-"); // [YYYY, MM, DD]
    if (partes.length < 3) return fechaVtoStr;
    return `${partes[2]}-${partes[1]}-${partes[0]}`; // Retorna DD-MM-YYYY
  };

  // 3. Formateamos las columnas para el archivo Excel
  const datosExcel = productosFiltrados.map((item) => ({
    "Producto": item.nombre || "Sin Nombre",
    "Categoría": item.categoria || "N/A",
    "Fecha Vencimiento": formatearFechaLatino(item.fechaVto), // 👈 Muestra DD-MM-YYYY
    "Stock": item.stock || 0,
    "Código de Barras": item.cb || "N/A",
    "Registro": item.registro || "N/A",
  }));

  // 4. Generamos y descargamos el archivo Excel
  const hoja = XLSX.utils.json_to_sheet(datosExcel);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Vencimientos");

  XLSX.writeFile(libro, `Vencimientos_${fechaInicioStr}_a_${fechaFinStr}.xlsx`);
};