import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../lib/firebase.js";
import { createWorker } from "tesseract.js";
import "./ReconocedorProducto.css";

// Cada cuánto se toma una foto del video para analizarla (ms)
const INTERVALO_CAPTURA_MS = 1800;
// % mínimo de palabras del nombre guardado que deben aparecer en el texto leído
const UMBRAL_COINCIDENCIA = 0.6;

function quitarAcentos(txt) {
  return txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizarTexto(txt) {
  return quitarAcentos(txt || "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Compara el nombre de un producto guardado contra el texto leído por la cámara
function calcularCoincidencia(nombreProducto, textoDetectado) {
  const palabrasNombre = normalizarTexto(nombreProducto)
    .split(" ")
    .filter((p) => p.length >= 3);
  if (palabrasNombre.length === 0) return 0;

  const textoNorm = normalizarTexto(textoDetectado);
  if (!textoNorm) return 0;

  const coincidencias = palabrasNombre.filter((palabra) =>
    textoNorm.includes(palabra)
  ).length;

  return coincidencias / palabrasNombre.length;
}

/**
 * Apunta la cámara al FRENTE de un envase: el componente va tomando fotos
 * automáticamente, lee el texto de la etiqueta (OCR) y lo compara contra
 * la lista de productos guardados del usuario. Si encuentra coincidencia
 * muestra código, registro, cantidad y fecha de vencimiento.
 */
export function ReconocedorProducto({ onClose, onVerFicha }) {
  const { usuario } = useParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const streamRef = useRef(null);
  const activoRef = useRef(true); // sigue montado
  const pausadoRef = useRef(false); // hay un resultado mostrándose
  const analizandoRef = useRef(false); // hay una foto en proceso de OCR

  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [estado, setEstado] = useState("iniciando"); // iniciando | buscando | encontrado | error
  const [resultado, setResultado] = useState(null);
  const [ultimoTexto, setUltimoTexto] = useState("");
  const [intentos, setIntentos] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Cargar una sola vez todos los productos del usuario logueado
  useEffect(() => {
    let vivo = true;
    (async () => {
      if (!usuario) return;
      try {
        const snap = await get(ref(db, "productos-farmacia"));
        if (!vivo) return;
        if (snap.exists()) {
          const data = snap.val();
          const lista = Object.keys(data)
            .map((key) => ({ id: key, ...data[key] }))
            .filter(
              (p) =>
                p.usuario &&
                p.usuario.toString().toUpperCase() === usuario.toUpperCase() &&
                typeof p.nombre === "string"
            );
          setProductos(lista);
        } else {
          setProductos([]);
        }
      } catch (err) {
        console.error("Error cargando productos para reconocimiento:", err);
      } finally {
        if (vivo) setCargandoProductos(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [usuario]);

  const buscarCoincidencia = useCallback(
    (texto) => {
      let mejor = null;
      let mejorScore = 0;
      productos.forEach((p) => {
        const score = calcularCoincidencia(p.nombre, texto);
        if (score > mejorScore) {
          mejorScore = score;
          mejor = p;
        }
      });
      return mejor && mejorScore >= UMBRAL_COINCIDENCIA ? mejor : null;
    },
    [productos]
  );

  // 2. Iniciar cámara + worker de OCR y arrancar el ciclo de capturas automáticas
  useEffect(() => {
    if (cargandoProductos) return;

    activoRef.current = true;

    const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

    const capturarYAnalizar = async () => {
      if (
        analizandoRef.current ||
        pausadoRef.current ||
        !videoRef.current ||
        !canvasRef.current ||
        !workerRef.current
      ) {
        return;
      }
      const video = videoRef.current;
      if (video.readyState < 2 || !video.videoWidth) return;

      analizandoRef.current = true;
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;

        // Recortamos el área central (donde está el marco guía) para
        // acelerar el OCR y evitar leer texto fuera del envase
        const recorteW = w * 0.8;
        const recorteH = h * 0.5;
        const sx = (w - recorteW) / 2;
        const sy = (h - recorteH) / 2;

        const canvas = canvasRef.current;
        canvas.width = recorteW;
        canvas.height = recorteH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, sx, sy, recorteW, recorteH, 0, 0, recorteW, recorteH);

        const {
          data: { text },
        } = await workerRef.current.recognize(canvas);

        if (!activoRef.current) return;

        setUltimoTexto((text || "").trim());
        setIntentos((n) => n + 1);

        const encontrado = buscarCoincidencia(text);
        if (encontrado) {
          pausadoRef.current = true;
          setResultado(encontrado);
          setEstado("encontrado");
        }
      } catch (err) {
        console.error("Error en OCR:", err);
      } finally {
        analizandoRef.current = false;
      }
    };

    const cicloDeCapturas = async () => {
      while (activoRef.current) {
        await dormir(INTERVALO_CAPTURA_MS);
        if (!activoRef.current) break;
        await capturarYAnalizar();
      }
    };

    const iniciar = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!activoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const worker = await createWorker("spa");
        if (!activoRef.current) {
          await worker.terminate();
          return;
        }
        workerRef.current = worker;

        setEstado("buscando");
        cicloDeCapturas();
      } catch (err) {
        console.error("Error iniciando cámara/OCR:", err);
        setErrorMsg(err.message || "No se pudo acceder a la cámara.");
        setEstado("error");
      }
    };

    iniciar();

    return () => {
      activoRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [cargandoProductos, buscarCoincidencia]);

  const seguirEscaneando = () => {
    pausadoRef.current = false;
    setResultado(null);
    setEstado("buscando");
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="reconocedor-contenido">
        <h3 className="reconocedor-titulo">
          {estado === "encontrado"
            ? "✅ PRODUCTO ENCONTRADO"
            : "🔎 RECONOCIENDO ENVASE..."}
        </h3>

        {estado === "error" ? (
          <p className="reconocedor-error">{errorMsg}</p>
        ) : (
          <>
            <div className="reconocedor-video-wrap">
              <video
                ref={videoRef}
                muted
                playsInline
                className="reconocedor-video"
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div className="reconocedor-marco" />
            </div>

            <p className="reconocedor-ayuda">
              Encuadrá el <strong>frente del envase</strong> dentro del
              marco, con buena luz y sin movimiento.
              {estado === "buscando" && ` (intento ${intentos})`}
            </p>

            {estado === "buscando" && ultimoTexto && (
              <p className="reconocedor-texto-leido">
                Último texto leído: <em>{ultimoTexto.slice(0, 80)}</em>
                {intentos >= 5 && (
                  <>
                    {" "}
                    — Sin coincidencias todavía, seguí probando o buscá el
                    producto manualmente.
                  </>
                )}
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
              <strong>Cantidad:</strong>{" "}
              {resultado.stock ?? resultado.cantidad ?? 0}
            </p>
            <p>
              <strong>Fecha de Vto.:</strong>{" "}
              {resultado.fechaVto || resultado.fecha || "-"}
            </p>

            <div className="reconocedor-botones">
              {onVerFicha && (
                <button
                  className="btn-guardar"
                  onClick={() => onVerFicha(resultado)}
                >
                  Ver ficha completa
                </button>
              )}
              <button className="btn-cerrar" onClick={seguirEscaneando}>
                Seguir escaneando
              </button>
            </div>
          </div>
        )}

        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{ marginTop: 15 }}
        >
          CERRAR
        </button>
      </div>
    </div>
  );
}
