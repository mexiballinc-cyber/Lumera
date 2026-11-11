import { db, auth } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { applyTranslations, getLanguage, setLanguage, t } from './i18n.js';

const ADMIN_EMAIL = 'jgonzalezgutierrez1@bcedu.mx';
const lang = () => getLanguage();
const $ = (id) => document.getElementById(id);
const profile = JSON.parse(localStorage.getItem('lumera_active_profile') || 'null');

let mediaItems = [], heroItems = [], activeFilter = localStorage.getItem('lumera_active_filter') || 'all', heroIndex = 0, heroTimer;

function setTheme(color) {
  const safe = /^#[\da-f]{6}$/i.test(color) ? color : '#d4af37';
  document.documentElement.style.setProperty('--accent-color', safe);
  document.documentElement.style.setProperty('--accent-glow', `${safe}55`);
  if ($('accentPicker')) $('accentPicker').value = safe;
}

setTheme(localStorage.getItem('lumera_accent_color') || '#d4af37');
if ($('languageSelect')) $('languageSelect').value = lang();
applyTranslations();

if ($('accountLabel')) $('accountLabel').textContent = profile?.name || t('signIn');
if (profile?.avatar && $('accountLink')) $('accountLink').querySelector('.account-avatar').innerHTML = `<img src="${String(profile.avatar).replace(/[&<>"']/g,'')}" alt="">`;

onAuthStateChanged(auth, (user) => {
  if ($('adminOpen')) $('adminOpen').hidden = user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase();
  if (user && !profile && $('accountLabel')) $('accountLabel').textContent = user.displayName || user.email || t('signIn');
});

function escapeAttr(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function localized(item, key) { const selected = lang(); return item.i18n?.[selected]?.[key] || item.i18n?.es?.[key] || item[key] || ''; }
function posterOf(item) { return item.images?.poster || item.poster || ''; }
function synopsisOf(item) { return localized(item, 'synopsis'); }
function titleOf(item) { return localized(item, 'title') || item.title || t('discoverLumera'); }
function inKids(item) { return Number(item.ageRating ?? item.age ?? 99) <= 10; }
function prettyType(item) { return item.type === 'series' ? t('series') : t('movie'); }

function filteredItems() {
  return mediaItems.filter((item) => {
    if (profile?.isKids && !inKids(item)) return false;
    if (activeFilter === 'kids') return inKids(item);
    if (activeFilter === 'movie' || activeFilter === 'series') return item.type === activeFilter;
    return true;
  });
}

function makeCard(item, compact = false) {
  const card = document.createElement('a');
  const isKidsContent = inKids(item);
  card.className = `media-card${compact ? ' compact-card' : ''}${profile?.isKids ? ' kids-border-active' : ''}`;
  card.href = item.targetUrl || `details.html?id=${encodeURIComponent(item.id)}`;
  
  const poster = posterOf(item);
  const title = titleOf(item);
  const kidsBadgeHtml = isKidsContent 
    ? `<img src="https://i.imgur.com/e0MQHrD.png" class="kids-corner-badge" alt="Kids Badge">` 
    : '';

  card.innerHTML = `
    <div class="poster-frame">
      ${kidsBadgeHtml}
      ${poster ? `<img loading="lazy" src="${escapeAttr(poster)}" alt="${escapeAttr(title)}">` : '<div class="poster-fallback"><span>LUMERA</span></div>'}
      <span class="poster-type">${escapeAttr(prettyType(item))}</span>
    </div>
    <div class="media-card-copy">
      <h3>${escapeAttr(title)}</h3>
      <span>${escapeAttr(String(item.year || ''))}</span>
    </div>
  `;
  return card;
}

function renderRow(id, items, compact = false) {
  const node = $(id);
  if (!node) return;
  node.replaceChildren();
  items.forEach((item) => node.appendChild(makeCard(item, compact)));
}

function renderCatalog() {
  const items = filteredItems();
  if ($('sectionTitle')) $('sectionTitle').textContent = activeFilter === 'movie' ? t('movie') : activeFilter === 'series' ? t('series') : activeFilter === 'kids' ? t('kids') : t('explore');
  if ($('catalogCount')) $('catalogCount').textContent = `${items.length} ${t('results')}`;
  renderRow('mainCatalogRow', items);
  
  if ($('emptyState')) $('emptyState').hidden = items.length > 0;
  if ($('emptyTitle')) $('emptyTitle').textContent = t('catalogEmpty');
  if ($('emptyMessage')) $('emptyMessage').textContent = mediaItems.length ? t('tryOtherFilters') : t('catalogConnectedEmpty');
  if ($('catalogStatus')) $('catalogStatus').hidden = true;
  if ($('mainCatalogRow')) $('mainCatalogRow').hidden = items.length === 0;
  if ($('catalogKicker')) $('catalogKicker').textContent = activeFilter === 'kids' ? t('kids') : t('catalogKicker');
  
  document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('active', button.dataset.filter === activeFilter));
  if (activeFilter === 'all') renderContinueAndNew();
  else {
    if ($('continueSection')) $('continueSection').hidden = true;
    if ($('newSection')) $('newSection').hidden = true;
  }
}

