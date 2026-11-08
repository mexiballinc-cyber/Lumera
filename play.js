import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');
const episodeNum = urlParams.get('ep') || '1';
const seasonNum = urlParams.get('season') || '1';
const lang = localStorage.getItem('lumera_lang') || 'es';

const videoPlayer = document.getElementById('lumeraVideoPlayer');
const backBtn = document.getElementById('backBtn');
const mediaTitle = document.getElementById('mediaTitle');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const timeDisplay = document.getElementById('timeDisplay');
const subtitleSelect = document.getElementById('subtitleSelect');
const audioSelect = document.getElementById('audioSelect');

let hideTimeout;

function resetControlsTimer() {
  document.body.classList.remove('controls-hidden');
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    if (!videoPlayer.paused) {
      document.body.classList.add('controls-hidden');
    }
  }, 3500);
}

document.addEventListener('mousemove', resetControlsTimer);
document.addEventListener('touchstart', resetControlsTimer);

if (playPauseBtn) {
  playPauseBtn.addEventListener('click', () => {
    if (videoPlayer.paused) videoPlayer.play();
    else videoPlayer.pause();
  });
}

videoPlayer.addEventListener('play', () => {
  if (playIcon) playIcon.style.display = 'none';
  if (pauseIcon) pauseIcon.style.display = 'block';
  resetControlsTimer();
});

videoPlayer.addEventListener('pause', () => {
  if (playIcon) playIcon.style.display = 'block';
  if (pauseIcon) pauseIcon.style.display = 'none';
  document.body.classList.remove('controls-hidden');
});

function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

videoPlayer.addEventListener('timeupdate', () => {
  const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100 || 0;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (timeDisplay) timeDisplay.textContent = `${formatTime(videoPlayer.currentTime)} / ${formatTime(videoPlayer.duration)}`;
});

if (progressBar) {
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoPlayer.currentTime = pos * videoPlayer.duration;
  });
}

if (backBtn) {
  backBtn.addEventListener('click', () => {
    window.history.back();
  });
}

// Carga segura de subtítulos vía Blob con forzado de modo showing
async function loadSubtitleTrack(videoElement, subtitleUrl, langLabel = 'Español') {
  const oldTracks = videoElement.querySelectorAll('track');
  oldTracks.forEach(t => t.remove());

  if (!subtitleUrl) return;

  try {
    const response = await fetch(subtitleUrl);
    if (!response.ok) throw new Error("No se pudo descargar el VTT");
    let vttText = await response.text();

    if (!vttText.trim().startsWith('WEBVTT')) {
      vttText = 'WEBVTT\n\n' + vttText;
    }

    const blob = new Blob([vttText], { type: 'text/vtt;charset=utf-8' });
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = langLabel;
    track.srclang = 'es';
    track.src = URL.createObjectURL(blob);
    track.default = true;

    videoElement.appendChild(track);
    
    setTimeout(() => {
      if (videoElement.textTracks && videoElement.textTracks.length > 0) {
        for (let i = 0; i < videoElement.textTracks.length; i++) {
          videoElement.textTracks[i].mode = 'showing';
        }
      }
    }, 150);
  } catch (err) {
    console.error("Error al cargar subtítulos VTT:", err);
  }
}

function extractVideoUrlFromObj(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.videoUrl) return obj.videoUrl;
  if (obj.video) return obj.video;
  if (obj.url) return obj.url;
  if (typeof obj.sources === 'string') return obj.sources;
  if (obj.sources && typeof obj.sources === 'object') {
    const val = obj.sources[lang] || obj.sources.es || Object.values(obj.sources)[0];
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object') return val.videoUrl || val.url || val.video || '';
  }
  return '';
}

function extractSubUrlFromObj(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.subtitleUrl) return obj.subtitleUrl;
  if (obj.subUrl) return obj.subUrl;
  if (obj.subtitlesUrl) return obj.subtitlesUrl;
  if (typeof obj.subtitles === 'string') return obj.subtitles;
  if (obj.subtitles && typeof obj.subtitles === 'object') {
    const val = obj.subtitles[lang] || obj.subtitles.es || Object.values(obj.subtitles)[0];
    if (typeof val === 'string') return val;
  }
  return '';
}

async function initPlayer() {
  if (!mediaId) {
    window.location.href = 'home.html';
    return;
  }
  
  try {
    const docSnap = await getDoc(doc(db, "content", mediaId));
    if (!docSnap.exists()) {
      if (mediaTitle) mediaTitle.textContent = "Contenido no disponible en Firestore";
      return;
    }
    
    const media = docSnap.data();
    let videoSrc = '';
    let subtitleSrc = '';
    let title = media.i18n?.[lang]?.title || media.title || 'Sin título';

    const seasons = media.seasons || media.temporadas || [];
    if (seasons.length > 0) {
      const season = seasons.find(s => String(s.seasonNumber || s.number || 1) === String(seasonNum)) || seasons[0];
      const episodes = season.episodes || season.episodios || [];
      if (episodes.length > 0) {
        const ep = episodes.find(e => String(e.episodeNumber || e.number || 1) === String(episodeNum)) || episodes[0];
        if (ep) {
          videoSrc = extractVideoUrlFromObj(ep);
          subtitleSrc = extractSubUrlFromObj(ep);
          const epTitle = ep.episodeTitle || ep.title || ep.name || `Episodio ${episodeNum}`;
          title = `${title} - E${episodeNum}: ${epTitle}`;
        }
      }
    }

    if (!videoSrc) {
      videoSrc = extractVideoUrlFromObj(media);
      subtitleSrc = extractSubUrlFromObj(media) || subtitleSrc;
    }

    if (!videoSrc) {
      if (mediaTitle) mediaTitle.textContent = "No se encontró URL de video para este contenido";
      return;
    }

    if (mediaTitle) mediaTitle.textContent = title;
    videoPlayer.src = videoSrc;

    if (audioSelect) {
      audioSelect.innerHTML = `<option value="${videoSrc}">ES (Español)</option>`;
    }
    
    if (subtitleSelect) {
      subtitleSelect.innerHTML = `<option value="">Off</option>`;
      if (subtitleSrc) {
        subtitleSelect.innerHTML += `<option value="${subtitleSrc}" selected>ES (Español)</option>`;
        loadSubtitleTrack(videoPlayer, subtitleSrc);
      }

      subtitleSelect.addEventListener('change', (e) => {
        if (e.target.value) loadSubtitleTrack(videoPlayer, e.target.value);
        else videoPlayer.querySelectorAll('track').forEach(t => t.remove());
      });
    }

    videoPlayer.play().catch(() => {});

  } catch (err) {
    console.error("Error al iniciar reproductor:", err);
    if (mediaTitle) mediaTitle.textContent = "Error al conectar con la base de datos";
  }
}

initPlayer();
