import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase.js";
import {
  cargarFirmas,
  cargarFirmasDesdeFotos,
  regenerarFirma,
  obtenerFotoProducto,
} from "../lib/fotos.js";
import {
  recortarCentro,
  firmaDesdeCanvas,
  similitud,
  geometriaRecorte,
} from "../utils/imagen.js";
import "./ReconocedorProducto.css";

// --- Comparación imagen/imagen con la foto guardada de cada producto ---
// Valores calibrados con un banco de pruebas. Se pueden ajustar mirando el
// porcentaje que se muestra en pantalla al apuntar a un envase.
const INTERVALO_VISUAL_MS = 400; // cada cuánto se compara la cámara con las fotos
const UMBRAL_VISUAL = 0.65; // parecido mínimo para aceptar
const MARGEN_VISUAL = 0.1; // ventaja mínima sobre la 2ª foto más parecida
const POCAS_FOTOS = 5; // con menos fotos el "margen" informa poco...
const UMBRAL_VISUAL_POCAS_FOTOS = 0.75; // ...así que se exige más parecido
const CAPTURAS_SEGUIDAS = 2; // comparaciones seguidas con el mismo producto

/**
 * Apunta la cámara al FRENTE de un envase: compara lo que ve contra las fotos
 * guardadas de los productos del usuario (solo imagen, sin leer texto).
 * Si encuentra coincidencia muestra código, registro, cantidad y vencimiento.
 */
