import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const ADMIN_EMAIL = 'jgonzalezgutierrez1@bcedu.mx';
const DEFAULT_AVATAR = 'https://i.imgur.com/cCqp6Qt.png';
let currentUser = null;
let selectedAvatarUrl = DEFAULT_AVATAR;
let editingProfileIndex = -1;
let editingProfilesList = [];
let editingAvatarUrl = DEFAULT_AVATAR;
let pendingDeleteIndex = -1;
let pendingDeleteProfilesList = [];
let isRegisterMode = false;
let isSubmitting = false;
let isEditingProfiles = false;
let profileLoadPromise = null;

const $ = (id) => document.getElementById(id);
const authForm = $('authForm');
const authFormSection = $('authFormSection');
const authEmail = $('authEmail');
const authPassword = $('authPassword');
const authTitle = $('authTitle');
const authToggle = $('authToggle');
const authSubmitBtn = $('authSubmitBtn');
const authMessage = $('authMessage');
const profilesSection = $('profilesSection');
const profilesGrid = $('profilesGrid');
const headerAdminBtn = $('headerAdminBtn');

function syncAuthSettingsUI() {
  const currentLang = localStorage.getItem('lumera_lang') || 'es';
  const currentColor = (localStorage.getItem('lumera_accent_color') || '#d4af37').toLowerCase();
  document.documentElement.style.setProperty('--accent-color', currentColor);
  document.documentElement.style.setProperty('--accent-glow', `${currentColor}55`);

  document.querySelectorAll('#authLangGrid .lang-chip').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  document.querySelectorAll('#authColorSwatches .color-swatch').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.color.toLowerCase() === currentColor);
  });
}

function showInlineError(elId, msg = '') {
  const el = $(elId);
  if (!el) return;
  el.textContent = msg;
  el.hidden = !msg;
  el.style.display = msg ? 'block' : 'none';
}

function showAuthMessage(message = '') {
  authMessage.textContent = message;
  authMessage.hidden = !message;
  authMessage.style.display = message ? 'block' : 'none';
}

