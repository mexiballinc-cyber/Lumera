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
const subtitleStatus = document.getElementById('subtitleStatus');
const language = getLanguage();
const languageNames = { es:'Español', en:'English', pt:'Português', fr:'Français' };
let controlTimer;

function populateSelect(select, values, includeOff = false) {
  select.replaceChildren();
  if (includeOff) {
    const off = document.createElement('option'); off.value = ''; off.textContent = t('off'); select.appendChild(off);
  }
  Object.entries(values || {}).filter(([, url]) => typeof url === 'string' && url.trim()).forEach(([code, url]) => {
    const option = document.createElement('option'); option.value = url; option.dataset.language = code;
    option.textContent = languageNames[code] || code.toUpperCase(); select.appendChild(option);
  });
}
function showSubtitleStatus(message = '', isError = false) {
  if (!subtitleStatus) return;
  subtitleStatus.textContent = message;
  subtitleStatus.hidden = !message;
  subtitleStatus.classList.toggle('is-error', isError);
}
function clearLumeraTracks() {
  player.querySelectorAll('track[data-lumera-subtitle]').forEach((track) => track.remove());
  for (const track of player.textTracks) track.mode = 'disabled';
}
function applySubtitles(url, code) {
  clearLumeraTracks();
  showSubtitleStatus();
  if (!url) return;
  const track = document.createElement('track');
  track.dataset.lumeraSubtitle = 'true'; track.kind = 'subtitles'; track.src = url;
  track.srclang = code || language; track.label = languageNames[code] || code?.toUpperCase() || 'Subtitles';
  track.default = true;
  track.addEventListener('load', () => { track.track.mode = 'showing'; showSubtitleStatus(); });
  track.addEventListener('error', () => {
    showSubtitleStatus(t('subtitleLoadError'), true);
    console.error('Subtitle track failed to load. Verify that the URL points to a valid .vtt file and permits cross-origin requests:', url);
  });
  // <track> must be a child of <video>; a sibling track is ignored by browsers.
  player.appendChild(track);
  player.textTracks.addEventListener?.('addtrack', (event) => {
    if (event.track === track.track) event.track.mode = 'showing';
  }, { once: true });
  if (track.readyState === 2 && track.track) track.track.mode = 'showing';
}
function revealControls() {
  document.body.classList.remove('controls-hidden');
  clearTimeout(controlTimer);
  if (player.paused || document.activeElement === audioSelect || document.activeElement === subtitleSelect) return;
  controlTimer = setTimeout(() => document.body.classList.add('controls-hidden'), 3000);
}
function installAutoHide() {
  ['pointermove','pointerdown','touchstart','keydown'].forEach((eventName) => document.addEventListener(eventName, revealControls, { passive:true }));
  [audioSelect, subtitleSelect].forEach((select) => {
    select.addEventListener('focus', () => { clearTimeout(controlTimer); document.body.classList.remove('controls-hidden'); });
    select.addEventListener('blur', revealControls);
  });
  player.addEventListener('play', revealControls);
  player.addEventListener('pause', () => { clearTimeout(controlTimer); document.body.classList.remove('controls-hidden'); });
  player.addEventListener('ended', () => { clearTimeout(controlTimer); document.body.classList.remove('controls-hidden'); });
  revealControls();
}

async function initPlayer() {
  if (!mediaId) return location.replace('home.html');
  try {
    // Set CORS mode before media or subtitle sources are assigned.
    player.crossOrigin = 'anonymous';
    const snapshot = await getDoc(doc(db, 'content', mediaId));
    if (!snapshot.exists()) return location.replace('home.html');
    const media = snapshot.data();
    let sources = media.sources || {};
    let subtitles = media.subtitles || {};
    let title = media.i18n?.[language]?.title || media.i18n?.es?.title || media.title || '';
    let description = media.i18n?.[language]?.synopsis || media.i18n?.es?.synopsis || '';

    if (media.type === 'series') {
      const season = (media.seasons || []).find((item) => Number(item.seasonNumber) === seasonNumber) || media.seasons?.[seasonNumber - 1];
      const episode = season?.episodes?.find((item) => Number(item.episodeNumber) === episodeNumber);
      if (!episode) throw new Error('Episode not found');
      sources = episode.sources || {};
      subtitles = episode.subtitles || {};
      title = `${title} · ${episode.i18n?.[language]?.title || episode.i18n?.es?.title || episode.title || `${t('episode')} ${episodeNumber}`}`;
    }

    document.getElementById('mediaTitle').textContent = title;
    document.getElementById('mediaDescription').textContent = description;
    populateSelect(audioSelect, sources);
    populateSelect(subtitleSelect, subtitles, true);

    const preferredAudio = [...audioSelect.options].find((option) => option.dataset.language === language);
    if (preferredAudio) audioSelect.value = preferredAudio.value;
    if (audioSelect.value) {
      player.src = audioSelect.value; player.load();
      player.play().catch(() => { /* Autoplay may require a user gesture. */ });
    } else {
      showSubtitleStatus(t('noVideoSource'), true);
    }

    const preferredSubtitle = [...subtitleSelect.options].find((option) => option.dataset.language === language);
    if (preferredSubtitle) subtitleSelect.value = preferredSubtitle.value;
    applySubtitles(subtitleSelect.value, subtitleSelect.selectedOptions[0]?.dataset.language);

    audioSelect.addEventListener('change', () => {
      const time = player.currentTime; player.src = audioSelect.value; player.load();
      player.addEventListener('loadedmetadata', () => { player.currentTime = Math.min(time, player.duration || time); }, { once:true });
      player.play().catch(() => {});
    });
    subtitleSelect.addEventListener('change', () => applySubtitles(subtitleSelect.value, subtitleSelect.selectedOptions[0]?.dataset.language));
    installAutoHide();
  } catch (error) {
    console.error('Could not initialize player:', error);
    document.getElementById('mediaTitle').textContent = t('playbackError');
  }
}

initPlayer();