function renderContinueAndNew() {
  let history = [];
  try { 
    history = JSON.parse(localStorage.getItem('lumera_continue_watching') || localStorage.getItem('lumera_watch_history') || '[]'); 
  } catch {
    history = [];
  }
  
  const historyMap = new Map();
  history.forEach(entry => {
    if (typeof entry === 'string') {
      historyMap.set(entry, { id: entry });
    } else if (entry && entry.id) {
      historyMap.set(entry.id, entry);
    }
  });

  const continuing = mediaItems
    .filter(item => historyMap.has(item.id) && (!profile?.isKids || inKids(item)))
    .map(item => {
      const saved = historyMap.get(item.id);
      return {
        ...item,
        targetUrl: saved?.episodeId 
          ? `details.html?id=${encodeURIComponent(item.id)}&episode=${encodeURIComponent(saved.episodeId)}`
          : `details.html?id=${encodeURIComponent(item.id)}`
      };
    });
  
  if ($('continueSection')) $('continueSection').hidden = !continuing.length;
  if ($('continueCount')) $('continueCount').textContent = continuing.length ? String(continuing.length) : '';
  if (continuing.length) renderRow('continueRow', continuing, true);

  const newest = [...mediaItems].filter((item) => !profile?.isKids || inKids(item)).sort((a, b) => Number(b.createdAt?.seconds || b.year || 0) - Number(a.createdAt?.seconds || a.year || 0)).slice(0, 12);
  if ($('newSection')) $('newSection').hidden = !newest.length;
  if (newest.length) renderRow('newRow', newest, true);
}

function showHero(item, index = 0) {
  if (!item) return;
  heroIndex = index;
  const banner = item.images?.banner || item.banner || item.url || posterOf(item);
  if ($('heroImage')) $('heroImage').style.backgroundImage = banner ? `url("${String(banner).replace(/["\\]/g, '')}")` : 'none';
  
  if ($('heroTitle')) $('heroTitle').textContent = titleOf(item) || t('discoverLumera');
  if ($('heroDescription')) $('heroDescription').textContent = synopsisOf(item) || t('discoverSub');
  if ($('heroMeta')) $('heroMeta').textContent = [item.year, item.ageRating != null ? `${item.ageRating}+` : '', item.type ? prettyType(item) : ''].filter(Boolean).join(' · ');
  
  if ($('heroPlayBtn')) {
    $('heroPlayBtn').onclick = () => {
      if (item.contentId) {
        location.href = `details.html?id=${encodeURIComponent(item.contentId)}`;
      } else if (item.customLink) {
        location.href = item.customLink;
      } else if (item.id) {
        location.href = `details.html?id=${encodeURIComponent(item.id)}`;
      }
    };
  }
  
  if ($('heroPagination')) {
    $('heroPagination').replaceChildren();
    const count = Math.min(heroItems.length || 1, 5);
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = `hero-dot${i === index % count ? ' active' : ''}`;
      dot.setAttribute('aria-label', `Featured ${i + 1}`);
      dot.onclick = () => showHero(heroItems[i], i);
      $('heroPagination').appendChild(dot);
    }
  }
}

