import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "women-safety-3842b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "women-safety-3842b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "women-safety-3842b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "192245461189",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:192245461189:web:0baa69764b964a018140ac",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9Z10TCPT46"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
