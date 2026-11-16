import { db, auth } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { applyTranslations, getLanguage, setLanguage, t } from './i18n.js';

const ADMIN_EMAIL = 'jgonzalezgutierrez1@bcedu.mx';
const INTERESTS_KEY = 'lumera_user_interests';
const lang = () => getLanguage();
const $ = (id) => document.getElementById(id);
const profile = JSON.parse(localStorage.getItem('lumera_active_profile') || 'null');

let mediaItems = [];
let loadedCategories = [];
let heroItems = [];
let activeFilter = localStorage.getItem('lumera_active_filter') || 'all';
let heroIndex = 0;
let heroTimer;
let searchRecordTimer;

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
function shortSynopsisOf(item) { return localized(item, 'shortSynopsis') || synopsisOf(item); }
function titleOf(item) { return localized(item, 'title') || item.title || t('discoverLumera'); }
function inKids(item) { return Number(item.ageRating ?? item.age ?? 99) <= 10; }
function prettyType(item) { return item.type === 'series' ? t('series') : t('movie'); }
function itemCategories(item) {
  return (Array.isArray(item.categories) ? item.categories : item.category ? [item.category] : []).filter(Boolean);
}

/* ALGORITMO PRIVADO DE INTERESES EN LOCALSTORAGE */
function getUserInterests() {
  try {
    const parsed = JSON.parse(localStorage.getItem(INTERESTS_KEY) || '{}');
    return {
      categories: parsed.categories && typeof parsed.categories === 'object' ? parsed.categories : {},
      terms: parsed.terms && typeof parsed.terms === 'object' ? parsed.terms : {}
    };
  } catch {
    return { categories: {}, terms: {} };
  }
}

export function recordUserInterest(categories = [], searchTerm = '') {
  try {
    const data = getUserInterests();

    (Array.isArray(categories) ? categories : [categories]).forEach((cat) => {
      const cleanCat = String(cat || '').trim();
      if (!cleanCat) return;
      data.categories[cleanCat] = (data.categories[cleanCat] || 0) + 1;
    });

    const cleanTerm = String(searchTerm || '').trim().toLowerCase();
    if (cleanTerm.length >= 2) {
      data.terms[cleanTerm] = (data.terms[cleanTerm] || 0) + 1;
      const entries = Object.entries(data.terms).sort((a, b) => b[1] - a[1]).slice(0, 30);
      data.terms = Object.fromEntries(entries);
    }

    data.updatedAt = Date.now();
    localStorage.setItem(INTERESTS_KEY, JSON.stringify(data));
  } catch {}
}

