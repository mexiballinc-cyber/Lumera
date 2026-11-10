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
  es: { cast: 'Reparto y Participantes', director: 'Dirección' },
  en: { cast: 'Cast & Participants', director: 'Director' },
  pt: { cast: 'Elenco e Participantes', director: 'Direção' },
  fr: { cast: 'Casting et Participants', director: 'Réalisation' }
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
    $('mediaSynopsis').textContent = textFor(media, 'synopsis') || t('noDescription');
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
    participantsSection.className = 'media-section participants-block';
    const parent = $('episodesSection')?.parentElement || document.querySelector('.catalog-area') || document.body;
    parent.appendChild(participantsSection);
  }

  participantsSection.replaceChildren();

  // Buscar participantes en diversos campos estándar de Firebase
  const castList = media.cast || media.participants || media.reparto || media.actors || [];
  const directorsList = media.director || media.directors || media.directores || [];

  const rawCast = Array.isArray(castList) ? castList.join(', ') : String(castList || '');
  const rawDirector = Array.isArray(directorsList) ? directorsList.join(', ') : String(directorsList || '');

  if (!rawCast && !rawDirector) {
    participantsSection.hidden = true;
    return;
  }

  participantsSection.hidden = false;

  const titleHeading = document.createElement('h2');
  titleHeading.style.cssText = 'font-size: 1.6rem; font-weight: 800; margin-bottom: 16px; color: var(--text-main); font-family: var(--font-display);';
  titleHeading.textContent = PARTICIPANTS_LABELS[language]?.cast || 'Reparto y Participantes';
  participantsSection.appendChild(titleHeading);

  if (rawDirector) {
    const dirBox = document.createElement('div');
    dirBox.style.cssText = 'margin-bottom: 14px; font-size: 1.15rem; line-height: 1.6;';
    dirBox.innerHTML = `<strong style="color: var(--accent-color, #d4af37); font-weight: 700;">${PARTICIPANTS_LABELS[language]?.director || 'Dirección'}:</strong> <span style="font-weight: 600; color: #fff;">${escapeHtml(rawDirector)}</span>`;
    participantsSection.appendChild(dirBox);
  }

  if (rawCast) {
    const castBox = document.createElement('div');
    castBox.style.cssText = 'font-size: 1.15rem; line-height: 1.6; padding: 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;';
    castBox.innerHTML = `<strong style="display: block; font-size: 1.25rem; font-weight: 800; margin-bottom: 8px; color: var(--accent-color, #d4af37);">${PARTICIPANTS_LABELS[language]?.cast || 'Reparto'}:</strong> <span style="font-weight: 600; color: #e7e4dc; font-size: 1.05rem;">${escapeHtml(rawCast)}</span>`;
    participantsSection.appendChild(castBox);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

loadMediaDetails();
