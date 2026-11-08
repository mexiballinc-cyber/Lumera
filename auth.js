import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const ADMIN_EMAIL = 'jgonzalezgutierrez1@bcedu.mx';
const DEFAULT_AVATAR = 'https://i.imgur.com/cCqp6Qt.png';
let currentUser = null;
let selectedAvatarUrl = DEFAULT_AVATAR;
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

  // Auto-scroll a la selección de perfiles en PC
  setTimeout(() => {
    profilesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 150);

  const isAdmin = Boolean(user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  headerAdminBtn.style.display = isAdmin ? 'flex' : 'none';
  setupHeaderTools(isAdmin);
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
  return messages[error.code] || `No se pudo completar la operación (${error.code || 'error'}).`;
}

function setupHeaderTools(isAdmin = Boolean(currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())) {
  const header = document.querySelector('.auth-header');
  if (!header || header.dataset.toolsReady) return;
  header.dataset.toolsReady = 'true';
  const leftZone = header.querySelector('.left-zone');
  const menuButton = leftZone?.querySelector('button');
  if (menuButton) {
    menuButton.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('nav');
    menu.id = 'authQuickMenu';
    Object.assign(menu.style, { position:'absolute', top:'calc(100% + 10px)', left:'0', zIndex:'50', minWidth:'210px', padding:'10px', display:'none', flexDirection:'column', gap:'6px', border:'1px solid rgba(255,255,255,.14)', borderRadius:'14px', background:'rgba(18,18,18,.96)', boxShadow:'0 18px 48px rgba(0,0,0,.4)' });
    const addMenuLink = (label, href) => {
      const link = document.createElement('a'); link.href = href; link.textContent = label;
      Object.assign(link.style, { display:'block', padding:'11px 12px', borderRadius:'9px', color:'#f5f2ea', textDecoration:'none' });
      menu.appendChild(link);
    };
    addMenuLink('Inicio', 'home.html');
    if (isAdmin) addMenuLink('Panel de administración', 'admin.html');
    const logout = document.createElement('button'); logout.type = 'button'; logout.textContent = 'Cerrar sesión';
    Object.assign(logout.style, { textAlign:'left', padding:'11px 12px', color:'#f5f2ea', background:'transparent', border:0, cursor:'pointer', font:'inherit' });
    logout.addEventListener('click', () => signOut(auth)); menu.appendChild(logout);
    leftZone.style.position = 'relative'; leftZone.appendChild(menu);
    menuButton.addEventListener('click', () => {
      const open = menu.style.display !== 'flex'; menu.style.display = open ? 'flex' : 'none'; menuButton.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (event) => { if (!leftZone.contains(event.target)) { menu.style.display = 'none'; menuButton.setAttribute('aria-expanded', 'false'); } });
  }
  const searchButton = header.querySelector('.right-zone button[title="Buscar"]');
  if (!searchButton) return;
  let dialog = $('authSearchDialog');
  if (!dialog) {
    dialog = document.createElement('dialog'); dialog.id = 'authSearchDialog';
    Object.assign(dialog.style, { width:'min(560px, calc(100vw - 28px))', padding:'22px', border:'1px solid rgba(255,255,255,.15)', borderRadius:'18px', background:'#151515', color:'#fff', boxShadow:'0 24px 80px rgba(0,0,0,.65)' });
    dialog.innerHTML = '<form method="dialog"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h2 style="margin:0 0 16px">Buscar contenido</h2><button aria-label="Cerrar" value="close">✕</button></div><input id="authSearchQuery" type="search" placeholder="Escribe un título…" style="width:100%;padding:12px;border-radius:10px;border:1px solid #444;background:#0b0b0b;color:#fff"><div id="authSearchResults" style="display:grid;gap:8px;margin-top:12px"></div></form>';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
    $('authSearchQuery').addEventListener('input', renderAuthSearchResults);
  }
  searchButton.addEventListener('click', () => { dialog.showModal(); $('authSearchQuery').focus(); renderAuthSearchResults(); });
}

async function renderAuthSearchResults() {
  const results = $('authSearchResults');
  if (!results) return;
  results.replaceChildren();
  const query = $('authSearchQuery').value.trim().toLocaleLowerCase();
  try {
    const snapshot = await getDocs(collection(db, 'content'));
    const matches = snapshot.docs.map((entry) => ({ id:entry.id, ...entry.data() })).filter((item) => {
      const lang = localStorage.getItem('lumera_lang') || 'es';
      const title = item.i18n?.[lang]?.title || item.title || '';
      return !query || title.toLocaleLowerCase().includes(query);
    }).slice(0, 12);
    if (!matches.length) { const empty = document.createElement('p'); empty.textContent = 'No encontramos contenido.'; results.appendChild(empty); return; }
    matches.forEach((item) => {
      const link = document.createElement('a'); link.href = `details.html?id=${encodeURIComponent(item.id)}`;
      link.textContent = item.i18n?.[localStorage.getItem('lumera_lang') || 'es']?.title || item.title || 'Sin título';
      Object.assign(link.style, { padding:'12px', borderRadius:'9px', background:'#222', color:'#fff', textDecoration:'none' }); results.appendChild(link);
    });
  } catch (error) {
    console.error('Search failed:', error);
    const message = document.createElement('p'); message.textContent = 'No se pudo cargar la búsqueda. Revisa la conexión.'; results.appendChild(message);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null; profileLoadPromise = null; localStorage.removeItem('lumera_session');
    authFormSection.style.display = 'block'; profilesSection.style.display = 'none'; profilesSection.hidden = true;
    headerAdminBtn.style.display = 'none';
    document.querySelector('.feature-panel')?.removeAttribute('hidden');
    document.querySelector('.auth-content')?.classList.remove('profiles-only');
    return;
  }
  showSignedInView(user);
  try { await loadUserProfiles(); } catch (error) { console.error('No se pudieron cargar los perfiles:', error); showProfileLoadError(); }
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting || !authForm.reportValidity()) return;
  const email = authEmail.value.trim(); const password = authPassword.value;
  isSubmitting = true; authSubmitBtn.disabled = true; authToggle.disabled = true;
  authSubmitBtn.textContent = isRegisterMode ? 'Creando cuenta…' : 'Entrando…'; showAuthMessage();
  try {
    const credential = isRegisterMode ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
    showSignedInView(credential.user);
    try { await loadUserProfiles(); } catch (error) { console.error(error); showProfileLoadError(); }
  } catch (error) { console.error('Error de autenticación:', error); showAuthMessage(getAuthErrorMessage(error)); }
  finally { isSubmitting = false; authSubmitBtn.disabled = false; authToggle.disabled = false; authSubmitBtn.textContent = isRegisterMode ? 'Crear cuenta' : 'Entrar'; }
});

