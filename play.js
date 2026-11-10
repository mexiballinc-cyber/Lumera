/**
 * Lumera Video Player Controller
 * Handles media retrieval, playback controls, subtitle tracks, and UI states.
 */

import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

// Query string parameter parsing
const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');
const episodeNum = urlParams.get('ep') || '1';
const seasonNum = urlParams.get('season') || '1';
const lang = localStorage.getItem('lumera_lang') || 'es';

// DOM Element Selectors
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

// State flags and timers
let hideTimeout = null;
let isSeeking = false;
let autoHideDelay = 3500; // milliseconds

/**
 * Reset auto-hide controls timer on user activity.
 */
function resetControlsTimer() {
  document.body.classList.remove('controls-hidden');
  clearTimeout(hideTimeout);
  if (!videoPlayer.paused) {
    hideTimeout = setTimeout(() => {
      document.body.classList.add('controls-hidden');
    }, autoHideDelay);
  }
}

/**
 * Attach global event listeners for mouse and touch events
 */
function setupActivityListeners() {
  document.addEventListener('mousemove', resetControlsTimer);
  document.addEventListener('touchstart', resetControlsTimer);
  document.addEventListener('click', resetControlsTimer);
}

/**
 * Handle keyboard hotkeys (Spacebar to toggle play/pause, Arrow keys for seek)
 */
function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') {
      return;
    }

    switch (e.code) {
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seekRelative(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        seekRelative(10);
        break;
      case 'KeyM':
        e.preventDefault();
        toggleMute();
        break;
      case 'KeyF':
        e.preventDefault();
        toggleFullscreen();
        break;
      default:
        break;
    }
  });
}

/**
 * Toggle Video Playback State
 */
function togglePlayPause() {
  if (!videoPlayer) return;
  if (videoPlayer.paused) {
    videoPlayer.play().catch((err) => console.warn('Playback error:', err));
  } else {
    videoPlayer.pause();
  }
}

/**
 * Seek relative seconds forward or backward
 */
function seekRelative(seconds) {
  if (!videoPlayer || isNaN(videoPlayer.duration)) return;
  const newTime = Math.min(Math.max(videoPlayer.currentTime + seconds, 0), videoPlayer.duration);
  videoPlayer.currentTime = newTime;
}

/**
 * Toggle Mute status
 */
function toggleMute() {
  if (!videoPlayer) return;
  videoPlayer.muted = !videoPlayer.muted;
}

/**
 * Toggle Fullscreen mode
 */
function toggleFullscreen() {
  const container = document.documentElement;
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

/**
 * Setup event listeners on the HTML5 video element
 */
function setupVideoPlayerEvents() {
  if (!videoPlayer) return;

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

  videoPlayer.addEventListener('timeupdate', () => {
    if (isSeeking) return;
    const current = videoPlayer.currentTime || 0;
    const duration = videoPlayer.duration || 0;
    const pct = duration > 0 ? (current / duration) * 100 : 0;
    
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (timeDisplay) timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  });

  videoPlayer.addEventListener('ended', () => {
    document.body.classList.remove('controls-hidden');
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
  });
}

/**
 * Format seconds into MM:SS or HH:MM:SS format
 */
function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return "00:00";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = Math.floor(sec % 60);

  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');

  if (hours > 0) {
    const hStr = String(hours).padStart(2, '0');
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
}

/**
 * Setup custom interactive timeline progress bar
 */
function setupProgressBar() {
  if (!progressBar) return;

  const calculateProgress = (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return pos / rect.width;
  };

  progressBar.addEventListener('click', (e) => {
    if (!videoPlayer || isNaN(videoPlayer.duration)) return;
    const percentage = calculateProgress(e);
    videoPlayer.currentTime = percentage * videoPlayer.duration;
  });

  progressBar.addEventListener('mousedown', () => { isSeeking = true; });
  document.addEventListener('mouseup', () => { isSeeking = false; });
}

/**
 * Setup navigation back button behavior
 */
function setupBackButton() {
  if (!backBtn) return;
  backBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = 'home.html';
    }
  });
}

/**
 * Dynamically parse, format, and load WebVTT subtitle track
 */
async function loadSubtitleTrack(videoElement, subtitleUrl, langLabel = 'Español') {
  if (!videoElement) return;

  const oldTracks = videoElement.querySelectorAll('track');
  oldTracks.forEach(t => t.remove());

  if (!subtitleUrl || typeof subtitleUrl !== 'string') return;

  try {
    let rawUrl = decodeURIComponent(subtitleUrl.trim());
    let directUrl = rawUrl
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "")
      .replace("&dl=0", "")
      .replace("?raw=1", "");

    const response = await fetch(directUrl);
    if (!response.ok) throw new Error("Subtitles fetch error status: " + response.status);

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
    console.error("Fallo al cargar subtítulos:", err);
  }
}

/**
 * Helper extractor for video URLs from objects or arrays
 */
function extractVideoUrlFromObj(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.videoUrl) return obj.videoUrl;
  if (obj.video) return obj.video;
  if (obj.url) return obj.url;
  return '';
}

/**
 * Helper extractor for subtitle URLs from objects or arrays
 */
function extractSubUrlFromObj(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.subtitleUrl) return obj.subtitleUrl;
  if (obj.subUrl) return obj.subUrl;
  return '';
}

/**
 * Initialize video player with content data from Firestore
 */
async function initPlayer() {
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
      if (mediaTitle) mediaTitle.textContent = "No se encontró el video";
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
        if (e.target.value) {
          loadSubtitleTrack(videoPlayer, e.target.value);
        } else {
          videoPlayer.querySelectorAll('track').forEach(t => t.remove());
        }
      });
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', togglePlayPause);
    }

    videoPlayer.play().catch(() => {});
  } catch (err) {
    console.error("Error al inicializar el reproductor:", err);
  }
}

// Attach all module handlers
setupActivityListeners();
setupKeyboardControls();
setupVideoPlayerEvents();
setupProgressBar();
setupBackButton();

// Execute Initialization
initPlayer();