function populateFilters() {
  const categories = [...new Set(mediaItems.flatMap((item) => Array.isArray(item.categories) ? item.categories : item.category ? [item.category] : []))].sort((a, b) => String(a).localeCompare(String(b)));
  const years = [...new Set(mediaItems.map((item) => item.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
  if ($('categoryFilter')) categories.forEach((value) => $('categoryFilter').add(new Option(value, value)));
  if ($('yearFilter')) years.forEach((value) => $('yearFilter').add(new Option(value, value)));
}

function updateSearch() {
  const q = $('searchQuery')?.value.trim().toLocaleLowerCase() || ''; 
  const category = $('categoryFilter')?.value || ''; 
  const year = $('yearFilter')?.value || ''; 
  const maxAge = Number($('ageFilter')?.value || 999);
  
  const matches = mediaItems.filter(item => (!profile?.isKids || inKids(item)) && (!q || String(titleOf(item)).toLocaleLowerCase().includes(q)) && (!category || (item.categories || [item.category]).filter(Boolean).includes(category)) && (!year || String(item.year) === year) && Number(item.ageRating ?? 0) <= maxAge);
  if ($('searchResultCount')) $('searchResultCount').textContent = String(matches.length); 
  
  const results = $('searchResults'); 
  if (!results) return;
  results.replaceChildren();
  matches.slice(0,30).forEach(item => results.appendChild(makeCard(item, true)));
  if (!matches.length) results.innerHTML = `<p class="search-empty">${t('noSearchResults')}</p>`;
}

async function loadCatalog() {
  if ($('catalogStatus')) $('catalogStatus').hidden = false;
  try {
    const [contentSnap, heroSnap] = await Promise.all([getDocs(collection(db, 'content')), getDocs(collection(db, 'hero_slides'))]);
    mediaItems = contentSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    
    // Mapear heros con la información de redirección si existe
    heroItems = heroSnap.docs.map((entry) => {
      const data = entry.data();
      const matchedContent = data.contentId ? mediaItems.find(m => m.id === data.contentId) : null;
      return {
        id: entry.id,
        ...data,
        ...(matchedContent || {})
      };
    }).filter((item) => item.url || item.banner);

    populateFilters();

    const visible = mediaItems.filter((item) => !profile?.isKids || inKids(item));
    if (!heroItems.length) heroItems = visible.filter((item) => item.images?.banner || posterOf(item));
    
    showHero(heroItems[Math.floor(Math.random() * heroItems.length)] || visible[0]);
    renderCatalog();
    updateSearch();
    
    if (!mediaItems.length && $('catalogStatus')) {
      $('catalogStatus').textContent = t('catalogConnectedEmpty');
      $('catalogStatus').hidden = false;
    }
    if (heroItems.length > 1) {
      clearInterval(heroTimer);
      heroTimer = setInterval(() => showHero(heroItems[(heroIndex + 1) % heroItems.length], (heroIndex + 1) % heroItems.length), 10000);
    }
  } catch (error) {
    console.error('Lumera catalog load failed:', error);
  }
}

document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  localStorage.setItem('lumera_active_filter', activeFilter);
  renderCatalog();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

const searchDialog = $('searchDialog'), settingsDialog = $('settingsDialog');
function openSearch() { if(searchDialog){ searchDialog.showModal(); updateSearch(); setTimeout(() => $('searchQuery')?.focus(), 50); } }
function openSettings() { if(settingsDialog) settingsDialog.showModal(); }

if ($('searchOpen')) $('searchOpen').onclick = openSearch;
if ($('mobileSearchOpen')) $('mobileSearchOpen').onclick = openSearch;
if ($('settingsOpen')) $('settingsOpen').onclick = openSettings;
if ($('mobileSettingsOpen')) $('mobileSettingsOpen').onclick = openSettings;
if ($('adminOpen')) $('adminOpen').onclick = () => location.href = 'admin.html';

['searchQuery','categoryFilter','yearFilter','ageFilter'].forEach(id => {
  if ($(id)) $(id).addEventListener('input', updateSearch);
});

if ($('languageSelect')) {
  $('languageSelect').addEventListener('change', event => {
    setLanguage(event.target.value);
    location.reload();
  });
}

if ($('accentPicker')) {
  $('accentPicker').addEventListener('input', event => {
    localStorage.setItem('lumera_accent_color', event.target.value);
    setTheme(event.target.value);
  });
}

[searchDialog, settingsDialog].forEach(dialog => {
  if (dialog) dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
});

loadCatalog();
