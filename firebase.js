// firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { initApp as initTranslations } from './i18n.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAclBJ0FUKgd8m2Cmj5bRQigafL9HqVzSw',
  authDomain: 'lumeraplay-ffde6.firebaseapp.com',
  projectId: 'lumeraplay-ffde6',
  storageBucket: 'lumeraplay-ffde6.firebasestorage.app',
  messagingSenderId: '793456652164',
  appId: '1:793456652164:web:b00ae2574389cb5d05f7d1'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize the global interface translations on all pages that use Firebase.
if (typeof document !== 'undefined') initTranslations();
if (typeof document !== 'undefined' && document.body?.classList.contains('home-page')) {
  import('./mobile-nav.js').catch((error) => console.error('Mobile navigation failed to load:', error));
}
