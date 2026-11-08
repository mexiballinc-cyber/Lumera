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

// Ocultar controles automáticamente cuando el mouse no se mueve
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

// Fix de Subtítulos de Archive u otros dominios
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

async function initPlayer() {
  if (!mediaId) return window.location.href = 'home.html';
  
  try {
    const docSnap = await getDoc(doc(db, "content", mediaId));
    if (!docSnap.exists()) throw new Error("El documento de esta película/serie no existe en la base de datos.");
    currentMedia = docSnap.data();

    let videoSrc = '';
    let subtitleSrc = '';
    let title = currentMedia.title || currentMedia.i18n?.[lang]?.title || 'Sin título';
    let desc = currentMedia.i18n?.[lang]?.synopsis || currentMedia.synopsis || '';

    // Búsqueda robusta del enlace del video
    if (type === 'movie' || !episodeNum) {
      if (typeof currentMedia.sources === 'string') {
        videoSrc = currentMedia.sources;
      } else if (currentMedia.sources && typeof currentMedia.sources === 'object') {
        videoSrc = currentMedia.sources[lang] || currentMedia.sources.es || Object.values(currentMedia.sources)[0];
      } else {
        videoSrc = currentMedia.videoUrl || currentMedia.url || '';
      }
      
      if (typeof currentMedia.subtitles === 'string') {
        subtitleSrc = currentMedia.subtitles;
      } else if (currentMedia.subtitles && typeof currentMedia.subtitles === 'object') {
        subtitleSrc = currentMedia.subtitles[lang] || currentMedia.subtitles.es || Object.values(currentMedia.subtitles)[0];
      }
    } else {
      // Es una serie
      const season = currentMedia.seasons?.find(s => String(s.seasonNumber) === String(seasonNum)) || currentMedia.seasons?.[0];
      if (season) {
        const ep = season.episodes?.find(e => String(e.episodeNumber) === String(episodeNum));
        if (ep) {
          if (typeof ep.sources === 'string') videoSrc = ep.sources;
          else if (ep.sources && typeof ep.sources === 'object') videoSrc = ep.sources[lang] || ep.sources.es || Object.values(ep.sources)[0];
          
          if (typeof ep.subtitles === 'string') subtitleSrc = ep.subtitles;
          else if (ep.subtitles && typeof ep.subtitles === 'object') subtitleSrc = ep.subtitles[lang] || ep.subtitles.es || Object.values(ep.subtitles)[0];
          
          title = `${title} - E${ep.episodeNumber}: ${ep.title || 'Episodio ' + ep.episodeNumber}`;
        } else {
           throw new Error("Episodio no encontrado en esta temporada.");
        }
      } else {
         throw new Error("Temporada no encontrada.");
      }
    }

    if (!videoSrc) throw new Error("No hay URL de video disponible en la base de datos para este contenido.");

    // Aplicar al reproductor
    mediaTitle.textContent = title;
    mediaDesc.textContent = desc;
    videoPlayer.src = videoSrc;

    // Configurar selects
    if (audioSelect) audioSelect.innerHTML = `<option value="default">Audio predeterminado</option>`;
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

    // Actualizar estado de "Cargando"
    const statusBadge = document.querySelector('.now-watching-badge');
    if (statusBadge) statusBadge.textContent = "AHORA VIENDO";

  } catch (err) {
    console.error("Error crítico en reproductor:", err);
    // Mostrar el error en la interfaz en lugar de una alerta molesta
    mediaTitle.textContent = "No se pudo cargar el video";
    mediaDesc.textContent = `Error: ${err.message}`;
    const statusBadge = document.querySelector('.now-watching-badge');
    if (statusBadge) statusBadge.textContent = "ERROR";
  }
}

initPlayer();
