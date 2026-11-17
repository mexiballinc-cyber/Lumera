import { db, auth } from './firebase.js';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { getLanguage, t, applyTranslations } from './i18n.js';

const params = new URLSearchParams(location.search);
const mediaId = params.get('id');
const language = getLanguage();
const $ = (id) => document.getElementById(id);

const DEFAULT_AVATAR = 'https://i.imgur.com/cCqp6Qt.png';
let currentUser = null;
let selectedRating = 5;

const savedAccent = localStorage.getItem('lumera_accent_color');
if (savedAccent && /^#[\da-f]{6}$/i.test(savedAccent)) {
  document.documentElement.style.setProperty('--accent-color', savedAccent);
  document.documentElement.style.setProperty('--accent-glow', `${savedAccent}55`);
}

const TYPE_LABELS = {
  es: { movie: 'Película', series: 'Serie' },
  en: { movie: 'Movie', series: 'Series' },
  pt: { movie: 'Filme', series: 'Série' },
  fr: { movie: 'Film', series: 'Série' }
};

const LABELS = {
  es: {
    trailer: 'Tráiler',
    cast: 'Reparto y Participantes',
    director: 'Dirección',
    more: 'Leer más',
    less: 'Leer menos',
    reviewsTitle: 'Opiniones y calificaciones',
    reviewPlaceholder: 'Escribe tu opinión sobre este título…',
    publishBtn: 'Publicar opinión',
    updateBtn: 'Actualizar opinión',
    deleteBtn: 'Eliminar mi opinión',
    loginToReview: 'Inicia sesión para dejar tu calificación.',
    noReviews: 'Aún no hay opiniones. ¡Sé el primero en calificar!',
    savedReview: 'Opinión guardada correctamente.',
    deletedReview: 'Opinión eliminada.',
    reviewCount: (n) => `${n} ${n === 1 ? 'opinión' : 'opiniones'}`
  },
  en: {
    trailer: 'Trailer',
    cast: 'Cast & Participants',
    director: 'Director',
    more: 'Read more',
    less: 'Read less',
    reviewsTitle: 'Reviews & Ratings',
    reviewPlaceholder: 'Write your review for this title…',
    publishBtn: 'Post review',
    updateBtn: 'Update review',
    deleteBtn: 'Delete my review',
    loginToReview: 'Sign in to leave your rating.',
    noReviews: 'No reviews yet. Be the first to rate!',
    savedReview: 'Review saved.',
    deletedReview: 'Review deleted.',
    reviewCount: (n) => `${n} ${n === 1 ? 'review' : 'reviews'}`
  },
  pt: {
    trailer: 'Trailer',
    cast: 'Elenco e Participantes',
    director: 'Direção',
    more: 'Ler mais',
    less: 'Ler menos',
    reviewsTitle: 'Avaliações e Comentários',
    reviewPlaceholder: 'Escreva sua opinião sobre este título…',
    publishBtn: 'Publicar avaliação',
    updateBtn: 'Atualizar avaliação',
    deleteBtn: 'Excluir minha avaliação',
    loginToReview: 'Faça login para deixar sua avaliação.',
    noReviews: 'Ainda não há avaliações. Seja o primeiro!',
    savedReview: 'Avaliação salva.',
    deletedReview: 'Avaliação excluída.',
    reviewCount: (n) => `${n} ${n === 1 ? 'avaliação' : 'avaliações'}`
  },
  fr: {
    trailer: 'Bande-annonce',
    cast: 'Casting et Participants',
    director: 'Réalisation',
    more: 'Lire la suite',
    less: 'Lire moins',
    reviewsTitle: 'Avis et Notes',
    reviewPlaceholder: 'Écrivez votre avis sur ce titre…',
    publishBtn: 'Publier un avis',
    updateBtn: "Mettre à jour l'avis",
    deleteBtn: 'Supprimer mon avis',
    loginToReview: 'Connectez-vous pour laisser une note.',
    noReviews: 'Aucun avis pour le moment. Soyez le premier !',
    savedReview: 'Avis enregistré.',
    deletedReview: 'Avis supprimé.',
    reviewCount: (n) => `${n} avis`
  }
};

