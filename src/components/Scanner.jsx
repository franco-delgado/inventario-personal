import { useEffect, useRef, useState } from "react";

export function Scanner({ onScanSuccess, onClose }) {
  const videoRef = useRef(null);
  const [isApiSupported, setIsApiSupported] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // 1. Verificar si el navegador soporta la API
    if (!("BarcodeDetector" in window)) {
      console.warn("Barcode Detection API no es soportada en este navegador.");
      setIsApiSupported(false);
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        if (videoRef.current && isMounted.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          startScanning();
        }
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
      }
    };

    const startScanning = async () => {
      // 2. Configurar el detector (especificamos formatos para mayor velocidad)
      const barcodeDetector = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"]
      });

      const render = async () => {
        if (!isMounted.current || !videoRef.current) return;

        try {
          // 3. Detectar códigos en el frame actual del video
          const barcodes = await barcodeDetector.detect(videoRef.current);
          
          if (barcodes.length > 0 && isMounted.current) {
            const detectedValue = barcodes[0].rawValue;
            console.log("✅ Código detectado:", detectedValue);
            onScanSuccess(detectedValue);
            return; // Detenemos el loop tras el primer éxito
          }
        } catch (e) {
          // Errores silenciosos durante el escaneo de frames
        }

        // Continuar el loop de detección
        requestAnimationFrame(render);
      };

      render();
    };

    startCamera();

    return () => {
      isMounted.current = false;
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScanSuccess]);

  if (!isApiSupported) {
    return (
      <div style={{ color: "white", textAlign: "center", padding: "20px", background: "red" }}>
        Tu navegador no soporta la detección nativa de códigos.
        <button onClick={onClose}>Cerrar</button>
      </div>
    );
  }

  return (
    <div
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
        style={{
          width: "90%",
          maxWidth: "500px",
          background: "#1a1a1a",
          padding: "20px",
          borderRadius: "15px",
        }}
      >
        <h3 style={{ color: "white", textAlign: "center", marginBottom: "15px" }}>
          ESCANEADO NATIVO (GPU)
        </h3>

        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/3",
            overflow: "hidden",
            borderRadius: "10px",
            backgroundColor: "#000",
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          
          {/* Overlay visual */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80%",
              height: "40%",
              border: "2px solid #00ff00",
              boxShadow: "0 0 0 4000px rgba(0,0,0,0.5)",
              pointerEvents: "none",
            }}
          />
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