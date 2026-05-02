import { useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export function Scanner({ onScanSuccess, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 30,
      qrbox: { width: 300, height: 150 },
      aspectRatio: 1.0,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      formatsToSupport: [6, 7, 12, 8],
    });

    scanner.render(
      (text) => {
        onScanSuccess(text);
        scanner.clear();
      },
      (err) => {},
    );

    return () => {
      scanner
        .clear()
        .catch((error) => console.error("Error al limpiar", error));
    };
  }, [onScanSuccess]);

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{ maxWidth: "500px", width: "90%" }}
      >
        <h3>Escaneando...</h3>
        <div id="reader" style={{ width: "100%" }}></div>
        <button
          className="btn-cerrar"
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "10px",
            backgroundColor: "#333",
            color: "white",
          }}
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}
