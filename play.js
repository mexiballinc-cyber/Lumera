import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');
const epNum = parseInt(urlParams.get('ep') || '1');

const player = document.getElementById('lumeraVideoPlayer');
const audioSelect = document.getElementById('audioSelect');
const subtitleSelect = document.getElementById('subtitleSelect');

async function initPlayer() {
  if (!mediaId) return window.location.href = 'home.html';

  const docRef = doc(db, "content", mediaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return window.location.href = 'home.html';

  const media = docSnap.data();
  let sources = {};
  let subtitles = {};

  if (media.type === 'movie') {
    sources = media.sources || {};
    subtitles = media.subtitles || {};
  } else {
    const ep = media.seasons?.[0]?.episodes?.find(e => e.episodeNumber === epNum);
    if (ep) {
      sources = ep.sources || {};
      subtitles = ep.subtitles || {};
    }
  }

  // Poblar selectores de idioma 4k (es, en, pt, fr)
  audioSelect.innerHTML = '';
  Object.keys(sources).forEach(lang => {
    const opt = document.createElement('option');
    opt.value = sources[lang];
    opt.textContent = lang.toUpperCase();
    audioSelect.appendChild(opt);
  });

  // Reproducir fuente por defecto
  if (audioSelect.options.length > 0) {
    player.src = audioSelect.value;
    player.play();
  }

  // Cambio dinámico de audio/doblaje
  audioSelect.onchange = () => {
    const currentTime = player.currentTime;
    player.src = audioSelect.value;
    player.currentTime = currentTime;
    player.play();
  };
}

initPlayer();
