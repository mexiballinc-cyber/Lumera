import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { getLanguage } from './i18n.js';

const params = new URLSearchParams(window.location.search);
const mediaId = params.get('id');
const requestedEp = Number(params.get('ep') || 1);
const requestedSeason = Number(params.get('season') || 1);
const requestedTime = Math.max(0, Number(params.get('t') || 0));
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

const audioWrap = $('audioWrap');
const audioBtn = $('audioBtn');
const audioLabel = $('audioLabel');
const audioMenu = $('audioMenu');

const subtitleWrap = $('subtitleWrap');
const subtitleBtn = $('subtitleBtn');
const subtitleLabel = $('subtitleLabel');
const subtitleMenu = $('subtitleMenu');

const backBtn = $('backBtn');
const moreBtn = $('moreEpisodesBtn');
const modal = $('episodesModal');
const episodesContainer = $('episodesListContainer');

let currentMedia = null;
let nextUrl = null;
let currentObjectUrl = null;
let hideTimeout = null;
let currentAudioUrl = '';
let currentSubtitleUrl = '';
let initialSeekApplied = false;
let lastSavedSecond = -1;

// Aplicar color de acento guardado en el reproductor
const savedAccent = localStorage.getItem('lumera_accent_color');
if (savedAccent && /^#[\da-f]{6}$/i.test(savedAccent)) {
  document.documentElement.style.setProperty('--accent-color', savedAccent);
  document.documentElement.style.setProperty('--accent-glow', `${savedAccent}55`);
}

function isAnyDropdownOpen() {
  return (audioMenu && !audioMenu.hidden) || (subtitleMenu && !subtitleMenu.hidden);
}

function closeAllDropdowns() {
  if (audioMenu) audioMenu.hidden = true;
  if (audioWrap) audioWrap.classList.remove('open');
  if (subtitleMenu) subtitleMenu.hidden = true;
  if (subtitleWrap) subtitleWrap.classList.remove('open');
}

function resetControlsTimer() {
  document.body.classList.remove('controls-hidden');
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    const isModalOpen = modal && !modal.hidden;
    if (!video.paused && !video.ended && !isModalOpen && !isAnyDropdownOpen()) {
      document.body.classList.add('controls-hidden');
    }
  }, 3000);
}

['pointermove', 'pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
  document.addEventListener(evt, resetControlsTimer, { passive: true });
});

document.addEventListener('click', (e) => {
  if (audioWrap && !audioWrap.contains(e.target) && subtitleWrap && !subtitleWrap.contains(e.target)) {
    closeAllDropdowns();
  }
});

if (audioBtn && audioMenu) {
  audioBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = audioMenu.hidden;
    closeAllDropdowns();
    if (willOpen) {
      audioMenu.hidden = false;
      audioWrap?.classList.add('open');
    }
    resetControlsTimer();
  });
}

if (subtitleBtn && subtitleMenu) {
  subtitleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = subtitleMenu.hidden;
    closeAllDropdowns();
    if (willOpen) {
      subtitleMenu.hidden = false;
      subtitleWrap?.classList.add('open');
    }
    resetControlsTimer();
  });
}

video.addEventListener('playing', resetControlsTimer);

function formatTime(seconds) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function saveHistory(id, season, ep, time = 0) {
  if (!id) return;
  try {
    let history = JSON.parse(localStorage.getItem('lumera_continue_watching') || '[]');
    history = history.filter(item => (typeof item === 'string' ? item : item.id) !== id);
    history.unshift({
      id,
      season,
      ep,
      time: Math.max(0, Math.floor(Number(time) || 0)),
      updatedAt: Date.now()
    });
    localStorage.setItem('lumera_continue_watching', JSON.stringify(history.slice(0, 25)));
  } catch (e) {}
}

function removeFromHistory(id) {
  if (!id) return;
  ['lumera_continue_watching', 'lumera_watch_history'].forEach(storageKey => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const filtered = list.filter(item => (typeof item === 'string' ? item : item?.id) !== id);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch (e) {}
  });
}

function applyResumeSeek() {
  if (initialSeekApplied || requestedTime <= 0) return;
  if (!Number.isFinite(video.duration) || video.duration <= 0) return;
  const safeTarget = Math.min(requestedTime, Math.max(0, video.duration - 2));
  if (safeTarget > 0) {
    try {
      video.currentTime = safeTarget;
      initialSeekApplied = true;
    } catch (e) {}
  }
}

video.addEventListener('loadedmetadata', applyResumeSeek);
video.addEventListener('canplay', applyResumeSeek);

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

    saveHistory(mediaId, requestedSeason, requestedEp, requestedTime);

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

function updateMenuSelection(menuEl, selectedValue) {
  if (!menuEl) return;
  menuEl.querySelectorAll('.custom-dropdown-option').forEach(btn => {
    const isSelected = btn.dataset.value === selectedValue;
    btn.classList.toggle('active', isSelected);
  });
}

