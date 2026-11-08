import { db } from './firebase.js';
import { applyTranslations, getLanguage, setLanguage, t, supportedLanguages } from './i18n.js';
import { addDoc, collection, getDocs, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const LOCALES = {
  es: { flag: '🇪🇸', label: 'Español' },
  en: { flag: '🇺🇸', label: 'English' },
  pt: { flag: '🇵🇹', label: 'Português' },
  fr: { flag: '🇫🇷', label: 'Français' }
};
const $ = (id) => document.getElementById(id);
let activeLocale = getLanguage();
let seasonsDraft = [];
let seasonSequence = 0;
let episodeSequence = 0;
let busy = false;

function localizedRecord() {
  return { title: '', synopsis: '', participants: '', video: '', subtitles: '' };
}
function blankContent() {
  const i18n = Object.fromEntries(supportedLanguages.map((lang) => [lang, localizedRecord()]));
  return { i18n, seasons: [] };
}
let contentDraft = blankContent();

function setStatus(message = '', error = false) {
  const node = $('cmsStatus');
  node.textContent = message;
  node.style.color = error ? '#ffaaaa' : '';
}
function localeData(record, locale) {
  record[locale] ||= localizedRecord();
  return record[locale];
}
function captureCurrentLocale() {
  const current = localeData(contentDraft.i18n, activeLocale);
  current.title = $('localizedTitle').value.trim();
  current.synopsis = $('localizedSynopsis').value.trim();
  current.participants = $('localizedParticipants').value.trim();
  current.video = $('localizedVideo').value.trim();
  current.subtitles = $('localizedSubtitle').value.trim();

  document.querySelectorAll('.cms-season').forEach((seasonNode) => {
    const season = seasonsDraft.find((item) => item.key === seasonNode.dataset.key);
    if (!season) return;
    localeData(season.i18n, activeLocale).title = seasonNode.querySelector('.season-title').value.trim();
    seasonNode.querySelectorAll('.cms-episode').forEach((episodeNode) => {
      const episode = season.episodes.find((item) => item.key === episodeNode.dataset.key);
      if (!episode) return;
      const data = localeData(episode.i18n, activeLocale);
      data.title = episodeNode.querySelector('.episode-title').value.trim();
      data.video = episodeNode.querySelector('.episode-video').value.trim();
      data.subtitles = episodeNode.querySelector('.episode-subtitle').value.trim();
    });
  });
}
function renderCurrentLocale() {
  const current = localeData(contentDraft.i18n, activeLocale);
  $('localizedTitle').value = current.title || '';
  $('localizedSynopsis').value = current.synopsis || '';
  $('localizedParticipants').value = current.participants || '';
  $('localizedVideo').value = current.video || '';
  $('localizedSubtitle').value = current.subtitles || '';
  $('activeLanguageLabel').textContent = `${t('activeLanguage')}: ${LOCALES[activeLocale].flag} ${LOCALES[activeLocale].label}`;
  document.querySelectorAll('[data-locale]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.locale === activeLocale));
  });
  renderSeasons();
}
function makeInput({ label, value = '', className, type = 'text', placeholder = '' }) {
  const wrapper = document.createElement('label');
  wrapper.className = 'cms-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') input.type = type;
  input.className = `cms-input ${className}`;
  input.value = value || '';
  input.placeholder = placeholder;
  wrapper.append(caption, input);
  return wrapper;
}
function renderSeasons() {
  const container = $('seasonsContainer');
  container.replaceChildren();
  seasonsDraft.forEach((season, seasonIndex) => {
    const seasonLocale = localeData(season.i18n, activeLocale);
    const block = document.createElement('section');
    block.className = 'cms-season';
    block.dataset.key = season.key;
    const header = document.createElement('div');
    header.className = 'cms-season-head';
    const heading = document.createElement('h3');
    heading.textContent = `${t('season')} ${seasonIndex + 1}`;
    const removeSeason = document.createElement('button');
    removeSeason.type = 'button';
    removeSeason.className = 'cms-small-btn cms-danger';
    removeSeason.dataset.action = 'remove-season';
    removeSeason.textContent = t('remove');
    header.append(heading, removeSeason);
    block.append(header, makeInput({ label: t('seasonName'), value: seasonLocale.title, className: 'season-title', placeholder: `${t('season')} ${seasonIndex + 1}` }));

    const episodes = document.createElement('div');
    episodes.className = 'episodes-container';
    season.episodes.forEach((episode, episodeIndex) => {
      const episodeLocale = localeData(episode.i18n, activeLocale);
      const episodeNode = document.createElement('article');
      episodeNode.className = 'cms-episode';
      episodeNode.dataset.key = episode.key;
      const episodeHeader = document.createElement('div');
      episodeHeader.className = 'cms-episode-head';
      const episodeHeading = document.createElement('h4');
      episodeHeading.textContent = `${t('episode')} ${episodeIndex + 1}`;
      const removeEpisode = document.createElement('button');
      removeEpisode.type = 'button';
      removeEpisode.className = 'cms-small-btn cms-danger';
      removeEpisode.dataset.action = 'remove-episode';
      removeEpisode.textContent = t('remove');
      episodeHeader.append(episodeHeading, removeEpisode);
      episodeNode.append(
        episodeHeader,
        makeInput({ label: t('episodeTitle'), value: episodeLocale.title, className: 'episode-title', placeholder: t('episodeTitle') }),
        makeInput({ label: t('videoUrl'), value: episodeLocale.video, className: 'episode-video', type: 'url', placeholder: t('videoPlaceholder') }),
        makeInput({ label: t('subtitleUrl'), value: episodeLocale.subtitles, className: 'episode-subtitle', type: 'url', placeholder: t('subtitlePlaceholder') })
      );
      episodes.appendChild(episodeNode);
    });
    block.appendChild(episodes);
    const addEpisode = document.createElement('button');
    addEpisode.type = 'button';
    addEpisode.className = 'cms-small-btn';
    addEpisode.dataset.action = 'add-episode';
    addEpisode.textContent = t('addEpisode');
    block.appendChild(addEpisode);
    container.appendChild(block);
  });
}

