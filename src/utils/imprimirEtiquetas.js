import { codigoBarrasSVG } from "./barcode.js";

// Tamaño por defecto de la etiqueta en mm (apaisada). Base de referencia para escalar tipografías.
export const ETIQUETA_ANCHO_MM = 60;
export const ETIQUETA_ALTO_MM = 40;

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
 * tamano: { ancho, alto } en mm
 */
export function imprimirEtiquetas(items, tamano = {}) {
  const W = Number(tamano.ancho) || ETIQUETA_ANCHO_MM;
  const H = Number(tamano.alto) || ETIQUETA_ALTO_MM;
  // Factor para escalar textos y código de barras según el tamaño elegido
  const k = Math.max(0.4, Math.min(W / ETIQUETA_ANCHO_MM, H / ETIQUETA_ALTO_MM));
  const hoy = fechaImpresion();

  const etiquetas = items
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
    })
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title>
<style>
  @page { size: ${W}mm ${H}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
  .etiqueta {
    width: ${W}mm; height: ${H}mm;
    padding: ${2 * k}mm ${3 * k}mm; display: flex; flex-direction: column; align-items: center;
    justify-content: space-between; overflow: hidden; page-break-after: always; break-after: page;
    text-align: center;
  }
  .etiqueta:last-child { page-break-after: auto; break-after: auto; }
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
