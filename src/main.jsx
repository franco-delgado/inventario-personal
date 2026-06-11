import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // 👈 Agregá esta importación
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {" "}
      {/* 👈 Envolvé tu App acá */}
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
