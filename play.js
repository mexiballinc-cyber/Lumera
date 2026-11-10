import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');
const episodeNum = urlParams.get('ep') || '1';
const seasonNum = urlParams.get('season') || '1';
const userLang = localStorage.getItem('lumera_lang') || 'es';

const LANG_NAMES = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français'
};

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

// Atajo de teclado tecla Espacio para Pausar/Reproducir
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    if (videoPlayer.paused) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }
});

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

// Carga segura y directa de subtítulos (Sin proxies fallidos y con conversión de Dropbox)
async function loadSubtitleTrack(videoElement, subtitleUrl, langLabel = 'Español') {
  const oldTracks = videoElement.querySelectorAll('track');
  oldTracks.forEach(t => t.remove());

  if (!subtitleUrl) return;

  try {
    let rawUrl = decodeURIComponent(subtitleUrl.trim());
    let directUrl = rawUrl
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "")
      .replace("&dl=0", "")
      .replace("?raw=1", "");

    const response = await fetch(directUrl);
    if (!response.ok) throw new Error("Error HTTP al descargar VTT");

    let text = await response.text();
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!text.trim().startsWith("WEBVTT")) {
      text = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    }

    const blob = new Blob([text], { type: 'text/vtt;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = langLabel;
    track.srclang = 'es';
    track.src = blobUrl;
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
    console.error("Fallo la carga de subtítulos:", err);
  }
}

// Extrae todos los mapas de video disponibles por idioma
function extractVideoSources(obj) {
  const result = {};
  if (!obj) return result;
  if (typeof obj === 'string') {
    result.es = obj;
    return result;
  }
  if (obj.sources && typeof obj.sources === 'object') {
    for (const [code, val] of Object.entries(obj.sources)) {
      if (typeof val === 'string' && val.trim()) result[code] = val.trim();
      else if (val && typeof val === 'object' && (val.videoUrl || val.url || val.video)) {
        result[code] = val.videoUrl || val.url || val.video;
      }
    }
  }
  if (Object.keys(result).length === 0) {
    const single = obj.videoUrl || obj.video || obj.url;
    if (single) result.es = single;
  }
  return result;
}

// Extrae todos los mapas de subtítulos disponibles por idioma
function extractSubtitleSources(obj) {
  const result = {};
  if (!obj) return result;
  if (typeof obj === 'string') {
    result.es = obj;
    return result;
  }
  if (obj.subtitles && typeof obj.subtitles === 'object') {
    for (const [code, val] of Object.entries(obj.subtitles)) {
      if (typeof val === 'string' && val.trim()) result[code] = val.trim();
    }
  }
  if (Object.keys(result).length === 0) {
    const single = obj.subtitleUrl || obj.subUrl || obj.subtitlesUrl;
    if (single) result.es = single;
  }
  return result;
}

async function initPlayer() {
  if (!mediaId) {
    window.location.href = 'index.html';
    return;
  }
  
  try {
    const docSnap = await getDoc(doc(db, "content", mediaId));
    if (!docSnap.exists()) {
      if (mediaTitle) mediaTitle.textContent = "Contenido no disponible en Firestore";
      return;
    }
    
    const media = docSnap.data();
    let title = media.i18n?.[userLang]?.title || media.title || 'Sin título';
    let targetObject = media;

    const seasons = media.seasons || media.temporadas || [];
    if (seasons.length > 0) {
      const season = seasons.find(s => String(s.seasonNumber || s.number || 1) === String(seasonNum)) || seasons[0];
      const episodes = season.episodes || season.episodios || [];
      if (episodes.length > 0) {
        const ep = episodes.find(e => String(e.episodeNumber || e.number || 1) === String(episodeNum)) || episodes[0];
        if (ep) {
          targetObject = ep;
          const epTitle = ep.i18n?.[userLang]?.title || ep.episodeTitle || ep.title || ep.name || `Episodio ${episodeNum}`;
          title = `${title} - E${episodeNum}: ${epTitle}`;
        }
      }
    }

    const videoMap = extractVideoSources(targetObject);
    const subtitleMap = extractSubtitleSources(targetObject);

    const availableAudioLangs = Object.keys(videoMap);
    if (availableAudioLangs.length === 0) {
      if (mediaTitle) mediaTitle.textContent = "No se encontró URL de video";
      return;
    }

    if (mediaTitle) mediaTitle.textContent = title;

    // Seleccionar audio coincidente con idioma del usuario o fallback
    let selectedAudioLang = availableAudioLangs.includes(userLang)
      ? userLang
      : (availableAudioLangs.includes('es') ? 'es' : availableAudioLangs[0]);

    videoPlayer.src = videoMap[selectedAudioLang];

    // Llenar selector de audio
    if (audioSelect) {
      audioSelect.innerHTML = availableAudioLangs
        .map(code => `<option value="${code}" ${code === selectedAudioLang ? 'selected' : ''}>${code.toUpperCase()} (${LANG_NAMES[code] || code})</option>`)
        .join('');

      audioSelect.addEventListener('change', (e) => {
        const newLang = e.target.value;
        if (videoMap[newLang] && videoMap[newLang] !== videoPlayer.src) {
          const currentTime = videoPlayer.currentTime;
          const isPaused = videoPlayer.paused;
          videoPlayer.src = videoMap[newLang];
          videoPlayer.currentTime = currentTime;
          if (!isPaused) videoPlayer.play().catch(() => {});
        }
      });
    }

    // Llenar selector de subtítulos
    if (subtitleSelect) {
      const availableSubLangs = Object.keys(subtitleMap);
      subtitleSelect.innerHTML = `<option value="">Off</option>` + availableSubLangs
        .map(code => `<option value="${code}">${code.toUpperCase()} (${LANG_NAMES[code] || code})</option>`)
        .join('');

      let selectedSubLang = availableSubLangs.includes(userLang)
        ? userLang
        : (availableSubLangs.includes('es') ? 'es' : '');

      if (selectedSubLang && subtitleMap[selectedSubLang]) {
        subtitleSelect.value = selectedSubLang;
        loadSubtitleTrack(videoPlayer, subtitleMap[selectedSubLang], LANG_NAMES[selectedSubLang] || selectedSubLang);
      }

      subtitleSelect.addEventListener('change', (e) => {
        const subLang = e.target.value;
        if (subLang && subtitleMap[subLang]) {
          loadSubtitleTrack(videoPlayer, subtitleMap[subLang], LANG_NAMES[subLang] || subLang);
        } else {
          videoPlayer.querySelectorAll('track').forEach(t => t.remove());
        }
      });
    }

    videoPlayer.play().catch(() => {});

  } catch (err) {
    console.error("Error al iniciar reproductor:", err);
    if (mediaTitle) mediaTitle.textContent = "Error al conectar con la base de datos";
  }
}

initPlayer();
