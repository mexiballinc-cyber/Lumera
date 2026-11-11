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
  const castContainer = $('mediaCastContainer');
  const castSpan = $('mediaCast');

  const participantsText = media.i18n?.[language]?.participants || 
                           media.i18n?.es?.participants || 
                           media.participants || 
                           media.cast || 
                           media.reparto || '';

  if (participantsText && castContainer && castSpan) {
    castSpan.textContent = Array.isArray(participantsText) ? participantsText.join(', ') : participantsText;
    castContainer.hidden = false;
  } else if (castContainer) {
    castContainer.hidden = true;
  }
}

loadMediaDetails();