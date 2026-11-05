// app.js

// Diccionario i18n para elementos de la interfaz en los 4 idiomas
export const i18nDictionary = {
  es: {
    home: "Inicio",
    movies: "Películas",
    series: "Series",
    kids: "Niños",
    search: "Buscar",
    settings: "Configuración",
    play: "Reproducir",
    episodes: "Episodios",
    seasons: "Temporadas",
    back: "Volver"
  },
  en: {
    home: "Home",
    movies: "Movies",
    series: "Series",
    kids: "Kids",
    search: "Search",
    settings: "Settings",
    play: "Play",
    episodes: "Episodes",
    seasons: "Seasons",
    back: "Back"
  },
  pt: {
    home: "Início",
    movies: "Filmes",
    series: "Séries",
    kids: "Crianças",
    search: "Buscar",
    settings: "Configurações",
    play: "Reproduzir",
    episodes: "Episódios",
    seasons: "Temporadas",
    back: "Voltar"
  },
  fr: {
    home: "Accueil",
    movies: "Films",
    series: "Séries",
    kids: "Enfants",
    search: "Rechercher",
    settings: "Paramètres",
    play: "Lancer",
    episodes: "Épisodes",
    seasons: "Saisons",
    back: "Retour"
  }
};

// Aplicar idioma a elementos con el atributo [data-i18n]
export function applyI18n(lang = 'es') {
  const currentLang = i18nDictionary[lang] ? lang : 'es';
  localStorage.setItem('lumera_lang', currentLang);
  
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (i18nDictionary[currentLang][key]) {
      element.textContent = i18nDictionary[currentLang][key];
    }
  });
}

// Aplicar tema dinámico cambiando la variable CSS
export function setAccentColor(colorHex) {
  if (!colorHex) colorHex = '#d4af37'; // Dorado por defecto
  document.documentElement.style.setProperty('--accent-color', colorHex);
  localStorage.setItem('lumera_accent_color', colorHex);
}

// Cargar preferencias guardadas al iniciar la app
export function initApp() {
  const savedColor = localStorage.getItem('lumera_accent_color') || '#d4af37';
  const savedLang = localStorage.getItem('lumera_lang') || 'es';
  
  setAccentColor(savedColor);
  applyI18n(savedLang);
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

export const app = { initApp, applyI18n, setAccentColor };
