import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { getLanguage, t } from './i18n.js';

const params = new URLSearchParams(location.search);
const mediaId = params.get('id');
const language = getLanguage();
const $ = (id) => document.getElementById(id);

function localizedTitle(media) {
  return media.i18n?.[language]?.title || media.title || t('untitled');
}
function typeLabel(type) {
  if (type === 'movie') return t('movie');
  return language === 'en' ? 'Series' : language === 'pt' ? 'Série' : language === 'fr' ? 'Série' : 'Serie';
}

async function loadMediaDetails() {
  if (!mediaId) return location.replace('home.html');
  try {
    const snapshot = await getDoc(doc(db, 'content', mediaId));
    if (!snapshot.exists()) return location.replace('home.html');
    const media = snapshot.data();
    const banner = media.images?.banner || media.images?.poster || '';
    $('detailsHero').style.backgroundImage = banner ? `url("${banner.replace(/["\\]/g, '')}")` : '';
    $('mediaTitle').textContent = localizedTitle(media);
    $('mediaYear').textContent = media.year || '';
    $('mediaAge').textContent = `${media.ageRating ?? 0}+`;
    $('mediaType').textContent = typeLabel(media.type);
    $('mediaSynopsis').textContent = media.i18n?.[language]?.synopsis || media.i18n?.es?.synopsis || media.synopsis || t('noDescription');

    if (media.type === 'movie') {
      $('episodesHeading').hidden = true;
      $('mainPlayBtn').onclick = () => { location.href = `play.html?id=${encodeURIComponent(mediaId)}&type=movie`; };
    } else {
      $('mainPlayBtn').hidden = true;
      renderEpisodes(media);
    }
  } catch (error) {
    console.error('Could not load media details:', error);
    $('mediaSynopsis').textContent = t('loadError');
  }
}

function renderEpisodes(media) {
  const container = $('episodesContainer');
  container.replaceChildren();
  (media.seasons || []).forEach((season, seasonIndex) => {
    const section = document.createElement('section');
    section.className = 'details-season';
    const heading = document.createElement('h3');
    heading.textContent = season.i18n?.[language]?.title || season.title || `${t('season')} ${season.seasonNumber || seasonIndex + 1}`;
    section.appendChild(heading);
    (season.episodes || []).forEach((episode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'episode-card';
      const label = document.createElement('strong');
      label.textContent = `E${episode.episodeNumber}: ${episode.i18n?.[language]?.title || episode.title || ''}`;
      button.appendChild(label);
      button.addEventListener('click', () => {
        location.href = `play.html?id=${encodeURIComponent(mediaId)}&ep=${episode.episodeNumber}&season=${season.seasonNumber || seasonIndex + 1}`;
      });
      section.appendChild(button);
    });
    container.appendChild(section);
  });
}

loadMediaDetails();