const L = LABELS[language] || LABELS.es;

function textFor(item, key) {
  return item.i18n?.[language]?.[key] || item.i18n?.es?.[key] || item[key] || '';
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showError(message) {
  $('detailsError').textContent = message;
  $('detailsError').hidden = false;
  $('mediaTitle').textContent = t('missingMedia');
}

function applyLocalizedLabels() {
  if ($('trailerBtnLabel')) $('trailerBtnLabel').textContent = L.trailer;
  if ($('reviewsHeading')) $('reviewsHeading').textContent = L.reviewsTitle;
  if ($('reviewComment')) $('reviewComment').placeholder = L.reviewPlaceholder;
  if ($('submitReviewBtn')) $('submitReviewBtn').textContent = L.publishBtn;
}

/* RESOLUCIÓN Y MODAL DE TRÁILER */
function resolveTrailerUrl(media) {
  const candidates = [
    media.i18n?.[language]?.trailer,
    media.i18n?.es?.trailer,
    media.trailers?.[language],
    media.trailers?.es,
    media.trailer,
    media.trailerUrl,
    media.videoTrailer,
    media.videos?.trailer
  ];
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return found ? found.trim() : '';
}

function getYoutubeEmbedUrl(url) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0` : '';
}

function openTrailerModal(trailerUrl, mediaTitleText) {
  const modal = $('trailerModal');
  const stage = $('trailerStage');
  const heading = $('trailerModalTitle');
  if (!modal || !stage || !trailerUrl) return;

  if (heading) heading.textContent = `${L.trailer} — ${mediaTitleText}`;
  stage.replaceChildren();

  const ytEmbed = getYoutubeEmbedUrl(trailerUrl);
  if (ytEmbed) {
    const iframe = document.createElement('iframe');
    iframe.src = ytEmbed;
    iframe.title = `${L.trailer} — ${mediaTitleText}`;
    iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    stage.appendChild(iframe);
  } else {
    const cleanDirectUrl = trailerUrl
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('?dl=0', '?raw=1');

    const videoEl = document.createElement('video');
    videoEl.src = cleanDirectUrl;
    videoEl.controls = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    stage.appendChild(videoEl);
    videoEl.play().catch(() => {});
  }

  modal.classList.add('is-open');
}

function closeTrailerModal() {
  const modal = $('trailerModal');
  const stage = $('trailerStage');
  if (!modal) return;
  modal.classList.remove('is-open');
  if (stage) {
    stage.querySelectorAll('video').forEach((v) => {
      v.pause();
      v.removeAttribute('src');
      v.load();
    });
    stage.replaceChildren();
  }
}

$('closeTrailerModalBtn')?.addEventListener('click', closeTrailerModal);
$('trailerModal')?.addEventListener('click', (e) => {
  if (e.target === $('trailerModal')) closeTrailerModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('trailerModal')?.classList.contains('is-open')) {
    closeTrailerModal();
  }
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateReviewFormState();
  if (mediaId) loadReviews();
});

function updateReviewFormState() {
  const statusEl = $('reviewStatusMsg');
  if (!currentUser) {
    if (statusEl && !statusEl.textContent) {
      statusEl.style.color = 'var(--text-muted)';
      statusEl.textContent = L.loginToReview;
    }
  } else {
    if (statusEl && statusEl.textContent === L.loginToReview) {
      statusEl.textContent = '';
    }
  }
}

function setupStarPicker() {
  const picker = $('starPicker');
  if (!picker) return;
  const buttons = picker.querySelectorAll('.star-btn');

  const paintStars = (val) => {
    buttons.forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.value) <= val);
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRating = Number(btn.dataset.value);
      paintStars(selectedRating);
    });
    btn.addEventListener('mouseenter', () => paintStars(Number(btn.dataset.value)));
  });

  picker.addEventListener('mouseleave', () => paintStars(selectedRating));
  paintStars(selectedRating);
}

async function loadMediaDetails() {
  applyTranslations();
  applyLocalizedLabels();
  setupStarPicker();

  if (!mediaId) return showError(t('missingMedia'));
  try {
    const snapshot = await getDoc(doc(db, 'content', mediaId));
    if (!snapshot.exists()) return showError(t('missingMedia'));
    const media = snapshot.data();

    const banner = media.images?.banner || media.banner || media.images?.poster || media.poster || '';
    if (banner) $('detailsHero').style.backgroundImage = `url("${banner.replace(/["\\]/g, '')}")`;

    const title = textFor(media, 'title') || t('untitled');
    $('mediaTitle').textContent = title;
    $('mediaYear').textContent = media.year || '';
    $('mediaAge').textContent = media.ageRating != null && media.ageRating !== '' ? `${media.ageRating}+` : '';
    $('mediaType').textContent = TYPE_LABELS[language]?.[media.type] || media.type || '';
    document.title = `${title} — Lumera`;

    const synopsisEl = $('mediaSynopsis');
    const synopsisText = textFor(media, 'synopsis') || t('noDescription');
    synopsisEl.textContent = synopsisText;
    setupSynopsisToggle(synopsisEl, synopsisText);

    const mainPlayBtn = $('mainPlayBtn');
    mainPlayBtn.hidden = false;

    if (media.type === 'movie') {
      mainPlayBtn.onclick = () => {
        location.href = `play.html?id=${encodeURIComponent(mediaId)}&type=movie`;
      };
      $('episodesSection').hidden = true;
    } else {
      mainPlayBtn.onclick = () => {
        const firstSeason = media.seasons?.[0];
        const firstEp = firstSeason?.episodes?.[0];
        const epNum = firstEp?.episodeNumber || 1;
        const seasonNum = firstSeason?.seasonNumber || 1;
        location.href = `play.html?id=${encodeURIComponent(mediaId)}&ep=${epNum}&season=${seasonNum}`;
      };
      $('episodesSection').hidden = false;
      renderEpisodes(media);
    }

    // Mostrar botón de Tráiler solo si existe en Firebase
    const trailerUrl = resolveTrailerUrl(media);
    const trailerBtn = $('trailerBtn');
    if (trailerBtn) {
      if (trailerUrl) {
        trailerBtn.hidden = false;
        trailerBtn.onclick = () => openTrailerModal(trailerUrl, title);
      } else {
        trailerBtn.hidden = true;
      }
    }

    renderParticipants(media);
    $('reviewsSection').hidden = false;
    await loadReviews();
  } catch (error) {
    console.error('No se cargaron detalles:', error);
    showError(t('detailsLoadError'));
  }
}

