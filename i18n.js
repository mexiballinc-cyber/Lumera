const dictionaries = {
  es: {
    cmsTitle:'CMS Películas y Series', back:'← Volver a Ajustes', publishHeading:'Publicar nuevo contenido', title:'Título del contenido', type:'Tipo de contenido', movie:'Película', series:'Serie', year:'Año de estreno', age:'Clasificación de edad (más de 10 se oculta en Kids)', poster:'URL del póster', banner:'URL del banner de fondo', synopsis:'Sinopsis', playback:'Reproducción por idioma', videoUrl:'URL del video', subtitlesUrl:'URL del archivo de subtítulos (.vtt)', addSeason:'+ Agregar temporada', season:'Temporada', seasonName:'Nombre de la temporada', addEpisode:'+ Agregar episodio', episode:'Episodio', episodeTitle:'Título del episodio', publish:'Guardar y publicar en Firebase', catalog:'Catálogo actual en Firebase', delete:'Eliminar', confirmDelete:'¿Seguro que deseas eliminar este contenido?', required:'Ingresa el título y la URL del póster.', published:'Contenido publicado con éxito.', saveError:'No se pudo guardar el contenido. Revisa los permisos de Firestore e inténtalo de nuevo.', loadError:'No se pudo cargar el catálogo. Revisa la conexión y los permisos de Firestore.', typeMovie:'Película', typeSeries:'Serie', language:'Idioma de la interfaz', languages:{es:'Español',en:'Inglés',pt:'Portugués',fr:'Francés'}, noCatalog:'Aún no hay contenido publicado.', cancel:'Cancelar'
  },
  en: {
    cmsTitle:'Movies & Series CMS', back:'← Back to settings', publishHeading:'Publish new content', title:'Content title', type:'Content type', movie:'Movie', series:'Series', year:'Release year', age:'Age rating (over 10 is hidden in Kids)', poster:'Poster URL', banner:'Background banner URL', synopsis:'Synopsis', playback:'Playback by language', videoUrl:'Video URL', subtitlesUrl:'Subtitle file URL (.vtt)', addSeason:'+ Add season', season:'Season', seasonName:'Season name', addEpisode:'+ Add episode', episode:'Episode', episodeTitle:'Episode title', publish:'Save and publish to Firebase', catalog:'Current Firebase catalog', delete:'Delete', confirmDelete:'Are you sure you want to delete this content?', required:'Enter the title and poster URL.', published:'Content published successfully.', saveError:'Could not save content. Check Firestore permissions and try again.', loadError:'Could not load the catalog. Check your connection and Firestore permissions.', typeMovie:'Movie', typeSeries:'Series', language:'Interface language', languages:{es:'Spanish',en:'English',pt:'Portuguese',fr:'French'}, noCatalog:'No content published yet.', cancel:'Cancel'
  },
  pt: {
    cmsTitle:'CMS de Filmes e Séries', back:'← Voltar às configurações', publishHeading:'Publicar novo conteúdo', title:'Título do conteúdo', type:'Tipo de conteúdo', movie:'Filme', series:'Série', year:'Ano de lançamento', age:'Classificação etária (acima de 10 fica oculto em Kids)', poster:'URL do pôster', banner:'URL do banner de fundo', synopsis:'Sinopse', playback:'Reprodução por idioma', videoUrl:'URL do vídeo', subtitlesUrl:'URL do arquivo de legendas (.vtt)', addSeason:'+ Adicionar temporada', season:'Temporada', seasonName:'Nome da temporada', addEpisode:'+ Adicionar episódio', episode:'Episódio', episodeTitle:'Título do episódio', publish:'Salvar e publicar no Firebase', catalog:'Catálogo atual no Firebase', delete:'Excluir', confirmDelete:'Tem certeza de que deseja excluir este conteúdo?', required:'Informe o título e a URL do pôster.', published:'Conteúdo publicado com sucesso.', saveError:'Não foi possível salvar. Verifique as permissões do Firestore e tente novamente.', loadError:'Não foi possível carregar o catálogo. Verifique a conexão e as permissões do Firestore.', typeMovie:'Filme', typeSeries:'Série', language:'Idioma da interface', languages:{es:'Espanhol',en:'Inglês',pt:'Português',fr:'Francês'}, noCatalog:'Ainda não há conteúdo publicado.', cancel:'Cancelar'
  },
  fr: {
    cmsTitle:'CMS Films et séries', back:'← Retour aux paramètres', publishHeading:'Publier un nouveau contenu', title:'Titre du contenu', type:'Type de contenu', movie:'Film', series:'Série', year:'Année de sortie', age:'Classification d’âge (plus de 10 ans est masqué dans Kids)', poster:'URL de l’affiche', banner:'URL de la bannière de fond', synopsis:'Synopsis', playback:'Lecture par langue', videoUrl:'URL de la vidéo', subtitlesUrl:'URL du fichier de sous-titres (.vtt)', addSeason:'+ Ajouter une saison', season:'Saison', seasonName:'Nom de la saison', addEpisode:'+ Ajouter un épisode', episode:'Épisode', episodeTitle:'Titre de l’épisode', publish:'Enregistrer et publier sur Firebase', catalog:'Catalogue actuel Firebase', delete:'Supprimer', confirmDelete:'Voulez-vous vraiment supprimer ce contenu ?', required:'Saisissez le titre et l’URL de l’affiche.', published:'Contenu publié avec succès.', saveError:'Impossible d’enregistrer. Vérifiez les autorisations Firestore et réessayez.', loadError:'Impossible de charger le catalogue. Vérifiez la connexion et les autorisations Firestore.', typeMovie:'Film', typeSeries:'Série', language:'Langue de l’interface', languages:{es:'Espagnol',en:'Anglais',pt:'Portugais',fr:'Français'}, noCatalog:'Aucun contenu publié pour le moment.', cancel:'Annuler'
  }
};

export function getLanguage() {
  const saved = localStorage.getItem('lumera_lang') || 'es';
  return dictionaries[saved] ? saved : 'es';
}

export function translate(key, language = getLanguage()) {
  const dict = dictionaries[dictionaries[language] ? language : 'es'];
  return key.split('.').reduce((value, part) => value?.[part], dict) ?? key;
}

export function applyTranslations(root = document) {
  const language = getLanguage();
  document.documentElement.lang = language;
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = translate(element.dataset.i18n, language);
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = translate(element.dataset.i18nPlaceholder, language);
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel, language));
  });
  return language;
}

export const supportedLanguages = ['es', 'en', 'pt', 'fr'];
