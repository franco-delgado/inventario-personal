import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

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
    <div
      className="modal-overlay"
      style={{
        background: "rgba(0,0,0,0.9)",
        zIndex: 1000,
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="modal-content"
        style={{
          width: "90%",
          maxWidth: "500px",
          background: "#1a1a1a",
          padding: "20px",
          borderRadius: "15px",
        }}
      >
        <h3
          style={{ color: "white", textAlign: "center", marginBottom: "15px" }}
        >
          ESCANEANDO...
        </h3>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "10px",
            backgroundColor: "#000",
            aspectRatio: "4/3",
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "70%",
              height: "40%",
              border: "2px solid #00ff00",
              boxShadow: "0 0 0 4000px rgba(0,0,0,0.5)",
              pointerEvents: "none",
            }}
          ></div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "15px",
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: "bold",
          }}
        >
          CERRAR
        </button>
      </div>
    </div>
  );
}
