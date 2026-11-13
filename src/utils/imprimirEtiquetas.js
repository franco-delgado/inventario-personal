import { codigoBarrasSVG } from "./barcode.js";

// Hoja A4 vertical: 210 x 297 mm. Las etiquetas se imprimen 4 por fila, desde arriba a la izquierda.
export const A4_ANCHO_MM = 210;
export const A4_ALTO_MM = 297;
export const ETIQUETAS_POR_FILA = 4;
export const ETIQUETA_ANCHO_MM = A4_ANCHO_MM / ETIQUETAS_POR_FILA; // 52,5 mm
export const ETIQUETA_ALTO_MM = 40;
// Base de referencia (60 x 40) para escalar tipografías
const BASE_ANCHO_MM = 60;
const BASE_ALTO_MM = 40;

const esc = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Convierte "41678,02", "41.678,02", "41678.02" o "$ 41.678,02" a número. */
export function parsearPrecio(texto) {
  let t = String(texto ?? "").replace(/[^\d.,]/g, "");
  if (!t) return NaN;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // 41.678 -> miles
  }
  return parseFloat(t);
}

export const formatearPrecio = (n) =>
  "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fechaImpresion = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * items: [{ nombre, registro, cb, contenido, precio (sin descuento), descuento (% de ese artículo) }]
 * tamano: { alto } en mm. El ancho es fijo (A4 / 4) para que entren 4 etiquetas por fila.
 */
export function imprimirEtiquetas(items, tamano = {}) {
  const W = ETIQUETA_ANCHO_MM;
  const H = Math.min(Number(tamano.alto) || ETIQUETA_ALTO_MM, A4_ALTO_MM);
  // Factor para escalar textos y código de barras según el tamaño elegido
  const k = Math.max(0.4, Math.min(W / BASE_ANCHO_MM, H / BASE_ALTO_MM));
  const hoy = fechaImpresion();

  const filasPorHoja = Math.max(1, Math.floor(A4_ALTO_MM / H));
  const porHoja = filasPorHoja * ETIQUETAS_POR_FILA;

  const etiquetasHtml = items
    .map((p) => {
      const pct = Number(p.descuento) || 0;
      const final = Math.round(p.precio * (1 - pct / 100) * 100) / 100;
      const barras = codigoBarrasSVG(p.cb);
      return `
      <section class="etiqueta">
        <div class="sin-desc">Precio sin descuento ${esc(formatearPrecio(p.precio))}</div>
        <div class="precio">${esc(formatearPrecio(final))}</div>
        <div class="nombre">${esc(p.nombre)}</div>
        ${p.contenido ? `<div class="contenido">${esc(p.contenido)}</div>` : ""}
        <div class="barras">${barras}</div>
        <div class="pie">
          <span>${p.registro ? "# " + esc(p.registro) : ""}</span>
          <span>${esc(p.cb)}</span>
          <span>${hoy}</span>
        </div>
      </section>`;
    });

  // Se arma cada hoja A4 con sus etiquetas, de izquierda a derecha y de arriba hacia abajo
  let etiquetas = "";
  for (let i = 0; i < etiquetasHtml.length; i += porHoja) {
    etiquetas += `<div class="hoja">${etiquetasHtml.slice(i, i + porHoja).join("")}</div>`;
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
  .hoja {
    width: ${A4_ANCHO_MM}mm; height: ${A4_ALTO_MM}mm;
    display: flex; flex-wrap: wrap; align-content: flex-start; justify-content: flex-start;
    overflow: hidden; page-break-after: always; break-after: page;
  }
  .hoja:last-child { page-break-after: auto; break-after: auto; }
  .etiqueta {
    width: ${W}mm; height: ${H}mm; flex: 0 0 ${W}mm;
    padding: ${2 * k}mm ${3 * k}mm; display: flex; flex-direction: column; align-items: center;
    justify-content: space-between; overflow: hidden;
    text-align: center; outline: 0.1mm dashed #999; outline-offset: -0.1mm;
  }
  .sin-desc { font-size: ${7 * k}pt; }
  .precio { font-size: ${22 * k}pt; font-weight: 800; line-height: 1; }
  .nombre { font-size: ${7.5 * k}pt; line-height: 1.1; max-height: 2.3em; overflow: hidden; }
  .contenido { font-size: ${6.5 * k}pt; }
  .barras { width: 85%; height: ${9 * k}mm; }
  .pie { width: 100%; display: flex; justify-content: space-between; font-size: ${6 * k}pt; }
</style></head><body>${etiquetas}</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const limpiar = () => setTimeout(() => iframe.remove(), 1000);
  iframe.contentWindow.onafterprint = limpiar;
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Respaldo por si el navegador no dispara onafterprint
    setTimeout(limpiar, 60000);
  }, 250);
}