function showSignedInView(user) {
  currentUser = user;
  localStorage.setItem('lumera_session', user.uid);
  authFormSection.style.display = 'none';
  document.querySelector('.feature-panel')?.setAttribute('hidden', '');
  document.querySelector('.auth-content')?.classList.add('profiles-only');
  profilesSection.style.display = 'block';
  profilesSection.hidden = false;

  setTimeout(() => {
    profilesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);

  const isAdmin = Boolean(user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  if (headerAdminBtn) headerAdminBtn.style.display = isAdmin ? 'flex' : 'none';
  setupHeaderTools(isAdmin);
}

function setAuthMode(registering) {
  isRegisterMode = registering;
  authTitle.textContent = registering ? 'Crear cuenta' : 'Iniciar sesión';
  authSubmitBtn.textContent = registering ? 'Crear cuenta' : 'Entrar';
  authToggle.textContent = registering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
  authToggle.className = 'auth-toggle-btn';
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
    'auth/network-request-failed': 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.'
  };
  return messages[error.code] || `No se pudo completar la operación (${error.code || 'error'}).`;
}

function setupHeaderTools(isAdmin = Boolean(currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
  const header = document.querySelector('.auth-header');
  if (!header || header.dataset.toolsReady) return;
  header.dataset.toolsReady = 'true';
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null;
    profileLoadPromise = null;
    localStorage.removeItem('lumera_session');
    authFormSection.style.display = 'block';
    profilesSection.style.display = 'none';
    profilesSection.hidden = true;
    if (headerAdminBtn) headerAdminBtn.style.display = 'none';
    document.querySelector('.feature-panel')?.removeAttribute('hidden');
    document.querySelector('.auth-content')?.classList.remove('profiles-only');
    return;
  }
  showSignedInView(user);
  try { await loadUserProfiles(); } catch (error) { console.error('Error al cargar perfiles:', error); }
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
    showSignedInView(credential.user);
    await loadUserProfiles();
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

async function loadUserProfiles() {
  if (!currentUser) return;
  if (profileLoadPromise) return profileLoadPromise;
  const userAtStart = currentUser;
  profileLoadPromise = (async () => {
    const userRef = doc(db, 'users', userAtStart.uid);
    const userSnap = await getDoc(userRef);
    let profiles = userSnap.exists() && Array.isArray(userSnap.data().profiles) ? userSnap.data().profiles : null;
    if (!profiles) {
      profiles = [{ name: 'Principal', avatar: DEFAULT_AVATAR, isKids: false }];
      await setDoc(userRef, { email: userAtStart.email, profiles }, { merge: true });
    }
    if (currentUser?.uid === userAtStart.uid) renderProfiles(profiles);
  })();
  try { await profileLoadPromise; } finally { profileLoadPromise = null; }
}

function renderProfiles(profiles) {
  profilesGrid.replaceChildren();
  profiles.forEach((profile, index) => {
    const card = document.createElement('div');
    card.className = `profile-card${profile.isKids ? ' kids-profile-card' : ''}`;
    
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
      
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn-profile-action';
      edit.textContent = 'Editar';
      edit.addEventListener('click', (event) => { event.stopPropagation(); openEditProfileModal(index, profiles); });
      
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn-profile-action delete-btn';
      remove.textContent = 'Eliminar';
      remove.addEventListener('click', (event) => { event.stopPropagation(); openDeleteProfileModal(index, profiles); });
      
      actions.append(edit, remove);
      card.appendChild(actions);
    } else {
      card.addEventListener('click', () => {
        localStorage.setItem('lumera_active_profile', JSON.stringify(profile));
        if (profile.isKids) {
          localStorage.setItem('lumera_active_filter', 'kids');
        } else {
          localStorage.setItem('lumera_active_filter', 'all');
        }
        location.href = 'home.html';
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

window.toggleEditProfiles = async () => { isEditingProfiles = !isEditingProfiles; await loadUserProfiles(); };

async function populateAvatarGrid(containerEl, currentUrl, onSelect) {
  containerEl.textContent = 'Cargando avatares…';
  try {
    const snapshot = await getDocs(collection(db, 'avatars'));
    containerEl.replaceChildren();

    const defaultImg = document.createElement('img');
    defaultImg.src = DEFAULT_AVATAR;
    defaultImg.alt = 'Avatar Lumera';
    defaultImg.className = `avatar-option${currentUrl === DEFAULT_AVATAR ? ' selected' : ''}`;
    defaultImg.addEventListener('click', () => {
      containerEl.querySelectorAll('.avatar-option').forEach((item) => item.classList.remove('selected'));
      defaultImg.classList.add('selected');
      onSelect(DEFAULT_AVATAR);
    });
    containerEl.appendChild(defaultImg);

    snapshot.forEach((entry) => {
      const data = entry.data();
      if (!data.url || data.url === DEFAULT_AVATAR) return;
      const img = document.createElement('img');
      img.src = data.url;
      img.alt = 'Avatar disponible';
      img.className = `avatar-option${currentUrl === data.url ? ' selected' : ''}`;
      img.addEventListener('click', () => {
        containerEl.querySelectorAll('.avatar-option').forEach((item) => item.classList.remove('selected'));
        img.classList.add('selected');
        onSelect(data.url);
      });
      containerEl.appendChild(img);
    });
  } catch (error) {
    containerEl.textContent = 'Usando avatar predeterminado.';
  }
}

/* MODAL EDITAR PERFIL (NOMBRE + FOTO/AVATAR + KIDS) */
async function openEditProfileModal(index, profiles) {
  editingProfileIndex = index;
  editingProfilesList = [...profiles];
  const target = profiles[index];
  if (!target) return;

  editingAvatarUrl = target.avatar || DEFAULT_AVATAR;
  $('editProfName').value = target.name || '';
  $('editProfKids').checked = Boolean(target.isKids);
  showInlineError('editProfError', '');
  $('editProfileModal').style.display = 'flex';

  await populateAvatarGrid($('editAvatarPickerContainer'), editingAvatarUrl, (url) => {
    editingAvatarUrl = url;
  });
}

window.closeEditProfileModal = () => {
  $('editProfileModal').style.display = 'none';
  editingProfileIndex = -1;
};

window.saveEditedProfile = async () => {
  if (editingProfileIndex < 0) return;
  const name = $('editProfName').value.trim();
  const isKids = $('editProfKids').checked;
  if (!name) {
    showInlineError('editProfError', 'El nombre del perfil no puede estar vacío.');
    return;
  }

  editingProfilesList[editingProfileIndex] = {
    ...editingProfilesList[editingProfileIndex],
    name,
    isKids,
    avatar: editingAvatarUrl || DEFAULT_AVATAR
  };

  const ok = await persistProfiles(editingProfilesList, 'editProfError');
  if (ok) closeEditProfileModal();
};

/* MODAL ELIMINAR PERFIL (SIN CONFIRM/ALERT NATIVO) */
function openDeleteProfileModal(index, profiles) {
  const confirmBtn = $('confirmDeleteProfileBtn');
  if (profiles.length <= 1) {
    $('deleteModalTag').textContent = 'AVISO';
    $('deleteModalTitle').textContent = 'No se puede eliminar';
    $('deleteModalMessage').textContent = 'Debe quedar al menos un perfil activo en tu cuenta.';
    if (confirmBtn) confirmBtn.style.display = 'none';
    $('deleteProfileModal').style.display = 'flex';
    return;
  }

  pendingDeleteIndex = index;
  pendingDeleteProfilesList = [...profiles];
  $('deleteModalTag').textContent = 'CONFIRMAR ACCIÓN';
  $('deleteModalTitle').textContent = 'Eliminar perfil';
  $('deleteModalMessage').textContent = `¿Estás seguro de eliminar el perfil “${profiles[index].name}”? Esta acción no se puede deshacer.`;
  if (confirmBtn) {
    confirmBtn.style.display = 'inline-flex';
    confirmBtn.onclick = async () => {
      if (pendingDeleteIndex < 0) return;
      pendingDeleteProfilesList.splice(pendingDeleteIndex, 1);
      const ok = await persistProfiles(pendingDeleteProfilesList);
      if (ok) closeDeleteProfileModal();
    };
  }
  $('deleteProfileModal').style.display = 'flex';
}

window.closeDeleteProfileModal = () => {
  $('deleteProfileModal').style.display = 'none';
  pendingDeleteIndex = -1;
};

async function persistProfiles(profiles, errorElId = '') {
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), { profiles });
    renderProfiles(profiles);
    return true;
  } catch (error) {
    console.error(error);
    if (errorElId) showInlineError(errorElId, 'No se pudo guardar el cambio. Revisa tu conexión.');
    return false;
  }
}

window.openAddProfileModal = async () => {
  showInlineError('newProfError', '');
  $('addProfileModal').style.display = 'flex';
  selectedAvatarUrl = DEFAULT_AVATAR;
  await populateAvatarGrid($('avatarPickerContainer'), selectedAvatarUrl, (url) => {
    selectedAvatarUrl = url;
  });
};

window.closeProfileModal = () => { $('addProfileModal').style.display = 'none'; };

window.saveNewProfile = async () => {
  const name = $('newProfName').value.trim();
  const isKids = $('newProfKids').checked;
  if (!name) {
    showInlineError('newProfError', 'Por favor asigna un nombre al perfil.');
    return;
  }
  if (!currentUser) {
    showInlineError('newProfError', 'Inicia sesión para crear un perfil.');
    return;
  }

  try {
    const ref = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    const profiles = snap.exists() ? (snap.data().profiles || []) : [];
    profiles.push({ name, isKids, avatar: selectedAvatarUrl });
    await setDoc(ref, { email: currentUser.email, profiles }, { merge: true });
    $('newProfName').value = '';
    $('newProfKids').checked = false;
    closeProfileModal();
    renderProfiles(profiles);
  } catch (error) {
    console.error(error);
    showInlineError('newProfError', 'No se pudo guardar el perfil.');
  }
};

window.logoutUser = () => signOut(auth);
window.openSettings = () => {
  syncAuthSettingsUI();
  $('settingsModal').style.display = 'flex';
};
window.closeSettingsModal = () => { $('settingsModal').style.display = 'none'; };
window.updateSecondaryColor = (hex) => {
  localStorage.setItem('lumera_accent_color', hex);
  syncAuthSettingsUI();
};
window.changeLanguage = (lang) => {
  localStorage.setItem('lumera_lang', lang);
  syncAuthSettingsUI();
};

syncAuthSettingsUI();
setAuthMode(false);
