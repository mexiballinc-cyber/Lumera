import { db } from './firebase.js';
import { applyTranslations, getLanguage, setLanguage, t, supportedLanguages } from './i18n.js';
import { addDoc, collection, getDocs, deleteDoc, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

const LOCALES={es:{flag:'🇪🇸',label:'Español'},en:{flag:'🇺🇸',label:'English'},pt:{flag:'🇵🇹',label:'Português'},fr:{flag:'🇫🇷',label:'Français'}};
const $=(id)=>document.getElementById(id);
let activeLocale=getLanguage(), seasonsDraft=[], seasonSequence=0, episodeSequence=0, busy=false, editingId=null;
const localizedRecord=()=>({title:'',synopsis:'',participants:'',video:'',subtitles:''});
const blankContent=()=>({i18n:Object.fromEntries(supportedLanguages.map((lang)=>[lang,localizedRecord()])),seasons:[]});
let contentDraft=blankContent();

function setStatus(message='',error=false){$('cmsStatus').textContent=message;$('cmsStatus').style.color=error?'#ffaaaa':'';}
function localeData(record,locale){record[locale]||=localizedRecord();return record[locale];}

function captureCurrentLocale(){
 const current=localeData(contentDraft.i18n,activeLocale);
 current.title=$('localizedTitle').value.trim();
 current.synopsis=$('localizedSynopsis').value.trim();
 current.participants=$('localizedParticipants').value.trim();
 current.video=$('localizedVideo').value.trim();
 current.subtitles=$('localizedSubtitle').value.trim();
 
 document.querySelectorAll('.cms-season').forEach((node)=>{
   const season=seasonsDraft.find((item)=>item.key===node.dataset.key);
   if(!season)return;
   localeData(season.i18n,activeLocale).title=node.querySelector('.season-title').value.trim();
   node.querySelectorAll('.cms-episode').forEach((epNode)=>{
     const episode=season.episodes.find((item)=>item.key===epNode.dataset.key);
     if(!episode)return;
     const data=localeData(episode.i18n,activeLocale);
     data.title=epNode.querySelector('.episode-title').value.trim();
     data.video=epNode.querySelector('.episode-video').value.trim();
     data.subtitles=epNode.querySelector('.episode-subtitle').value.trim();
   });
 });
}

function renderCurrentLocale(){
 const current=localeData(contentDraft.i18n,activeLocale);
 $('localizedTitle').value=current.title||'';
 $('localizedSynopsis').value=current.synopsis||'';
 $('localizedParticipants').value=current.participants||'';
 $('localizedVideo').value=current.video||'';
 $('localizedSubtitle').value=current.subtitles||'';
 $('activeLanguageLabel').textContent=`${t('activeLanguage') || 'Idioma activo'}: ${LOCALES[activeLocale].flag} ${LOCALES[activeLocale].label}`;
 document.querySelectorAll('[data-locale]').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.locale===activeLocale)));
 renderSeasons();
}

function makeInput({label,value='',className,type='text',placeholder=''}){
 const wrapper=document.createElement('label');
 wrapper.className='cms-field';
 const caption=document.createElement('span');
 caption.textContent=label;
 const input=document.createElement(type==='textarea'?'textarea':'input');
 if(type!=='textarea')input.type=type;
 input.className=`cms-input ${className}`;
 input.value=value||'';
 input.placeholder=placeholder;
 wrapper.append(caption,input);
 return wrapper;
}