function setupSynopsisToggle(synopsisEl, text) {
  const prevBtn = $('synopsisToggleBtn');
  if (prevBtn) prevBtn.remove();
  synopsisEl.classList.remove('is-clamped');

  if (!text || text.length < 150) return;

  synopsisEl.classList.add('is-clamped');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'synopsisToggleBtn';
  btn.className = 'synopsis-toggle-btn';
  btn.textContent = L.more;

  btn.addEventListener('click', () => {
    const clamped = synopsisEl.classList.toggle('is-clamped');
    btn.textContent = clamped ? L.more : L.less;
  });

  synopsisEl.insertAdjacentElement('afterend', btn);
}

function renderEpisodes(media) {
  const container = $('episodesContainer');
  container.replaceChildren();

  (media.seasons || []).forEach((season, seasonIndex) => {
    const section = document.createElement('section');
    section.className = 'details-season';

    const heading = document.createElement('h3');
    heading.textContent =
      season.i18n?.[language]?.title ||
      season.i18n?.es?.title ||
      season.title ||
      `${t('season')} ${season.seasonNumber || seasonIndex + 1}`;
    section.appendChild(heading);

    (season.episodes || []).forEach((episode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'episode-card';

      const label = document.createElement('strong');
      label.textContent = `E${episode.episodeNumber}: ${episode.i18n?.[language]?.title || episode.i18n?.es?.title || episode.title || ''}`;

      const play = document.createElement('span');
      play.setAttribute('aria-hidden', 'true');
      play.textContent = '▶';

      button.append(label, play);
      button.addEventListener('click', () => {
        location.href = `play.html?id=${encodeURIComponent(mediaId)}&ep=${episode.episodeNumber}&season=${season.seasonNumber || seasonIndex + 1}`;
      });
      section.appendChild(button);
    });

    container.appendChild(section);
  });

  if (!container.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'details-state';
    empty.textContent = t('noEpisodes');
    container.appendChild(empty);
  }
}

