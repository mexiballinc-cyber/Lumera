import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { getLanguage, t, applyTranslations } from './i18n.js';

const params = new URLSearchParams(location.search);
const mediaId = params.get('id');
const language = getLanguage();
const $ = (id) => document.getElementById(id);

const TYPE_LABELS = {
  es: { movie: 'Película', series: 'Serie' },
  en: { movie: 'Movie', series: 'Series' },
  pt: { movie: 'Filme', series: 'Série' },
  fr: { movie: 'Film', series: 'Série' }
};

const PARTICIPANTS_LABELS = {
  es: { cast: 'Reparto y Participantes', director: 'Dirección', more: 'Leer más', less: 'Leer menos' },
  en: { cast: 'Cast & Participants', director: 'Director', more: 'Read more', less: 'Read less' },
  pt: { cast: 'Elenco e Participantes', director: 'Direção', more: 'Ler mais', less: 'Ler menos' },
  fr: { cast: 'Casting et Participants', director: 'Réalisation', more: 'Lire la suite', less: 'Lire moins' }
};

function textFor(item, key) {
  return item.i18n?.[language]?.[key] || item.i18n?.es?.[key] || item[key] || '';
}

function showError(message) {
  $('detailsError').textContent = message;
  $('detailsError').hidden = false;
  $('mediaTitle').textContent = t('detailsUnavailable');
}

async function loadMediaDetails() {
  applyTranslations();
  if (!mediaId) return showError(t('missingMedia'));
  try {
    const snapshot = await getDoc(doc(db, 'content', mediaId));
    if (!snapshot.exists()) return showError(t('missingMedia'));
    const media = snapshot.data();
    const banner = media.images?.banner || media.banner || media.images?.poster || media.poster || '';
    if (banner) $('detailsHero').style.backgroundImage = `url("${banner.replace(/["\\]/g, '')}")`;
    
    $('mediaTitle').textContent = textFor(media, 'title') || t('untitled');
    $('mediaYear').textContent = media.year || '';
    $('mediaAge').textContent = media.ageRating ? `${media.ageRating}+` : '';
    $('mediaType').textContent = TYPE_LABELS[language]?.[media.type] || media.type || '';

    const synopsisEl = $('mediaSynopsis');
    const synopsisText = textFor(media, 'synopsis') || t('noDescription');
    synopsisEl.textContent = synopsisText;
    setupSynopsisToggle(synopsisEl, synopsisText);

    document.title = `${$('mediaTitle').textContent} — Lumera`;

    const mainPlayBtn = $('mainPlayBtn');
    mainPlayBtn.hidden = false;

    // BOTÓN GRANDOTE ARRIBA EN EL HERO
    if (media.type === 'movie') {
      mainPlayBtn.onclick = () => {
        location.href = `play.html?id=${encodeURIComponent(mediaId)}&type=movie`;
      };
      $('episodesSection').hidden = true;
    } else {
      mainPlayBtn.onclick = () => {
        const firstSeason = media.seasons?.[0];
        const firstEp = firstSeason?.episodes?.[0];
        const epNum = firstEp?.episodeNumber || 1;
        const seasonNum = firstSeason?.seasonNumber || 1;
        location.href = `play.html?id=${encodeURIComponent(mediaId)}&ep=${epNum}&season=${seasonNum}`;
      };
      $('episodesSection').hidden = false;
      renderEpisodes(media);
    }

    // SECCIÓN DESTACADA DE PARTICIPANTES/REPARTO ABAJO
    renderParticipants(media);

  } catch (error) {
    console.error('No se cargaron detalles:', error);
    showError(t('detailsLoadError'));
  }
}

