import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Configuración extraída de tu consola de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAHHkzTkVbiLA09OQs7y6GYZCcSTuc768c",
  authDomain: "delgadowebs-firebase.firebaseapp.com",
  databaseURL: "https://delgadowebs-firebase-default-rtdb.firebaseio.com",
  projectId: "delgadowebs-firebase",
  storageBucket: "delgadowebs-firebase.firebasestorage.app",
  messagingSenderId: "401940367025",
  appId: "1:401940367025:web:027f3bb98beaa34bb54490",
  measurementId: "G-DP9R9R4RH1"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar la base de datos de Realtime Database
export const db = getDatabase(app);