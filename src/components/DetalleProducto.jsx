import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ref, update, remove } from "firebase/database";
import { db } from "../lib/firebase.js";
import {
  obtenerFotoProducto,
  guardarFotoProducto,
  eliminarFotoProducto,
} from "../lib/fotos.js";
import { CapturaFoto } from "./CapturaFoto.jsx";
import { estadoVencimiento, formatearFecha } from "../utils/vencimiento.js";
import "./componentes.css";

export function DetalleProducto({
  producto,
  onClose,
  todosLosProductos,
  onActualizar,
}) {
  const { usuario } = useParams();

  const [datosEditados, setDatosEditados] = useState({
    registro: "",
    stock: 0,
    fechaVto: "",
  });

  useEffect(() => {
    if (producto) {
      setDatosEditados({
        registro: producto.registro || "",
        stock: producto.stock !== undefined ? producto.stock : 0,
        fechaVto: producto.fechaVto || "",
      });
    }
  }, [producto]);

  // Foto del envase: undefined = cargando, null = sin foto, texto = foto.
  // Se guarda aparte (fotos-farmacia): nunca forma parte del producto ni del Excel.
  const [fotoUrl, setFotoUrl] = useState(undefined);
  const [capturandoFoto, setCapturandoFoto] = useState(false);

  useEffect(() => {
    if (!producto?.id || !usuario) return;
    let vivo = true;
    obtenerFotoProducto(usuario, producto.id)
      .then((url) => {
        if (vivo) setFotoUrl(url);
      })
      .catch((err) => {
        console.error("Error cargando la foto:", err);
        if (vivo) setFotoUrl(null);
      });
    return () => {
      vivo = false;
    };
  }, [producto?.id, usuario]);

  if (!producto) return null;

  // Lógica de artículos relacionados
  const nombreBase = producto?.nombre
    ? producto.nombre.split(" ").slice(0, 2).join(" ").toLowerCase()
    : "";

  const relacionados = Array.isArray(todosLosProductos)
    ? todosLosProductos.filter((item) => {
        if (!item || !item.nombre) return false;
        const usuarioActual = usuario ? usuario.trim().toUpperCase() : "";
        const usuarioProducto = item.usuario ? item.usuario.trim().toUpperCase() : "";

        if (usuarioActual && usuarioProducto !== usuarioActual) return false;

        return (
          item.nombre.toLowerCase().includes(nombreBase) &&
          item.id !== producto.id
        );
      })
    : [];

  // FUNCIÓN PARA ACTUALIZAR EN FIREBASE
  const actualizarCampoUnico = async (nombreColumna, valor) => {
    try {
      if (!producto.id) {
        alert("Error: El producto no tiene una ID válida de Firebase.");
        return;
      }

      const valorFinal = nombreColumna === "stock" ? parseInt(valor) || 0 : valor;
      const prodRef = ref(db, `productos-farmacia/${producto.id}`);

      await update(prodRef, {
        [nombreColumna]: valorFinal,
      });

      alert(`${nombreColumna.toUpperCase()} actualizado correctamente`);
      
      if (onActualizar) onActualizar();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    }
  };

  // GUARDAR / QUITAR LA FOTO DEL ENVASE
  const guardarFoto = async ({ foto, firma }) => {
    try {
      await guardarFotoProducto(usuario, producto.id, { foto, firma });
      setFotoUrl(foto);
      setCapturandoFoto(false);
    } catch (err) {
      alert("No se pudo guardar la foto: " + err.message);
    }
  };

  const quitarFoto = async () => {
    if (!window.confirm("¿Quitar la foto de este producto?")) return;
    try {
      await eliminarFotoProducto(usuario, producto.id);
      setFotoUrl(null);
    } catch (err) {
      alert("No se pudo quitar la foto: " + err.message);
    }
  };

  // FUNCIÓN PARA ELIMINAR EN FIREBASE
  const handleEliminar = async () => {
    if (window.confirm(`¿Eliminar ${producto.nombre}?`)) {
      try {
        if (!producto.id) {
          alert("Error: El producto no tiene una ID válida.");
          return;
        }

        const prodRef = ref(db, `productos-farmacia/${producto.id}`);
        await remove(prodRef);

        // La foto asociada también se borra (para que no quede huérfana)
        try {
          await eliminarFotoProducto(usuario, producto.id);
        } catch (errFoto) {
          console.error("No se pudo borrar la foto asociada:", errFoto);
        }

        onClose();
        if (onActualizar) onActualizar();
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      }
    }
  };

  const estado = estadoVencimiento(producto.fechaVto);

  const filaCampo = (etiqueta, id, tipo, clave, cambio) => (
    <div className="campo-edicion-fila">
      <label className="label-campo" htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type={tipo}
        className="input-flex"
        value={datosEditados[clave]}
        onChange={(e) => setDatosEditados({ ...datosEditados, [clave]: e.target.value })}
      />
      {cambio && (
        <button
          type="button"
          className="btn-guardar btn-update-small"
          onClick={() => actualizarCampoUnico(clave, datosEditados[clave])}
          aria-label={`Guardar ${etiqueta.toLowerCase()}`}
        >
          Guardar
        </button>
      )}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content detalle-producto">
        <div className="detalle-encabezado">
          <h2>{producto.nombre}</h2>
          {estado && <span className={`badge ${estado.clase}`}>{estado.texto}</span>}
        </div>
        <hr />

        <div className="infoPrincipal">
          {filaCampo("Registro", "det-registro", "text", "registro", datosEditados.registro !== (producto.registro || ""))}
          {filaCampo("Stock", "det-stock", "number", "stock", Number(datosEditados.stock) !== Number(producto.stock))}
          {filaCampo("Vencimiento", "det-vto", "date", "fechaVto", datosEditados.fechaVto !== (producto.fechaVto || ""))}
        </div>

        {/* La foto se guarda aparte: no afecta a la lista ni al Excel */}
        <div className="seccion-foto">
          <p className="foto-titulo">Foto del envase</p>
          {fotoUrl === undefined && <p className="foto-estado">Cargando foto...</p>}
          {fotoUrl === null && (
            <p className="foto-estado">
              Sin foto. Agregá una para reconocer el producto con la cámara.
            </p>
          )}
          {fotoUrl && (
            <img
              src={fotoUrl}
              alt={`Foto de ${producto.nombre}`}
              className="foto-producto"
            />
          )}
          <div className="foto-botones">
            <button type="button" onClick={() => setCapturandoFoto(true)}>
              {fotoUrl ? "Cambiar foto" : "Agregar foto"}
            </button>
            {fotoUrl && (
              <button type="button" className="btn-quitar-foto" onClick={quitarFoto}>
                Quitar foto
              </button>
            )}
          </div>
        </div>

        {relacionados.length > 0 && (
          <div className="seccion-relacionados">
            <p className="art-relacionado">Artículos relacionados</p>
            <ul className="relacionados-lista">
              {relacionados.map((rel) => (
                <li key={rel.id || rel.nombre} className="art-en-ventana">
                  <strong>{rel.nombre}</strong>
                  <span>
                    Stock {rel.stock ?? 0} · Vto. {formatearFecha(rel.fechaVto)} · Reg. {rel.registro || "-"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="detalle-acciones">
          <button type="button" className="btn-danger-soft" onClick={handleEliminar}>
            Eliminar producto
          </button>
          <button type="button" className="btn-cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      {capturandoFoto && (
        <CapturaFoto
          onConfirmar={guardarFoto}
          onCancelar={() => setCapturandoFoto(false)}
        />
      )}
    </div>
  );
}
