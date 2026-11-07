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

const ADMIN_EMAIL = 'jgonzalezgutierrez1@bcedu.mx';
const DEFAULT_AVATAR = 'https://i.imgur.com/cCqp6Qt.png';
let currentUser = null;
let selectedAvatarUrl = DEFAULT_AVATAR;
let isRegisterMode = false;
let isSubmitting = false;
let isEditingProfiles = false;
let profileLoadPromise = null;

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
  authMessage.style.display = message ? 'block' : 'none';
}

function showSignedInView(user) {
  currentUser = user;
  localStorage.setItem('lumera_session', user.uid);
  authFormSection.style.display = 'none';
  profilesSection.style.display = 'block';
  profilesSection.hidden = false;
  const isAdmin = Boolean(user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  headerAdminBtn.style.display = isAdmin ? 'flex' : 'none';
}

function setAuthMode(registering) {
  isRegisterMode = registering;
  authTitle.textContent = registering ? 'Crear cuenta' : 'Iniciar sesión';
  authSubmitBtn.textContent = registering ? 'Crear cuenta' : 'Entrar';
  authToggle.textContent = registering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
  authPassword.autocomplete = registering ? 'new-password' : 'current-password';
  showAuthMessage();
}

function getAuthErrorMessage(error) {
  const messages = {
    'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Cambia a Iniciar sesión.',
    'auth/invalid-email': 'Ingresa un correo válido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/user-not-found': 'No existe una cuenta con ese correo.',
    'auth/wrong-password': 'Correo o contraseña incorrectos.',
    'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Hubo demasiados intentos. Espera un momento e inténtalo de nuevo.',
    'auth/network-request-failed': 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
    'auth/operation-not-allowed': 'El registro por correo y contraseña no está habilitado en Firebase.',
    'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication.'
  };
  return messages[error.code] || `No se pudo completar la operación (${error.code || 'error'}). Revisa la configuración de Firebase e inténtalo de nuevo.`;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    profileLoadPromise = null;
    localStorage.removeItem('lumera_session');
    authFormSection.style.display = 'block';
    profilesSection.style.display = 'none';
    profilesSection.hidden = true;
    headerAdminBtn.style.display = 'none';
    return;
  }

  showSignedInView(user);
  try {
    await loadUserProfiles();
  } catch (error) {
    console.error('No se pudieron cargar los perfiles:', error);
    showProfileLoadError();
  }
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting || !authForm.reportValidity()) return;

  const email = authEmail.value.trim();
  const password = authPassword.value;
  isSubmitting = true;
  authSubmitBtn.disabled = true;
  authToggle.disabled = true;
  authSubmitBtn.textContent = isRegisterMode ? 'Creando cuenta…' : 'Entrando…';
  showAuthMessage();

  try {
    const credential = isRegisterMode
      ? await createUserWithEmailAndPassword(auth, email, password)
      : await signInWithEmailAndPassword(auth, email, password);

    // Cambia la vista inmediatamente tras el éxito, sin depender de que el
    // callback de estado de Firebase se ejecute primero.
    showSignedInView(credential.user);
    try {
      await loadUserProfiles();
    } catch (error) {
      console.error('Autenticación correcta; falló la carga de perfiles:', error);
      showProfileLoadError();
    }
  } catch (error) {
    console.error('Error de autenticación:', error);
    showAuthMessage(getAuthErrorMessage(error));
  } finally {
    isSubmitting = false;
    authSubmitBtn.disabled = false;
    authToggle.disabled = false;
    authSubmitBtn.textContent = isRegisterMode ? 'Crear cuenta' : 'Entrar';
  }
});

authToggle.addEventListener('click', () => setAuthMode(!isRegisterMode));

function showProfileLoadError() {
  profilesGrid.innerHTML = '';
  const message = document.createElement('p');
  message.className = 'profile-load-error';
  message.textContent = 'La sesión está iniciada, pero no se pudieron cargar los perfiles. Revisa las reglas/permisos de Firestore y vuelve a cargar la página.';
  profilesGrid.appendChild(message);
}

async function loadUserProfiles() {
  if (!currentUser) return;
  if (profileLoadPromise) return profileLoadPromise;

  const userAtStart = currentUser;
  profileLoadPromise = (async () => {
    const userRef = doc(db, 'users', userAtStart.uid);
    const userSnap = await getDoc(userRef);
    let profiles = userSnap.exists() && Array.isArray(userSnap.data().profiles)
      ? userSnap.data().profiles
      : null;

    if (!profiles) {
      profiles = [{ name: 'Principal', avatar: DEFAULT_AVATAR, isKids: false }];
      await setDoc(userRef, { email: userAtStart.email, profiles }, { merge: true });
    }

    // No renderizar datos si el usuario cambió mientras Firestore respondía.
    if (currentUser?.uid !== userAtStart.uid) return;
    renderProfiles(profiles);
  })();

  try {
    await profileLoadPromise;
  } finally {
    profileLoadPromise = null;
  }
}

