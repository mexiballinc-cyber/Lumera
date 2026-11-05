import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const ADMIN_EMAIL = "jgonzalezgutierrez1@bcedu.mx";
let currentUser = null;
let selectedAvatarUrl = "https://i.imgur.com/cCqp6Qt.png";

const authFormSection = document.getElementById('authFormSection');
const profilesSection = document.getElementById('profilesSection');
const profilesGrid = document.getElementById('profilesGrid');
const headerAdminBtn = document.getElementById('headerAdminBtn');

// Cargar estado de sesión
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    localStorage.setItem('lumera_session', user.uid);
    authFormSection.style.display = 'none';
    profilesSection.style.display = 'block';

    if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      headerAdminBtn.style.display = 'flex';
    }

    await loadUserProfiles();
  } else {
    localStorage.removeItem('lumera_session');
    authFormSection.style.display = 'block';
    profilesSection.style.display = 'none';
    headerAdminBtn.style.display = 'none';
  }
});

// Renderizar lista de perfiles guardados + Botón "+" Añadir
async function loadUserProfiles() {
  profilesGrid.innerHTML = '';
  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);

  let profiles = [];
  if (userSnap.exists() && userSnap.data().profiles) {
    profiles = userSnap.data().profiles;
  } else {
    profiles = [{ name: "Principal", avatar: "https://i.imgur.com/cCqp6Qt.png", isKids: false }];
    await setDoc(userRef, { email: currentUser.email, profiles }, { merge: true });
  }

  // Tarjetas de perfil existentes
  profiles.forEach(prof => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.innerHTML = `
      <img src="${prof.avatar}" class="profile-avatar">
      <div class="profile-name">${prof.name}</div>
    `;
    card.onclick = () => {
      localStorage.setItem('lumera_active_profile', JSON.stringify(prof));
      window.location.href = 'home.html';
    };
    profilesGrid.appendChild(card);
  });

  // Botón (+) Añadir Perfil
  const addCard = document.createElement('div');
  addCard.className = 'profile-card';
  addCard.innerHTML = `
    <div class="add-profile-circle">+</div>
    <div class="profile-name">Añadir</div>
  `;
  addCard.onclick = () => openAddProfileModal();
  profilesGrid.appendChild(addCard);
}

// Ventana Modal para Añadir Perfil
window.openAddProfileModal = async function() {
  document.getElementById('addProfileModal').style.display = 'flex';
  const container = document.getElementById('avatarPickerContainer');
  container.innerHTML = 'Cargando avatares...';

  // Obtener avatares subidos por el Admin desde Firestore
  const querySnap = await getDocs(collection(db, "avatars"));
  container.innerHTML = '';
  
  querySnap.forEach(docSnap => {
    const data = docSnap.data();
    const img = document.createElement('img');
    img.src = data.url;
    img.className = 'avatar-option';
    img.onclick = () => {
      document.querySelectorAll('.avatar-option').forEach(i => i.classList.remove('selected'));
      img.classList.add('selected');
      selectedAvatarUrl = data.url;
    };
    container.appendChild(img);
  });
};

window.closeProfileModal = function() {
  document.getElementById('addProfileModal').style.display = 'none';
};

window.saveNewProfile = async function() {
  const name = document.getElementById('newProfName').value.trim();
  const isKids = document.getElementById('newProfKids').checked;

  if (!name) return alert("Por favor asigna un nombre al perfil.");

  const userRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(userRef);
  let profiles = userSnap.data().profiles || [];

  profiles.push({ name, isKids, avatar: selectedAvatarUrl });

  await updateDoc(userRef, { profiles });
  closeProfileModal();
  loadUserProfiles();
};

window.logoutUser = () => signOut(auth);

// Configuración & Temas Dinámicos
window.openSettings = () => document.getElementById('settingsModal').style.display = 'flex';
window.closeSettingsModal = () => document.getElementById('settingsModal').style.display = 'none';
window.updateSecondaryColor = (hex) => {
  document.documentElement.style.setProperty('--accent-color', hex);
  localStorage.setItem('lumera_accent_color', hex);
};
window.changeLanguage = (lang) => {
  localStorage.setItem('lumera_lang', lang);
};