authToggle.addEventListener('click', () => setAuthMode(!isRegisterMode));

function showProfileLoadError() {
  profilesGrid.replaceChildren();
  const message = document.createElement('p'); message.className = 'profile-load-error';
  message.textContent = 'Sesión iniciada, pero Firestore no permitió cargar perfiles. Revisa sus reglas y vuelve a cargar.'; profilesGrid.appendChild(message);
}

async function loadUserProfiles() {
  if (!currentUser) return;
  if (profileLoadPromise) return profileLoadPromise;
  const userAtStart = currentUser;
  profileLoadPromise = (async () => {
    const userRef = doc(db, 'users', userAtStart.uid); const userSnap = await getDoc(userRef);
    let profiles = userSnap.exists() && Array.isArray(userSnap.data().profiles) ? userSnap.data().profiles : null;
    if (!profiles) { profiles = [{ name:'Principal', avatar:DEFAULT_AVATAR, isKids:false }]; await setDoc(userRef, { email:userAtStart.email, profiles }, { merge:true }); }
    if (currentUser?.uid === userAtStart.uid) renderProfiles(profiles);
  })();
  try { await profileLoadPromise; } finally { profileLoadPromise = null; }
}

function renderProfiles(profiles) {
  profilesGrid.replaceChildren();
  profiles.forEach((profile, index) => {
    const card = document.createElement('div'); card.className = 'profile-card';
    const avatar = document.createElement('img'); avatar.src = profile.avatar || DEFAULT_AVATAR; avatar.className = 'profile-avatar'; avatar.alt = `Avatar de ${profile.name}`;
    const name = document.createElement('div'); name.className = 'profile-name'; name.textContent = profile.name; card.append(avatar, name);
    if (isEditingProfiles) {
      const actions = document.createElement('div'); actions.className = 'profile-actions';
      const edit = document.createElement('button'); edit.type='button'; edit.textContent='Editar'; edit.addEventListener('click', (event) => { event.stopPropagation(); editProfile(index, profiles); });
      const remove = document.createElement('button'); remove.type='button'; remove.textContent='Eliminar'; remove.addEventListener('click', (event) => { event.stopPropagation(); deleteProfile(index, profiles); });
      actions.append(edit, remove); card.appendChild(actions);
    } else card.addEventListener('click', () => { localStorage.setItem('lumera_active_profile', JSON.stringify(profile)); location.href='home.html'; });
    profilesGrid.appendChild(card);
  });
  const addCard = document.createElement('div'); addCard.className='profile-card'; addCard.innerHTML='<div class="add-profile-circle">+</div><div class="profile-name">Añadir</div>'; addCard.addEventListener('click', () => window.openAddProfileModal()); profilesGrid.appendChild(addCard);
}

