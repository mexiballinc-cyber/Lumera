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
const mediaDesc = document.getElementById('mediaDescription');
const subtitleSelect = document.getElementById('subtitleSelect');
const audioSelect = document.getElementById('audioSelect');

let hideTimeout;

// Manejo de visibilidad de controles por inactividad
function resetControlsTimer() {
  document.body.classList.remove('controls-hidden');
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    if (!videoPlayer.paused) {
      document.body.classList.add('controls-hidden');
    }
  }, 3000);
}

document.addEventListener('mousemove', resetControlsTimer);
document.addEventListener('click', resetControlsTimer);
document.addEventListener('touchstart', resetControlsTimer);
videoPlayer.addEventListener('play', resetControlsTimer);
videoPlayer.addEventListener('pause', () => document.body.classList.remove('controls-hidden'));

backBtn.addEventListener('click', () => {
  if (document.referrer.includes('details.html') || document.referrer.includes('home.html')) {
    window.history.back();
  } else {
    window.location.href = mediaId ? `details.html?id=${encodeURIComponent(mediaId)}` : 'home.html';
  }
});

// Carga de Subtítulos VTT sorteando CORS mediante Blob
async function loadSubtitleTrack(videoElement, subtitleUrl, langLabel = 'Subtítulos') {
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
    if (videoElement.textTracks && videoElement.textTracks[0]) {
      videoElement.textTracks[0].mode = 'showing';
    }
  } catch (err) {
    console.error("Error al cargar subtítulos:", err);
  }
}

// Extractor todoterreno de URLs de video
function extractMediaUrl(targetObj, currentLang = 'es') {
  if (!targetObj) return '';
  if (typeof targetObj === 'string') return targetObj;
  
  if (typeof targetObj.sources === 'string') return targetObj.sources;
  if (targetObj.sources && typeof targetObj.sources === 'object') {
    const res = targetObj.sources[currentLang] || targetObj.sources.es || Object.values(targetObj.sources)[0];
    if (res) return typeof res === 'string' ? res : res.url || res.video || '';
  }
  
  return targetObj.videoUrl || targetObj.video || targetObj.url || targetObj.link || targetObj.videoLink || '';
}

// Extractor todoterreno de URLs de subtítulos
function extractSubtitleUrl(targetObj, currentLang = 'es') {
  if (!targetObj) return '';
  if (typeof targetObj.subtitles === 'string') return targetObj.subtitles;
  if (targetObj.subtitles && typeof targetObj.subtitles === 'object') {
    const res = targetObj.subtitles[currentLang] || targetObj.subtitles.es || Object.values(targetObj.subtitles)[0];
    if (res) return typeof res === 'string' ? res : res.url || '';
  }
  return targetObj.subLink || targetObj.subtitleUrl || targetObj.subtitlesUrl || '';
}

async function initPlayer() {
  if (!mediaId) return window.location.href = 'home.html';
  
  try {
    const docSnap = await getDoc(doc(db, "content", mediaId));
    if (!docSnap.exists()) throw new Error("No existe el contenido en Firestore.");
    
    const media = docSnap.data();
    let videoSrc = '';
    let subtitleSrc = '';
    let title = media.i18n?.[lang]?.title || media.title || 'Sin título';
    let desc = media.i18n?.[lang]?.synopsis || media.synopsis || '';

    if (type === 'movie' || !episodeNum) {
      videoSrc = extractMediaUrl(media, lang);
      subtitleSrc = extractSubtitleUrl(media, lang);
    } else {
      // Búsqueda de episodios en Series
      const seasons = media.seasons || [];
      const season = seasons.find(s => String(s.seasonNumber) === String(seasonNum)) || seasons[0];
      
      if (season) {
        const episodes = season.episodes || [];
        const ep = episodes.find(e => String(e.episodeNumber) === String(episodeNum)) || episodes[0];
        
        if (ep) {
          videoSrc = extractMediaUrl(ep, lang);
          subtitleSrc = extractSubtitleUrl(ep, lang);
          const epTitle = ep.i18n?.[lang]?.title || ep.title || `Episodio ${ep.episodeNumber}`;
          title = `${title} - E${ep.episodeNumber}: ${epTitle}`;
        }
      }
    }

    if (!videoSrc) {
      throw new Error("No se encontró ninguna URL de video válida asociada.");
    }

    // Carga de metadatos y fuente del video
    mediaTitle.textContent = title;
    mediaDesc.textContent = desc;
    videoPlayer.src = videoSrc;

    // Configurar selectores de UI
    if (audioSelect) {
      audioSelect.innerHTML = `<option value="default">Audio predeterminado</option>`;
    }
    
    if (subtitleSelect) {
      subtitleSelect.innerHTML = `<option value="">Off</option>`;
      if (subtitleSrc) {
        subtitleSelect.innerHTML += `<option value="${subtitleSrc}" selected>Subtítulos Principales</option>`;
        loadSubtitleTrack(videoPlayer, subtitleSrc);
      }
      subtitleSelect.addEventListener('change', (e) => {
        if (e.target.value) loadSubtitleTrack(videoPlayer, e.target.value);
        else videoPlayer.querySelectorAll('track').forEach(t => t.remove());
      });
    }

    const tag = document.querySelector('.play-tag');
    if (tag) tag.textContent = "AHORA VIENDO";

  } catch (err) {
    console.error("Player Error:", err);
    mediaTitle.textContent = "Error reproduciendo contenido";
    mediaDesc.textContent = err.message;
    const tag = document.querySelector('.play-tag');
    if (tag) tag.textContent = "ERROR";
  }
}

initPlayer();
