// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDIr7p4mzLDdFet5zaFvwH-Z3DaPSEzGG8",
  authDomain: "nwitter-v2.firebaseapp.com",
  projectId: "nwitter-v2",
  storageBucket: "nwitter-v2.firebasestorage.app",
  messagingSenderId: "714026600125",
  appId: "1:714026600125:web:b01336fb502ca161db19d4",
  measurementId: "G-8XRMP88MXS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);

export const storage = getStorage(app);

export const db = getFirestore(app);