function resetEditor() {
  contentDraft = blankContent();
  seasonsDraft = [];
  $('localizedTitle').value = '';
  $('localizedSynopsis').value = '';
  $('localizedParticipants').value = '';
  $('localizedVideo').value = '';
  $('localizedSubtitle').value = '';
  $('poster').value = '';
  $('banner').value = '';
  $('year').value = new Date().getFullYear();
  $('ageRating').value = '';
  document.querySelector('input[name="contentType"][value="movie"]').checked = true;
  $('seriesSection').hidden = true;
  renderSeasons();
  renderCurrentLocale();
}

async function publishMedia() {
  if (busy) return;
  captureCurrentLocale();
  const poster = $('poster').value.trim();
  const title = Object.values(contentDraft.i18n).find((locale) => locale.title)?.title;
  if (!title || !poster) {
    setStatus(t('required'), true);
    $('localizedTitle').focus();
    return;
  }
  const type = document.querySelector('input[name="contentType"]:checked').value;
  const payload = {
    title,
    type,
    year: Number($('year').value) || new Date().getFullYear(),
    ageRating: Number($('ageRating').value) || 0,
    images: { poster, banner: $('banner').value.trim() },
    i18n: Object.fromEntries(supportedLanguages.map((lang) => {
      const data = contentDraft.i18n[lang] || localizedRecord();
      return [lang, { title: data.title, synopsis: data.synopsis, participants: data.participants }];
    })),
    sources: Object.fromEntries(supportedLanguages.map((lang) => [lang, contentDraft.i18n[lang]?.video || '']).filter(([, value]) => value)),
    subtitles: Object.fromEntries(supportedLanguages.map((lang) => [lang, contentDraft.i18n[lang]?.subtitles || '']).filter(([, value]) => value))
  };

  if (type === 'series') {
    payload.seasons = seasonsDraft.map((season, seasonIndex) => ({
      seasonNumber: seasonIndex + 1,
      title: Object.values(season.i18n).find((locale) => locale.title)?.title || `${t('season')} ${seasonIndex + 1}`,
      i18n: Object.fromEntries(supportedLanguages.map((lang) => [lang, { title: season.i18n[lang]?.title || '' }])),
      episodes: season.episodes.map((episode, episodeIndex) => ({
        episodeNumber: episodeIndex + 1,
        title: Object.values(episode.i18n).find((locale) => locale.title)?.title || `${t('episode')} ${episodeIndex + 1}`,
        i18n: Object.fromEntries(supportedLanguages.map((lang) => [lang, { title: episode.i18n[lang]?.title || '' }])),
        sources: Object.fromEntries(supportedLanguages.map((lang) => [lang, episode.i18n[lang]?.video || '']).filter(([, value]) => value)),
        subtitles: Object.fromEntries(supportedLanguages.map((lang) => [lang, episode.i18n[lang]?.subtitles || '']).filter(([, value]) => value))
      }))
    }));
  }

  busy = true;
  $('publishBtn').disabled = true;
  try {
    await addDoc(collection(db, 'content'), payload);
    setStatus(t('published'));
    resetEditor();
    await loadCatalog();
  } catch (error) {
    console.error('CMS publish failed:', error);
    setStatus(t('saveError'), true);
  } finally {
    busy = false;
    $('publishBtn').disabled = false;
  }
}