function renderSeasons(){
 const container=$('seasonsContainer');
 container.replaceChildren();
 seasonsDraft.forEach((season,index)=>{
   const locale=localeData(season.i18n,activeLocale);
   const block=document.createElement('section');
   block.className='cms-season';
   block.dataset.key=season.key;
   const header=document.createElement('div');
   header.className='cms-season-head';
   const heading=document.createElement('h3');
   heading.textContent=`${t('season')} ${index+1}`;
   const remove=document.createElement('button');
   remove.type='button';
   remove.className='cms-small-btn cms-danger';
   remove.dataset.action='remove-season';
   remove.textContent=t('remove') || 'Eliminar';
   header.append(heading,remove);
   block.append(header,makeInput({label:t('seasonName') || 'Nombre de la temporada',value:locale.title,className:'season-title',placeholder:`${t('season')} ${index+1}`}));
   
   const episodes=document.createElement('div');
   episodes.className='episodes-container';
   season.episodes.forEach((episode,epIndex)=>{
     const epLocale=localeData(episode.i18n,activeLocale);
     const node=document.createElement('article');
     node.className='cms-episode';
     node.dataset.key=episode.key;
     const epHead=document.createElement('div');
     epHead.className='cms-episode-head';
     const epTitle=document.createElement('h4');
     epTitle.textContent=`${t('episode')} ${epIndex+1}`;
     const epRemove=document.createElement('button');
     epRemove.type='button';
     epRemove.className='cms-small-btn cms-danger';
     epRemove.dataset.action='remove-episode';
     epRemove.textContent=t('remove') || 'Eliminar';
     epHead.append(epTitle,epRemove);
     node.append(
       epHead,
       makeInput({label:t('episodeTitle') || 'Título del episodio',value:epLocale.title,className:'episode-title',placeholder:t('episodeTitle') || 'Título'}),
       makeInput({label:`${t('videoUrl') || 'URL del video'} (${LOCALES[activeLocale].flag} ${activeLocale.toUpperCase()})`,value:epLocale.video,className:'episode-video',type:'url',placeholder:'https://...'}),
       makeInput({label:`${t('subtitleUrl') || 'URL de subtítulos'} (${LOCALES[activeLocale].flag} ${activeLocale.toUpperCase()})`,value:epLocale.subtitles,className:'episode-subtitle',type:'url',placeholder:'https://... .vtt'})
     );
     episodes.appendChild(node);
   });
   block.appendChild(episodes);
   const add=document.createElement('button');
   add.type='button';
   add.className='cms-small-btn';
   add.dataset.action='add-episode';
   add.textContent=t('addEpisode') || '+ Agregar episodio';
   block.appendChild(add);
   container.appendChild(block);
 });
}

function resetEditor(){
 editingId=null;
 contentDraft=blankContent();
 seasonsDraft=[];
 $('localizedTitle').value='';
 $('localizedSynopsis').value='';
 $('localizedParticipants').value='';
 $('localizedVideo').value='';
 $('localizedSubtitle').value='';
 $('poster').value='';
 $('banner').value='';
 $('year').value=new Date().getFullYear();
 $('ageRating').value='';
 document.querySelector('input[name="contentType"][value="movie"]').checked=true;
 $('seriesSection').hidden=true;
 $('publishBtn').textContent=t('publish') || 'Guardar y publicar en Firebase';
 renderCurrentLocale();
}

function normalizedLocale(data={},fallbackTitle=''){
 return {
   title: data.title || fallbackTitle || '',
   synopsis: data.synopsis || '',
   participants: data.participants || '',
   video: '',
   subtitles: ''
 };
}

async function beginEdit(id){
 try {
   const snapshot=await getDoc(doc(db,'content',id));
   if(!snapshot.exists())throw new Error('El contenido no existe');
   const item=snapshot.data();
   editingId=id;
   contentDraft=blankContent();
   
   supportedLanguages.forEach((lang)=>{
     const locale=item.i18n?.[lang]||{};
     contentDraft.i18n[lang]=normalizedLocale(locale, lang==='es' ? (locale.title||item.title||'') : '');
     contentDraft.i18n[lang].video=item.sources?.[lang] || (lang==='es' ? (item.videoUrl||item.video||'') : '');
     contentDraft.i18n[lang].subtitles=item.subtitles?.[lang] || (lang==='es' ? (item.subtitleUrl||item.subUrl||'') : '');
   });
   
   seasonsDraft=(item.seasons||[]).map((season)=>({
     key:`season-${++seasonSequence}`,
     i18n:Object.fromEntries(supportedLanguages.map((lang)=>[lang,{title:season.i18n?.[lang]?.title||(lang==='es'?season.title||'':'')}])),
     episodes:(season.episodes||[]).map((episode)=>({
       key:`episode-${++episodeSequence}`,
       i18n:Object.fromEntries(supportedLanguages.map((lang)=>[lang,{
         title:episode.i18n?.[lang]?.title||(lang==='es'?episode.title||'':''),
         video:episode.sources?.[lang] || (lang==='es' ? (episode.videoUrl||episode.video||'') : ''),
         subtitles:episode.subtitles?.[lang] || (lang==='es' ? (episode.subtitleUrl||episode.subUrl||'') : '')
       }]))
     }))
   }));
   
   $('poster').value=item.images?.poster||item.poster||'';
   $('banner').value=item.images?.banner||item.banner||'';
   $('year').value=item.year||new Date().getFullYear();
   $('ageRating').value=item.ageRating??item.age??'';
   document.querySelector(`input[name="contentType"][value="${item.type==='series'?'series':'movie'}"]`).checked=true;
   $('seriesSection').hidden=item.type!=='series';
   
   renderCurrentLocale();
   $('publishBtn').textContent=t('saveChanges') || 'Guardar cambios';
   setStatus();
   window.scrollTo({top:0,behavior:'smooth'});
 } catch(error) {
   console.error('Error al cargar contenido para edición:',error);
   setStatus('Error al cargar los datos para editar.',true);
 }
}

