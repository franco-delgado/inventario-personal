import { useEffect, useRef, useState } from "react";
import {
  recortarCentro,
  firmaDesdeCanvas,
  canvasAJpeg,
  cargarImagenArchivo,
  imagenACanvas,
  geometriaRecorte,
} from "../utils/imagen.js";
import "./CapturaFoto.css";

/**
 * Modal para sacar (o elegir de la galería) la foto de referencia de un envase.
 * Entrega { foto, firma } a onConfirmar. NO guarda nada por sí mismo: quien lo
 * usa decide dónde guardarlo (siempre fuera de "productos-farmacia").
 *
 * Usa el mismo encuadre que el reconocedor, así la foto guardada y lo que ve la
 * cámara al reconocer son comparables.
 */
export function CapturaFoto({ onConfirmar, onCancelar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const archivoRef = useRef(null);

  const [fase, setFase] = useState("camara"); // camara | revision | error
  const [captura, setCaptura] = useState(null); // { foto, firma }
  const [errorMsg, setErrorMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [dims, setDims] = useState({ w: 3, h: 4 }); // proporción real del video

  // La cámara solo está encendida mientras se muestra la fase "camara"
  useEffect(() => {
    if (fase !== "camara") return;
    let cancelado = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        if (cancelado) return;
        console.error("Error iniciando la cámara:", err);
        setErrorMsg(err.message || "No se pudo acceder a la cámara.");
        setFase("error");
      }
    })();

    return () => {
      cancelado = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [fase]);

  // Toma un cuadro completo y calcula: la firma (del recorte central) y la foto liviana
  const prepararCaptura = (cuadro) => {
    const recorte = recortarCentro(
      cuadro,
      cuadro.width,
      cuadro.height,
      document.createElement("canvas")
    );
    setCaptura({
      firma: firmaDesdeCanvas(recorte),
      foto: canvasAJpeg(cuadro),
      w: cuadro.width,
      h: cuadro.height,
    });
    setFase("revision");
  };

  const tomarFoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      alert("La cámara todavía no está lista. Esperá un segundo e intentá de nuevo.");
      return;
    }
    const cuadro = document.createElement("canvas");
    cuadro.width = video.videoWidth;
    cuadro.height = video.videoHeight;
    cuadro.getContext("2d").drawImage(video, 0, 0);
    prepararCaptura(cuadro);
  };

  const alElegirArchivo = async (e) => {
    const archivo = e.target.files && e.target.files[0];
    e.target.value = ""; // permite elegir el mismo archivo otra vez
    if (!archivo) return;
    try {
      setOcupado(true);
      const img = await cargarImagenArchivo(archivo);
      prepararCaptura(imagenACanvas(img));
    } catch (err) {
      alert(err.message || "No se pudo usar esa imagen.");
    } finally {
      setOcupado(false);
    }
  };

  const confirmar = async () => {
    if (!captura) return;
    try {
      setOcupado(true);
      await onConfirmar(captura);
    } finally {
      setOcupado(false);
    }
  };

  // Marco vertical: mismo recorte que usa el reconocedor
  const marcoVivo = geometriaRecorte(dims.w, dims.h);
  const marcoFoto = captura ? geometriaRecorte(captura.w, captura.h) : null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="captura-contenido">
        <h3 className="captura-titulo">
          {fase === "revision" ? "¿Usar esta foto?" : "Foto del envase"}
        </h3>

        {fase === "camara" && (
          <>
            <div
              className="captura-video-wrap"
              style={{
                aspectRatio: `${dims.w} / ${dims.h}`,
                width: `min(100%, ${(55 * dims.w) / dims.h}vh)`,
                margin: "0 auto",
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                className="captura-video"
                onLoadedMetadata={(e) =>
                  setDims({ w: e.target.videoWidth || 3, h: e.target.videoHeight || 4 })
                }
              />
              <div
                className="captura-marco"
                style={{
                  width: `${marcoVivo.fracAncho * 100}%`,
                  height: `${marcoVivo.fracAlto * 100}%`,
                }}
              />
            </div>
            <p className="captura-ayuda">
              Encuadrá el <strong>frente del envase</strong> dentro del marco,
              igual que cuando lo reconocés. Buena luz y sin movimiento.
            </p>
          </>
        )}

        {fase === "revision" && captura && (
          <>
            <div
              className="captura-preview"
              style={{
                width: `min(100%, ${(55 * captura.w) / captura.h}vh)`,
                margin: "0 auto",
              }}
            >
              <img src={captura.foto} alt="Vista previa" className="captura-img" />
              <div
                className="captura-zona"
                style={{
                  left: `${((1 - marcoFoto.fracAncho) / 2) * 100}%`,
                  top: `${((1 - marcoFoto.fracAlto) / 2) * 100}%`,
                  width: `${marcoFoto.fracAncho * 100}%`,
                  height: `${marcoFoto.fracAlto * 100}%`,
                }}
              />
            </div>
            <p className="captura-ayuda">
              El recuadro punteado es la zona que se usa para reconocer el
              producto. Debería contener el frente del envase.
            </p>
          </>
        )}

        {fase === "error" && <p className="captura-error">{errorMsg}</p>}

        <div className="captura-botones">
          {fase === "camara" && (
            <button type="button" className="btn-primary" onClick={tomarFoto}>
              Tomar foto
            </button>
          )}
          {fase === "revision" && (
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={confirmar}
                disabled={ocupado}
              >
                {ocupado ? "Guardando..." : "Usar esta foto"}
              </button>
              <button
                type="button"
                className="btn-repetir"
                onClick={() => {
                  setCaptura(null);
                  setFase("camara");
                }}
                disabled={ocupado}
              >
                Repetir
              </button>
            </>
          )}
          {fase !== "revision" && (
            <button
              type="button"
              className="btn-repetir"
              onClick={() => archivoRef.current && archivoRef.current.click()}
              disabled={ocupado}
            >
              Elegir de la galería
            </button>
          )}
        </div>

        <input
          ref={archivoRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={alElegirArchivo}
        />

        <button
          type="button"
          className="btn-cerrar"
          onClick={onCancelar}
          disabled={ocupado}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
