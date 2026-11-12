import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { getLanguage } from './i18n.js';

const params = new URLSearchParams(window.location.search);
const mediaId = params.get('id');
const requestedEp = Number(params.get('ep') || 1);
const requestedSeason = Number(params.get('season') || 1);
const lang = getLanguage();
const $ = id => document.getElementById(id);

const video = $('lumeraVideoPlayer');
const playPauseBtn = $('playPauseBtn');
const playIcon = $('playIcon');
const pauseIcon = $('pauseIcon');
const progressBar = $('progressBar');
const progressFill = $('progressFill');
const timeDisplay = $('timeDisplay');
const mediaTitle = $('mediaTitle');
const audioSelect = $('audioSelect');
const subtitleSelect = $('subtitleSelect');
const backBtn = $('backBtn');
const moreBtn = $('moreEpisodesBtn');
const modal = $('episodesModal');
const episodesContainer = $('episodesListContainer');

let currentMedia = null;
let nextUrl = null;
let currentObjectUrl = null;
let hideTimeout = null;

function resetControlsTimer() {
  document.body.classList.remove('controls-hidden');
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    const isModalOpen = modal && !modal.hidden;
    if (!video.paused && !video.ended && !isModalOpen) {
      document.body.classList.add('controls-hidden');
    }
  }, 3000);
}

['pointermove', 'pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
  document.addEventListener(evt, resetControlsTimer, { passive: true });
});

video.addEventListener('playing', resetControlsTimer);

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function saveHistory(id, season, ep) {
  try {
    let history = JSON.parse(localStorage.getItem('lumera_continue_watching') || '[]');
    history = history.filter(item => (typeof item === 'string' ? item : item.id) !== id);
    history.unshift({ id, season, ep, updatedAt: Date.now() });
    localStorage.setItem('lumera_continue_watching', JSON.stringify(history.slice(0, 25)));
  } catch (e) {}
}

// Carga robusta mediante Blob para evitar bloqueos CORS en subtítulos externos
async function activateSubtitleTrack(targetUrl) {
  Array.from(video.querySelectorAll('track')).forEach(t => t.remove());
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  if (!targetUrl) return;

  try {
    let cleanUrl = targetUrl.trim()
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "")
      .replace("&dl=0", "")
      .replace("?raw=1", "");

    const res = await fetch(cleanUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let text = await res.text();
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!text.trim().startsWith("WEBVTT")) {
      text = "WEBVTT\n\n" + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    }

    const blob = new Blob([text], { type: 'text/vtt;charset=utf-8' });
    currentObjectUrl = URL.createObjectURL(blob);

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'Subtítulo';
    track.srclang = lang;
    track.src = currentObjectUrl;
    track.default = true;

    video.appendChild(track);

    setTimeout(() => {
      if (video.textTracks && video.textTracks[0]) {
        video.textTracks[0].mode = 'showing';
      }
    }, 100);
  } catch (err) {
    console.warn("Fallo fetch de subtítulo, usando fallback directo:", err);
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'Subtítulo';
    track.srclang = lang;
    track.src = targetUrl;
    track.default = true;
    video.appendChild(track);
    setTimeout(() => {
      if (video.textTracks && video.textTracks[0]) {
        video.textTracks[0].mode = 'showing';
      }
    }, 100);
  }
}

