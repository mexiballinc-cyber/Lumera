const dictionaries = {
  es: {
    cmsTitle:'CMS Películas y Series',back:'← Volver a Ajustes',publishHeading:'Añadir contenido',localeHint:'Completa los datos de cada idioma usando las banderas. El póster, banner y metadatos generales se comparten.',interfaceLang:'Idioma de la interfaz',play:'Reproducir',viewDetails:'Ver detalles',connectCatalog:'Conectando con tu catálogo…',continueWatching:'Continuar viendo',newArrivals:'Nuevos agregados',catalogKicker:'LUMERA PICKS',catalogEmpty:'Tu catálogo te espera',findStory:'ENCUENTRA TU PRÓXIMA HISTORIA',searchContent:'Buscar contenido',titleLabel:'Título',category:'Categoría',all:'Todas',results:'Resultados',yourStyle:'A TU ESTILO',accentColor:'Color de acento',accentDetails:'Detalles, bordes y resplandores',interfaceLanguage:'Idioma de la interfaz',audio:'Audio',subtitles:'Subtítulos',offLabel:'Off',previous:'Anterior',next:'Próximo',settings:'Ajustes',heroEyebrow:'TU PRÓXIMA HISTORIA',home:'Inicio',movie:'Películas',series:'Series',kids:'Kids',search:'Buscar',connecting:'Conectando con tu catálogo…',continueKicker:'RETOMA DONDE LO DEJASTE',newItems:'Nuevos agregados',explore:'Explora el catálogo',catalogConnectedEmpty:'Catálogo conectado · aún no hay contenido publicado',catalogConnectError:'No se pudo conectar con el catálogo.',noSearchResults:'No encontramos títulos con esos filtros.',tryOtherFilters:'Prueba con otra sección o ajusta los filtros.'
  },
  en: {
    cmsTitle:'Movies & Series CMS',back:'← Back to settings',publishHeading:'Add content',localeHint:'Enter each language version using the flags. Poster, banner, and general metadata are shared.',interfaceLang:'Interface language',play:'Play',viewDetails:'View details',connectCatalog:'Connecting to your catalog…',continueWatching:'Continue watching',newArrivals:'New arrivals',catalogKicker:'LUMERA PICKS',catalogEmpty:'Your catalog is waiting',findStory:'FIND YOUR NEXT STORY',searchContent:'Search content',titleLabel:'Title',category:'Category',all:'All',results:'Results',yourStyle:'YOUR STYLE',accentColor:'Accent color',accentDetails:'Details, borders, and glows',interfaceLanguage:'Interface language',audio:'Audio',subtitles:'Subtitles',offLabel:'Off',previous:'Previous',next:'Next',settings:'Settings',heroEyebrow:'YOUR NEXT STORY',home:'Home',movie:'Movies',series:'Series',kids:'Kids',search:'Search',connecting:'Connecting to your catalog…',continueKicker:'PICK UP WHERE YOU LEFT OFF',newItems:'Recently added',explore:'Explore the catalog',catalogConnectedEmpty:'Catalog connected · no content published yet',catalogConnectError:'The catalog could not be reached.',noSearchResults:'No titles match those filters.',tryOtherFilters:'Try another section or adjust the filters.'
  },
  pt: {
    cmsTitle:'CMS de Filmes e Séries',back:'← Voltar às configurações',publishHeading:'Adicionar conteúdo',localeHint:'Preencha cada idioma usando as bandeiras. Pôster, banner e metadados gerais são compartilhados.',interfaceLang:'Idioma da interface',play:'Reproduzir',viewDetails:'Ver detalhes',connectCatalog:'Conectando com seu catálogo…',continueWatching:'Continuar assistindo',newArrivals:'Novidades',catalogKicker:'LUMERA PICKS',catalogEmpty:'Seu catálogo está esperando',findStory:'ENCONTRE SUA PRÓXIMA HISTÓRIA',searchContent:'Buscar conteúdo',titleLabel:'Título',category:'Categoria',all:'Todas',results:'Resultados',yourStyle:'DO SEU JEITO',accentColor:'Cor de destaque',accentDetails:'Detalhes, bordas e brilhos',interfaceLanguage:'Idioma da interface',audio:'Áudio',subtitles:'Legendas',offLabel:'Off',previous:'Anterior',next:'Próximo',settings:'Configurações',heroEyebrow:'SUA PRÓXIMA HISTÓRIA',home:'Início',movie:'Filmes',series:'Séries',kids:'Kids',search:'Buscar',connecting:'Conectando com seu catálogo…',continueKicker:'CONTINUE DE ONDE PAROU',newItems:'Adicionados recentemente',explore:'Explore o catálogo',catalogConnectedEmpty:'Catálogo conectado · ainda não há conteúdo publicado',catalogConnectError:'Não foi possível conectar com o catálogo.',noSearchResults:'Não encontramos títulos com esses filtros.',tryOtherFilters:'Teste outra seção ou ajuste os filtros.'
  },
  fr: {
    cmsTitle:'CMS Films et séries',back:'← Retour aux réglages',publishHeading:'Ajouter du contenu',localeHint:'Renseignez chaque langue avec les drapeaux. Affiche, bannière et métadonnées générales sont partagées.',interfaceLang:'Langue de l’interface',play:'Lire',viewDetails:'Voir les détails',connectCatalog:'Connexion à votre catalogue…',continueWatching:'Continuer la lecture',newArrivals:'Nouveautés',catalogKicker:'LUMERA PICKS',catalogEmpty:'Votre catalogue vous attend',findStory:'TROUVEZ VOTRE PROCHAINE HISTOIRE',searchContent:'Rechercher du contenu',titleLabel:'Titre',category:'Catégorie',all:'Toutes',results:'Résultats',yourStyle:'À VOTRE GOÛT',accentColor:'Couleur d’accentuation',accentDetails:'Détails, bords et reflets',interfaceLanguage:'Langue de l’interface',audio:'Audio',subtitles:'Sous-titres',offLabel:'Off',previous:'Précédent',next:'Suivant',settings:'Paramètres',heroEyebrow:'VOTRE PROCHAINE HISTOIRE',home:'Accueil',movie:'Films',series:'Séries',kids:'Kids',search:'Rechercher',connecting:'Connexion à votre catalogue…',continueKicker:'REPRENEZ OÙ VOUS AVEZ ARRÊTÉ',newItems:'Récemment ajoutés',explore:'Explorez le catalogue',catalogConnectedEmpty:'Catalogue connecté · aucun contenu publié pour le moment',catalogConnectError:'Le catalogue est inaccessible.',noSearchResults:'Aucun titre ne correspond à ces filtres.',tryOtherFilters:'Essayez une autre section ou ajustez les filtres.'
  }
};

