import { ref, get, push, set, remove } from "firebase/database";
import { db } from "./firebase.js";

/**
 * Autenticación y gestión de usuarios.
 *
 * - Hay UN solo administrador: ADMIN_USUARIO. Su contraseña no se guarda en
 *   texto plano en el código, solo su hash (SHA-256 con sal).
 * - El resto de los usuarios viven en Firebase: nodo "usuarios-farmacia".
 *   Solo el administrador puede agregarlos o quitarlos (desde /admin/usuarios).
 * - El rol NO se lee de la base de datos: es administrador únicamente quien
 *   inicia sesión como ADMIN_USUARIO con la contraseña correcta.
 */

export const ADMIN_USUARIO = "franco";
const ADMIN_HASH =
  "164d7661e6ae70a54db4d8e785465bdd849226c24b54067c266805337b5f9a57";
const SAL = "farmacia-admin:v1:";

const NODO_USUARIOS = "usuarios-farmacia";

const sha256 = async (texto) => {
  const datos = new TextEncoder().encode(texto);
  const buffer = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const normalizar = (usuario) => String(usuario || "").trim().toLowerCase();

export const esAdmin = (usuario) => normalizar(usuario) === ADMIN_USUARIO;

/**
 * Valida credenciales. Devuelve { usuario, esAdmin } o null si son incorrectas.
 * Lanza un error si no se pudo consultar la base de datos.
 */
export async function validarCredenciales(usuarioIngresado, passwordIngresada) {
  const usuario = normalizar(usuarioIngresado);
  const password = String(passwordIngresada || "").trim();

  // El administrador se valida siempre contra su hash, nunca contra la base
  if (usuario === ADMIN_USUARIO) {
    const hash = await sha256(SAL + password);
    return hash === ADMIN_HASH ? { usuario, esAdmin: true } : null;
  }

  const lista = await listarUsuarios();
  const encontrado = lista.find(
    (u) => normalizar(u.usuario) === usuario && u.contraseña === password
  );
  return encontrado ? { usuario, esAdmin: false } : null;
}

/** Lista de usuarios de la base: [{ id, usuario, contraseña }] ordenada por nombre */
export async function listarUsuarios() {
  const snapshot = await get(ref(db, NODO_USUARIOS));
  const lista = [];
  if (snapshot.exists()) {
    // forEach entrega la clave real aunque Firebase devuelva un Array
    snapshot.forEach((hijo) => {
      const v = hijo.val();
      if (v && v.usuario) {
        lista.push({
          id: hijo.key,
          usuario: v.usuario.toString(),
          contraseña: v.contraseña != null ? v.contraseña.toString() : "",
        });
      }
    });
  }
  return lista.sort((a, b) => a.usuario.localeCompare(b.usuario));
}

/** Devuelve un texto con el problema, o "" si los datos son válidos */
export function validarNuevoUsuario(usuario, password, existentes = []) {
  const u = normalizar(usuario);
  if (!u) return "Ingresá un nombre de usuario.";
  if (!/^[a-z0-9_.-]+$/i.test(u))
    return "El usuario solo puede tener letras, números, punto, guion y guion bajo.";
  if (u.length < 3) return "El usuario debe tener al menos 3 caracteres.";
  if (u === ADMIN_USUARIO) return "Ese nombre está reservado para el administrador.";
  if (existentes.some((e) => normalizar(e.usuario) === u))
    return "Ya existe un usuario con ese nombre.";
  if (String(password || "").trim().length < 4)
    return "La contraseña debe tener al menos 4 caracteres.";
  return "";
}

/** Crea un usuario (solo debe llamarse desde la pantalla del administrador) */
export async function crearUsuario(usuario, password) {
  const nuevoRef = push(ref(db, NODO_USUARIOS));
  await set(nuevoRef, {
    usuario: normalizar(usuario).toUpperCase(),
    contraseña: String(password).trim(),
  });
}

/** Quita un usuario por su id. No borra sus productos ni categorías. */
export async function eliminarUsuario(id) {
  await remove(ref(db, `${NODO_USUARIOS}/${id}`));
}
