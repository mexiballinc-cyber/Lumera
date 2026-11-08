import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { getLanguage, t } from './i18n.js';

const params = new URLSearchParams(location.search);
const mediaId = params.get('id');
const episodeNumber = Number(params.get('ep') || 1);
const seasonNumber = Number(params.get('season') || 1);
const player = document.getElementById('lumeraVideoPlayer');
const audioSelect = document.getElementById('audioSelect');
const subtitleSelect = document.getElementById('subtitleSelect');
const language = getLanguage();
const languageNames = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français' };

function populateSelect(select, values, includeOff = false) {
  select.replaceChildren();
  if (includeOff) {
    const off = document.createElement('option');
    off.value = '';
    off.textContent = t('off');
    select.appendChild(off);
  }
  Object.entries(values || {}).filter(([, url]) => typeof url === 'string' && url.trim()).forEach(([code, url]) => {
    const option = document.createElement('option');
    option.value = url;
    option.dataset.language = code;
    option.textContent = languageNames[code] || code.toUpperCase();
    select.appendChild(option);
  });
}

function applySubtitles(url, code) {
  player.querySelectorAll('track[data-lumera-subtitle]').forEach((track) => track.remove());
  for (const track of player.textTracks) track.mode = 'disabled';
  if (!url) return;
  const track = document.createElement('track');
  track.dataset.lumeraSubtitle = 'true';
  track.kind = 'subtitles';
  track.src = url;
  track.srclang = code || language;
  track.label = languageNames[code] || code.toUpperCase();
  track.default = true;
  player.appendChild(track);
  track.track.mode = 'showing';
}

async function initPlayer() {
  if (!mediaId) return location.replace('home.html');
  try {
    const snapshot = await getDoc(doc(db, 'content', mediaId));
    if (!snapshot.exists()) return location.replace('home.html');
    const media = snapshot.data();
    let sources = media.sources || {};
    let subtitles = media.subtitles || {};
    let title = media.i18n?.[language]?.title || media.title || '';

    if (media.type === 'series') {
      const season = (media.seasons || []).find((item) => Number(item.seasonNumber) === seasonNumber) || media.seasons?.[seasonNumber - 1];
      const episode = season?.episodes?.find((item) => Number(item.episodeNumber) === episodeNumber);
      if (!episode) throw new Error('Episode not found');
      sources = episode.sources || {};
      subtitles = episode.subtitles || {};
      title = `${title} · ${episode.i18n?.[language]?.title || episode.title || `${t('episode')} ${episodeNumber}`}`;
    }

    document.getElementById('mediaTitle').textContent = title;
    document.getElementById('mediaDescription').textContent = media.i18n?.[language]?.synopsis || media.i18n?.es?.synopsis || '';
    populateSelect(audioSelect, sources);
    populateSelect(subtitleSelect, subtitles, true);

    const preferredAudio = [...audioSelect.options].find((option) => option.dataset.language === language);
    if (preferredAudio) audioSelect.value = preferredAudio.value;
    if (audioSelect.value) {
      player.src = audioSelect.value;
      player.load();
      player.play().catch(() => {});
    }
    const preferredSubtitle = [...subtitleSelect.options].find((option) => option.dataset.language === language);
    if (preferredSubtitle) subtitleSelect.value = preferredSubtitle.value;
    applySubtitles(subtitleSelect.value, subtitleSelect.selectedOptions[0]?.dataset.language);

    audioSelect.addEventListener('change', () => {
      const time = player.currentTime;
      player.src = audioSelect.value;
      player.load();
      player.addEventListener('loadedmetadata', () => { player.currentTime = Math.min(time, player.duration || time); }, { once: true });
      player.play().catch(() => {});
    });
    subtitleSelect.addEventListener('change', () => applySubtitles(subtitleSelect.value, subtitleSelect.selectedOptions[0]?.dataset.language));
  } catch (error) {
    console.error('Could not initialize player:', error);
    document.getElementById('mediaTitle').textContent = t('playbackError');
  }
}

initPlayer();
