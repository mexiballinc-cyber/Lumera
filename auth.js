import { auth, db } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const ADMIN_EMAIL = "jgonzalezgutierrez1@bcedu.mx";
let currentUser = null;
let selectedAvatarUrl = "https://i.imgur.com/cCqp6Qt.png";
let isRegisterMode = false;
let isSubmitting = false;

const authForm = document.getElementById('authForm');
const authFormSection = document.getElementById('authFormSection');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authTitle = document.getElementById('authTitle');
const authToggle = document.getElementById('authToggle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authMessage = document.getElementById('authMessage');
const profilesSection = document.getElementById('profilesSection');
const profilesGrid = document.getElementById('profilesGrid');
const headerAdminBtn = document.getElementById('headerAdminBtn');

function showAuthMessage(message = '') {
  authMessage.textContent = message;
  authMessage.hidden = !message;
}

function setAuthMode(registering) {
  isRegisterMode = registering;
  authTitle.textContent = registering ? 'Crear cuenta' : 'Iniciar sesión';
  authSubmitBtn.textContent = registering ? 'Crear cuenta' : 'Entrar';
  authToggle.textContent = registering
    ? '¿Ya tienes cuenta? Inicia sesión'
    : '¿No tienes cuenta? Regístrate';
  authPassword.autocomplete = registering ? 'new-password' : 'current-password';
  showAuthMessage();
}

function getAuthErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Inicia sesión.',
    'auth/invalid-email': 'Ingresa un correo válido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.',
    'auth/network-request-failed': 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
    'auth/operation-not-allowed': 'El método de correo y contraseña no está habilitado en Firebase.'
  };
  return messages[error.code] || 'No se pudo completar la autenticación. Inténtalo de nuevo.';
}

// El botón de administración se muestra solamente al tener una sesión autenticada
// con el correo administrador configurado.
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  headerAdminBtn.style.display = isAdmin ? 'flex' : 'none';

  if (user) {
    localStorage.setItem('lumera_session', user.uid);
    authFormSection.style.display = 'none';
    profilesSection.style.display = 'block';
    try {
      await loadUserProfiles();
    } catch (error) {
      console.error('No se pudieron cargar los perfiles:', error);
      alert('Sesión iniciada, pero no se pudieron cargar los perfiles. Revisa la conexión y los permisos de Firestore.');
    }
  } else {
    localStorage.removeItem('lumera_session');
    authFormSection.style.display = 'block';
    profilesSection.style.display = 'none';
  }
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting) return;

  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!authForm.reportValidity()) return;

  isSubmitting = true;
  authSubmitBtn.disabled = true;
  authToggle.disabled = true;
  authSubmitBtn.textContent = isRegisterMode ? 'Creando cuenta…' : 'Entrando…';
  showAuthMessage();

  try {
    if (isRegisterMode) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error));
  } finally {
    isSubmitting = false;
    authSubmitBtn.disabled = false;
    authToggle.disabled = false;
    authSubmitBtn.textContent = isRegisterMode ? 'Crear cuenta' : 'Entrar';
  }
});

authToggle.addEventListener('click', () => setAuthMode(!isRegisterMode));

// Renderizar lista de perfiles guardados + botón para añadir.
async function loadUserProfiles() {
  profilesGrid.innerHTML = '';
  const userRef = doc(db, 'users', currentUser.uid);
  const userSnap = await getDoc(userRef);

  let profiles = [];
  if (userSnap.exists() && userSnap.data().profiles) {
    profiles = userSnap.data().profiles;
  } else {
    profiles = [{ name: 'Principal', avatar: 'https://i.imgur.com/cCqp6Qt.png', isKids: false }];
    await setDoc(userRef, { email: currentUser.email, profiles }, { merge: true });
  }

  profiles.forEach((prof) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    const avatar = document.createElement('img');
    avatar.src = prof.avatar;
    avatar.className = 'profile-avatar';
    avatar.alt = `Avatar de ${prof.name}`;
    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = prof.name;
    card.append(avatar, name);
    card.addEventListener('click', () => {
      localStorage.setItem('lumera_active_profile', JSON.stringify(prof));
      window.location.href = 'home.html';
    });
    profilesGrid.appendChild(card);
  });

  const addCard = document.createElement('div');
  addCard.className = 'profile-card';
  addCard.innerHTML = '<div class="add-profile-circle">+</div><div class="profile-name">Añadir</div>';
  addCard.addEventListener('click', () => window.openAddProfileModal());
  profilesGrid.appendChild(addCard);
}

// Ventana modal para añadir perfil.
window.openAddProfileModal = async function() {
  document.getElementById('addProfileModal').style.display = 'flex';
  const container = document.getElementById('avatarPickerContainer');
  container.textContent = 'Cargando avatares…';

  try {
    const querySnap = await getDocs(collection(db, 'avatars'));
    container.innerHTML = '';
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      const img = document.createElement('img');
      img.src = data.url;
      img.alt = 'Avatar disponible';
      img.className = 'avatar-option';
      img.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach((item) => item.classList.remove('selected'));
        img.classList.add('selected');
        selectedAvatarUrl = data.url;
      });
      container.appendChild(img);
    });
  } catch (error) {
    console.error('No se pudieron cargar los avatares:', error);
    container.textContent = 'No se pudieron cargar los avatares.';
  }
};

window.closeProfileModal = function() {
  document.getElementById('addProfileModal').style.display = 'none';
};

window.saveNewProfile = async function() {
  const name = document.getElementById('newProfName').value.trim();
  const isKids = document.getElementById('newProfKids').checked;
  if (!name) return alert('Por favor asigna un nombre al perfil.');
  if (!currentUser) return alert('Inicia sesión para crear un perfil.');

  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    const profiles = userSnap.exists() ? (userSnap.data().profiles || []) : [];
    profiles.push({ name, isKids, avatar: selectedAvatarUrl });
    await setDoc(userRef, { email: currentUser.email, profiles }, { merge: true });
    closeProfileModal();
    await loadUserProfiles();
  } catch (error) {
    console.error('No se pudo guardar el perfil:', error);
    alert('No se pudo guardar el perfil. Inténtalo de nuevo.');
  }
};

window.logoutUser = () => signOut(auth);

// Configuración y temas dinámicos.
window.openSettings = () => document.getElementById('settingsModal').style.display = 'flex';
window.closeSettingsModal = () => document.getElementById('settingsModal').style.display = 'none';
window.updateSecondaryColor = (hex) => {
  document.documentElement.style.setProperty('--accent-color', hex);
  localStorage.setItem('lumera_accent_color', hex);
};
window.changeLanguage = (lang) => localStorage.setItem('lumera_lang', lang);