function loadSources(sources = {}, subtitles = {}) {
  const audioKeys = Object.keys(sources);
  let selectedAudioKey = audioKeys.includes(lang) ? lang : (audioKeys[0] || '');
  currentAudioUrl = selectedAudioKey ? sources[selectedAudioKey] : '';

  if (audioLabel) audioLabel.textContent = selectedAudioKey ? selectedAudioKey.toUpperCase() : '—';

  if (audioMenu) {
    audioMenu.replaceChildren();
    audioKeys.forEach(audioLang => {
      const url = sources[audioLang];
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.className = `custom-dropdown-option${audioLang === selectedAudioKey ? ' active' : ''}`;
      optBtn.dataset.value = url;
      optBtn.textContent = audioLang.toUpperCase();

      optBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentAudioUrl !== url) {
          const time = video.currentTime;
          currentAudioUrl = url;
          video.src = url;
          video.currentTime = time;
          video.play().catch(() => {});
        }
        if (audioLabel) audioLabel.textContent = audioLang.toUpperCase();
        updateMenuSelection(audioMenu, url);
        closeAllDropdowns();
        resetControlsTimer();
      });

      audioMenu.appendChild(optBtn);
    });
  }

  const subKeys = Object.keys(subtitles);
  const selectedSubKey = subKeys.includes(lang) ? lang : '';
  currentSubtitleUrl = selectedSubKey ? subtitles[selectedSubKey] : '';

  if (subtitleLabel) subtitleLabel.textContent = selectedSubKey ? selectedSubKey.toUpperCase() : 'Off';

  if (subtitleMenu) {
    subtitleMenu.replaceChildren();

    const offBtn = document.createElement('button');
    offBtn.type = 'button';
    offBtn.className = `custom-dropdown-option${!currentSubtitleUrl ? ' active' : ''}`;
    offBtn.dataset.value = '';
    offBtn.textContent = 'Off';
    offBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentSubtitleUrl = '';
      if (subtitleLabel) subtitleLabel.textContent = 'Off';
      updateMenuSelection(subtitleMenu, '');
      activateSubtitleTrack('');
      closeAllDropdowns();
      resetControlsTimer();
    });
    subtitleMenu.appendChild(offBtn);

    subKeys.forEach(subLang => {
      const url = subtitles[subLang];
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.className = `custom-dropdown-option${subLang === selectedSubKey ? ' active' : ''}`;
      optBtn.dataset.value = url;
      optBtn.textContent = subLang.toUpperCase();

      optBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentSubtitleUrl = url;
        if (subtitleLabel) subtitleLabel.textContent = subLang.toUpperCase();
        updateMenuSelection(subtitleMenu, url);
        activateSubtitleTrack(url);
        closeAllDropdowns();
        resetControlsTimer();
      });

      subtitleMenu.appendChild(optBtn);
    });
  }

  if (currentAudioUrl) {
    video.src = currentAudioUrl;
    video.play().catch(() => {});
  }

  if (currentSubtitleUrl) {
    activateSubtitleTrack(currentSubtitleUrl);
  }
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
  if (video.duration && !video.ended && video.currentTime > 3 && video.currentTime < video.duration - 5) {
    saveHistory(mediaId, requestedSeason, requestedEp, video.currentTime);
  }
};

video.ontimeupdate = () => {
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;

  const currentSec = Math.floor(video.currentTime);
  if (currentSec > 3 && currentSec < video.duration - 5 && Math.abs(currentSec - lastSavedSecond) >= 3) {
    lastSavedSecond = currentSec;
    saveHistory(mediaId, requestedSeason, requestedEp, currentSec);
  }
};

window.addEventListener('pagehide', () => {
  if (video.duration && !video.ended && video.currentTime > 3 && video.currentTime < video.duration - 5) {
    saveHistory(mediaId, requestedSeason, requestedEp, video.currentTime);
  }
});

if (progressBar) {
  progressBar.onclick = (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
    if (video.duration && video.currentTime < video.duration - 5) {
      saveHistory(mediaId, requestedSeason, requestedEp, video.currentTime);
    }
  };
}

if (moreBtn && modal) {
  moreBtn.onclick = () => {
    closeAllDropdowns();
    modal.hidden = !modal.hidden;
  };
}

if (backBtn) {
  backBtn.onclick = () => {
    if (video.duration && !video.ended && video.currentTime > 3 && video.currentTime < video.duration - 5) {
      saveHistory(mediaId, requestedSeason, requestedEp, video.currentTime);
    }
    location.href = `details.html?id=${encodeURIComponent(mediaId)}`;
  };
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    if (video.paused) video.play(); else video.pause();
  }
});

video.onended = () => {
  if (nextUrl) {
    const nextParams = new URL(nextUrl, location.origin).searchParams;
    saveHistory(
      mediaId,
      Number(nextParams.get('season') || requestedSeason),
      Number(nextParams.get('ep') || requestedEp + 1),
      0
    );
    location.href = nextUrl;
  } else {
    removeFromHistory(mediaId);
    location.href = 'home.html';
  }
};

init();
