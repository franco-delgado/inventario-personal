import { ref, get, update } from "firebase/database";
import { db } from "./firebase.js";
import { serializarFirma, deserializarFirma, firmaDesdeDataUrl } from "../utils/imagen.js";

/**
 * Las fotos NO se guardan dentro de "productos-farmacia". Viven en dos nodos
 * propios, organizados por usuario y por id de producto:
 *
 *   fotos-farmacia/{USUARIO}/{idProducto}  -> { foto: "data:image/jpeg;base64,...", actualizado }
 *   firmas-farmacia/{USUARIO}/{idProducto} -> { firma: "2:ab12...", actualizado }
 *
 * Así:
 *  - El Excel, la lista, los vencimientos y el buscador siguen leyendo
 *    "productos-farmacia" sin ningún dato extra (no se vuelven más pesados).
 *  - El reconocedor solo descarga las firmas (livianas), no las fotos.
 *  - La foto completa se descarga únicamente al abrir la ficha de un producto.
 */

const NODO_FOTOS = "fotos-farmacia";
const NODO_FIRMAS = "firmas-farmacia";

// Las claves de Firebase no pueden contener . $ # [ ] /
const claveUsuario = (usuario) =>
  String(usuario || "").toUpperCase().replace(/[.$#[\]/]/g, "_");

/**
 * Guarda (o reemplaza) la foto y su firma de un producto.
 * Las dos escrituras van en una sola actualización: o se guardan ambas o ninguna.
 * @param {{foto: string, firma: Uint8Array}} datos
 */
export async function guardarFotoProducto(usuario, productoId, { foto, firma }) {
  const u = claveUsuario(usuario);
  const ahora = Date.now();
  await update(ref(db), {
    [`${NODO_FOTOS}/${u}/${productoId}`]: { foto, actualizado: ahora },
    [`${NODO_FIRMAS}/${u}/${productoId}`]: {
      firma: serializarFirma(firma),
      actualizado: ahora,
    },
  });
}

/** Foto (data URL) de un producto, o null si no tiene */
export async function obtenerFotoProducto(usuario, productoId) {
  const snap = await get(
    ref(db, `${NODO_FOTOS}/${claveUsuario(usuario)}/${productoId}`)
  );
  return snap.exists() ? snap.val().foto || null : null;
}

/** Borra la foto y la firma de un producto (no falla si no existían) */
export async function eliminarFotoProducto(usuario, productoId) {
  const u = claveUsuario(usuario);
  await update(ref(db), {
    [`${NODO_FOTOS}/${u}/${productoId}`]: null,
    [`${NODO_FIRMAS}/${u}/${productoId}`]: null,
  });
}

/**
 * Firmas del usuario guardadas en Firebase.
 * Devuelve { firmas: Map(idProducto -> Uint8Array), obsoletas: [ids] }.
 * "obsoletas" son firmas de una versión anterior del algoritmo (o ilegibles):
 * se pueden recalcular a partir de la foto con regenerarFirma().
 */
export async function cargarFirmas(usuario) {
  const firmas = new Map();
  const obsoletas = [];
  const snap = await get(ref(db, `${NODO_FIRMAS}/${claveUsuario(usuario)}`));
  if (!snap.exists()) return { firmas, obsoletas };
  const datos = snap.val();
  Object.keys(datos).forEach((id) => {
    const firma = deserializarFirma(datos[id]?.firma);
    if (firma) firmas.set(id, firma);
    else obsoletas.push(id);
  });
  return { firmas, obsoletas };
}

// Guarda una firma recalculada (si no hay permiso o falla, no pasa nada: se recalcula la próxima vez)
async function guardarFirmaSola(usuario, productoId, firma) {
  try {
    await update(ref(db), {
      [`${NODO_FIRMAS}/${claveUsuario(usuario)}/${productoId}`]: {
        firma: serializarFirma(firma),
        actualizado: Date.now(),
      },
    });
  } catch (err) {
    console.warn("No se pudo guardar la firma recalculada:", err.message);
  }
}

/** Recalcula la firma de un producto a partir de su foto guardada (null si no tiene foto) */
export async function regenerarFirma(usuario, productoId) {
  const foto = await obtenerFotoProducto(usuario, productoId);
  if (!foto) return null;
  const firma = await firmaDesdeDataUrl(foto);
  await guardarFirmaSola(usuario, productoId, firma);
  return firma;
}

/**
 * Plan B: arma las firmas leyendo directamente las fotos del usuario.
 * Sirve si el nodo de firmas no se puede leer. Es más pesado (descarga las fotos).
 */
export async function cargarFirmasDesdeFotos(usuario) {
  const firmas = new Map();
  const snap = await get(ref(db, `${NODO_FOTOS}/${claveUsuario(usuario)}`));
  if (!snap.exists()) return firmas;
  const datos = snap.val();
  for (const id of Object.keys(datos)) {
    const foto = datos[id]?.foto;
    if (!foto) continue;
    try {
      const firma = await firmaDesdeDataUrl(foto);
      firmas.set(id, firma);
      guardarFirmaSola(usuario, id, firma);
    } catch (err) {
      console.warn("Foto ilegible:", id, err.message);
    }
  }
  return firmas;
}