async function publishMedia(){
 if(busy)return;
 captureCurrentLocale();
 const poster=$('poster').value.trim();
 const title=Object.values(contentDraft.i18n).find((locale)=>locale.title)?.title;
 if(!title||!poster){
   setStatus('Ingresa al menos el título y el póster.',true);
   $('localizedTitle').focus();
   return;
 }
 const type=document.querySelector('input[name="contentType"]:checked').value;
 
 const payload={
   title,
   type,
   year:Number($('year').value)||new Date().getFullYear(),
   ageRating:Number($('ageRating').value)||0,
   images:{poster,banner:$('banner').value.trim()},
   i18n:Object.fromEntries(supportedLanguages.map((lang)=>{
     const data=contentDraft.i18n[lang]||localizedRecord();
     return[lang,{title:data.title,synopsis:data.synopsis,participants:data.participants}];
   })),
   sources:Object.fromEntries(supportedLanguages.map((lang)=>[lang,contentDraft.i18n[lang]?.video||'']).filter(([,value])=>value)),
   subtitles:Object.fromEntries(supportedLanguages.map((lang)=>[lang,contentDraft.i18n[lang]?.subtitles||'']).filter(([,value])=>value))
 };

 if(type==='series'){
   payload.seasons=seasonsDraft.map((season,index)=>({
     seasonNumber:index+1,
     title:Object.values(season.i18n).find((locale)=>locale.title)?.title||`${t('season')} ${index+1}`,
     i18n:Object.fromEntries(supportedLanguages.map((lang)=>[lang,{title:season.i18n[lang]?.title||''}])),
     episodes:season.episodes.map((episode,epIndex)=>({
       episodeNumber:epIndex+1,
       title:Object.values(episode.i18n).find((locale)=>locale.title)?.title||`${t('episode')} ${epIndex+1}`,
       i18n:Object.fromEntries(supportedLanguages.map((lang)=>[lang,{title:episode.i18n[lang]?.title||''}])),
       sources:Object.fromEntries(supportedLanguages.map((lang)=>[lang,episode.i18n[lang]?.video||'']).filter(([,value])=>value)),
       subtitles:Object.fromEntries(supportedLanguages.map((lang)=>[lang,episode.i18n[lang]?.subtitles||'']).filter(([,value])=>value))
     }))
   }));
 }

 busy=true;
 $('publishBtn').disabled=true;
 try {
   if(editingId){
     await updateDoc(doc(db,'content',editingId),payload);
     setStatus('Contenido actualizado correctamente.');
   } else {
     await addDoc(collection(db,'content'),payload);
     setStatus('Contenido publicado correctamente.');
   }
   resetEditor();
   await loadCatalog();
 } catch(error) {
   console.error('Error al publicar:',error);
   setStatus('Error al guardar en Firebase.',true);
 } finally {
   busy=false;
   $('publishBtn').disabled=false;
 }
}