function renderParticipants(media) {
  const participantsSection = $('participantsSection');
  if (!participantsSection) return;
  participantsSection.replaceChildren();

  const i18nParticipants = media.i18n?.[language]?.participants || media.i18n?.es?.participants;
  const castList = i18nParticipants || media.cast || media.participants || media.reparto || media.actors || [];
  const directorsList = media.director || media.directors || media.directores || [];

  const rawCast = Array.isArray(castList) ? castList.join(', ') : String(castList || '');
  const rawDirector = Array.isArray(directorsList) ? directorsList.join(', ') : String(directorsList || '');

  if (!rawCast && !rawDirector) {
    participantsSection.hidden = true;
    return;
  }

  participantsSection.hidden = false;

  const titleHeading = document.createElement('h2');
  titleHeading.className = 'participants-heading';
  titleHeading.textContent = L.cast;
  participantsSection.appendChild(titleHeading);

  if (rawDirector) {
    const dirBox = document.createElement('div');
    dirBox.className = 'participants-director';
    dirBox.innerHTML = `<strong style="color: var(--accent-color); font-weight: 700;">${escapeHtml(L.director)}:</strong> <span style="font-weight: 600; color: #fff;">${escapeHtml(rawDirector)}</span>`;
    participantsSection.appendChild(dirBox);
  }

  if (rawCast) {
    const castBox = document.createElement('div');
    castBox.className = 'participants-card';
    castBox.innerHTML = `<span class="participants-card-label">${escapeHtml(L.cast)}</span><span class="participants-card-text">${escapeHtml(rawCast)}</span>`;
    participantsSection.appendChild(castBox);
  }
}

