const dictionaries = {
  es: {
    cmsTitle:'CMS Películas y Series', back:'← Volver a Ajustes', publishHeading:'Añadir contenido', localeHint:'Completa los datos de cada idioma usando las banderas. El póster, banner y metadatos generales se comparten.', interfaceLanguage:'Idioma de interfaz', activeLanguage:'Idioma activo', contentName:'Nombre', description:'Descripción', participants:'Participantes', poster:'Portada (URL)', banner:'Banner (URL)', year:'Año', ageRating:'Clasificación de edad (>10 se oculta en Kids)', contentType:'¿Serie o película?', movie:'Película', series:'Serie', playbackForLanguage:'Video y subtítulos del idioma seleccionado', videoUrl:'URL del video', subtitleUrl:'URL de subtítulos (.vtt)', subtitleHint:'Los subtítulos deben ser un archivo WebVTT (.vtt) accesible por URL.', seasonsEpisodes:'Temporadas y episodios', season:'Temporada', seasonName:'Nombre de la temporada', episode:'Episodio', episodeTitle:'Título del episodio', addSeason:'+ Agregar temporada', addEpisode:'+ Agregar episodio', remove:'Quitar', publish:'Guardar y publicar en Firebase', catalog:'Catálogo actual', loading:'Cargando…', noContent:'Aún no hay contenido publicado.', untitled:'Sin título', delete:'Eliminar', confirmDelete:'¿Seguro que deseas eliminar este contenido?', deleteError:'No se pudo eliminar el contenido.', required:'Ingresa un nombre en al menos un idioma y la URL del póster.', published:'Contenido publicado con éxito.', saveError:'No se pudo guardar. Revisa los permisos de Firestore e inténtalo de nuevo.', loadError:'No se pudo cargar el catálogo. Revisa tu conexión y los permisos de Firestore.', titlePlaceholder:'Nombre en el idioma seleccionado', descriptionPlaceholder:'Descripción en el idioma seleccionado', participantsPlaceholder:'Actores, directores, etc.', imageUrlPlaceholder:'https://…', videoPlaceholder:'URL del video del idioma activo', subtitlePlaceholder:'URL de subtítulos del idioma activo'
  },
  en: {
    cmsTitle:'Movies & Series CMS', back:'← Back to settings', publishHeading:'Add content', localeHint:'Enter each language version using the flags. Poster, banner, and general metadata are shared.', interfaceLanguage:'Interface language', activeLanguage:'Active language', contentName:'Name', description:'Description', participants:'Cast and crew', poster:'Poster (URL)', banner:'Banner (URL)', year:'Year', ageRating:'Age rating (>10 hidden in Kids)', contentType:'Series or movie?', movie:'Movie', series:'Series', playbackForLanguage:'Video and subtitles for selected language', videoUrl:'Video URL', subtitleUrl:'Subtitle URL (.vtt)', subtitleHint:'Subtitles must be a URL-accessible WebVTT (.vtt) file.', seasonsEpisodes:'Seasons and episodes', season:'Season', seasonName:'Season name', episode:'Episode', episodeTitle:'Episode title', addSeason:'+ Add season', addEpisode:'+ Add episode', remove:'Remove', publish:'Save and publish to Firebase', catalog:'Current catalog', loading:'Loading…', noContent:'No content published yet.', untitled:'Untitled', delete:'Delete', confirmDelete:'Are you sure you want to delete this content?', deleteError:'Could not delete the content.', required:'Enter a name in at least one language and the poster URL.', published:'Content published successfully.', saveError:'Could not save. Check Firestore permissions and try again.', loadError:'Could not load the catalog. Check your connection and Firestore permissions.', titlePlaceholder:'Name in the selected language', descriptionPlaceholder:'Description in the selected language', participantsPlaceholder:'Actors, directors, etc.', imageUrlPlaceholder:'https://…', videoPlaceholder:'Video URL for the active language', subtitlePlaceholder:'Subtitle URL for the active language'
  },
  pt: {
    cmsTitle:'CMS de Filmes e Séries', back:'← Voltar às configurações', publishHeading:'Adicionar conteúdo', localeHint:'Preencha cada idioma usando as bandeiras. Pôster, banner e metadados gerais são compartilhados.', interfaceLanguage:'Idioma da interface', activeLanguage:'Idioma ativo', contentName:'Nome', description:'Descrição', participants:'Elenco e equipe', poster:'Pôster (URL)', banner:'Banner (URL)', year:'Ano', ageRating:'Classificação etária (>10 fica oculto em Kids)', contentType:'Série ou filme?', movie:'Filme', series:'Série', playbackForLanguage:'Vídeo e legendas do idioma selecionado', videoUrl:'URL do vídeo', subtitleUrl:'URL das legendas (.vtt)', subtitleHint:'As legendas devem ser um arquivo WebVTT (.vtt) acessível por URL.', seasonsEpisodes:'Temporadas e episódios', season:'Temporada', seasonName:'Nome da temporada', episode:'Episódio', episodeTitle:'Título do episódio', addSeason:'+ Adicionar temporada', addEpisode:'+ Adicionar episódio', remove:'Remover', publish:'Salvar e publicar no Firebase', catalog:'Catálogo atual', loading:'Carregando…', noContent:'Ainda não há conteúdo publicado.', untitled:'Sem título', delete:'Excluir', confirmDelete:'Tem certeza de que deseja excluir este conteúdo?', deleteError:'Não foi possível excluir o conteúdo.', required:'Informe um nome em pelo menos um idioma e a URL do pôster.', published:'Conteúdo publicado com sucesso.', saveError:'Não foi possível salvar. Verifique as permissões do Firestore e tente novamente.', loadError:'Não foi possível carregar o catálogo. Verifique sua conexão e as permissões do Firestore.', titlePlaceholder:'Nome no idioma selecionado', descriptionPlaceholder:'Descrição no idioma selecionado', participantsPlaceholder:'Atores, diretores etc.', imageUrlPlaceholder:'https://…', videoPlaceholder:'URL do vídeo do idioma ativo', subtitlePlaceholder:'URL das legendas do idioma ativo'
  },
  fr: {
    cmsTitle:'CMS Films et séries', back:'← Retour aux paramètres', publishHeading:'Ajouter du contenu', localeHint:'Renseignez chaque langue avec les drapeaux. Affiche, bannière et métadonnées générales sont partagées.', interfaceLanguage:'Langue de l’interface', activeLanguage:'Langue active', contentName:'Nom', description:'Description', participants:'Distribution et équipe', poster:'Affiche (URL)', banner:'Bannière (URL)', year:'Année', ageRating:'Classification d’âge (>10 masqué dans Kids)', contentType:'Série ou film ?', movie:'Film', series:'Série', playbackForLanguage:'Vidéo et sous-titres de la langue sélectionnée', videoUrl:'URL de la vidéo', subtitleUrl:'URL des sous-titres (.vtt)', subtitleHint:'Les sous-titres doivent être un fichier WebVTT (.vtt) accessible par URL.', seasonsEpisodes:'Saisons et épisodes', season:'Saison', seasonName:'Nom de la saison', episode:'Épisode', episodeTitle:'Titre de l’épisode', addSeason:'+ Ajouter une saison', addEpisode:'+ Ajouter un épisode', remove:'Retirer', publish:'Enregistrer et publier sur Firebase', catalog:'Catalogue actuel', loading:'Chargement…', noContent:'Aucun contenu publié pour le moment.', untitled:'Sans titre', delete:'Supprimer', confirmDelete:'Voulez-vous vraiment supprimer ce contenu ?', deleteError:'Impossible de supprimer le contenu.', required:'Saisissez un nom dans au moins une langue et l’URL de l’affiche.', published:'Contenu publié avec succès.', saveError:'Impossible d’enregistrer. Vérifiez les autorisations Firestore et réessayez.', loadError:'Impossible de charger le catalogue. Vérifiez la connexion et les autorisations Firestore.', titlePlaceholder:'Nom dans la langue sélectionnée', descriptionPlaceholder:'Description dans la langue sélectionnée', participantsPlaceholder:'Acteurs, réalisateurs, etc.', imageUrlPlaceholder:'https://…', videoPlaceholder:'URL vidéo de la langue active', subtitlePlaceholder:'URL des sous-titres de la langue active'
  }
};

export const supportedLanguages = ['es', 'en', 'pt', 'fr'];
export function getLanguage() {
  const stored = localStorage.getItem('lumera_lang') || 'es';
  return dictionaries[stored] ? stored : 'es';
}
export function t(key, language = getLanguage()) {
  return dictionaries[language]?.[key] ?? dictionaries.es[key] ?? key;
}
export function setLanguage(language) {
  if (!dictionaries[language]) return getLanguage();
  localStorage.setItem('lumera_lang', language);
  document.documentElement.lang = language;
  applyTranslations();
  return language;
}
export function applyTranslations(root = document) {
  const language = getLanguage();
  document.documentElement.lang = language;
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const translation = t(element.dataset.i18n, language);
    if (translation !== element.dataset.i18n) element.textContent = translation;
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder, language);
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel, language));
  });
  return language;
}
export function initApp() {
  const accent = localStorage.getItem('lumera_accent_color') || '#d4af37';
  document.documentElement.style.setProperty('--accent-color', accent);
  applyTranslations();
}
export const app = { initApp, applyTranslations, setLanguage, getLanguage, t };
