import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');

const userLang = localStorage.getItem('lumera_lang') || 'es';

async function loadMediaDetails() {
  if (!mediaId) return window.location.href = 'home.html';

  const docRef = doc(db, "content", mediaId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return window.location.href = 'home.html';

  const media = docSnap.data();

  // Cargar metadatos
  document.getElementById('detailsHero').style.backgroundImage = `url('${media.images?.banner}')`;
  document.getElementById('mediaTitle').textContent = media.title;
  document.getElementById('mediaYear').textContent = media.year || '2026';
  document.getElementById('mediaAge').textContent = `${media.ageRating}+`;
  document.getElementById('mediaType').textContent = media.type === 'movie' ? 'Película' : 'Serie';
  
  // Descripción según i18n
  const synopsis = media.i18n?.[userLang]?.synopsis || media.synopsis || "Sin descripción disponible.";
  document.getElementById('mediaSynopsis').textContent = synopsis;

  // Si es Película, botón directo a Play
  if (media.type === 'movie') {
    document.getElementById('episodesHeading').style.display = 'none';
    document.getElementById('mainPlayBtn').onclick = () => {
      window.location.href = `play.html?id=${mediaId}&type=movie`;
    };
  } else {
    // Si es Serie, renderizar lista de episodios de la Temporada 1
    renderEpisodes(media);
  }
}

function renderEpisodes(media) {
  const container = document.getElementById('episodesContainer');
  container.innerHTML = '';

  const season = media.seasons?.[0]; // Temporada 1 por defecto
  if (!season || !season.episodes) return;

  season.episodes.forEach((ep) => {
    const div = document.createElement('div');
    div.className = 'episode-card';
    div.innerHTML = `
      <div>
        <strong>E${ep.episodeNumber}: ${ep.title}</strong>
      </div>
      <svg class="icon-svg" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
    `;
    div.onclick = () => {
      window.location.href = `play.html?id=${mediaId}&ep=${ep.episodeNumber}`;
    };
    container.appendChild(div);
  });
}

loadMediaDetails();