async function loadReviews() {
  const listEl = $('reviewsList');
  const summaryEl = $('reviewsSummary');
  const ratingTag = $('mediaRatingTag');
  if (!listEl || !mediaId) return;

  try {
    const q = query(collection(db, 'reviews'), where('mediaId', '==', mediaId));
    const snap = await getDocs(q);
    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    reviews.sort((a, b) => Number(b.updatedAt?.seconds || 0) - Number(a.updatedAt?.seconds || 0));

    let sum = 0;
    let validCount = 0;
    reviews.forEach((r) => {
      const val = Number(r.rating);
      if (!isNaN(val) && val >= 1 && val <= 5) {
        sum += val;
        validCount++;
      }
    });

    const avg = validCount > 0 ? (sum / validCount).toFixed(1) : '5.0';
    if (ratingTag) {
      ratingTag.textContent = `⭐ ${avg}`;
      ratingTag.hidden = false;
    }
    if (summaryEl) {
      summaryEl.textContent = validCount > 0 ? `⭐ ${avg} · ${L.reviewCount(validCount)}` : L.reviewCount(0);
    }

    listEl.replaceChildren();
    if (!reviews.length) {
      listEl.innerHTML = `<p class="review-status-msg">${escapeHtml(L.noReviews)}</p>`;
      return;
    }

    const activeUid = auth.currentUser?.uid || currentUser?.uid || localStorage.getItem('lumera_session') || '';

    reviews.forEach((rev) => {
      const isMine = Boolean(activeUid && rev.userId === activeUid);
      if (isMine) {
        selectedRating = Number(rev.rating) || 5;
        $('starPicker')?.querySelectorAll('.star-btn').forEach((btn) => {
          btn.classList.toggle('active', Number(btn.dataset.value) <= selectedRating);
        });
        if ($('reviewComment')) $('reviewComment').value = rev.comment || '';
        if ($('submitReviewBtn')) $('submitReviewBtn').textContent = L.updateBtn;
      }

      const starsCount = Math.max(1, Math.min(5, Math.round(Number(rev.rating) || 5)));
      const starsStr = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

      const card = document.createElement('article');
      card.className = 'review-item';
      card.innerHTML = `
        <div class="review-item-top">
          <div class="review-author">
            <img src="${escapeHtml(rev.avatar || DEFAULT_AVATAR)}" alt="">
            <span>${escapeHtml(rev.authorName || 'Usuario Lumera')}</span>
          </div>
          <span class="review-stars-display" aria-label="${starsCount} de 5">${starsStr}</span>
        </div>
        ${rev.comment ? `<p class="review-body">${escapeHtml(rev.comment)}</p>` : ''}
      `;

      if (isMine) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'review-delete-btn';
        delBtn.textContent = L.deleteBtn;
        delBtn.addEventListener('click', async () => {
          try {
            await deleteDoc(doc(db, 'reviews', rev.id));
            if ($('reviewComment')) $('reviewComment').value = '';
            if ($('submitReviewBtn')) $('submitReviewBtn').textContent = L.publishBtn;
            if ($('reviewStatusMsg')) {
              $('reviewStatusMsg').style.color = 'var(--accent-color)';
              $('reviewStatusMsg').textContent = L.deletedReview;
            }
            await loadReviews();
          } catch (err) {
            if ($('reviewStatusMsg')) {
              $('reviewStatusMsg').style.color = '#ff6b7a';
              $('reviewStatusMsg').textContent = `No se pudo eliminar (${err.code || 'error'}).`;
            }
          }
        });
        card.appendChild(delBtn);
      }

      listEl.appendChild(card);
    });
  } catch (err) {
    console.error('Error cargando reseñas:', err);
  }
}

if ($('submitReviewBtn')) {
  $('submitReviewBtn').addEventListener('click', async () => {
    const btn = $('submitReviewBtn');
    const statusEl = $('reviewStatusMsg');

    if (auth.authStateReady) await auth.authStateReady();
    const user = auth.currentUser || currentUser;

    if (!user) {
      if (statusEl) {
        statusEl.style.color = '#ff6b7a';
        statusEl.textContent = L.loginToReview;
      }
      return;
    }
    if (!mediaId) return;

    const comment = ($('reviewComment')?.value || '').trim();
    const activeProfile = JSON.parse(localStorage.getItem('lumera_active_profile') || 'null');

    btn.disabled = true;
    if (statusEl) {
      statusEl.style.color = 'var(--text-muted)';
      statusEl.textContent = '…';
    }

    try {
      const reviewDocId = `${mediaId}_${user.uid}`;
      await setDoc(doc(db, 'reviews', reviewDocId), {
        mediaId,
        userId: user.uid,
        authorName: activeProfile?.name || user.displayName || user.email?.split('@')[0] || 'Usuario',
        avatar: activeProfile?.avatar || DEFAULT_AVATAR,
        rating: selectedRating,
        comment,
        updatedAt: serverTimestamp()
      });

      if (statusEl) {
        statusEl.style.color = 'var(--accent-color)';
        statusEl.textContent = L.savedReview;
      }
      btn.textContent = L.updateBtn;
      await loadReviews();
    } catch (err) {
      console.error('Error guardando reseña:', err);
      if (statusEl) {
        statusEl.style.color = '#ff6b7a';
        statusEl.textContent = err.code === 'permission-denied'
          ? 'Permiso denegado en Firestore (revisa las reglas de "reviews").'
          : `No se pudo publicar (${err.code || 'error'}).`;
      }
    } finally {
      btn.disabled = false;
    }
  });
}

loadMediaDetails();
