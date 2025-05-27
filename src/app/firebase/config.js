// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCj01-T9BihQTFNrKlRKs4mT2GyCS6Nvh0",
  authDomain: "battlecode-dcb79.firebaseapp.com",
  projectId: "battlecode-dcb79",
  storageBucket: "battlecode-dcb79.firebasestorage.app",
  messagingSenderId: "319352396507",
  appId: "1:319352396507:web:833b43d083167c47894afe"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };