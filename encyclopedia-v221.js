/* V2.9 visual learning across the dictionary.
 * Only editorial word/sense mappings commit an image automatically. Other image
 * results remain explicit topic choices. Commons licenses are checked per file.
 * Requests occur on a visible committed word (never on keystrokes), are cached,
 * can be disabled, and never upload favorites, history or user identifiers. */
(function(){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=x=>{const d=new DOMParser().parseFromString(String(x||''),'text/html');d.querySelectorAll('script,style').forEach(n=>n.remove());return(d.body.textContent||'').replace(/\s+/g,' ').trim();};
const own=(o,k)=>o&&Object.hasOwn(o,k)?o[k]:null;
const localImage=u=>typeof u==='string'&&(u==='./images/andiron-in-use.png'||/^\.\/images\/visual-v(?:29|210|215|220)\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(u));
const urlOK=(raw,kind)=>{try{const u=new URL(raw,location.href);if(u.protocol!=='https:')return false;return kind==='image'?['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname):(/(^|\.)(wikipedia\.org|wikimedia\.org|creativecommons\.org)$/.test(u.hostname));}catch(_){return false;}};
const allowedLicense=s=>/^(?:Public domain|CC0(?: 1\.0)?|CC[- ]BY(?:-SA)?(?:[ -][0-9.]+)?)$/i.test(String(s||''));
const seeds=window.ROOTLAB_VISUAL_SEEDS||Object.create(null),legacy=window.ROOTLAB_ENCYCLOPEDIA_SEEDS||Object.create(null),hints=window.ROOTLAB_VISUAL_HINTS||Object.create(null);
const snapshots=window.ROOTLAB_WIKI_SNAPSHOTS_V220||{};
const pairAudit=new Map();
const operations=new Map(),searches=new Map(),searchTasks=new Map(),images=new Map(),imageTasks=new Map(),articles=new Map(),dom=new Map(),pending=new WeakMap(),contexts=new WeakMap();
const KEY='rootlab_wikipedia_cache_v215',CHOICES='rootlab_visual_choices_v29',PREF='rootlab_visual_auto_v29';
const topicMaps=window.ROOTLAB_TOPIC_MAPS_V215||{},articleViews=new Map(),discoveryTimers=new Map();
const loadJSON=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(_){return{};}};
// Topic identity is case-sensitive after the initial letter. REvolution is an album,
// Revolution is a concept: spelling alone must never collapse those two entities.
const pinned={revolution:[{title:'Revolution',zhTitle:'革命',sense:'政治与社会变革'},{title:'Rotation',zhTitle:'旋转',sense:'转动一周'},{title:'Industrial Revolution',zhTitle:'工业革命',sense:'重大的技术与社会变革'}]};
pinned.reason=[{title:'Reason',zhTitle:'理智',sense:'理智与推理能力'}];
pinned.carrier=[{title:'Common carrier',zhTitle:'公共承运人',sense:'运输服务 Transport services'},{title:'Mobile network operator',zhTitle:'移动通信运营商',sense:'移动网络 Mobile network'},{title:'Aircraft carrier',zhTitle:'航空母舰',sense:'舰船 Naval vessel'},{title:'Carrier bag',zhTitle:'购物袋',sense:'日常物品 Everyday object'}];
pinned.species=[{title:'Species',zhTitle:'物种',sense:'生物分类 Biological classification'}];
pinned.dogwood=[{title:'Cornus',zhTitle:'山茱萸属',sense:'属名；dogwood 的植物义项'},{title:'Cornus florida',zhTitle:'大花四照花',sense:'该属中的一种植物'},{title:'Cornus kousa',zhTitle:'四照花',sense:'该属中的一种植物'},{title:'Cornus sericea',zhTitle:'红瑞木类植物',sense:'该属中的一种植物'}];
const normalizeTitle=t=>{t=String(t||'').trim().replace(/_/g,' ');return t?t[0].toUpperCase()+t.slice(1):'';};
const workRx=/\b(?:studio album|compilation album|soundtrack|debut album|album by|song by|single by|film directed|television series|video game developed|novel by|rock band|music video)\b/i;
function acceptable(word,title,description=''){
 const set=pinned[word];if(set)return set.some(x=>normalizeTitle(x.title)===normalizeTitle(title));
 const seed=own(seeds,word);if(seed&&normalizeTitle(seed.title)===normalizeTitle(title))return true;
 return !workRx.test(description)&&!/(?:\((?:album|film|song|band|TV series|video game|novel)\))$/i.test(title);
}
function placeholder(title,subtitle='',small=false){return '<div class="topic-text-choice" data-authored-done="1"><strong>'+esc(title)+'</strong><small lang="en">'+esc(subtitle)+'</small></div>';}
const choices=loadJSON(CHOICES);for(const [w,x]of Object.entries(choices)){if(!x||!acceptable(w,x.title))delete choices[w];}
try{localStorage.setItem(CHOICES,JSON.stringify(choices));}catch(_){}
let auto=true;try{auto=localStorage.getItem(PREF)!=='off';}catch(_){}
for(const [key,r]of Object.entries(Object.keys(loadJSON(KEY)).length?loadJSON(KEY):loadJSON('rootlab_wikipedia_cache_v211')).slice(-30)){if(r&&Date.now()-r.time<7*86400000&&r.article&&urlOK(r.article.source))articles.set(key,r.article);}
function remember(key,a){articles.set(key,a);try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries([...articles].slice(-30).map(([k,v])=>[k,{time:Date.now(),article:v}]))));}catch(_){}}
function saveChoice(word,title,lang){choices[word]={title,lang};try{localStorage.setItem(CHOICES,JSON.stringify(Object.fromEntries(Object.entries(choices).slice(-80))));}catch(_){}}
function live(node){return node.isConnected&&node.closest('#readerV24')&&!document.getElementById('readerV24')?.hidden;}
function currentTarget(node,word,token){if(operations.get(word)!==token)return null;const target=node&&live(node)?node:document.querySelector('#readerV24 .wiki-enrichment[data-wiki-word="'+CSS.escape(word)+'"]');return target&&live(target)&&target.dataset.wikiWord===word?target:null;}
function rememberDOM(node){if(live(node)&&!['network-error','image-error'].includes(node.dataset.mediaState))dom.set(node.dataset.wikiWord,node.innerHTML);}
function creditMarkup(img){if(!img||!allowedLicense(img.license)||!urlOK(img.source))return'';return'<a href="'+esc(img.source)+'" target="_blank" rel="noopener noreferrer">'+esc(img.credit||'Wikimedia Commons')+'</a> · '+(urlOK(img.licenseUrl)?'<a href="'+esc(img.licenseUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(img.license)+'</a>':esc(img.license));}
function visualAlt(img){return (img.alt||'所选主题的图片')+' / '+(img.altEn||img.captionEn||'Illustration for the selected topic.');}
function imageMarkup(img){if(!img?.src||(!localImage(img.src)&&!urlOK(img.src,'image'))||!creditMarkup(img))return'';return'<figure class="wiki-figure visual-figure '+(img.kind==='diagram'?'is-diagram':'')+'"><button type="button" class="visual-zoom" data-wiki="zoom" aria-label="放大图片 / Enlarge image: '+esc(img.alt||'单词配图')+'"><img src="'+esc(img.src)+'"'+(img.remote&&urlOK(img.remote,'image')&&img.remote!==img.src?' data-fallback-src="'+esc(img.remote)+'"':'')+' alt="'+esc(visualAlt(img))+'" loading="lazy" decoding="async" referrerpolicy="no-referrer"'+(img.width&&img.height?' width="'+Number(img.width)+'" height="'+Number(img.height)+'"':'')+'><span>点图放大</span></button><figcaption>'+(img.caption&&img.captionEn?'<div class="bi-pair visual-caption-pair" data-bi-pair="true"><p class="bi-zh" lang="zh-CN">'+esc(img.caption)+'</p><p class="bi-en" lang="en">'+esc(img.captionEn)+'</p></div>':img.caption?'<div class="visual-caption-deferred"><p lang="zh-CN">这张图片的原始说明请见来源链接。</p><p lang="en">See the source link for the original image caption.</p></div>':'')+'<small>'+creditMarkup(img)+'</small></figcaption></figure>';}
function summary(raw,lang){const value=text(raw);if(value.length<=650)return value;try{const chunks=[...new Intl.Segmenter(lang,{granularity:'sentence'}).segment(value)].map(x=>x.segment.trim());let out='';for(const chunk of chunks){if(out&&out.length+chunk.length>650)break;out+=(out?' ':'')+chunk;if(out.length>=500)break;}if(out&&out.length<=850)return out;}catch(_){}let cut=value.slice(0,650);if(lang==='en')cut=cut.slice(0,cut.lastIndexOf(' '));return cut+'…';}
function pairEvidence(a){
 const en=a.en||(a.language==='en'?{title:a.title,text:a.summary,source:a.source}:null);
 const zh=a.zh||(['zh','zh-editorial'].includes(a.language)?{title:a.zhTitle||a.title,text:a.summary,source:a.source}:null);
 const readyEn=!!(en?.text&&en.text.trim()),readyZh=!!(zh?.text&&zh.text.trim());
 const entityConflict=!!(en?.entity&&zh?.entity&&en.entity!==zh.entity);
 const record={key:a.source,title:a.title,source:a.source,englishSource:en?.source||null,chineseSource:zh?.source||null,englishPresent:readyEn,chinesePresent:readyZh,entityConflict,paired:readyEn&&readyZh&&!entityConflict,missingLanguages:[...(!readyEn?['en']:[]),...(!readyZh?['zh-CN']:[])],rawSourceRetained:true,kind:'independent_language_summaries_not_literal_translation'};
 pairAudit.set(a.source,record);return record;
}
function auditSnapshot(){const rows=[...pairAudit.values()];return{buildId:window.ROOTLAB_BILINGUAL_META?.buildId||'',observed:rows.length,ready:rows.filter(r=>r.paired).length,unpaired:rows.filter(r=>!r.paired).length,scope:'observed encyclopedia articles only, not full-site coverage',records:rows};}

function identityMarkup(word,a){const title=a?.en?.title||a?.canonicalTitle||a?.title||'',map=topicMaps[word],exact=map&&normalizeTitle(map.title)===normalizeTitle(title);if(!word)return '';
 const speciesExample=word==='dogwood'&&pinned.dogwood.some(p=>p.title===title)&&title!=='Cornus';const zh=speciesExample?'这个主题是山茱萸属中的一个物种，不能代表所有 dogwood。':exact?map.identityZh:'所选百科主题，不改变当前查询词。';const en=speciesExample?'This topic is one species in Cornus, not all plants called dogwoods.':exact?map.identityEn:'This is the selected encyclopedia topic, not a replacement search word.';
 return '<div class="v215-topic-identity" data-authored-done="1"><p><b lang="en">'+esc(word)+'</b> · <span lang="zh-CN">百科主题</span> <span lang="en">Topic: '+esc(title)+'</span></p><p lang="zh-CN">'+esc(zh)+'</p><p lang="en">'+esc(en)+'</p></div>';
}
function summaryParts(value,lang){const pieces=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(lang,{granularity:'sentence'}).segment(value)].map(x=>x.segment):[value];const out=[];let chunk='';const limit=lang==='en'?650:260;for(const x of pieces){if(chunk&&chunk.length+x.length>limit){out.push(chunk);chunk='';}chunk+=x;}if(chunk)out.push(chunk);return out;}
function state(node,value){node.dataset.mediaState=value;const entry=document.querySelector('#readerV24 [data-media-entry="'+CSS.escape(node.dataset.wikiWord)+'"]');if(entry){const labels={loading:'正在查图 · Finding pictures',candidates:'选择图片主题 · Choose a topic',ready:'查看图文 · Picture topics','network-error':'图片查询失败，重试 · Retry pictures','no-compatible-image':'查看可用图文 · Picture topics','image-error':'图片未加载，重试 · Retry image'};entry.textContent=labels[value]||labels.ready;}}
function mediaEntry(root,word){/* The encyclopedia is already visible at the top. */}
function presentArticle(node,a,word){if(!live(node))return;const cap=window.ROOTLAB_VISUAL_BILINGUAL?.[word];if(a.image?.caption&&!a.image.captionEn&&cap?.zh===a.image.caption)a={...a,image:{...a.image,captionEn:cap.en}};
 articleViews.set(word,a);node.dataset.mediaPosition='primary';node.innerHTML=articleMarkup(a,word);
 const root=node.closest('#readerV24');root?.querySelector('[data-v214-media=primary]')?.append(node);state(node,a.image?'ready':'no-compatible-image');rememberDOM(node);}
function protectKnownImage(node,word){/* Do not split the picture from its bilingual article. */}

function articleMarkup(a,word=''){
 if(!a||!urlOK(a.source))return '';const evidence=pairEvidence(a),en=a.en||(a.language==='en'?{title:a.title,text:a.summary,source:a.source}:null),zh=a.zh||(['zh','zh-editorial'].includes(a.language)?{title:a.zhTitle||a.title,text:a.summary,source:a.source}:null);
 const block=(x,lang)=>x?.text?'<div class="wiki-language-block" data-language="'+lang+'"><p class="wiki-summary" lang="'+lang+'">'+esc(x.text)+'</p><a class="wiki-language-source" href="'+esc(x.source)+'" target="_blank" rel="noopener noreferrer">'+(lang==='en'?'English source':'中文来源')+' ↗</a></div>':'';
 const scope=a.scopeZh?'<p class="wiki-scope" data-authored-done="1"><span lang="zh-CN">'+esc(a.scopeZh)+'</span><small lang="en">'+esc(a.scopeEn||'Selected encyclopedia topic.')+'</small></p>':identityMarkup(word,a);
 return '<article class="wiki-article encyclopedia-top" data-query-word="'+esc(word)+'" data-canonical-title="'+esc(en?.title||a.title)+'" data-entity="'+esc(en?.entity||zh?.entity||'')+'" data-bi-state="'+(evidence.paired?'paired-independent-summaries':'pending-source-pair')+'" data-source-key="'+esc(a.source)+'">'+
 '<div class="encyclopedia-grid '+(a.image?'has-picture':'text-only')+'">'+(a.image?'<aside class="wiki-photo-card">'+imageMarkup(a.image)+'</aside>':'')+'<div class="encyclopedia-copy"><h3 data-authored-done="1">'+esc(zh?.title||a.title)+' <small lang="en">'+esc(en?.title||'')+'</small></h3>'+scope+'<div class="wiki-languages">'+block(zh,'zh-CN')+block(en,'en')+'</div>'+(!evidence.paired?'<p class="wiki-note" data-authored-done="1">该主题暂缺一侧语言资料。<small lang="en">One language source is unavailable.</small></p>':'')+'</div></div>'+
 '</article>';
}
function seedMarkup(s){const p=window.ROOTLAB_VISUAL_BILINGUAL?.[s.word];const verified=p?.zh===s.caption?p:null;return'<div class="visual-heading"><h3>看图理解 · Picture meaning</h3><span>'+esc(s.zhTitle)+'</span></div>'+imageMarkup({...s.image,caption:s.caption,captionEn:verified?.en,alt:(s.image.alt||s.zhTitle)+(verified?' / '+verified.en:'')})+identityMarkup(s.word,{title:s.title})+'<div class="visual-links"><button type="button" class="rd-text" data-wiki="article" data-title="'+esc(s.title)+'" data-lang="en">读相关百科 ↗</button><button type="button" class="rd-text" data-wiki="search">其他含义的图</button></div>';}

function fallback(node,msg,reason='network-error'){if(!live(node))return;const word=node.dataset.wikiWord;state(node,reason);dom.delete(word);node.innerHTML='<section class="wiki-card"><h3>图文 · Picture topics</h3><div class="v215-image-state" role="status"><span lang="zh-CN">'+esc(msg)+'</span><span lang="en">Existing dictionary content is unchanged. You can retry the picture request.</span></div><button class="rd-text" data-wiki="search">重新找图 · Retry</button> · <a class="rd-text" href="https://en.wikipedia.org/wiki/Special:Search?search='+encodeURIComponent(word)+'" target="_blank" rel="noopener noreferrer">原站 · Source ↗</a></section>';}
const watcher='IntersectionObserver'in window?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){watcher.unobserve(e.target);if(auto&&live(e.target)&&e.target.dataset.visualPending==='yes'){e.target.dataset.visualPending='no';search(e.target);}}},{rootMargin:'80px'}):null;

function mount(root,c){if(!root)return;const gate=root.querySelector('[data-extra-encyclopedia]');if(gate&&!gate.open){if(!gate.dataset.bound){gate.dataset.bound='1';gate.addEventListener('toggle',()=>{if(gate.open)mount(root,c);});}return;}const existing=root.querySelector('.wiki-enrichment');if(existing){contexts.set(existing,c);mediaEntry(root,c.word);return;}
 const word=c.word,holder=document.createElement('section');holder.className='wiki-enrichment visual-learning';holder.dataset.wikiWord=word;holder.id='picture-topic-'+word;holder.setAttribute('aria-label','图文 / Pictures: '+word);contexts.set(holder,c);
 const snap=own(snapshots,word),selected=own(choices,word)||(snap?{title:snap.canonicalTitle,lang:'en'}:null),saved=(selected?articles.get(selected.lang+':'+selected.title):null)||(snap&&(!selected||selected.title===snap.canonicalTitle)?snap:null),seed=own(seeds,word),old=own(legacy,word);holder.dataset.mediaPosition='primary';root.querySelector('[data-v214-media="'+holder.dataset.mediaPosition+'"]').append(holder);
 if(saved&&acceptable(word,saved.en?.title||saved.title,saved.en?.text||'')){presentArticle(holder,saved,word);if(!saved.image&&auto&&navigator.onLine)setTimeout(()=>{if(live(holder))article(holder,selected.title,selected.lang,true);},250);}
 else if(seed){holder.innerHTML='<section class="wiki-card">'+seedMarkup(seed)+'</section>';state(holder,'ready');if(auto&&navigator.onLine)setTimeout(()=>{if(live(holder))article(holder,seed.title,'en');},250);}
 else if(old){presentArticle(holder,old,word);}
 else if(dom.has(word)){holder.innerHTML=dom.get(word);state(holder,'candidates');mediaEntry(root,word);}
 else{holder.innerHTML='<section class="visual-compact"><h3>图文主题 · Picture topics</h3><p class="wiki-note">按当前词义选择图片，不会更改查询词。<br><span lang="en">Choose an image for this meaning; your search word stays unchanged.</span></p><button class="rd-text" data-wiki="search">查找图文 · Find pictures</button></section>';mediaEntry(root,word);
  const sensitive=/(?:porn|nude|genital|corpse|suicide|dissect)/i.test(word);if(auto&&navigator.onLine&&!sensitive){clearTimeout(discoveryTimers.get(word));discoveryTimers.set(word,setTimeout(()=>{discoveryTimers.delete(word);if(auto&&live(holder))search(holder);},220));}}
}
async function api(lang,params,signal){const host=lang==='commons'?'commons.wikimedia.org':(lang==='zh'?'zh.wikipedia.org':'en.wikipedia.org');const u='https://'+host+'/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:2,origin:'*',...params});const r=await fetch(u,{signal,credentials:'omit'});if(!r.ok)throw Error('百科服务暂时无法连接');const x=await r.json();if(x.error)throw Error('百科服务未返回可用资料');return x;}

async function commonsImage(name,signal){if(!name)return null;if(images.has(name))return images.get(name);if(imageTasks.has(name))return imageTasks.get(name);
 const task=(async()=>{const x=await api('commons',{prop:'imageinfo',titles:'File:'+name.replace(/^File:/,''),iiprop:'url|extmetadata|size|mime',iiurlwidth:640},signal);const p=x.query?.pages?.[0],i=p?.imageinfo?.[0],m=i?.extmetadata||{};if(!i||p.missing)return null;const license=text(m.LicenseShortName?.value||m.UsageTerms?.value);if(!allowedLicense(license))return null;const src=i.thumburl||i.url;if(!urlOK(src,'image')||!urlOK(i.descriptionurl))return null;
 if(i.mime&&!/^image\//.test(i.mime))return null;if(i.width&&i.height&&(i.width<120||i.height<100))return null;
 const out={src,source:i.descriptionurl,credit:text(m.Artist?.value||m.Credit?.value||'Wikimedia Commons').slice(0,250),license,licenseUrl:(m.LicenseUrl?.value||'').replace(/^http:/,'https:'),alt:text(m.ImageDescription?.value||name).slice(0,200),width:i.thumbwidth||i.width,height:i.thumbheight||i.height,file:name,kind:/\.svg$/i.test(name)?'diagram':'photo'};images.set(name,out);return out;})();imageTasks.set(name,task);try{return await task;}finally{imageTasks.delete(name);}}
const decorativeFile=/\b(?:logo|icon|flag|symbol|pictogram|disambig|ambox|question|edit|wikimedia|wikidata|commons|oojs|no.image|no.photo)\b/i;
function suitableFile(name){return /\.(?:svg|png|jpe?g|webp)$/i.test(name)&&!decorativeFile.test(name.replace(/[_-]/g,' '));}
function imageRelevance(file,title){const tokens=title.toLowerCase().replace(/\([^)]*\)/g,'').split(/[^a-z]+/).filter(w=>w.length>3);return tokens.some(t=>file.toLowerCase().includes(t));}
async function bodyImages(title,lang,signal){const x=await api(lang,{prop:'images',titles:title,redirects:1,imlimit:12},signal);const list=(x.query?.pages?.[0]?.images||[]).map(p=>p.title.replace(/^File:/,'')).filter(suitableFile).slice(0,6);const result=[];
 for(let i=0;i<list.length;i+=2){const rows=await Promise.all(list.slice(i,i+2).map(async file=>{try{return await commonsImage(file,signal);}catch(e){if(signal.aborted)throw e;return null;}}));result.push(...rows.filter(Boolean));if(result.length>=4)break;}return result.slice(0,4);}
async function findTopics(word,force=false){const old=searches.get(word);if(!force&&old&&Date.now()-old.time<(old.rows.length?600000:30000)&&!old.incomplete)return old.rows;if(searchTasks.has(word))return searchTasks.get(word);
 const task=(async()=>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),22000);try{
 const common={prop:'extracts|info|pageprops|pageimages|langlinks',exintro:1,explaintext:1,exchars:220,exlimit:6,inprop:'url',piprop:'name',pilicense:'free',lllang:'zh'};
 let x=await api('en',{...common,titles:pinned[word]?pinned[word].map(v=>v.title).join('|'):normalizeTitle(word),redirects:1},ctrl.signal);
 if(!pinned[word]&&!(x.query?.pages||[]).some(p=>!p.missing&&p.ns===0&&!Object.hasOwn(p.pageprops||{},'disambiguation')))x=await api('en',{...common,generator:'search',gsrsearch:word,gsrnamespace:0,gsrlimit:6},ctrl.signal);
 const redirects=x.query?.redirects||[];let rows=(x.query?.pages||[]).filter(p=>!p.missing&&p.ns===0).sort((a,b)=>(a.index||0)-(b.index||0)).map(p=>({queryWord:word,title:p.title,pageId:p.pageid,entity:p.pageprops?.wikibase_item||'',zhTitle:p.langlinks?.find(l=>l.lang==='zh')?.title||'',summary:text(p.extract||'').slice(0,220),description:p.pageprops?.['wikibase-shortdesc']||'',disambiguation:Object.hasOwn(p.pageprops||{},'disambiguation'),file:p.pageimage||'',redirects:redirects.filter(r=>r.to===p.title)})).filter(r=>acceptable(word,r.title,r.summary+' '+r.description));
 if(pinned[word]){rows.sort((a,b)=>pinned[word].findIndex(t=>t.title===a.title)-pinned[word].findIndex(t=>t.title===b.title));for(const r of rows){const pin=pinned[word].find(p=>p.title===r.title);if(pin){r.sense=pin.sense;r.zhTitle=r.zhTitle||pin.zhTitle;}}}
 else{const exact=normalizeTitle(word),same=rows.filter(r=>normalizeTitle(r.title)===exact||normalizeTitle(r.title).startsWith(exact+' ('));if(same.some(r=>normalizeTitle(r.title)===exact))rows=same;}
 rows=rows.slice(0,4);let incomplete=false;
 for(let i=0;i<rows.length;i+=2)await Promise.all(rows.slice(i,i+2).map(async r=>{if(r.disambiguation)return;try{if(r.file)r.image=await commonsImage(r.file,ctrl.signal);if(!r.image){const alt=await bodyImages(r.title,'en',ctrl.signal);r.image=alt.find(v=>imageRelevance(v.file,r.title))||null;r.bodyCandidates=alt;}}catch(_){r.image=null;incomplete=true;}}));
 searches.set(word,{rows,time:Date.now(),incomplete});return rows;
 }finally{clearTimeout(timer);}})();searchTasks.set(word,task);try{return await task;}finally{searchTasks.delete(word);}}
function candidateDescription(row){
 const z=row.sense&&/[\u3400-\u9fff]/.test(row.sense)?row.sense:'';
 const translated=z&&window.RootLabAuthored?.lookup(z)?.en;
 if(translated)return '<small lang="zh-CN">'+esc(z)+'</small><small lang="en">'+esc(translated)+'</small>';
 return row.disambiguation?'<small lang="zh-CN">选择具体主题</small><small lang="en">Choose a specific topic</small>':'';
}

async function search(node,force=false){const word=node.dataset.wikiWord;if(!/^[a-z][a-z'-]{0,49}$/i.test(word))return;pending.get(node)?.abort();protectKnownImage(node,word);const token=new AbortController();pending.set(node,token);operations.set(word,token);state(node,'loading');node.innerHTML='<section class="wiki-card"><div class="v215-image-state" role="status"><span lang="zh-CN">正在寻找图片主题…</span><span lang="en">Finding picture topics…</span></div></section>';
 try{const rows=await findTopics(word,force);node=currentTarget(node,word,token);if(!node)return;pending.set(node,token);if(!rows.length){fallback(node,'暂无匹配的百科主题，已有释义与例句仍可阅读。','no-compatible-image');return;}
 node.innerHTML='<section class="wiki-card"><div class="visual-heading"><h3>为 '+esc(word)+' 选择主题 <small lang="en">Choose a topic</small></h3></div><p class="wiki-note">候选主题不是自动判定的词义。<br><span lang="en">A candidate topic is not an automatically assigned meaning.</span></p><div class="wiki-candidates visual-candidates">'+rows.map(r=>'<article class="visual-candidate" data-topic-entity="'+esc(r.entity)+'"><button type="button" data-wiki="article" data-title="'+esc(r.title)+'" data-lang="en">'+(r.image?'<img src="'+esc(r.image.src)+'" alt="'+esc(r.zhTitle||r.title)+' / '+esc(r.title)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer">':placeholder(r.zhTitle||r.title,r.title,true))+(r.image?'<b lang="zh-CN">'+esc(r.zhTitle||r.title)+'</b><small lang="en">'+esc(r.title)+'</small>':'')+candidateDescription(r)+'<span class="visual-open-label"><span lang="zh-CN">查看图文</span><span lang="en">Open →</span></span></button>'+(r.image?'<div class="visual-thumb-credit">'+creditMarkup(r.image)+'</div>':'')+'</article>').join('')+'</div></section>';state(node,'candidates');rememberDOM(node);
 }catch(e){const target=currentTarget(node,word,token);if(target)fallback(target,e.name==='AbortError'?'图片查询超时，可以重试。':'图片来源暂时不可用，可以重试。','network-error');}}

async function article(node,title,lang,force=false){
 if(!title||title.length>180||!['en','zh'].includes(lang))return;const word=node.dataset.wikiWord;
 if(lang==='en'&&!acceptable(word,title))return search(node,true);
 protectKnownImage(node,word);const key=lang+':'+title,cached=articles.get(key);
 if(!force&&cached&&cached.schema===3&&cached.image&&acceptable(word,cached.en?.title||cached.title,cached.en?.text||'')){pending.get(node)?.abort();operations.set(word,{});saveChoice(word,title,lang);presentArticle(node,cached,word);return;}
 pending.get(node)?.abort();const ctrl=new AbortController();pending.set(node,ctrl);operations.set(word,ctrl);const timer=setTimeout(()=>ctrl.abort(),24000);state(node,'loading');node.innerHTML='<section class="wiki-card"><div class="v215-image-state" role="status"><span lang="zh-CN">正在读取中英图文…</span><span lang="en">Loading bilingual topic material…</span></div></section>';
 try{
 const params={prop:'extracts|pageimages|info|pageprops|langlinks',redirects:1,exintro:1,explaintext:1,exchars:650,piprop:'name',pilicense:'free',inprop:'url',llprop:'url',lllimit:5};
 const fetchPage=async(l,t)=>{const x=await api(l,{...params,titles:t,lllang:l==='en'?'zh':'en',...(l==='zh'?{variant:'zh-cn'}:{})},ctrl.signal);const p=x.query?.pages?.[0];if(!p||p.missing||Object.hasOwn(p.pageprops||{},'disambiguation'))return null;return {...p,redirects:x.query?.redirects||[]};};
 const initial=await fetchPage(lang,title);if(!initial)throw Error('请从候选中选择具体主题。');if(lang==='en'&&!acceptable(word,initial.title,initial.extract+' '+initial.pageprops?.['wikibase-shortdesc']))throw Error('这个同名条目与当前词义不符。');
 let en=lang==='en'?initial:null,zh=lang==='zh'?initial:null;const otherTitle=initial.langlinks?.find(l=>l.lang===(lang==='en'?'zh':'en'))?.title;
 if(otherTitle){try{const other=await fetchPage(lang==='en'?'zh':'en',otherTitle);const a=initial.pageprops?.wikibase_item,b=other?.pageprops?.wikibase_item;if(other&&(!a||!b||a===b)){if(lang==='en')zh=other;else en=other;}}catch(_){}}
 if(en&&!acceptable(word,en.title,en.extract||''))throw Error('对应语言条目与当前词义不符。');
 const pack=(p,l)=>p?{title:p.title,text:summary(p.extract||'',l),source:'https://'+l+'.wikipedia.org/wiki/'+encodeURIComponent(p.title),pageId:p.pageid,entity:p.pageprops?.wikibase_item||''}:null;
 const a={schema:3,en:pack(en,'en'),zh:pack(zh,'zh'),title:zh?.title||en?.title||initial.title,language:zh?'zh':'en',summary:summary((zh||en||initial).extract||'',zh?'zh':'en'),source:'https://'+(zh?'zh':'en')+'.wikipedia.org/wiki/'+encodeURIComponent((zh||en||initial).title),redirects:initial.redirects,canonicalTitle:en?.title||initial.title,requestedTitle:title,checkedAt:Date.now()};
 const mapping=topicMaps[word];if(mapping&&normalizeTitle(mapping.title)===normalizeTitle(a.canonicalTitle)&&en?.pageprops?.wikibase_item&&mapping.entity!==en.pageprops.wikibase_item)throw Error('百科对象已发生变化，请重新选择。');
 const seed=own(seeds,word);if(seed&&normalizeTitle(seed.title)===normalizeTitle(a.canonicalTitle))a.image=seed.image;
 const files=[...new Set([en?.pageimage,zh?.pageimage].filter(Boolean))];let imageFailure=false;
 if(!a.image)for(const file of files){try{a.image=await commonsImage(file,ctrl.signal);if(a.image)break;}catch(_){imageFailure=true;}}
 if(!a.image){const all=[];for(const [page,language]of [[en,'en'],[zh,'zh']]){if(!page)continue;try{all.push(...await bodyImages(page.title,language,ctrl.signal));}catch(_){imageFailure=true;}if(all.length>=4)break;}const unique=[...new Map(all.map(i=>[i.source,i])).values()];a.image=unique.find(i=>imageRelevance(i.file,a.canonicalTitle))||null;a.imageCandidates=a.image?[]:unique.slice(0,4);}
 if(a.image){a.image={...a.image,caption:a.image.caption||'图片对应所选百科主题，请结合具体义项理解。',captionEn:a.image.captionEn||'This illustration belongs to the selected topic; relate it to the specific meaning.'};}
 a.imageState=a.image?'ready':imageFailure?'network-error':a.imageCandidates?.length?'candidates':'no-compatible-image';
 node=currentTarget(node,word,ctrl);if(!node)return;pending.set(node,ctrl);remember(key,a);saveChoice(word,title,lang);presentArticle(node,a,word);state(node,a.imageState);
 if(imageFailure&&!a.image)node.insertAdjacentHTML('beforeend','<p class="wiki-note" role="status">图片暂未加载，可重试。<br><span lang="en">The image request failed; retry is available.</span></p><button class="rd-text" data-wiki="retry-article" data-title="'+esc(title)+'" data-lang="'+lang+'">重试图片 · Retry image</button>');
 }catch(e){const target=currentTarget(node,word,ctrl);if(target)fallback(target,e.name==='AbortError'?'图文查询超时，可重试。':e.message||'图文查询失败。');}finally{clearTimeout(timer);}
}
function zoom(button){const figure=button.closest('figure'),img=figure?.querySelector('img');if(!img||img.hidden)return;let dialog=document.getElementById('visualLightbox');if(!dialog){dialog=document.createElement('dialog');dialog.id='visualLightbox';dialog.className='visual-lightbox';dialog.setAttribute('aria-label','单词图片大图');document.body.append(dialog);}dialog.innerHTML='<button type="button" data-wiki="close-zoom" class="visual-close" aria-label="关闭大图">×</button><div class="visual-large-image"></div>';const copy=figure.cloneNode(true),nested=copy.querySelector('.visual-zoom');if(nested){const image=nested.querySelector('img');image.loading='eager';nested.replaceWith(image);}dialog.querySelector('.visual-large-image').append(copy);dialog.addEventListener('close',()=>button.isConnected&&button.focus({preventScroll:true}),{once:true});dialog.showModal();dialog.querySelector('.visual-close')?.focus();}
function setAuto(value){auto=!!value;try{localStorage.setItem(PREF,auto?'on':'off');}catch(_){}document.querySelectorAll('[data-wiki="toggle-auto"]').forEach(b=>{b.setAttribute('aria-pressed',String(auto));b.textContent='相关图片自动查找：'+(auto?'开启':'关闭');});}
function preferences(){return'<div class="visual-preference"><button type="button" class="outline-btn" data-wiki="toggle-auto" aria-pressed="'+auto+'">相关图片自动查找：'+(auto?'开启':'关闭')+'</button><p>已整理的配图直接显示。开启后，确认查询单词即查找图片主题；关闭后仅在主动点击时查询。</p></div>';}

document.addEventListener('error',e=>{const image=e.target;if(image?.tagName!=='IMG'||!image.closest('#readerV24 .visual-learning,#readerV24 .v215-image-preview'))return;
 if(!image.dataset.originalSrc)image.dataset.originalSrc=image.getAttribute('src')||'';const alternate=image.dataset.fallbackSrc;if(alternate&&urlOK(alternate,'image')&&!image.dataset.fallbackTried){image.dataset.fallbackTried='1';image.src=alternate;return;}
 const fig=image.closest('figure');if(!fig)return;const scope=image.closest('[data-wiki-word]'),word=scope?.dataset.wikiWord||window.RootLabReader?.context?.word;image.hidden=true;const zoom=image.closest('.visual-zoom');if(zoom)zoom.hidden=true;fig.classList.add('image-unavailable');
 if(!fig.querySelector('.v215-image-retry')){const button=document.createElement('button');button.className='rd-text v215-image-retry';button.dataset.wiki='retry-image';button.textContent='图片未加载，重试 · Retry image';button.dataset.src=image.dataset.originalSrc||image.getAttribute('src');zoom?.after(button);}
 const controller=document.querySelector('#readerV24 .wiki-enrichment[data-wiki-word="'+CSS.escape(word||'')+'"]');if(controller)state(controller,'image-error');},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-wiki]');if(!b)return;const action=b.dataset.wiki;if(action==='close-zoom'){e.preventDefault();document.getElementById('visualLightbox')?.close();return;}if(action==='toggle-auto'){e.preventDefault();setAuto(!auto);return;}
 const scope=b.closest('.wiki-enrichment,.v215-image-preview');if(!scope)return;const word=scope.dataset.wikiWord,n=document.querySelector('#readerV24 .wiki-enrichment[data-wiki-word="'+CSS.escape(word)+'"]');if(!n)return;e.preventDefault();e.stopPropagation();
 if(action==='zoom'){zoom(b);return;}
 if(action==='retry-image'){const fig=b.closest('figure'),img=fig?.querySelector('img');if(img){fig.classList.remove('image-unavailable');img.hidden=false;img.dataset.fallbackTried='';img.closest('.visual-zoom').hidden=false;const src=b.dataset.src;b.remove();img.src=src;state(n,'loading');img.addEventListener('load',()=>state(n,'ready'),{once:true});}return;}
 if(action==='search')search(n,true);if(action==='article'||action==='retry-article')article(n,b.dataset.title,b.dataset.lang,action==='retry-article');
 if(action==='choose-image'){const a=articleViews.get(word),i=Number(b.dataset.imageIndex);if(a&&Number.isInteger(i)&&a.imageCandidates?.[i]){a.image={...a.imageCandidates[i],caption:'用户为此百科主题选择的图片。',captionEn:'An image selected for this encyclopedia topic.'};a.imageCandidates=[];const choice=choices[word];if(choice)remember(choice.lang+':'+choice.title,a);presentArticle(n,a,word);}}
});
window.RootLabEncyclopedia={mount,search,article,preferences,setAuto,placeholder,acceptable,auditSnapshot,findTopics,bodyImages,commonsImage,identityMarkup,get auto(){return auto;},get stats(){return{seeds:Object.keys(seeds).length,candidates:Object.keys(hints).length};},clear(){operations.clear();searches.clear();articles.clear();dom.clear();pairAudit.clear();articleViews.clear();for(const t of discoveryTimers.values())clearTimeout(t);discoveryTimers.clear();for(const key of Object.keys(choices))delete choices[key];try{localStorage.removeItem(KEY);localStorage.removeItem('rootlab_wikipedia_cache_v211');localStorage.removeItem(CHOICES);}catch(_){}}};
})();