async function init() {
  if (!mediaId) { location.href = 'home.html'; return; }
  try {
    const snap = await getDoc(doc(db, 'content', mediaId));
    if (!snap.exists()) { location.href = 'home.html'; return; }
    currentMedia = snap.data();

    saveHistory(mediaId, requestedSeason, requestedEp);

    const isSeries = currentMedia.type === 'series';
    const title = currentMedia.i18n?.[lang]?.title || currentMedia.i18n?.es?.title || currentMedia.title || 'Lumera';

    if (!isSeries) {
      if (mediaTitle) mediaTitle.textContent = title;
      loadSources(currentMedia.sources, currentMedia.subtitles);
    } else {
      const seasonData = currentMedia.seasons?.find(s => Number(s.seasonNumber) === requestedSeason) || currentMedia.seasons?.[0];
      const episodeData = seasonData?.episodes?.find(e => Number(e.episodeNumber) === requestedEp) || seasonData?.episodes?.[0];

      if (episodeData) {
        const epTitle = episodeData.i18n?.[lang]?.title || episodeData.i18n?.es?.title || episodeData.title || '';
        if (mediaTitle) mediaTitle.textContent = `${title} — T${seasonData.seasonNumber || requestedSeason}:E${episodeData.episodeNumber || requestedEp} ${epTitle}`;
        loadSources(episodeData.sources, episodeData.subtitles);

        const totalEpisodes = (currentMedia.seasons || []).reduce((acc, s) => acc + (s.episodes?.length || 0), 0);
        if (totalEpisodes > 1 && moreBtn) {
          moreBtn.hidden = false;
          renderEpisodesList();
        }

        const nextEpInSeason = seasonData.episodes?.find(e => Number(e.episodeNumber) === requestedEp + 1);
        if (nextEpInSeason) {
          nextUrl = `play.html?id=${encodeURIComponent(mediaId)}&ep=${nextEpInSeason.episodeNumber}&season=${seasonData.seasonNumber || requestedSeason}`;
        } else {
          const nextSeason = currentMedia.seasons?.find(s => Number(s.seasonNumber) === (requestedSeason + 1));
          if (nextSeason?.episodes?.length) {
            nextUrl = `play.html?id=${encodeURIComponent(mediaId)}&ep=${nextSeason.episodes[0].episodeNumber || 1}&season=${nextSeason.seasonNumber}`;
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
    location.href = 'home.html';
  }
}

function loadSources(sources = {}, subtitles = {}) {
  if (audioSelect) audioSelect.replaceChildren();
  if (subtitleSelect) subtitleSelect.replaceChildren();

  if (subtitleSelect) {
    const subOff = document.createElement('option');
    subOff.value = "";
    subOff.textContent = "Off";
    subtitleSelect.appendChild(subOff);
  }

  if (audioSelect) {
    Object.keys(sources).forEach(audioLang => {
      const opt = document.createElement('option');
      opt.value = sources[audioLang];
      opt.textContent = audioLang.toUpperCase();
      if (audioLang === lang) opt.selected = true;
      audioSelect.appendChild(opt);
    });
  }

  let autoSelectedSubUrl = null;

  if (subtitleSelect) {
    Object.keys(subtitles).forEach(subLang => {
      const opt = document.createElement('option');
      opt.value = subtitles[subLang];
      opt.textContent = subLang.toUpperCase();
      if (subLang === lang) {
        opt.selected = true;
        autoSelectedSubUrl = subtitles[subLang];
      }
      subtitleSelect.appendChild(opt);
    });
  }

  if (audioSelect && audioSelect.value) {
    video.src = audioSelect.value;
    video.play().catch(() => {});
  }

  if (autoSelectedSubUrl) activateSubtitleTrack(autoSelectedSubUrl);
}

function renderEpisodesList() {
  if (!episodesContainer) return;
  episodesContainer.replaceChildren();

  (currentMedia.seasons || []).forEach(season => {
    const seasonTitle = document.createElement('h4');
    seasonTitle.style.cssText = 'color: var(--accent-color, #d4af37); margin: 10px 0 6px; font-size: 0.9rem;';
    seasonTitle.textContent = season.i18n?.[lang]?.title || season.i18n?.es?.title || season.title || `Temporada ${season.seasonNumber}`;
    episodesContainer.appendChild(seasonTitle);

    (season.episodes || []).forEach(ep => {
      const btn = document.createElement('a');
      const isCurrent = season.seasonNumber === requestedSeason && ep.episodeNumber === requestedEp;
      btn.className = `ep-modal-item${isCurrent ? ' active' : ''}`;
      const epName = ep.i18n?.[lang]?.title || ep.i18n?.es?.title || ep.title || '';
      btn.textContent = `E${ep.episodeNumber}: ${epName}`;
      btn.href = `play.html?id=${encodeURIComponent(mediaId)}&ep=${ep.episodeNumber}&season=${season.seasonNumber}`;
      episodesContainer.appendChild(btn);
    });
  });
}

if (playPauseBtn) {
  playPauseBtn.onclick = () => {
    if (video.paused) { video.play(); } else { video.pause(); }
  };
}

video.onplay = () => {
  if (playIcon) playIcon.style.display = 'none';
  if (pauseIcon) pauseIcon.style.display = 'block';
  resetControlsTimer();
};

video.onpause = () => {
  if (playIcon) playIcon.style.display = 'block';
  if (pauseIcon) pauseIcon.style.display = 'none';
  document.body.classList.remove('controls-hidden');
};

video.ontimeupdate = () => {
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
};

if (progressBar) {
  progressBar.onclick = (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };
}

if (audioSelect) {
  audioSelect.onchange = () => {
    const time = video.currentTime;
    video.src = audioSelect.value;
    video.currentTime = time;
    video.play().catch(() => {});
  };
}

if (subtitleSelect) {
  subtitleSelect.onchange = () => {
    activateSubtitleTrack(subtitleSelect.value);
  };
}

if (moreBtn && modal) {
  moreBtn.onclick = () => { modal.hidden = !modal.hidden; };
}

if (backBtn) {
  backBtn.onclick = () => { location.href = `details.html?id=${encodeURIComponent(mediaId)}`; };
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    if (video.paused) video.play(); else video.pause();
  }
});

video.onended = () => {
  if (nextUrl) {
    location.href = nextUrl;
  } else {
    location.href = 'home.html';
  }
};

init();
