import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { getLanguage } from './i18n.js';

const params = new URLSearchParams(window.location.search);
const mediaId = params.get('id');
const requestedEp = Number(params.get('ep') || 1);
const requestedSeason = Number(params.get('season') || 1);
const requestedTime = Math.max(0, Math.floor(Number(params.get('t') || 0)));
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
let lastSavedSecond = -1;
let initialSeekApplied = false;

// Control de "¿Sigues viendo?" (45 min sin interacción)
const STILL_WATCHING_MS = 45 * 60 * 1000;
let stillWatchingTimer = null;
let stillWatchingAutoExitTimer = null;
let stillWatchingModal = null;

const STILL_WATCHING_TEXT = {
  es: {
    kicker: 'LUMERA · PAUSA AUTOMÁTICA',
    title: '¿Sigues viendo?',
    subtitle: 'Llevas un buen rato sin interactuar con el reproductor.',
    continueBtn: 'Continuar viendo',
    exitBtn: 'Volver al inicio'
  },
  en: {
    kicker: 'LUMERA · AUTO PAUSE',
    title: 'Are you still watching?',
    subtitle: "You haven't interacted with the player for a while.",
    continueBtn: 'Continue watching',
    exitBtn: 'Back to home'
  },
  pt: {
    kicker: 'LUMERA · PAUSA AUTOMÁTICA',
    title: 'Você ainda está assistindo?',
    subtitle: 'Você está há algum tempo sem interagir com o player.',
    continueBtn: 'Continuar assistindo',
    exitBtn: 'Voltar ao início'
  },
  fr: {
    kicker: 'LUMERA · PAUSE AUTOMATIQUE',
    title: 'Vous regardez toujours ?',
    subtitle: "Vous n'avez pas interagi avec le lecteur depuis un moment.",
    continueBtn: 'Continuer à regarder',
    exitBtn: "Retour à l'accueil"
  }
}[lang] || {
  kicker: 'LUMERA · PAUSA AUTOMÁTICA',
  title: '¿Sigues viendo?',
  subtitle: 'Llevas un buen rato sin interactuar con el reproductor.',
  continueBtn: 'Continuar viendo',
  exitBtn: 'Volver al inicio'
};

// Aplicar color de acento guardado en el reproductor
const savedAccent = localStorage.getItem('lumera_accent_color');
if (savedAccent && /^#[\da-f]{6}$/i.test(savedAccent)) {
  document.documentElement.style.setProperty('--accent-color', savedAccent);
  document.documentElement.style.setProperty('--accent-glow', `${savedAccent}55`);
}

function ensureStillWatchingModal() {
  if (stillWatchingModal) return stillWatchingModal;

  const style = document.createElement('style');
  style.textContent = `
    .still-watching-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(10px);
    }
    .still-watching-backdrop.is-open {
      display: flex;
    }
    .still-watching-card {
      width: min(440px, 100%);
      padding: 26px 24px;
      border-radius: 22px;
      background: rgba(20, 20, 24, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 28px 80px rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(24px) saturate(150%);
      color: #f7f5ef;
      text-align: center;
    }
    .still-watching-kicker {
      margin: 0 0 8px;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      color: var(--accent-color, #d4af37);
    }
    .still-watching-card h3 {
      margin: 0 0 8px;
      font-size: 1.55rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .still-watching-card p {
      margin: 0 0 20px;
      font-size: 0.92rem;
      color: #b8b4ac;
      line-height: 1.5;
    }
    .still-watching-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .still-watching-btn-primary {
      flex: 1;
      min-width: 150px;
      min-height: 44px;
      padding: 0 18px;
      border-radius: 12px;
      border: 0;
      background: var(--accent-color, #d4af37);
      color: #161208;
      font-weight: 750;
      cursor: pointer;
    }
    .still-watching-btn-secondary {
      flex: 1;
      min-width: 140px;
      min-height: 44px;
      padding: 0 18px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.06);
      color: #f7f5ef;
      font-weight: 650;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'still-watching-backdrop';
  backdrop.id = 'stillWatchingModal';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.innerHTML = `
    <div class="still-watching-card">
      <p class="still-watching-kicker">${STILL_WATCHING_TEXT.kicker}</p>
      <h3>${STILL_WATCHING_TEXT.title}</h3>
      <p>${STILL_WATCHING_TEXT.subtitle}</p>
      <div class="still-watching-actions">
        <button type="button" class="still-watching-btn-primary" id="stillWatchingContinueBtn">${STILL_WATCHING_TEXT.continueBtn}</button>
        <button type="button" class="still-watching-btn-secondary" id="stillWatchingExitBtn">${STILL_WATCHING_TEXT.exitBtn}</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  backdrop.querySelector('#stillWatchingContinueBtn').addEventListener('click', () => {
    closeStillWatchingModal();
    video.play().catch(() => {});
  });

  backdrop.querySelector('#stillWatchingExitBtn').addEventListener('click', () => {
    location.href = 'home.html';
  });

  stillWatchingModal = backdrop;
  return backdrop;
}