const legacyTextKeys = {
  'Inicio':'home','Home':'home','Início':'home','Accueil':'home',
  'Películas':'movie','Movies':'movie','Filmes':'movie','Films':'movie',
  'Series':'series','Séries':'series','Kids':'kids','Niños':'kids','Crianças':'kids','Enfants':'kids','Sparks':'sparks',
  'Buscar':'search','Search':'search','Rechercher':'search','Configuração':'settings','Configuración':'settings','Settings':'settings','Paramètres':'settings','Configurações':'settings',
  'TU PRÓXIMA HISTORIA':'heroEyebrow','YOUR NEXT STORY':'heroEyebrow','SUA PRÓXIMA HISTÓRIA':'heroEyebrow','VOTRE PROCHAINE HISTOIRE':'heroEyebrow',
  'Ver detalles':'viewDetails','View details':'viewDetails','Conectando con tu catálogo…':'connecting','Connecting to your catalog…':'connecting',
  'RETOMA DONDE LO DEJASTE':'continueKicker','PICK UP WHERE YOU LEFT OFF':'continueKicker','Continuar viendo':'continueWatching','Continue watching':'continueWatching',
  'RECIÉN LLEGADOS':'newArrivals','NEW ARRIVALS':'newArrivals','Nuevos agregados':'newItems','Recently added':'newItems','SELECCIÓN LUMERA':'catalogKicker','LUMERA PICKS':'catalogKicker',
  'Explora el catálogo':'explore','Explore the catalog':'explore','Seu catálogo está esperando':'catalogEmpty','Tu catálogo te espera':'catalogEmpty','Your catalog is waiting':'catalogEmpty','[...]':'catalogEmpty',
  'ENCUENTRA TU PRÓXIMA HISTORIA':'findStory','FIND YOUR NEXT STORY':'findStory','ENCONTRE SUA PRÓXIMA HISTÓRIA':'findStory','TROUVEZ VOTRE PROCHAINE HISTOIRE':'findStory',
  'Buscar contenido':'searchContent','Search content':'searchContent','Rechercher du contenu':'searchContent','Título':'titleLabel','Title':'titleLabel','Titre':'titleLabel',
  'Categoría':'category','Category':'category','Categoria':'category','Catégorie':'category','Todas':'all','All':'all','Toutes':'all','Resultados':'results','Results':'results','Résultats':'results',
  'A TU ESTILO':'yourStyle','YOUR STYLE':'yourStyle','DO SEU JEITO':'yourStyle','À VOTRE GOÛT':'yourStyle','Idioma de la interfaz':'interfaceLang','Interface language':'interfaceLang','Idioma da interface':'interfaceLang','Langue de l’interface':'interfaceLang',
  'Color de acento':'accentColor','Accent color':'accentColor','Cor de destaque':'accentColor','Couleur d’accentuation':'accentColor','Detalles, bordes y resplandores':'accentDetails','Details, borders, and glows':'accentDetails',
  'Ahora viendo':'nowWatching','Now watching':'nowWatching','Assistindo agora':'nowWatching','Lecture en cours':'nowWatching','Audio':'audio','Subtítulos':'subtitles','Subtitles':'subtitles','Legendas':'subtitles','Sous-titres':'subtitles','Off':'offLabel',
  'Anterior':'previous','Previous':'previous','Próximo':'next','Siguiente':'next','Next':'next','Off':'offLabel',
  'No encontramos títulos con esos filtros.':'noSearchResults','No titles match those filters.':'noSearchResults','Prueba con otra sección o ajusta los filtros.':'tryOtherFilters',
  'Catálogo conectado · aún no hay contenido publicado':'catalogConnectedEmpty','No se pudo conectar con el catálogo.':'catalogConnectError'
};

