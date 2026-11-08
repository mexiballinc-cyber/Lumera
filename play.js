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

let currentMedia = null;
let hideTimeout;

// Ocultar controles automáticos
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
    window.location.href = `details.html?id=${encodeURIComponent(mediaId)}`;
  }
});

// Función salvavidas para Subtítulos cruzando dominios (.vtt de Archive)
async function loadSubtitleTrack(videoElement, subtitleUrl, langLabel = 'Subtítulos') {
  const oldTracks = videoElement.querySelectorAll('track');
  oldTracks.forEach(t => t.remove());

  if (!subtitleUrl) return;

  try {
    const response = await fetch(subtitleUrl);
    if (!response.ok) throw new Error("No se pudo descargar el archivo VTT");
    
    const vttText = await response.text();
    const blob = new Blob([vttText], { type: 'text/vtt' });
    const blobUrl = URL.createObjectURL(blob);

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = langLabel;
    track.srclang = 'es';
    track.src = blobUrl;
    track.default = true;

    videoElement.appendChild(track);
    
    if (videoElement.textTracks && videoElement.textTracks[0]) {
      videoElement.textTracks[0].mode = 'showing';
    }
    
    const statusEl = document.getElementById('subtitleStatus');
    if (statusEl) statusEl.hidden = true;
  } catch (err) {
    console.error("Error al cargar subtítulos:", err);
    const statusEl = document.getElementById('subtitleStatus');
    if (statusEl) {
      statusEl.textContent = "Error al cargar subtítulos. Posible bloqueo de origen.";
      statusEl.classList.add('is-error');
      statusEl.hidden = false;
    }
  }
}

async function initPlayer() {
  if (!mediaId) return window.location.href = 'home.html';
  
  try {
    const docSnap = await getDoc(doc(db, "content", mediaId));
    if (!docSnap.exists()) throw new Error("Media not found");
    currentMedia = docSnap.data();

    let videoSrc = '';
    let subtitleSrc = '';
    let title = currentMedia.title;
    let desc = currentMedia.i18n?.[lang]?.synopsis || currentMedia.synopsis || '';

    if (type === 'movie' || !episodeNum) {
      videoSrc = currentMedia.sources?.[lang] || currentMedia.sources?.es || Object.values(currentMedia.sources || {})[0];
      subtitleSrc = currentMedia.subtitles?.[lang] || currentMedia.subtitles?.es;
    } else {
      const season = currentMedia.seasons?.find(s => String(s.seasonNumber) === String(seasonNum)) || currentMedia.seasons?.[0];
      if (season) {
        const ep = season.episodes.find(e => String(e.episodeNumber) === String(episodeNum));
        if (ep) {
          videoSrc = ep.sources?.[lang] || ep.sources?.es || Object.values(ep.sources || {})[0];
          subtitleSrc = ep.subtitles?.[lang] || ep.subtitles?.es || ep.subtitles?.[''] || '';
          title = `${currentMedia.title} - E${ep.episodeNumber}: ${ep.title}`;
        }
      }
    }

    mediaTitle.textContent = title;
    mediaDesc.textContent = desc;

    if (videoSrc) {
      videoPlayer.src = videoSrc;
      audioSelect.innerHTML = `<option value="default">Audio predeterminado</option>`;
      subtitleSelect.innerHTML = `<option value="">Off</option>`;
      
      if (subtitleSrc) {
        subtitleSelect.innerHTML += `<option value="${subtitleSrc}" selected>Subtítulos Principales</option>`;
        loadSubtitleTrack(videoPlayer, subtitleSrc);
      }
    } else {
      throw new Error("No video source found");
    }

    subtitleSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
         loadSubtitleTrack(videoPlayer, val);
      } else {
         const oldTracks = videoPlayer.querySelectorAll('track');
         oldTracks.forEach(t => t.remove());
      }
    });

  } catch (err) {
    console.error(err);
    alert("Error cargando el reproductor.");
    window.history.back();
  }
}

initPlayer();
