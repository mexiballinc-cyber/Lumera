import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');
const epNum = parseInt(urlParams.get('ep') || '1');
const currentLang = localStorage.getItem('lumera_lang') || 'es';

const player = document.getElementById('lumeraVideoPlayer');
const titleEl = document.getElementById('playerTitle');
const synopsisEl = document.getElementById('playerSynopsis');
const audioSelect = document.getElementById('audioSelect');
const subtitleSelect = document.getElementById('subtitleSelect');

let hideControlsTimeout;

// Manejo de inactividad del cursor para ocultar la UI
function handleUserActivity() {
  document.body.classList.remove('user-inactive');
  clearTimeout(hideControlsTimeout);
  hideControlsTimeout = setTimeout(() => {
    if (!player.paused) {
      document.body.classList.add('user-inactive');
    }
  }, 3000);
}

document.addEventListener('mousemove', handleUserActivity);
document.addEventListener('touchstart', handleUserActivity);
player.addEventListener('play', handleUserActivity);
player.addEventListener('pause', () => document.body.classList.remove('user-inactive'));

// Función para evadir problemas CORS con subtítulos VTT de Archive.org
async function setSubtitleTrack(vttUrl) {
  const oldTracks = player.querySelectorAll('track');
  oldTracks.forEach(t => t.remove());

  if (!vttUrl) return;

  try {
    const res = await fetch(vttUrl);
    if (!res.ok) throw new Error("VTT response not ok");
    const blobText = await res.text();
    const blob = new Blob([blobText], { type: 'text/vtt' });
    
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'Subtítulos';
    track.srclang = 'es';
    track.src = URL.createObjectURL(blob);
    track.default = true;
    
    player.appendChild(track);
    if (player.textTracks && player.textTracks[0]) {
      player.textTracks[0].mode = 'showing';
    }
  } catch (err) {
    console.error("Error al cargar subtítulo VTT:", err);
  }
}

async function initPlayer() {
  if (!mediaId) return window.location.href = 'home.html';

  try {
    const docRef = doc(db, "content", mediaId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      titleEl.textContent = "Contenido no encontrado";
      return;
    }

    const media = docSnap.data();
    let sources = {};
    let subtitles = {};
    
    titleEl.textContent = media.i18n?.[currentLang]?.title || media.title || 'Sin título';
    synopsisEl.textContent = media.i18n?.[currentLang]?.synopsis || media.synopsis || '';

    // Extracción flexible de video y subtítulos (soporta tanto cadenas como objetos)
    if (media.type === 'movie') {
      sources = media.sources || media.videoUrl || media.url || {};
      subtitles = media.subtitles || media.subUrl || {};
    } else {
      const episode = media.seasons?.[0]?.episodes?.find(e => e.episodeNumber === epNum) || media.seasons?.[0]?.episodes?.[0];
      if (episode) {
        sources = episode.sources || episode.videoUrl || episode.url || {};
        subtitles = episode.subtitles || episode.subUrl || {};
        titleEl.textContent += ` - E${episode.episodeNumber}: ${episode.title || ''}`;
      }
    }

    // Normalizar fuentes de video
    audioSelect.innerHTML = '';
    if (typeof sources === 'string') {
      const opt = document.createElement('option');
      opt.value = sources;
      opt.textContent = "Principal";
      audioSelect.appendChild(opt);
    } else if (typeof sources === 'object' && sources !== null) {
      Object.entries(sources).forEach(([langKey, url]) => {
        if (url) {
          const opt = document.createElement('option');
          opt.value = url;
          opt.textContent = langKey.toUpperCase();
          audioSelect.appendChild(opt);
        }
      });
    }

    if (audioSelect.options.length > 0) {
      player.src = audioSelect.value;
      player.play().catch(() => {});
    } else {
      titleEl.textContent = "Error reproduciendo contenido";
      synopsisEl.textContent = "No se encontró ninguna URL de video válida asociada.";
      return;
    }

    // Normalizar subtítulos
    subtitleSelect.innerHTML = '<option value="">Desactivado</option>';
    if (typeof subtitles === 'string' && subtitles) {
      const opt = document.createElement('option');
      opt.value = subtitles;
      opt.textContent = "Español";
      subtitleSelect.appendChild(opt);
    } else if (typeof subtitles === 'object' && subtitles !== null) {
      Object.entries(subtitles).forEach(([langKey, url]) => {
        if (url) {
          const opt = document.createElement('option');
          opt.value = url;
          opt.textContent = langKey.toUpperCase();
          subtitleSelect.appendChild(opt);
        }
      });
    }

    // Eventos de selección
    audioSelect.onchange = () => {
      const currentTime = player.currentTime;
      player.src = audioSelect.value;
      player.currentTime = currentTime;
      player.play();
    };

    subtitleSelect.onchange = () => {
      setSubtitleTrack(subtitleSelect.value);
    };

    // Cargar subtítulo predeterminado si existe
    if (subtitleSelect.options.length > 1) {
      subtitleSelect.selectedIndex = 1;
      setSubtitleTrack(subtitleSelect.value);
    }

  } catch (error) {
    console.error("Error al inicializar el reproductor:", error);
    titleEl.textContent = "Error de conexión";
    synopsisEl.textContent = error.message;
  }
}

initPlayer();