window.toggleEditProfiles = async () => { isEditingProfiles = !isEditingProfiles; await loadUserProfiles(); };

async function editProfile(index, profiles) {
  const name = prompt('Nuevo nombre para el perfil:', profiles[index]?.name || ''); if (name === null) return;
  if (!name.trim()) return alert('El nombre del perfil no puede estar vacío.');
  profiles[index] = { ...profiles[index], name:name.trim() }; await persistProfiles(profiles);
}

async function deleteProfile(index, profiles) {
  if (profiles.length <= 1) return alert('Debe quedar al menos un perfil.');
  if (!confirm(`¿Eliminar el perfil “${profiles[index].name}”?`)) return;
  profiles.splice(index, 1); await persistProfiles(profiles);
}

async function persistProfiles(profiles) {
  try { await updateDoc(doc(db, 'users', currentUser.uid), { profiles }); renderProfiles(profiles); }
  catch (error) { console.error(error); alert('No se pudo guardar el cambio. Revisa los permisos de Firestore.'); }
}

window.openAddProfileModal = async () => {
  $('addProfileModal').style.display='flex'; const container=$('avatarPickerContainer'); container.textContent='Cargando avatares…'; selectedAvatarUrl=DEFAULT_AVATAR;
  try {
    const snapshot=await getDocs(collection(db,'avatars')); container.replaceChildren();
    snapshot.forEach((entry) => { const data=entry.data(); if(!data.url)return; const img=document.createElement('img'); img.src=data.url; img.alt='Avatar disponible'; img.className='avatar-option'; img.addEventListener('click',()=>{ container.querySelectorAll('.avatar-option').forEach((item)=>item.classList.remove('selected')); img.classList.add('selected'); selectedAvatarUrl=data.url; }); container.appendChild(img); });
  } catch(error) { console.error(error); container.textContent='No se pudieron cargar los avatares; se usará el avatar predeterminado.'; }
};

window.closeProfileModal=()=>{ $('addProfileModal').style.display='none'; };

window.saveNewProfile=async()=>{
  const name=$('newProfName').value.trim(); const isKids=$('newProfKids').checked;
  if(!name)return alert('Por favor asigna un nombre al perfil.'); if(!currentUser)return alert('Inicia sesión para crear un perfil.');
  try { const ref=doc(db,'users',currentUser.uid); const snap=await getDoc(ref); const profiles=snap.exists()?(snap.data().profiles||[]):[]; profiles.push({name,isKids,avatar:selectedAvatarUrl}); await setDoc(ref,{email:currentUser.email,profiles},{merge:true}); $('newProfName').value=''; $('newProfKids').checked=false; closeProfileModal(); renderProfiles(profiles); }
  catch(error) { console.error(error); alert('No se pudo guardar el perfil. Revisa los permisos de Firestore.'); }
};

window.logoutUser=()=>signOut(auth);
window.openSettings=()=>$('settingsModal').style.display='flex';
window.closeSettingsModal=()=>$('settingsModal').style.display='none';
window.updateSecondaryColor=(hex)=>{document.documentElement.style.setProperty('--accent-color',hex);localStorage.setItem('lumera_accent_color',hex);};
window.changeLanguage=(lang)=>{localStorage.setItem('lumera_lang',lang);};
setupHeaderTools();