function renderRecommendations() {
  const section = $('recommendedSection');
  const row = $('recommendedRow');
  const countEl = $('recommendedCount');
  if (!section || !row) return;

  const visible = mediaItems.filter((item) => !profile?.isKids || inKids(item));
  if (!visible.length) {
    section.hidden = true;
    return;
  }

  const interests = getUserInterests();
  const catWeights = interests.categories || {};
  const termWeights = interests.terms || {};

  const scored = visible.map((item) => {
    let score = 0;

    itemCategories(item).forEach((cat) => {
      if (catWeights[cat]) score += catWeights[cat] * 3;
    });

    const searchableText = `${titleOf(item)} ${synopsisOf(item)}`.toLowerCase();
    Object.entries(termWeights).forEach(([term, weight]) => {
      if (term && searchableText.includes(term)) {
        score += weight * 2;
      }
    });

    const ratingVal = Number(item.avgRating || 5.0);
    score += ratingVal * 0.25;

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const recommended = scored.slice(0, 12).map((entry) => entry.item);

  section.hidden = !recommended.length;
  if (countEl) countEl.textContent = recommended.length ? String(recommended.length) : '';
  if (recommended.length) renderRow(row, recommended, true);
}

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

  card.addEventListener('click', () => {
    recordUserInterest(itemCategories(item));
  });
  
  const poster = posterOf(item);
  const title = titleOf(item);
  const ratingText = item.avgRating || '5.0';
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
      <div class="media-card-meta">
        <span>${escapeAttr(String(item.year || ''))}</span>
        <span class="media-card-rating">⭐ ${escapeAttr(ratingText)}</span>
      </div>
    </div>
  `;
  return card;
}

function renderRow(containerId, items, compact = false) {
  const container = typeof containerId === 'string' ? $(containerId) : containerId;
  if (!container) return;
  container.replaceChildren();
  items.forEach((item) => container.appendChild(makeCard(item, compact)));
}

function renderCatalog() {
  const items = filteredItems();
  const dynamicContainer = $('dynamicCategoriesContainer');

  if ($('sectionTitle')) $('sectionTitle').textContent = activeFilter === 'movie' ? t('movie') : activeFilter === 'series' ? t('series') : activeFilter === 'kids' ? t('kids') : t('explore');
  if ($('catalogCount')) $('catalogCount').textContent = `${items.length} ${t('results')}`;
  if ($('catalogStatus')) $('catalogStatus').hidden = true;

  document.querySelectorAll('[data-filter]').forEach((button) => button.classList.toggle('active', button.dataset.filter === activeFilter));

  if (activeFilter === 'all') {
    renderContinueAndNew();
    renderRecommendations();
    if ($('mainSection')) $('mainSection').hidden = true;

    if (dynamicContainer) {
      dynamicContainer.replaceChildren();

      const categoriesMap = new Map();
      items.forEach(item => {
        const cats = itemCategories(item);
        cats.forEach(cat => {
          if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
          categoriesMap.get(cat).push(item);
        });
      });

      categoriesMap.forEach((catItems, catKey) => {
        if (!catItems.length) return;

        const currentLang = lang();
        
        // 1. Buscar coincidencia en la colección categories
        const matchedCat = loadedCategories.find(c => {
          if (c.id === catKey) return true;
          if (c.name && c.name.toLowerCase() === catKey.toLowerCase()) return true;
          if (!c.i18n) return false;
          return Object.values(c.i18n).some(loc => {
            const val = typeof loc === 'string' ? loc : loc?.name;
            return val?.toLowerCase() === catKey.toLowerCase();
          });
        });

        // 2. Extraer el nombre según la estructura guardada en Firestore
        let displayCatName = catKey;
        if (matchedCat && matchedCat.i18n) {
          const langEntry = matchedCat.i18n[currentLang];
          const esEntry = matchedCat.i18n.es;
          const enEntry = matchedCat.i18n.en;

          const getVal = (entry) => (typeof entry === 'object' ? entry?.name : entry);

          displayCatName = getVal(langEntry) || 
                           getVal(esEntry) || 
                           getVal(enEntry) || 
                           matchedCat.name || 
                           catKey;
        }

        const section = document.createElement('section');
        section.className = 'media-section';
        section.innerHTML = `
          <div class="section-heading">
            <div>
              <p class="section-kicker">${t('category') || 'CATEGORÍA'}</p>
              <h2>${escapeAttr(displayCatName)}</h2>
            </div>
            <span class="section-count">${catItems.length}</span>
          </div>
          <div class="media-row"></div>
        `;
        const row = section.querySelector('.media-row');
        renderRow(row, catItems, true);
        dynamicContainer.appendChild(section);
      });
    }
  } else {
    if ($('continueSection')) $('continueSection').hidden = true;
    if ($('recommendedSection')) $('recommendedSection').hidden = true;
    if ($('newSection')) $('newSection').hidden = true;
    if (dynamicContainer) dynamicContainer.replaceChildren();
    if ($('mainSection')) $('mainSection').hidden = false;

    renderRow('mainCatalogRow', items);
    if ($('emptyState')) $('emptyState').hidden = items.length > 0;
    if ($('mainCatalogRow')) $('mainCatalogRow').hidden = items.length === 0;
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
      const savedTime = Math.max(0, Math.floor(Number(saved?.time || 0)));
      const timeParam = savedTime > 0 ? `&t=${savedTime}` : '';

      let target = `play.html?id=${encodeURIComponent(item.id)}&type=movie${timeParam}`;
      if (item.type === 'series' || (saved?.season && saved?.ep)) {
        const s = saved?.season || 1;
        const e = saved?.ep || 1;
        target = `play.html?id=${encodeURIComponent(item.id)}&ep=${encodeURIComponent(e)}&season=${encodeURIComponent(s)}${timeParam}`;
      }
      return { ...item, targetUrl: target };
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
  const banner = item.heroUrl || item.url || item.images?.banner || item.banner || posterOf(item);
  if ($('heroImage')) $('heroImage').style.backgroundImage = banner ? `url("${String(banner).replace(/["\\]/g, '')}")` : 'none';
  
  if ($('heroTitle')) $('heroTitle').textContent = titleOf(item) || t('discoverLumera');
  if ($('heroDescription')) $('heroDescription').textContent = shortSynopsisOf(item) || t('discoverSub');
  if ($('heroMeta')) $('heroMeta').textContent = [item.year, item.ageRating != null ? `${item.ageRating}+` : '', item.type ? prettyType(item) : ''].filter(Boolean).join(' · ');
  
  if ($('heroPlayBtn')) {
    $('heroPlayBtn').onclick = () => {
      recordUserInterest(itemCategories(item));
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
  const currentLang = lang();
  const categories = [...new Set(mediaItems.flatMap((item) => itemCategories(item)))].sort((a, b) => String(a).localeCompare(String(b)));
  const years = [...new Set(mediaItems.map((item) => item.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
  
  if ($('categoryFilter')) {
    categories.forEach((value) => {
      const matchedCat = loadedCategories.find(c => {
        if (c.id === value) return true;
        if (c.name && c.name.toLowerCase() === value.toLowerCase()) return true;
        if (!c.i18n) return false;
        return Object.values(c.i18n).some(loc => {
          const val = typeof loc === 'string' ? loc : loc?.name;
          return val?.toLowerCase() === value.toLowerCase();
        });
      });

      const getVal = (entry) => (typeof entry === 'object' ? entry?.name : entry);
      const labelName = getVal(matchedCat?.i18n?.[currentLang]) || getVal(matchedCat?.i18n?.es) || value;
      $('categoryFilter').add(new Option(labelName, value));
    });
  }
  if ($('yearFilter')) years.forEach((value) => $('yearFilter').add(new Option(value, value)));
}

function updateSearch() {
  const q = $('searchQuery')?.value.trim().toLocaleLowerCase() || ''; 
  const category = $('categoryFilter')?.value || ''; 
  const year = $('yearFilter')?.value || ''; 
  const maxAge = Number($('ageFilter')?.value || 999);

  clearTimeout(searchRecordTimer);
  if (q.length >= 2 || category) {
    searchRecordTimer = setTimeout(() => {
      recordUserInterest(category ? [category] : [], q);
    }, 600);
  }
  
  const matches = mediaItems.filter(item => (!profile?.isKids || inKids(item)) && (!q || String(titleOf(item)).toLocaleLowerCase().includes(q)) && (!category || itemCategories(item).includes(category)) && (!year || String(item.year) === year) && Number(item.ageRating ?? 0) <= maxAge);
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
    const [contentSnap, heroSnap, categoriesSnap, reviewsSnap] = await Promise.all([
      getDocs(collection(db, 'content')),
      getDocs(collection(db, 'hero_slides')),
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'reviews')).catch(() => ({ docs: [] }))
    ]);

    // Calcular promedio matemático exacto (Suma / Total) por mediaId
    const ratingsAccumulator = new Map();
    reviewsSnap.docs.forEach((docSnap) => {
      const r = docSnap.data();
      const mId = r.mediaId;
      const val = Number(r.rating);
      if (!mId || isNaN(val) || val < 1 || val > 5) return;
      const current = ratingsAccumulator.get(mId) || { sum: 0, count: 0 };
      current.sum += val;
      current.count += 1;
      ratingsAccumulator.set(mId, current);
    });
    
    mediaItems = contentSnap.docs.map((entry) => {
      const stats = ratingsAccumulator.get(entry.id);
      const avgRating = stats && stats.count > 0 ? (stats.sum / stats.count).toFixed(1) : '5.0';
      return {
        id: entry.id,
        ...entry.data(),
        avgRating,
        reviewCount: stats?.count || 0
      };
    });

    loadedCategories = categoriesSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    
    heroItems = heroSnap.docs.map((entry) => {
      const data = entry.data();
      const matchedContent = data.contentId ? mediaItems.find(m => m.id === data.contentId) : null;
      return {
        ...(matchedContent || {}),
        ...data,
        id: entry.id,
        heroUrl: data.url || ''
      };
    }).filter((item) => item.heroUrl || item.url || item.banner);

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
function openSearch() {
  if (searchDialog) {
    searchDialog.showModal();
    document.body.classList.add('modal-open');
    updateSearch();
    setTimeout(() => $('searchQuery')?.focus(), 50);
  }
}
function openSettings() {
  if (settingsDialog) {
    settingsDialog.showModal();
    document.body.classList.add('modal-open');
  }
}

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
  if (!dialog) return;
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
  });
});

loadCatalog();
