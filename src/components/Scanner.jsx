import { useEffect, useRef } from "react";
import Quagga from "@ericblade/quagga2"; // Importación de Quagga2

export function Scanner({ onScanSuccess, onClose }) {
  const videoContainerRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const startScanner = async () => {
      // Pequeño delay para asegurar que el DOM esté listo y limpiar instancias previas
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!isMounted.current || !videoContainerRef.current) return;

      try {
        console.log("🚀 Iniciando Quagga2...");
        
        await Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoContainerRef.current, // Contenedor donde Quagga inyectará el video
            constraints: {
              width: 1280,
              height: 720,
              facingMode: "environment", // Usar cámara trasera
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true, // Optimiza velocidad reduciendo la resolución de procesamiento
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          decoder: {
            // Aquí defines qué tipos de códigos quieres leer
            readers: ["ean_reader", "code_128_reader", "ean_8_reader", "code_39_reader"],
          },
          locate: true, // Localiza el código en la imagen para mejor enfoque
        });

        if (isMounted.current) {
          Quagga.start();
          console.log("✅ Quagga iniciado correctamente");
        }

        Quagga.onDetected((data) => {
          if (data && data.codeResult && isMounted.current) {
            console.log("✅ Código detectado:", data.codeResult.code);
            onScanSuccess(data.codeResult.code);
          }
        });

      } catch (error) {
        console.error("❌ Error al iniciar Quagga:", error);
      }
    };

    startScanner();

    return () => {
      console.log("🛑 Deteniendo Quagga...");
      isMounted.current = false;
      Quagga.offDetected();
      Quagga.stop();
      
      // Limpieza manual extra de tracks de video
      const videoElem = videoContainerRef.current?.querySelector('video');
      if (videoElem && videoElem.srcObject) {
        videoElem.srcObject.getTracks().forEach(track => track.stop());
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
        <h3 style={{ color: "white", textAlign: "center", marginBottom: "15px" }}>
          ESCANEANDO CÓDIGO...
        </h3>

        <div
          ref={videoContainerRef} // Quagga insertará el video aquí automáticamente
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "10px",
            backgroundColor: "#000",
            aspectRatio: "4/3",
          }}
        >
          {/* Quagga añade un <video> y un <canvas> aquí. Estilizamos los hijos con CSS: */}
          <style>{`
            #video-container canvas, #video-container video {
              width: 100%;
              height: 100%;
              object-fit: cover;
              position: absolute;
              top: 0;
              left: 0;
            }
          `}</style>
          
          {/* El recuadro guía (Overlay visual) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80%",
              height: "30%",
              border: "2px solid #00ff00",
              boxShadow: "0 0 0 4000px rgba(0,0,0,0.5)",
              zIndex: 10,
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
            cursor: "pointer"
          }}
        >
          CERRAR
        </button>
      </div>
    </div>
  );
}