import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Articulos from "./pages/Articulos"; // Usamos solo esta importación limpia

function App() {
  return (
    <Routes>
      {/* 1. RUTA PÚBLICA: Pantalla de Login */}
      <Route path="/" element={<Login />} />
      <Route path="login" element={<Login />}/>

      {/* 2. RUTAS PROTEGIDAS: Todo lo que vaya acá adentro tendrá la barra de "Cierre" */}
      <Route element={<ProtectedRoute />}>
        
        {/* Tu Dashboard Principal (Lista de artículos con el usuario en la URL) */}
        <Route path="/articulos/:usuario" element={<Articulos />} />
        
        {/* 💡 OPCIONAL: Si un usuario logueado intenta entrar a "/" sin el nombre, 
            podés hacer que también renderice Articulos o manejarlo desde el Login */}
        <Route path="/dashboard" element={<Articulos />} />
        
        {/* Aquí vas a poder sumar más secciones del inventario en el futuro, por ejemplo:
        <Route path="/vencimientos" element={<Vencimientos />} />
        <Route path="/proveedores" element={<Proveedores />} /> 
        */}
        
      </Route>
    </Routes>
  );
}

export default App;