import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import "./Scanner.css";

export function Scanner({ onScanSuccess, onClose }) {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(new BrowserMultiFormatReader());
  const isMounted = useRef(true); // Para rastrear si el componente sigue vivo

  useEffect(() => {
    isMounted.current = true;
    const hints = new Map();
    hints.set(2, [0, 1, 2, 3, 4, 11, 14, 15]);
    hints.set(3, true);

    const startScanner = async () => {
      // Agregamos un pequeño delay de 200ms
      // Esto da tiempo a que cualquier instancia anterior se limpie del todo
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!isMounted.current || !videoRef.current) return;

      try {
        console.log("🚀 Intentando acceder a la cámara...");
        await codeReaderRef.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, err) => {
            if (result && isMounted.current) {
              console.log("✅ Código detectado:", result.getText());
              onScanSuccess(result.getText());
            }
          },
          hints,
        );
      } catch (error) {
        // Si el error es que ya está reproduciendo, lo ignoramos silenciosamente
        if (
          error.name !== "NotReadableError" &&
          !error.message?.includes("already playing")
        ) {
          console.error("❌ Error real de cámara:", error);
        }
      }
    };

    startScanner();

    return () => {
      console.log("🛑 Limpiando recursos...");
      isMounted.current = false;
      codeReaderRef.current.reset();

      // Forzamos la detención de los tracks de video manualmente
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="modal-overlay camara-overlay">
      <div className="modal-content camara-panel">
        <h3 className="camara-titulo">Escaneando código de barras</h3>

        <div className="scanner-visor">
          <video ref={videoRef} muted playsInline className="scanner-video" />
          <div className="scanner-marco"></div>
        </div>

        <p className="camara-ayuda">Apuntá al código de barras dentro del recuadro.</p>

        <button type="button" onClick={onClose} className="btn-cerrar">
          Cerrar
        </button>
      </div>
    </div>
  );
}
