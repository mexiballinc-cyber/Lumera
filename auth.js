import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// Correo oficial del único administrador
const ADMIN_EMAIL = "jgonzalezgutierrez1@bcedu.mx";

const authFormSection = document.getElementById('authFormSection');
const profilesSection = document.getElementById('profilesSection');
const authTitle = document.getElementById('authTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggle = document.getElementById('authToggle');
const profilesGrid = document.getElementById('profilesGrid');

let isLoginMode = true;

// Alternar entre Login y Registro
authToggle.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authTitle.textContent = isLoginMode ? "Iniciar Sesión" : "Crear Cuenta";
  authSubmitBtn.textContent = isLoginMode ? "Entrar" : "Registrarse";
  authToggle.textContent = isLoginMode ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Inicia sesión";
});

// Manejar Autenticación (Login / Registro)
authSubmitBtn.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) return alert("Por favor llena todos los campos");

  try {
    if (isLoginMode) {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      
      const isAdmin = (email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

      // Crear el documento del usuario en Firestore guardando su rol
      await setDoc(doc(db, "users", userCred.user.uid), {
        email: email,
        role: isAdmin ? "admin" : "user",
        profiles: [{ name: "Principal", avatar: "https://i.imgur.com/cCqp6Qt.png", isKids: false }]
      });
    }
  } catch (err) {
    alert("Error de autenticación: " + err.message);
  }
});

// Listener de sesión activa
onAuthStateChanged(auth, async (user) => {
  if (user) {
    localStorage.setItem('lumera_session', user.uid);
    authFormSection.style.display = 'none';
    profilesSection.style.display = 'block';
    await loadProfiles(user);
  } else {
    localStorage.removeItem('lumera_session');
    authFormSection.style.display = 'block';
    profilesSection.style.display = 'none';
  }
});

// Cargar lista de perfiles y habilitar botón de lápiz Admin si el correo coincide
async function loadProfiles(user) {
  profilesGrid.innerHTML = '';
  const userDocRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userDocRef);

  let profiles = [{ name: "Principal", avatar: "https://i.imgur.com/cCqp6Qt.png", isKids: false }];
  if (userSnap.exists() && userSnap.data().profiles) {
    profiles = userSnap.data().profiles;
  }

  // Renderizar Tarjetas de Perfil normales para todos los usuarios
  profiles.forEach((prof) => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.innerHTML = `
      <img src="${prof.avatar}" class="profile-avatar">
      <div class="profile-name">${prof.name}</div>
    `;
    card.onclick = () => selectProfile(prof);
    profilesGrid.appendChild(card);
  });

  // FILTRO DE SEGURIDAD: Solo se renderiza el botón de lápiz si el usuario es el correo admin
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    const adminBtn = document.createElement('div');
    adminBtn.className = 'profile-card';
    adminBtn.innerHTML = `
      <div class="profile-avatar" style="background:#1a1a1a; display:flex; align-items:center; justify-content:center; border: 2px dashed var(--accent-color);">
        <svg class="icon-svg" viewBox="0 0 24 24" style="width:36px; height:36px; fill:var(--accent-color);">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </div>
      <div class="profile-name" style="color:var(--accent-color); font-weight:bold;">Panel Admin ✏️</div>
    `;
    adminBtn.onclick = () => window.location.href = 'admin.html';
    profilesGrid.appendChild(adminBtn);
  }
}

function selectProfile(profile) {
  localStorage.setItem('lumera_active_profile', JSON.stringify(profile));
  window.location.href = 'home.html';
}