function renderProfiles(profiles) {
  profilesGrid.innerHTML = '';
  profiles.forEach((profile, index) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    const avatar = document.createElement('img');
    avatar.src = profile.avatar || DEFAULT_AVATAR;
    avatar.className = 'profile-avatar';
    avatar.alt = `Avatar de ${profile.name}`;
    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = profile.name;
    card.append(avatar, name);

    if (isEditingProfiles) {
      const actions = document.createElement('div');
      actions.className = 'profile-actions';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.textContent = 'Editar';
      editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        editProfile(index, profiles);
      });
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.textContent = 'Eliminar';
      deleteButton.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteProfile(index, profiles);
      });
      actions.append(editButton, deleteButton);
      card.appendChild(actions);
    } else {
      card.addEventListener('click', () => {
        localStorage.setItem('lumera_active_profile', JSON.stringify(profile));
        window.location.href = 'home.html';
      });
    }
    profilesGrid.appendChild(card);
  });

  const addCard = document.createElement('div');
  addCard.className = 'profile-card';
  addCard.innerHTML = '<div class="add-profile-circle">+</div><div class="profile-name">Añadir</div>';
  addCard.addEventListener('click', () => window.openAddProfileModal());
  profilesGrid.appendChild(addCard);
}

window.toggleEditProfiles = async function() {
  isEditingProfiles = !isEditingProfiles;
  await loadUserProfiles();
};

async function editProfile(index, profiles) {
  const currentName = profiles[index]?.name || '';
  const name = window.prompt('Nuevo nombre para el perfil:', currentName);
  if (name === null) return;
  const trimmedName = name.trim();
  if (!trimmedName) return alert('El nombre del perfil no puede estar vacío.');
  profiles[index] = { ...profiles[index], name: trimmedName };
  await persistProfiles(profiles);
}

async function deleteProfile(index, profiles) {
  if (profiles.length <= 1) return alert('Debe quedar al menos un perfil.');
  if (!window.confirm(`¿Eliminar el perfil “${profiles[index].name}”?`)) return;
  profiles.splice(index, 1);
  await persistProfiles(profiles);
}

async function persistProfiles(profiles) {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { profiles });
    renderProfiles(profiles);
  } catch (error) {
    console.error('No se pudieron guardar los perfiles:', error);
    alert('No se pudo guardar el cambio. Revisa los permisos de Firestore e inténtalo de nuevo.');
  }
}

window.openAddProfileModal = async function() {
  document.getElementById('addProfileModal').style.display = 'flex';
  const container = document.getElementById('avatarPickerContainer');
  container.textContent = 'Cargando avatares…';
  selectedAvatarUrl = DEFAULT_AVATAR;

  try {
    const querySnap = await getDocs(collection(db, 'avatars'));
    container.innerHTML = '';
    querySnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.url) return;
      const img = document.createElement('img');
      img.src = data.url;
      img.alt = 'Avatar disponible';
      img.className = 'avatar-option';
      img.addEventListener('click', () => {
        container.querySelectorAll('.avatar-option').forEach((item) => item.classList.remove('selected'));
        img.classList.add('selected');
        selectedAvatarUrl = data.url;
      });
      container.appendChild(img);
    });
  } catch (error) {
    console.error('No se pudieron cargar los avatares:', error);
    container.textContent = 'No se pudieron cargar los avatares. Puedes guardar el perfil con el avatar predeterminado.';
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
    document.getElementById('newProfName').value = '';
    document.getElementById('newProfKids').checked = false;
    closeProfileModal();
    renderProfiles(profiles);
  } catch (error) {
    console.error('No se pudo guardar el perfil:', error);
    alert('No se pudo guardar el perfil. Revisa los permisos de Firestore e inténtalo de nuevo.');
  }
};

window.logoutUser = () => signOut(auth);
window.openSettings = () => document.getElementById('settingsModal').style.display = 'flex';
window.closeSettingsModal = () => document.getElementById('settingsModal').style.display = 'none';
window.updateSecondaryColor = (hex) => {
  document.documentElement.style.setProperty('--accent-color', hex);
  localStorage.setItem('lumera_accent_color', hex);
};
window.changeLanguage = (lang) => localStorage.setItem('lumera_lang', lang);
