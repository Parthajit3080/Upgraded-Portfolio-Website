import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase web settings identify the public project; Firestore rules enforce access.
const firebaseConfig = {
    apiKey: "AIzaSyC3VAj6pHUPZOrOVoWti64EZgVt0wDEqYE",
    authDomain: "parthajit-portfolio.firebaseapp.com",
    projectId: "parthajit-portfolio",
    storageBucket: "parthajit-portfolio.firebasestorage.app",
    messagingSenderId: "368597265378",
    appId: "1:368597265378:web:8b1352aac8da9dd2ada7bb"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