function openStillWatchingModal() {
  const modalEl = ensureStillWatchingModal();
  video.pause();
  document.body.classList.remove('controls-hidden');
  modalEl.classList.add('is-open');

  clearTimeout(stillWatchingAutoExitTimer);
  stillWatchingAutoExitTimer = setTimeout(() => {
    location.href = 'home.html';
  }, 30000);
}

function closeStillWatchingModal() {
  clearTimeout(stillWatchingAutoExitTimer);
  if (stillWatchingModal) stillWatchingModal.classList.remove('is-open');
  resetStillWatchingTimer();
}

function resetStillWatchingTimer() {
  clearTimeout(stillWatchingTimer);
  if (stillWatchingModal?.classList.contains('is-open')) return;
  stillWatchingTimer = setTimeout(() => {
    if (!video.paused && !video.ended) {
      openStillWatchingModal();
    }
  }, STILL_WATCHING_MS);
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
    const isModalOpen = (modal && !modal.hidden) || stillWatchingModal?.classList.contains('is-open');
    if (!video.paused && !video.ended && !isModalOpen && !isAnyDropdownOpen()) {
      document.body.classList.add('controls-hidden');
    }
  }, 3000);
}

['pointermove', 'pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
  document.addEventListener(evt, () => {
    resetControlsTimer();
    resetStillWatchingTimer();
  }, { passive: true });
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

video.addEventListener('playing', () => {
  resetControlsTimer();
  resetStillWatchingTimer();
});

function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function saveHistory(id, season, ep, currentTimeSeconds = 0) {
  try {
    let history = JSON.parse(localStorage.getItem('lumera_continue_watching') || '[]');
    const cleanTime = Math.max(0, Math.floor(Number(currentTimeSeconds || 0)));
    history = history.filter(item => (typeof item === 'string' ? item : item.id) !== id);
    history.unshift({ id, season, ep, time: cleanTime, updatedAt: Date.now() });
    localStorage.setItem('lumera_continue_watching', JSON.stringify(history.slice(0, 25)));
  } catch (e) {}
}

function removeFromHistory(id) {
  try {
    let history = JSON.parse(localStorage.getItem('lumera_continue_watching') || '[]');
    history = history.filter(item => (typeof item === 'string' ? item : item.id) !== id);
    localStorage.setItem('lumera_continue_watching', JSON.stringify(history));
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
    const cleanUrl = targetUrl.trim()
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('?dl=0', '')
      .replace('&dl=0', '')
      .replace('?raw=1', '');

    const res = await fetch(cleanUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let text = await res.text();
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!text.trim().startsWith('WEBVTT')) {
      text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
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
    console.warn('Fallo fetch de subtítulo, usando fallback directo:', err);
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
  const selectedAudioKey = audioKeys.includes(lang) ? lang : (audioKeys[0] || '');
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
    video.addEventListener('loadedmetadata', () => {
      if (!initialSeekApplied && requestedTime > 0 && requestedTime < video.duration - 5) {
        initialSeekApplied = true;
        video.currentTime = requestedTime;
      }
    }, { once: true });
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
  resetStillWatchingTimer();
};

video.onpause = () => {
  if (playIcon) playIcon.style.display = 'block';
  if (pauseIcon) pauseIcon.style.display = 'none';
  document.body.classList.remove('controls-hidden');
  if (mediaId && video.currentTime > 0) {
    saveHistory(mediaId, requestedSeason, requestedEp, video.currentTime);
  }
};

video.ontimeupdate = () => {
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  if (progressFill) progressFill.style.width = `${pct}%`;
  if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;

  const sec = Math.floor(video.currentTime);
  if (mediaId && sec > 0 && sec - lastSavedSecond >= 5) {
    lastSavedSecond = sec;
    saveHistory(mediaId, requestedSeason, requestedEp, sec);
  }
};

if (progressBar) {
  progressBar.onclick = (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
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
    if (mediaId && video.currentTime > 0) {
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
    location.href = nextUrl;
  } else {
    if (mediaId) removeFromHistory(mediaId);
    location.href = 'home.html';
  }
};

init();
