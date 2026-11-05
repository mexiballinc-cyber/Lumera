// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAclBJ0FUKgd8m2Cmj5bRQigafL9HqVzSw",
  authDomain: "lumeraplay-ffde6.firebaseapp.com",
  projectId: "lumeraplay-ffde6",
  storageBucket: "lumeraplay-ffde6.firebasestorage.app",
  messagingSenderId: "793456652164",
  appId: "1:793456652164:web:b00ae2574389cb5d05f7d1"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
