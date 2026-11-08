import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';
import { getLanguage, t } from './i18n.js';

const params=new URLSearchParams(location.search);
const mediaId=params.get('id');
const episodeNumber=Number(params.get('ep')||1);
const seasonNumber=Number(params.get('season')||1);
const player=document.getElementById('lumeraVideoPlayer');
const audioSelect=document.getElementById('audioSelect');
const subtitleSelect=document.getElementById('subtitleSelect');
const subtitleStatus=document.getElementById('subtitleStatus');
const backButton=document.getElementById('backBtn');
const language=getLanguage();
const languageNames={es:'Español',en:'English',pt:'Português',fr:'Français'};
let controlTimer;
backButton?.addEventListener('click',()=>{player.pause();location.href=mediaId?`details.html?id=${encodeURIComponent(mediaId)}`:'home.html';});
function showSubtitleStatus(message='',isError=false){if(!subtitleStatus)return;subtitleStatus.textContent=message;subtitleStatus.hidden=!message;subtitleStatus.classList.toggle('is-error',isError);}
function populateSelect(select,values,includeOff=false){select.replaceChildren();if(includeOff){const option=document.createElement('option');option.value='';option.textContent=t('off');select.appendChild(option);}Object.entries(values||{}).filter(([,url])=>typeof url==='string'&&url.trim()).forEach(([code,url])=>{const option=document.createElement('option');option.value=url.trim();option.dataset.language=code;option.textContent=languageNames[code]||code.toUpperCase();select.appendChild(option);});}
function normalizeLocalizedSources(value,defaultLanguage=language){
 if(typeof value==='string')return value.trim()?{[defaultLanguage]:value.trim()}:{};
 if(!value||typeof value!=='object')return{};
 const result={};for(const [key,item] of Object.entries(value)){if(typeof item==='string'&&item.trim())result[key.toLowerCase()]=item.trim();else if(item&&typeof item==='object'){const url=item.url||item.src||item.videoUrl||item.video||item.file;if(typeof url==='string'&&url.trim())result[key.toLowerCase()]=url.trim();}}
 return result;
}
function findSources(primary,record,locale){
 const direct=normalizeLocalizedSources(primary,locale);
 if(Object.keys(direct).length)return direct;
 for(const field of ['videoSources','sourcesByLanguage','videos','audioSources']){const result=normalizeLocalizedSources(record?.[field],locale);if(Object.keys(result).length)return result;}
 const single=record?.videoUrl||record?.video||record?.sourceUrl||record?.url;
 return typeof single==='string'&&single.trim()?{[locale]:single.trim()}:{};
}
function findSubtitles(primary,record,locale){
 const direct=normalizeLocalizedSources(primary,locale);if(Object.keys(direct).length)return direct;
 for(const field of ['subtitleSources','subtitlesByLanguage','captions']){const result=normalizeLocalizedSources(record?.[field],locale);if(Object.keys(result).length)return result;}
 const single=record?.subtitleUrl||record?.subtitle;
 return typeof single==='string'&&single.trim()?{[locale]:single.trim()}:{};
}
function clearLumeraTracks(){player.querySelectorAll('track[data-lumera-subtitle]').forEach((track)=>track.remove());for(const track of player.textTracks)track.mode='disabled';}
function applySubtitles(url,code){clearLumeraTracks();showSubtitleStatus();if(!url)return;const track=document.createElement('track');track.dataset.lumeraSubtitle='true';track.kind='subtitles';track.src=url;track.srclang=code||language;track.label=languageNames[code]||code?.toUpperCase()||'Subtitles';track.default=true;track.addEventListener('load',()=>{if(track.track)track.track.mode='showing';showSubtitleStatus();});track.addEventListener('error',()=>{showSubtitleStatus(t('subtitleLoadError'),true);console.error('Subtitle load failed. Use a valid .vtt URL that allows cross-origin requests:',url);});player.appendChild(track);if(track.track)track.track.mode='showing';}
function revealControls(){document.body.classList.remove('controls-hidden');clearTimeout(controlTimer);if(player.paused||document.activeElement===audioSelect||document.activeElement===subtitleSelect)return;controlTimer=setTimeout(()=>document.body.classList.add('controls-hidden'),3000);}
function installAutoHide(){['pointermove','pointerdown','touchstart','keydown'].forEach((name)=>document.addEventListener(name,revealControls,{passive:true}));[audioSelect,subtitleSelect].forEach((select)=>{select.addEventListener('focus',()=>{clearTimeout(controlTimer);document.body.classList.remove('controls-hidden');});select.addEventListener('blur',revealControls);});player.addEventListener('play',revealControls);player.addEventListener('pause',()=>{clearTimeout(controlTimer);document.body.classList.remove('controls-hidden');});player.addEventListener('ended',()=>{clearTimeout(controlTimer);document.body.classList.remove('controls-hidden');});revealControls();}
function reportVideoError(){const error=player.error;if(!error)return;const reasons={1:'Playback was aborted',2:'Network error while loading media',3:'Video decoding failed',4:'Video format or source is unsupported'};console.error('Video playback error:',reasons[error.code]||'Unknown media error',player.currentSrc);showSubtitleStatus(t('videoLoadError'),true);}
player.addEventListener('error',reportVideoError);
async function initPlayer(){
 if(!mediaId)return location.replace('home.html');
 try{
  // Do not set crossOrigin=anonymous on the video element: many valid media hosts
  // do not send CORS headers, and that setting prevents the video itself playing.
  player.removeAttribute('crossorigin');
  const snapshot=await getDoc(doc(db,'content',mediaId));if(!snapshot.exists())return location.replace('home.html');
  const media=snapshot.data();let record=media;let sources=findSources(media.sources,media,language);let subtitles=findSubtitles(media.subtitles,media,language);
  let title=media.i18n?.[language]?.title||media.i18n?.es?.title||media.title||'';let description=media.i18n?.[language]?.synopsis||media.i18n?.es?.synopsis||'';
  if(media.type==='series'){
   const season=(media.seasons||[]).find((item)=>Number(item.seasonNumber)===seasonNumber)||media.seasons?.[seasonNumber-1];
   const episode=season?.episodes?.find((item)=>Number(item.episodeNumber)===episodeNumber);if(!episode)throw new Error(`Episode ${episodeNumber} in season ${seasonNumber} not found`);
   record=episode;sources=findSources(episode.sources,episode,language);subtitles=findSubtitles(episode.subtitles,episode,language);
   title=`${title} · ${episode.i18n?.[language]?.title||episode.i18n?.es?.title||episode.title||`${t('episode')} ${episodeNumber}`}`;
  }
  document.getElementById('mediaTitle').textContent=title;document.getElementById('mediaDescription').textContent=description;
  populateSelect(audioSelect,sources);populateSelect(subtitleSelect,subtitles,true);
  const preferredAudio=[...audioSelect.options].find((option)=>option.dataset.language===language);if(preferredAudio)audioSelect.value=preferredAudio.value;
  if(audioSelect.value){player.src=audioSelect.value;player.load();player.play().catch(()=>{showSubtitleStatus(t('autoplayHint'));});}
  else{showSubtitleStatus(t('noVideoSource'),true);console.warn('No playback source found for media:',mediaId,record);}
  const preferredSubtitle=[...subtitleSelect.options].find((option)=>option.dataset.language===language);if(preferredSubtitle)subtitleSelect.value=preferredSubtitle.value;
  applySubtitles(subtitleSelect.value,subtitleSelect.selectedOptions[0]?.dataset.language);
  audioSelect.addEventListener('change',()=>{if(!audioSelect.value)return;const time=player.currentTime;player.src=audioSelect.value;player.load();player.addEventListener('loadedmetadata',()=>{if(Number.isFinite(time))player.currentTime=Math.min(time,player.duration||time);},{once:true});player.play().catch(()=>showSubtitleStatus(t('autoplayHint')));});
  subtitleSelect.addEventListener('change',()=>applySubtitles(subtitleSelect.value,subtitleSelect.selectedOptions[0]?.dataset.language));
  installAutoHide();
 }catch(error){console.error('Could not initialize player:',error);document.getElementById('mediaTitle').textContent=t('playbackError');showSubtitleStatus(t('videoLoadError'),true);}
}
initPlayer();