async function loadCatalog(){
 const list=$('publishedContentList');
 list.replaceChildren();
 try {
   const snapshot=await getDocs(collection(db,'content'));
   if(snapshot.empty){
     const empty=document.createElement('p');
     empty.className='cms-empty';
     empty.textContent=t('catalogEmpty') || 'No hay contenido publicado.';
     list.appendChild(empty);
     return;
   }
   snapshot.forEach((entry)=>{
     const item=entry.data();
     const row=document.createElement('article');
     row.className='cms-catalog-item';
     const main=document.createElement('div');
     main.className='cms-catalog-main';
     const image=document.createElement('img');
     image.src=item.images?.poster||item.poster||'';
     image.alt='';
     const copy=document.createElement('div');
     copy.className='cms-catalog-copy';
     const title=document.createElement('strong');
     title.textContent=item.i18n?.[activeLocale]?.title||item.title||t('untitled');
     const meta=document.createElement('span');
     meta.textContent=`${t(item.type==='series'?'series':'movie')} · ${item.year||''}`;
     copy.append(title,meta);
     main.append(image,copy);
     
     const actions=document.createElement('div');
     actions.className='cms-actions';
     const edit=document.createElement('button');
     edit.type='button';
     edit.className='cms-small-btn';
     edit.textContent=t('edit') || 'Editar';
     edit.addEventListener('click',()=>beginEdit(entry.id));
     const remove=document.createElement('button');
     remove.type='button';
     remove.className='cms-small-btn cms-danger';
     remove.textContent=t('delete') || 'Eliminar';
     remove.addEventListener('click',async()=>{
       if(!confirm('¿Seguro que deseas eliminar este contenido?'))return;
       remove.disabled=true;
       try{
         await deleteDoc(doc(db,'content',entry.id));
         await loadCatalog();
       }catch(error){
         console.error(error);
         setStatus('Error al eliminar.',true);
         remove.disabled=false;
       }
     });
     actions.append(edit,remove);
     row.append(main,actions);
     list.appendChild(row);
   });
 } catch(error) {
   console.error('Error al cargar catálogo CMS:',error);
   const message=document.createElement('p');
   message.className='cms-empty';
   message.textContent='Error al cargar catálogo.';
   list.appendChild(message);
 }
}

function refreshInterfaceLanguage(language){
 captureCurrentLocale();
 activeLocale=language;
 setLanguage(language);
 applyTranslations();
 $('uiLanguage').value=language;
 renderCurrentLocale();
 loadCatalog();
}

document.querySelectorAll('[data-locale]').forEach((button)=>button.addEventListener('click',()=>{
 captureCurrentLocale();
 activeLocale=button.dataset.locale;
 renderCurrentLocale();
}));

$('uiLanguage').value=getLanguage();
$('uiLanguage').addEventListener('change',(event)=>refreshInterfaceLanguage(event.target.value));
document.querySelectorAll('input[name="contentType"]').forEach((radio)=>radio.addEventListener('change',()=>{
 $('seriesSection').hidden=radio.value!=='series'||!radio.checked;
}));

$('addSeasonBtn').addEventListener('click',()=>{
 captureCurrentLocale();
 seasonsDraft.push({key:`season-${++seasonSequence}`,i18n:{},episodes:[]});
 renderSeasons();
});

$('seasonsContainer').addEventListener('click',(event)=>{
 const button=event.target.closest('button[data-action]');
 if(!button)return;
 captureCurrentLocale();
 const seasonNode=button.closest('.cms-season');
 const index=seasonsDraft.findIndex((season)=>season.key===seasonNode?.dataset.key);
 if(index<0)return;
 if(button.dataset.action==='remove-season')seasonsDraft.splice(index,1);
 if(button.dataset.action==='add-episode')seasonsDraft[index].episodes.push({key:`episode-${++episodeSequence}`,i18n:{}});
 if(button.dataset.action==='remove-episode'){
   const episodeNode=button.closest('.cms-episode');
   seasonsDraft[index].episodes=seasonsDraft[index].episodes.filter((episode)=>episode.key!==episodeNode.dataset.key);
 }
 renderSeasons();
});

$('publishBtn').addEventListener('click',publishMedia);

applyTranslations();
$('uiLanguage').value=getLanguage();
renderCurrentLocale();
loadCatalog();
