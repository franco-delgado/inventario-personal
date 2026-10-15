/**
 * Estado de un vencimiento a partir de una fecha "YYYY-MM-DD".
 * Devuelve { clase, texto } para mostrar una etiqueta de color.
 */
const DIAS_AVISO = 60;

const aFecha = (texto) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

export function formatearFecha(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : texto || "-";
}

export function estadoVencimiento(texto, hoy = new Date()) {
  const fecha = aFecha(texto);
  if (!fecha) return null;

  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((fecha - inicioHoy) / 86400000);

  if (dias < 0) return { clase: "badge-danger", texto: "Vencido" };
  if (dias === 0) return { clase: "badge-danger", texto: "Vence hoy" };
  if (dias <= DIAS_AVISO) {
    return { clase: "badge-warn", texto: dias === 1 ? "Vence en 1 día" : `Vence en ${dias} días` };
  }
  return { clase: "badge-ok", texto: "Vigente" };
}