export function ReconocedorProducto({ onClose, onVerFicha }) {
  const { usuario } = useParams();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const pausadoRef = useRef(false); // hay un resultado mostrándose
  const firmasRef = useRef(new Map()); // idProducto -> firma visual de su foto
  const rachaRef = useRef({ id: null, n: 0 }); // mismo candidato visual seguido

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState("iniciando"); // iniciando | buscando | encontrado | error
  const [resultado, setResultado] = useState(null);
  const [puntaje, setPuntaje] = useState(0); // parecido del resultado aceptado
  const [hayFotos, setHayFotos] = useState(0);
  const [visual, setVisual] = useState(null); // { nombre, registro, score } del más parecido
  const [errorMsg, setErrorMsg] = useState("");
  const [fotoResultado, setFotoResultado] = useState(null); // { id, url }
  const [errorFotos, setErrorFotos] = useState("");
  const [dims, setDims] = useState({ w: 3, h: 4 }); // proporción real del video

  // 1. Cargar una sola vez los productos del usuario y las firmas de sus fotos
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!usuario) return;
      const [resProd, resFirmas] = await Promise.allSettled([
        get(ref(db, "productos-farmacia")),
        cargarFirmas(usuario),
      ]);
      if (!vivo) return;

      let lista = [];
      if (resProd.status === "fulfilled") {
        const snap = resProd.value;
        if (snap.exists()) {
          const data = snap.val();
          lista = Object.keys(data)
            // OJO: id va al final, para que la clave de Firebase no la pise un campo "id" guardado dentro del producto
            .map((key) => ({ ...data[key], id: key }))
            .filter(
              (p) =>
                p.usuario &&
                p.usuario.toString().toUpperCase() === usuario.toUpperCase() &&
                typeof p.nombre === "string"
            );
        }
      } else {
        console.error("Error cargando productos:", resProd.reason);
      }
      setProductos(lista);

      // Solo se usan las fotos de productos que siguen existiendo
      const ids = new Set(lista.map((p) => p.id));
      const firmas = new Map();
      let obsoletas = [];
      let mensajeError = "";
      if (resFirmas.status === "fulfilled") {
        resFirmas.value.firmas.forEach((f, id) => {
          if (ids.has(id)) firmas.set(id, f);
        });
        obsoletas = resFirmas.value.obsoletas.filter((id) => ids.has(id));
      } else {
        console.error("Error cargando firmas:", resFirmas.reason);
        mensajeError = "No se pudieron leer las firmas (" + (resFirmas.reason?.message || "error") + ").";
      }

      try {
        if (resFirmas.status === "rejected") {
          // Plan B: se arman las firmas desde las fotos guardadas
          const desdeFotos = await cargarFirmasDesdeFotos(usuario);
          desdeFotos.forEach((f, id) => {
            if (ids.has(id)) firmas.set(id, f);
          });
          if (firmas.size > 0) mensajeError = "";
        } else {
          // Firmas de una versión anterior: se recalculan desde la foto (sin volver a sacarla)
          for (const id of obsoletas) {
            const f = await regenerarFirma(usuario, id);
            if (f) firmas.set(id, f);
          }
          // No hay ninguna firma que coincida: puede haber fotos guardadas sin firma.
          // Se arman desde las fotos (y quedan guardadas, así que es solo la primera vez).
          if (firmas.size === 0) {
            const desdeFotos = await cargarFirmasDesdeFotos(usuario);
            desdeFotos.forEach((f, id) => {
              if (ids.has(id)) firmas.set(id, f);
            });
          }
        }
      } catch (err) {
        console.error("Error preparando las fotos:", err);
        mensajeError = mensajeError || "No se pudieron leer las fotos (" + (err.message || "error") + ").";
      }
      if (!vivo) return;
      setErrorFotos(mensajeError);
      firmasRef.current = firmas;
      setHayFotos(firmas.size);
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, [usuario]);

  // 2. Iniciar la cámara y comparar continuamente con las fotos
  useEffect(() => {
    if (cargando) return;

    let activo = true;
    const productosPorId = new Map(productos.map((p) => [p.id, p]));
    const canvas = document.createElement("canvas");
    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

    const analizar = () => {
      const firmas = firmasRef.current;
      if (!firmas.size || pausadoRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      recortarCentro(video, video.videoWidth, video.videoHeight, canvas);
      const firmaVivo = firmaDesdeCanvas(canvas);

      let mejorId = null;
      let mejor = 0;
      let segundo = 0;
      firmas.forEach((firma, id) => {
        const sc = similitud(firmaVivo, firma);
        if (sc > mejor) {
          segundo = mejor;
          mejor = sc;
          mejorId = id;
        } else if (sc > segundo) {
          segundo = sc;
        }
      });

      const prod = mejorId ? productosPorId.get(mejorId) : null;
      setVisual(prod ? { nombre: prod.nombre, registro: prod.registro, score: mejor } : null);

      const umbral = firmas.size >= POCAS_FOTOS ? UMBRAL_VISUAL : UMBRAL_VISUAL_POCAS_FOTOS;
      if (prod && mejor >= umbral && mejor - segundo >= MARGEN_VISUAL) {
        const racha = rachaRef.current;
        rachaRef.current =
          racha.id === mejorId ? { id: mejorId, n: racha.n + 1 } : { id: mejorId, n: 1 };
        if (rachaRef.current.n >= CAPTURAS_SEGUIDAS) {
          pausadoRef.current = true;
          rachaRef.current = { id: null, n: 0 };
          setPuntaje(mejor);
          setResultado(prod);
          setEstado("encontrado");
        }
      } else {
        rachaRef.current = { id: null, n: 0 };
      }
    };

    const ciclo = async () => {
      while (activo) {
        await dormir(INTERVALO_VISUAL_MS);
        if (!activo) break;
        try {
          analizar();
        } catch (err) {
          console.error("Error comparando con las fotos:", err);
        }
      }
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setEstado("buscando");
        ciclo();
      } catch (err) {
        console.error("Error iniciando la cámara:", err);
        if (!activo) return;
        setErrorMsg(err.message || "No se pudo acceder a la cámara.");
        setEstado("error");
      }
    })();

    return () => {
      activo = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [cargando, productos]);

  // Foto guardada del producto reconocido, para verificarlo a ojo
  useEffect(() => {
    if (!resultado || !resultado.id) return;
    let vivo = true;
    obtenerFotoProducto(usuario, resultado.id)
      .then((url) => {
        if (vivo && url) setFotoResultado({ id: resultado.id, url });
      })
      .catch((err) => console.error("Error cargando la foto:", err));
    return () => {
      vivo = false;
    };
  }, [resultado, usuario]);

  const seguirEscaneando = () => {
    pausadoRef.current = false;
    rachaRef.current = { id: null, n: 0 };
    setResultado(null);
    setEstado("buscando");
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="reconocedor-contenido">
        <h3 className="reconocedor-titulo">
          {estado === "encontrado" ? "✅ PRODUCTO ENCONTRADO" : "📷 COMPARANDO CON FOTOS..."}
        </h3>

        {estado === "error" ? (
          <p className="reconocedor-error">{errorMsg}</p>
        ) : (
          <>
            <div
              className="reconocedor-video-wrap"
              style={{
                aspectRatio: `${dims.w} / ${dims.h}`,
                width: `min(100%, ${(60 * dims.w) / dims.h}vh)`,
                margin: "0 auto",
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                className="reconocedor-video"
                onLoadedMetadata={(e) =>
                  setDims({ w: e.target.videoWidth || 3, h: e.target.videoHeight || 4 })
                }
              />
              <div
                className="reconocedor-marco"
                style={{
                  width: `${geometriaRecorte(dims.w, dims.h).fracAncho * 100}%`,
                  height: `${geometriaRecorte(dims.w, dims.h).fracAlto * 100}%`,
                }}
              />
            </div>

            <p className="reconocedor-ayuda">
              Encuadrá el <strong>frente del envase</strong> dentro del marco,
              en la misma posición y distancia que en su foto. Buena luz y sin
              movimiento.
            </p>

            {cargando && <p className="reconocedor-texto-leido">Preparando fotos...</p>}
            {!cargando && hayFotos === 0 && errorFotos && (
              <p className="reconocedor-error">{errorFotos}</p>
            )}
            {!cargando && hayFotos === 0 && !errorFotos && (
              <p className="reconocedor-error">
                Ningún producto tiene foto todavía. Agregala desde la ficha de
                cada producto.
              </p>
            )}

            {estado === "buscando" && hayFotos > 0 && visual && (
              <p className="reconocedor-visual">
                Más parecido: <strong>{visual.nombre.slice(0, 40)}</strong>
                {visual.registro ? <> · Reg. <strong>{visual.registro}</strong></> : null} (
                {Math.round(visual.score * 100)}%)
              </p>
            )}
          </>
        )}

        {estado === "encontrado" && resultado && (
          <div className="reconocedor-resultado">
            <p>
              <strong>Nombre:</strong> {resultado.nombre}
            </p>
            <p>
              <strong>Código:</strong> {resultado.cb || "-"}
            </p>
            <p>
              <strong>Registro:</strong> {resultado.registro || "-"}
            </p>
            <p>
              <strong>Cantidad:</strong> {resultado.stock ?? resultado.cantidad ?? 0}
            </p>
            <p>
              <strong>Fecha de Vto.:</strong>{" "}
              {resultado.fechaVto || resultado.fecha || "-"}
            </p>
            <p>
              <strong>Parecido con la foto:</strong> {Math.round(puntaje * 100)}%
            </p>
            {fotoResultado && fotoResultado.id === resultado.id && (
              <img
                src={fotoResultado.url}
                alt="Foto guardada"
                className="reconocedor-foto-resultado"
              />
            )}

            <div className="reconocedor-botones">
              {onVerFicha && (
                <button className="btn-guardar" onClick={() => onVerFicha(resultado)}>
                  Ver ficha completa
                </button>
              )}
              <button className="btn-cerrar" onClick={seguirEscaneando}>
                Seguir escaneando
              </button>
            </div>
          </div>
        )}

        <button className="btn-cerrar" onClick={onClose} style={{ marginTop: 15 }}>
          CERRAR
        </button>
      </div>
    </div>
  );
}
