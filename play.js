import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');
const episodeNum = urlParams.get('ep');
const seasonNum = urlParams.get('season') || 1;
const type = urlParams.get('type') || 'movie';
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

// Ocultar controles cuando el cursor está inactivo durante la reproducción
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

// Alternar Play / Pausa
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

// Formato de tiempo (MM:SS)
function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

// Actualizar la barra de progreso personalizada
videoPlayer.addEventListener('timeupdate', () => {
  const pct = (videoPlayer.currentTime / videoPlayer.duration) * 100 || 0;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (timeDisplay) timeDisplay.textContent = `${formatTime(videoPlayer.currentTime)} / ${formatTime(videoPlayer.duration)}`;
});

// Buscar punto de reproducción al hacer clic en la barra
if (progressBar) {
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoPlayer.currentTime = pos * videoPlayer.duration;
  });
}

// Botón de regresar
if (backBtn) {
  backBtn.addEventListener('click', () => {
    if (document.referrer.includes('details.html') || document.referrer.includes('home.html')) {
      window.history.back();
    } else {
      window.location.href = mediaId ? `details.html?id=${encodeURIComponent(mediaId)}` : 'home.html';
    }
  });
}

// Descargar subtítulos VTT vía Blob para evitar problemas de CORS en Firefox/Chrome
async function loadSubtitleTrack(videoElement, subtitleUrl, langLabel = 'Español') {
  const oldTracks = videoElement.querySelectorAll('track');
  oldTracks.forEach(t => t.remove());

  if (!subtitleUrl) return;

  try {
    const response = await fetch(subtitleUrl);
    if (!response.ok) throw new Error("No se pudo descargar el VTT");
    const vttText = await response.text();
    const blob = new Blob([vttText], { type: 'text/vtt' });
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = langLabel;
    track.srclang = 'es';
    track.src = URL.createObjectURL(blob);
    track.default = true;

    videoElement.appendChild(track);
    
    setTimeout(() => {
      if (videoElement.textTracks && videoElement.textTracks[0]) {
        videoElement.textTracks[0].mode = 'showing';
      }
    }, 100);
  } catch (err) {
    console.error("Error al cargar subtítulo VTT:", err);
  }
}

// Extractor todoterreno de URL de video
function extractUrl(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj.sources === 'string') return obj.sources;
  if (obj.sources && typeof obj.sources === 'object') {
    return obj.sources[lang] || obj.sources.es || Object.values(obj.sources)[0] || '';
  }
  return obj.videoUrl || obj.video || obj.url || obj.link || obj.videoLink || '';
}

// Extractor todoterreno de URL de subtítulos
function extractSub(obj) {
  if (!obj) return '';
  if (typeof obj.subtitles === 'string') return obj.subtitles;
  if (obj.subtitles && typeof obj.subtitles === 'object') {
    return obj.subtitles[lang] || obj.subtitles.es || Object.values(obj.subtitles)[0] || '';
  }
  return obj.subLink || obj.subtitleUrl || obj.subtitlesUrl || '';
}

async function initPlayer() {
  // Redireccionar si no hay id de contenido en la URL
  if (!mediaId) {
    window.location.href = 'home.html';
    return;
  }
  
  try {
    const docSnap = await getDoc(doc(db, "content", mediaId));
    if (!docSnap.exists()) {
      if (mediaTitle) mediaTitle.textContent = "Contenido no disponible";
      return;
    }
    
    const media = docSnap.data();
    let videoSrc = '';
    let subtitleSrc = '';
    let title = media.i18n?.[lang]?.title || media.title || 'Sin título';

    if (type === 'movie' || !episodeNum) {
      videoSrc = extractUrl(media);
      subtitleSrc = extractSub(media);
    } else {
      const seasons = media.seasons || [];
      const season = seasons.find(s => String(s.seasonNumber) === String(seasonNum)) || seasons[0];
      if (season) {
        const ep = (season.episodes || []).find(e => String(e.episodeNumber) === String(episodeNum)) || season.episodes?.[0];
        if (ep) {
          videoSrc = extractUrl(ep);
          subtitleSrc = extractSub(ep);
          const epTitle = ep.i18n?.[lang]?.title || ep.title || `Episodio ${ep.episodeNumber}`;
          title = `${title} - E${ep.episodeNumber}: ${epTitle}`;
        }
      }
    }

    if (!videoSrc) {
      if (mediaTitle) mediaTitle.textContent = "URL de video no encontrada";
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
    if (mediaTitle) mediaTitle.textContent = "Error al reproducir contenido";
  }
}

initPlayer();