async function loadCatalog() {
  const list = $('publishedContentList');
  list.replaceChildren();
  try {
    const snapshot = await getDocs(collection(db, 'content'));
    if (snapshot.empty) {
      const empty = document.createElement('p');
      empty.className = 'cms-empty';
      empty.textContent = t('noContent');
      list.appendChild(empty);
      return;
    }
    snapshot.forEach((entry) => {
      const item = entry.data();
      const row = document.createElement('article');
      row.className = 'cms-catalog-item';
      const main = document.createElement('div');
      main.className = 'cms-catalog-main';
      const image = document.createElement('img');
      image.src = item.images?.poster || '';
      image.alt = '';
      const copy = document.createElement('div');
      copy.className = 'cms-catalog-copy';
      const title = document.createElement('strong');
      title.textContent = item.i18n?.[activeLocale]?.title || item.title || t('untitled');
      const meta = document.createElement('span');
      meta.textContent = `${t(item.type === 'series' ? 'series' : 'movie')} · ${item.year || ''}`;
      copy.append(title, meta);
      main.append(image, copy);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cms-small-btn cms-danger';
      remove.textContent = t('delete');
      remove.addEventListener('click', async () => {
        if (!window.confirm(t('confirmDelete'))) return;
        remove.disabled = true;
        try {
          await deleteDoc(doc(db, 'content', entry.id));
          await loadCatalog();
        } catch (error) {
          console.error('CMS delete failed:', error);
          setStatus(t('deleteError'), true);
          remove.disabled = false;
        }
      });
      row.append(main, remove);
      list.appendChild(row);
    });
  } catch (error) {
    console.error('CMS catalog load failed:', error);
    const message = document.createElement('p');
    message.className = 'cms-empty';
    message.textContent = t('loadError');
    list.appendChild(message);
  }
}

function refreshInterfaceLanguage(language) {
  activeLocale = language;
  setLanguage(language);
  applyTranslations();
  $('uiLanguage').value = language;
  renderCurrentLocale();
  loadCatalog();
}

document.querySelectorAll('[data-locale]').forEach((button) => {
  button.addEventListener('click', () => {
    captureCurrentLocale();
    activeLocale = button.dataset.locale;
    renderCurrentLocale();
  });
});
$('uiLanguage').value = getLanguage();
$('uiLanguage').addEventListener('change', (event) => refreshInterfaceLanguage(event.target.value));
document.querySelectorAll('input[name="contentType"]').forEach((radio) => {
  radio.addEventListener('change', () => { $('seriesSection').hidden = radio.value !== 'series' || !radio.checked; });
});
$('addSeasonBtn').addEventListener('click', () => {
  captureCurrentLocale();
  const key = `season-${++seasonSequence}`;
  seasonsDraft.push({ key, i18n: {}, episodes: [] });
  renderSeasons();
});
$('seasonsContainer').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  captureCurrentLocale();
  const seasonNode = button.closest('.cms-season');
  const seasonIndex = seasonsDraft.findIndex((season) => season.key === seasonNode?.dataset.key);
  if (seasonIndex < 0) return;
  if (button.dataset.action === 'remove-season') seasonsDraft.splice(seasonIndex, 1);
  if (button.dataset.action === 'add-episode') {
    seasonsDraft[seasonIndex].episodes.push({ key: `episode-${++episodeSequence}`, i18n: {} });
  }
  if (button.dataset.action === 'remove-episode') {
    const episodeNode = button.closest('.cms-episode');
    seasonsDraft[seasonIndex].episodes = seasonsDraft[seasonIndex].episodes.filter((episode) => episode.key !== episodeNode.dataset.key);
  }
  renderSeasons();
});
$('publishBtn').addEventListener('click', publishMedia);

applyTranslations();
$('uiLanguage').value = getLanguage();
renderCurrentLocale();
loadCatalog();