export const supportedLanguages=['es','en','pt','fr'];
export const i18nDictionary=dictionaries;

export function getLanguage(){
  const stored=localStorage.getItem('lumera_lang')||'es';
  return dictionaries[stored]?stored:'es';
}

export function t(key,language=getLanguage()){
  return dictionaries[language]?.[key] ?? dictionaries.es[key] ?? key;
}

export function translate(key,language=getLanguage()){
  return t(key,language);
}

function translateLegacyText(root,language){
  if(!root?.ownerDocument && root!==document)return;
  const doc=root.nodeType===9?root:root.ownerDocument;
  const walker=doc.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const changes=[];
  while(walker.nextNode()){
    const node=walker.currentNode;
    if(node.parentElement?.closest('[data-i18n],script,style,textarea,input,select,option,[contenteditable="true"]'))continue;
    const raw=node.nodeValue||'', trimmed=raw.trim(), key=legacyTextKeys[trimmed];
    if(!key)continue;
    const translated=t(key,language);
    if(translated===key)continue;
    const leading=raw.match(/^\s*/)?.[0]||'', trailing=raw.match(/\s*$/)?.[0]||'';
    changes.push([node,`${leading}${translated}${trailing}`]);
  }
  changes.forEach(([node,value])=>{if(node.isConnected)node.nodeValue=value;});
}

let observer;
let isApplyingTranslations=false;

export function applyTranslations(root=document){
  if(typeof document==='undefined')return getLanguage();
  if(isApplyingTranslations)return getLanguage();

  const language=getLanguage();
  document.documentElement.lang=language;
  const scope=root?.nodeType===9?root:root || document;
  if(!scope) return language;

  isApplyingTranslations=true;
  try {
    scope.querySelectorAll?.('[data-i18n]').forEach((element)=>{
      const value=t(element.dataset.i18n,language);
      if(value !== element.dataset.i18n && element.textContent !== value){
        element.textContent=value;
      }
    });

    scope.querySelectorAll?.('[data-i18n-placeholder]').forEach((element)=>{
      const value=t(element.dataset.i18nPlaceholder,language);
      if(element.placeholder !== value) element.placeholder=value;
    });

    scope.querySelectorAll?.('[data-i18n-aria-label]').forEach((element)=>{
      const value=t(element.dataset.i18nAriaLabel,language);
      if(element.getAttribute('aria-label') !== value) element.setAttribute('aria-label',value);
    });

    scope.querySelectorAll?.('input[placeholder],textarea[placeholder]').forEach((element)=>{
      const key=legacyTextKeys[element.placeholder];
      if(key){
        const translated=t(key,language);
        if(element.placeholder !== translated) element.placeholder=translated;
      }
    });

    translateLegacyText(scope,language);
  } finally {
    isApplyingTranslations=false;
  }

  return language;
}

export function initApp(){
  document.documentElement.style.setProperty('--accent-color',localStorage.getItem('lumera_accent_color')||'#d4af37');
  applyTranslations();

  if(observer) observer.disconnect();

  observer=new MutationObserver((records)=>{
    if(isApplyingTranslations) return;
    const roots=new Set();
    for(const record of records){
      if(record.type==='characterData'){
        const parent=record.target.parentElement || document.body;
        if(parent) roots.add(parent);
      }
      for(const node of record.addedNodes||[]){
        if(node.nodeType===Node.ELEMENT_NODE) roots.add(node);
      }
    }
    roots.forEach((root)=>{
      if(root && root.isConnected) applyTranslations(root);
    });
  });

  if(document.body){
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }
}

export const applyI18n=applyTranslations;

export function setLanguage(language){
  if(!dictionaries[language]) return getLanguage();
  localStorage.setItem('lumera_lang',language);
  applyTranslations();
  return language;
}

export const app={initApp,applyI18n:applyTranslations,applyTranslations,setLanguage,getLanguage,t};

if(typeof document!=='undefined'){
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initApp,{once:true});
  else initApp();
}