function setupSynopsisToggle(synopsisEl, text) {
  const prevBtn = $('synopsisToggleBtn');
  if (prevBtn) prevBtn.remove();
  synopsisEl.classList.remove('is-clamped');

  if (!text || text.length < 150) return;

  synopsisEl.classList.add('is-clamped');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'synopsisToggleBtn';
  btn.className = 'synopsis-toggle-btn';
  btn.textContent = PARTICIPANTS_LABELS[language]?.more || 'Leer más';

  btn.addEventListener('click', () => {
    const clamped = synopsisEl.classList.toggle('is-clamped');
    btn.textContent = clamped
      ? (PARTICIPANTS_LABELS[language]?.more || 'Leer más')
      : (PARTICIPANTS_LABELS[language]?.less || 'Leer menos');
  });

  synopsisEl.insertAdjacentElement('afterend', btn);
}

function renderEpisodes(media) {
  const container = $('episodesContainer');
  container.replaceChildren();
  (media.seasons || []).forEach((season, seasonIndex) => {
    const section = document.createElement('section');
    section.className = 'details-season';
    const heading = document.createElement('h3');
    heading.textContent = season.i18n?.[language]?.title || season.i18n?.es?.title || season.title || `${t('season')} ${season.seasonNumber || seasonIndex + 1}`;
    section.appendChild(heading);

    (season.episodes || []).forEach((episode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'episode-card';
      const label = document.createElement('strong');
      label.textContent = `E${episode.episodeNumber}: ${episode.i18n?.[language]?.title || episode.i18n?.es?.title || episode.title || ''}`;
      const play = document.createElement('span');
      play.setAttribute('aria-hidden', 'true');
      play.textContent = '▶';
      button.append(label, play);
      button.addEventListener('click', () => {
        location.href = `play.html?id=${encodeURIComponent(mediaId)}&ep=${episode.episodeNumber}&season=${season.seasonNumber || seasonIndex + 1}`;
      });
      section.appendChild(button);
    });
    container.appendChild(section);
  });

  if (!container.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'details-state';
    empty.textContent = t('noEpisodes');
    container.appendChild(empty);
  }
}

function renderParticipants(media) {
  let participantsSection = $('participantsSection');
  if (!participantsSection) {
    participantsSection = document.createElement('section');
    participantsSection.id = 'participantsSection';
    participantsSection.className = 'participants-block';
    const parent = $('episodesSection')?.parentElement || document.body;
    parent.appendChild(participantsSection);
  }

  participantsSection.replaceChildren();

  // Compatibilidad total con i18n.participants (CMS Admin), cast, participants y reparto
  const i18nParticipants = media.i18n?.[language]?.participants || media.i18n?.es?.participants;
  const castList = i18nParticipants || media.cast || media.participants || media.reparto || media.actors || [];
  const directorsList = media.director || media.directors || media.directores || [];

  const rawCast = Array.isArray(castList) ? castList.join(', ') : String(castList || '');
  const rawDirector = Array.isArray(directorsList) ? directorsList.join(', ') : String(directorsList || '');

  if (!rawCast && !rawDirector) {
    participantsSection.hidden = true;
    return;
  }

  participantsSection.hidden = false;

  const titleHeading = document.createElement('h2');
  titleHeading.className = 'participants-heading';
  titleHeading.textContent = PARTICIPANTS_LABELS[language]?.cast || 'Reparto y Participantes';
  participantsSection.appendChild(titleHeading);

  if (rawDirector) {
    const dirBox = document.createElement('div');
    dirBox.className = 'participants-director';
    dirBox.innerHTML = `<strong style="color: var(--accent-color, #d4af37); font-weight: 700;">${PARTICIPANTS_LABELS[language]?.director || 'Dirección'}:</strong> <span style="font-weight: 600; color: #fff;">${escapeHtml(rawDirector)}</span>`;
    participantsSection.appendChild(dirBox);
  }

  if (rawCast) {
    const castBox = document.createElement('div');
    castBox.className = 'participants-card';
    castBox.innerHTML = `<span class="participants-card-label">${PARTICIPANTS_LABELS[language]?.cast || 'Reparto'}:</span><span class="participants-card-text">${escapeHtml(rawCast)}</span>`;
    participantsSection.appendChild(castBox);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

loadMediaDetails();
