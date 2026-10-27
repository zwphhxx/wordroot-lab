/* V2.9 visual learning across the dictionary.
 * Only editorial word/sense mappings commit an image automatically. Other image
 * results remain explicit topic choices. Commons licenses are checked per file.
 * Requests occur on a visible committed word (never on keystrokes), are cached,
 * can be disabled, and never upload favorites, history or user identifiers. */
(function(){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=x=>{const d=new DOMParser().parseFromString(String(x||''),'text/html');d.querySelectorAll('script,style').forEach(n=>n.remove());return(d.body.textContent||'').replace(/\s+/g,' ').trim();};
const own=(o,k)=>o&&Object.hasOwn(o,k)?o[k]:null;
const localImage=u=>typeof u==='string'&&(u==='./images/andiron-in-use.png'||/^\.\/images\/visual-v(?:29|210)\/[a-z0-9-]+\.(?:png|jpe?g|webp)$/.test(u));
const urlOK=(raw,kind)=>{try{const u=new URL(raw,location.href);if(u.protocol!=='https:')return false;return kind==='image'?['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname):(/(^|\.)(wikipedia\.org|wikimedia\.org|creativecommons\.org)$/.test(u.hostname));}catch(_){return false;}};
const allowedLicense=s=>/^(?:Public domain|CC0(?: 1\.0)?|CC[- ]BY(?:-SA)?(?:[ -][0-9.]+)?)$/i.test(String(s||''));
const seeds=window.ROOTLAB_VISUAL_SEEDS||Object.create(null),legacy=window.ROOTLAB_ENCYCLOPEDIA_SEEDS||Object.create(null),hints=window.ROOTLAB_VISUAL_HINTS||Object.create(null);
const pairAudit=new Map();
const operations=new Map(),searches=new Map(),searchTasks=new Map(),images=new Map(),imageTasks=new Map(),articles=new Map(),dom=new Map(),pending=new WeakMap(),contexts=new WeakMap();
const KEY='rootlab_wikipedia_cache_v211',CHOICES='rootlab_visual_choices_v29',PREF='rootlab_visual_auto_v29';
const loadJSON=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch(_){return{};}};
// Topic identity is case-sensitive after the initial letter. REvolution is an album,
// Revolution is a concept: spelling alone must never collapse those two entities.
const pinned={revolution:[{title:'Revolution',zhTitle:'革命',sense:'政治与社会变革'},{title:'Rotation',zhTitle:'旋转',sense:'转动一周'},{title:'Industrial Revolution',zhTitle:'工业革命',sense:'重大的技术与社会变革'}]};
pinned.carrier=[{title:'Common carrier',zhTitle:'公共承运人',sense:'运输服务 Transport services'},{title:'Mobile network operator',zhTitle:'移动通信运营商',sense:'移动网络 Mobile network'},{title:'Aircraft carrier',zhTitle:'航空母舰',sense:'舰船 Naval vessel'},{title:'Carrier bag',zhTitle:'购物袋',sense:'日常物品 Everyday object'}];
const normalizeTitle=t=>{t=String(t||'').trim().replace(/_/g,' ');return t?t[0].toUpperCase()+t.slice(1):'';};
const workRx=/\b(?:studio album|compilation album|soundtrack|debut album|album by|song by|single by|film directed|television series|video game developed|novel by|rock band|music video)\b/i;
function acceptable(word,title,description=''){
 const set=pinned[word];if(set)return set.some(x=>normalizeTitle(x.title)===normalizeTitle(title));
 const seed=own(seeds,word);if(seed&&normalizeTitle(seed.title)===normalizeTitle(title))return true;
 return !workRx.test(description)&&!/(?:\((?:album|film|song|band|TV series|video game|novel)\))$/i.test(title);
}
function placeholder(title,subtitle='',small=false){return '<figure class="visual-placeholder '+(small?'is-small':'')+'" role="img" aria-label="文字占位 / Title placeholder: '+esc(title)+'"><span class="placeholder-label">文字示意 · 非实物图 <small lang="en">Text only · Not a photograph</small></span><strong>'+esc(title)+'</strong>'+(subtitle?'<span class="placeholder-subtitle">'+esc(subtitle)+'</span>':'')+'</figure>';}
const choices=loadJSON(CHOICES);for(const [w,x]of Object.entries(choices)){if(!x||!acceptable(w,x.title))delete choices[w];}
try{localStorage.setItem(CHOICES,JSON.stringify(choices));}catch(_){}
let auto=true;try{auto=localStorage.getItem(PREF)!=='off';}catch(_){}
for(const [key,r]of Object.entries(loadJSON(KEY)).slice(-30)){if(r&&Date.now()-r.time<7*86400000&&r.article&&urlOK(r.article.source))articles.set(key,r.article);}
function remember(key,a){articles.set(key,a);try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries([...articles].slice(-30).map(([k,v])=>[k,{time:Date.now(),article:v}]))));}catch(_){}}
function saveChoice(word,title,lang){choices[word]={title,lang};try{localStorage.setItem(CHOICES,JSON.stringify(Object.fromEntries(Object.entries(choices).slice(-80))));}catch(_){}}
function live(node){return node.isConnected&&node.closest('#readerV24')&&!document.getElementById('readerV24')?.hidden;}
function currentTarget(node,word,token){if(operations.get(word)!==token)return null;const target=node&&live(node)?node:document.querySelector('#readerV24 .wiki-enrichment');return target&&live(target)&&target.dataset.wikiWord===word?target:null;}
function rememberDOM(node){if(live(node))dom.set(node.dataset.wikiWord,node.innerHTML);}
function creditMarkup(img){if(!img||!allowedLicense(img.license)||!urlOK(img.source))return'';return'<a href="'+esc(img.source)+'" target="_blank" rel="noopener noreferrer">'+esc(img.credit||'Wikimedia Commons')+'</a> · '+(urlOK(img.licenseUrl)?'<a href="'+esc(img.licenseUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(img.license)+'</a>':esc(img.license));}
function visualAlt(img){return (img.alt||'所选主题的图片')+' / '+(img.altEn||img.captionEn||'Illustration for the selected topic.');}
function imageMarkup(img){if(!img?.src||(!localImage(img.src)&&!urlOK(img.src,'image'))||!creditMarkup(img))return'';return'<figure class="wiki-figure visual-figure"><button type="button" class="visual-zoom" data-wiki="zoom" aria-label="放大图片 / Enlarge image: '+esc(img.alt||'单词配图')+'"><img src="'+esc(img.src)+'" alt="'+esc(visualAlt(img))+'" loading="lazy" decoding="async" referrerpolicy="no-referrer"'+(img.width&&img.height?' width="'+Number(img.width)+'" height="'+Number(img.height)+'"':'')+'><span>点图放大</span></button><figcaption>'+(img.caption&&img.captionEn?'<div class="bi-pair visual-caption-pair" data-bi-pair="true"><p class="bi-zh" lang="zh-CN">'+esc(img.caption)+'</p><p class="bi-en" lang="en">'+esc(img.captionEn)+'</p></div>':img.caption?'<div class="visual-caption-deferred"><p lang="zh-CN">这张图片的原始说明请见来源链接。</p><p lang="en">See the source link for the original image caption.</p></div>':'')+'<small>'+creditMarkup(img)+'</small></figcaption></figure>';}
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
function articleMarkup(a){
 if(!a||!urlOK(a.source))return'';
 const evidence=pairEvidence(a);
 const en=a.en||(a.language==='en'?{title:a.title,text:a.summary,source:a.source}:null);
 const zh=a.zh||(['zh','zh-editorial'].includes(a.language)?{title:a.zhTitle||a.title,text:a.summary,source:a.source}:null);
 const photo=imageMarkup(a.image)||placeholder(zh?.title||a.title,en?.title||'百科主题');
 if(!evidence.paired)return '<article class="wiki-article bi-source-pending" data-bi-state="pending-source-pair" data-source-key="'+esc(a.source)+'"><div class="wiki-heading"><h3>'+esc(zh?.title||a.title)+'</h3></div>'+photo+'<p>这个百科主题暂未提供完整的中英文对照；当前单词的双语释义仍在本卡片中。</p><p lang="en">A complete bilingual overview is not available for this topic. The paired dictionary meanings remain available below.</p><a href="'+esc(a.source)+'" target="_blank" rel="noopener noreferrer">阅读原始来源 · Read original source ↗</a></article>';
 const block=(x,lang,label)=>x?.text?'<section class="wiki-language-block" data-language="'+lang+'"><div class="wiki-language-label">'+label+'</div><p class="wiki-summary" lang="'+lang+'">'+esc(x.text)+'</p>'+(urlOK(x.source)?'<a class="wiki-language-source" href="'+esc(x.source)+'" target="_blank" rel="noopener noreferrer">'+(lang==='en'?'English source':'中文来源')+' ↗</a>':'')+'</section>':'';
 return '<article class="wiki-article" data-bi-state="paired-independent-summaries" data-source-key="'+esc(a.source)+'"><div class="wiki-heading"><h3>'+esc(zh?.title||a.title)+'</h3><span>'+(en&&zh?'中英百科':zh?'中文百科':'英文百科原文')+'</span></div>'+photo+'<div class="wiki-languages">'+block(zh,'zh-CN',a.language==='zh-editorial'?'中文整理':'中文百科')+block(en,'en','English overview')+'</div>'+(!zh?'<p class="wiki-note">该主题暂缺中文版；保留英文来源。</p>':'')+(!en?'<p class="wiki-note">英文对应内容暂不可用。</p>':'')+'<p class="wiki-attribution">Wikipedia 贡献者 · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>'+(en&&zh?' · 中英为同主题独立摘要，非逐句翻译':'')+'</p></article>';
}
function seedMarkup(s){const p=window.ROOTLAB_VISUAL_BILINGUAL?.[s.word];const verified=p?.zh===s.caption?p:null;return'<div class="visual-heading"><h3>看图理解 · Picture meaning</h3><span>'+esc(s.zhTitle)+'</span></div>'+imageMarkup({...s.image,caption:s.caption,captionEn:verified?.en,alt:(s.image.alt||s.zhTitle)+(verified?' / '+verified.en:'')})+'<div class="visual-links"><button type="button" class="rd-text" data-wiki="article" data-title="'+esc(s.title)+'" data-lang="en">读相关百科 ↗</button><button type="button" class="rd-text" data-wiki="search">其他含义的图</button></div>';}
function fallback(node,msg){if(!live(node))return;const word=node.dataset.wikiWord;node.innerHTML='<div class="visual-compact">'+placeholder(word,contexts.get(node)?.meaning||'百科图文')+'<h3>看图理解 '+esc(word)+'</h3><p class="wiki-note">'+esc(msg)+'</p><button class="rd-text" data-wiki="search">重新找图</button> · <a class="rd-text" href="https://en.wikipedia.org/wiki/Special:Search?search='+encodeURIComponent(word)+'" target="_blank" rel="noopener noreferrer">查看原站 ↗</a></div>';}
const watcher='IntersectionObserver'in window?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){watcher.unobserve(e.target);if(auto&&live(e.target)&&e.target.dataset.visualPending==='yes'){e.target.dataset.visualPending='no';search(e.target);}}},{rootMargin:'80px'}):null;
function mount(root,c){if(!root||root.querySelector('.wiki-enrichment'))return;watcher?.disconnect();const word=c.word,holder=document.createElement('section');holder.className='wiki-enrichment visual-learning';holder.dataset.wikiWord=word;holder.setAttribute('aria-label','看图理解 '+word);contexts.set(holder,c);
 const selected=own(choices,word),saved=selected?articles.get(selected.lang+':'+selected.title):null,seed=own(seeds,word),old=own(legacy,word);
 const rootEligible=c.learning?.route==='root'&&c.learning?.pieces?.length>1&&!/(?:sex|porn|nude|breast|penis|vagina|genital|blood|corpse|cancer|suicide|weapon|gun|rifle|bomb|kill|assault|anatom|surgery|disease|injury|dissect)/i.test(word);const automatic=auto&&(Boolean(own(hints,word))||rootEligible)&&navigator.onLine;
 holder.innerHTML=dom.get(word)||(saved?articleMarkup(saved)+'<button class="rd-text" data-wiki="search">换一个主题</button>':seed?seedMarkup(seed):old?articleMarkup(old):'<div class="visual-compact">'+placeholder(word,c.meaning||'词义与来历')+'<h3>看图理解 '+esc(word)+'</h3><p class="wiki-note">'+(automatic?'正在准备相关主题图片，请根据词义选择。':'从实物、使用场景或示意图中，选择与当前意思相符的主题。')+'</p><button class="rd-text" data-wiki="search">'+(automatic?'查找图片主题':'查找图文主题 ↗')+'</button></div>');
 const primary=!!(seed||old)&&!saved&&!dom.has(word);holder.dataset.mediaPosition=primary?'primary':'more';
 const target=root.querySelector('[data-v214-media="'+holder.dataset.mediaPosition+'"]');if(!target)return;target.append(holder);
 holder.addEventListener('error',e=>{if(e.target.tagName!=='IMG')return;const image=e.target;image.hidden=true;const fig=image.closest('figure')||image.parentElement;fig?.classList.add('image-unavailable');if(fig&&!fig.querySelector('.visual-placeholder')){const wrap=image.closest('.visual-zoom');const box=document.createElement('div');box.innerHTML=placeholder(word,'图片暂未加载');if(wrap){wrap.hidden=true;wrap.after(box.firstElementChild);}else image.after(box.firstElementChild);}},true);
 if(!dom.has(word)&&!seed&&!old&&!saved&&automatic&&navigator.onLine){holder.dataset.visualPending='yes';if(watcher)watcher.observe(holder);else setTimeout(()=>{if(live(holder))search(holder);},0);}
}
async function api(lang,params,signal){const host=lang==='commons'?'commons.wikimedia.org':(lang==='zh'?'zh.wikipedia.org':'en.wikipedia.org');const u='https://'+host+'/w/api.php?'+new URLSearchParams({action:'query',format:'json',formatversion:2,origin:'*',...params});const r=await fetch(u,{signal,credentials:'omit'});if(!r.ok)throw Error('百科服务暂时无法连接');const x=await r.json();if(x.error)throw Error('百科服务未返回可用资料');return x;}
async function commonsImage(name,signal){if(!name)return null;if(images.has(name))return images.get(name);if(imageTasks.has(name))return imageTasks.get(name);const task=(async()=>{const x=await api('commons',{prop:'imageinfo',titles:'File:'+name,iiprop:'url|extmetadata',iiurlwidth:500},signal);const p=x.query?.pages?.[0],i=p?.imageinfo?.[0],m=i?.extmetadata||{};if(!i||p.missing)return null;const license=text(m.LicenseShortName?.value||m.UsageTerms?.value);if(!allowedLicense(license))return null;const src=i.thumburl||i.url;if(!urlOK(src,'image')||!urlOK(i.descriptionurl))return null;const out={src,source:i.descriptionurl,credit:text(m.Artist?.value||m.Credit?.value||'Wikimedia Commons').slice(0,250),license,licenseUrl:m.LicenseUrl?.value||'',alt:text(m.ImageDescription?.value||name).slice(0,200),width:i.thumbwidth,height:i.thumbheight};images.set(name,out);return out;})();imageTasks.set(name,task);try{return await task;}finally{imageTasks.delete(name);}}
async function findTopics(word){
 if(searches.has(word))return searches.get(word);if(searchTasks.has(word))return searchTasks.get(word);
 const task=(async()=>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),18000);
 try{
  const common={prop:'extracts|info|pageprops|pageimages|langlinks',exintro:1,explaintext:1,exchars:220,exlimit:6,inprop:'url',piprop:'name',pilicense:'free',lllang:'zh'};
  // Ask for canonical titles, not a lowercased search result that happens to match.
  let x;
  if(pinned[word])x=await api('en',{...common,titles:pinned[word].map(v=>v.title).join('|'),redirects:1},ctrl.signal);
  else x=await api('en',{...common,generator:'search',gsrsearch:word,gsrnamespace:0,gsrlimit:6},ctrl.signal);
  let rows=(x.query?.pages||[]).filter(p=>!p.missing&&p.ns===0).sort((a,b)=>(a.index||0)-(b.index||0)).map(p=>({title:p.title,pageId:p.pageid,entity:p.pageprops?.wikibase_item||'',zhTitle:p.langlinks?.find(l=>l.lang==='zh')?.title||'',summary:text(p.extract||'').slice(0,220),description:p.pageprops?.['wikibase-shortdesc']||'',disambiguation:Object.hasOwn(p.pageprops||{},'disambiguation'),file:p.pageimage||''}));
  rows=rows.filter(r=>acceptable(word,r.title,r.summary+' '+r.description));
  if(pinned[word]){rows.sort((a,b)=>pinned[word].findIndex(t=>t.title===a.title)-pinned[word].findIndex(t=>t.title===b.title));for(const r of rows){const pin=pinned[word].find(p=>p.title===r.title);if(pin){r.sense=pin.sense;r.zhTitle=r.zhTitle||pin.zhTitle;}}}
  else{const exact=normalizeTitle(word);const preferred=rows.filter(r=>normalizeTitle(r.title)===exact||normalizeTitle(r.title).startsWith(exact+' ('));if(preferred.some(r=>normalizeTitle(r.title)===exact))rows=preferred;}
  rows=rows.slice(0,4);
  for(let i=0;i<rows.length;i+=2)await Promise.all(rows.slice(i,i+2).map(async r=>{if(r.disambiguation||!r.file)return;try{r.image=await commonsImage(r.file,ctrl.signal);}catch(_){r.image=null;}}));
  searches.set(word,rows);return rows;
 }finally{clearTimeout(timer);}})();searchTasks.set(word,task);try{return await task;}finally{searchTasks.delete(word);}
}
function candidateDescription(row){
 const z=row.sense&&/[\u3400-\u9fff]/.test(row.sense)?row.sense:'';
 const translated=z&&window.RootLabAuthored?.lookup(z)?.en;
 if(translated)return '<small lang="zh-CN">'+esc(z)+'</small><small lang="en">'+esc(translated)+'</small>';
 return row.disambiguation?'<small lang="zh-CN">选择具体主题</small><small lang="en">Choose a specific topic</small>':'';
}
async function search(node){const word=node.dataset.wikiWord;if(!/^[a-z][a-z'-]{0,49}$/i.test(word))return;pending.get(node)?.abort();const token=new AbortController();pending.set(node,token);operations.set(word,token);node.dataset.visualPending='no';node.innerHTML=placeholder(word,contexts.get(node)?.meaning||'百科图文')+'<div class="visual-loading" role="status"><span lang="zh-CN">正在寻找相关图文…</span><span lang="en">Finding related picture topics…</span></div>';
 try{const rows=await findTopics(word);node=currentTarget(node,word,token);if(!node)return;pending.set(node,token);if(!rows.length){fallback(node,'暂无对应的百科图片主题；已有词义和例句照常保留。');return;}
 node.innerHTML='<div class="visual-heading"><h3>选一个与词义相符的画面</h3></div><p class="wiki-note">同一个词可能指不同事物，选择当前想了解的主题。</p><div class="wiki-candidates visual-candidates">'+rows.map(r=>'<article class="visual-candidate"><button type="button" data-wiki="article" data-title="'+esc(r.title)+'" data-lang="en">'+(r.image?'<img src="'+esc(r.image.src)+'" alt="'+esc(r.zhTitle||r.title)+'：主题配图" loading="lazy" decoding="async" referrerpolicy="no-referrer">':placeholder(r.zhTitle||r.title,r.title,true))+(r.image?'<b>'+esc(r.zhTitle||r.title)+'</b>'+(r.zhTitle?'<small lang="en">'+esc(r.title)+'</small>':''):'')+candidateDescription(r)+'<span class="visual-open-label"><span lang="zh-CN">查看图文</span><span lang="en">Open →</span></span></button>'+(r.image?'<div class="visual-thumb-credit">'+creditMarkup(r.image)+'</div>':'')+'</article>').join('')+'</div>';rememberDOM(node);
 }catch(e){const target=currentTarget(node,word,token);if(target)fallback(target,e.name==='AbortError'?'找图超时，请重试；已有词典内容不受影响。':'图片来源暂时不可用；词义、例句和已缓存图片仍可阅读。');}}
async function article(node,title,lang){
 if(!title||title.length>180||!['en','zh'].includes(lang))return;
 const word=node.dataset.wikiWord;
 if(lang==='en'&&!acceptable(word,title)){dom.delete(word);delete choices[word];try{localStorage.setItem(CHOICES,JSON.stringify(choices));}catch(_){}return search(node);}
 const key=lang+':'+title,cached=articles.get(key);
 if(cached&&cached.schema===2&&acceptable(word,cached.en?.title||cached.title,cached.en?.text||'')){pending.get(node)?.abort();operations.set(word,{});saveChoice(word,title,lang);window.RootLabMeanings?.fromTopic(word,cached);node.innerHTML=articleMarkup(cached)+'<button class="rd-text" data-wiki="search">换一个主题</button>';rememberDOM(node);return;}
 pending.get(node)?.abort();const ctrl=new AbortController();pending.set(node,ctrl);operations.set(word,ctrl);const timer=setTimeout(()=>ctrl.abort(),18000);
 node.innerHTML=placeholder(title,contexts.get(node)?.meaning||'百科图文')+'<p class="wiki-note" role="status"><span lang="zh-CN">正在读取中英图文…</span><span lang="en">Loading bilingual topic material…</span></p>';
 try{
  const params={prop:'extracts|pageimages|info|pageprops|langlinks',redirects:1,exintro:1,explaintext:1,exchars:650,piprop:'name',pilicense:'free',inprop:'url',llprop:'url',lllimit:5};
  const fetchPage=async(l,t)=>{const x=await api(l,{...params,titles:t,lllang:l==='en'?'zh':'en',...(l==='zh'?{variant:'zh-cn'}:{})},ctrl.signal);const p=x.query?.pages?.[0];if(!p||p.missing||Object.hasOwn(p.pageprops||{},'disambiguation'))return null;return p;};
  const initial=await fetchPage(lang,title);if(!initial)throw Error('该主题是目录或暂时没有正文，请选择具体主题');
  if(lang==='en'&&!acceptable(word,initial.title,initial.extract+' '+initial.pageprops?.['wikibase-shortdesc']))throw Error('这个同名条目不对应当前词义，请重新选择');
  let en=lang==='en'?initial:null,zh=lang==='zh'?initial:null;
  const otherTitle=initial.langlinks?.find(l=>l.lang===(lang==='en'?'zh':'en'))?.title;
  if(otherTitle){try{const other=await fetchPage(lang==='en'?'zh':'en',otherTitle);const a=initial.pageprops?.wikibase_item,b=other?.pageprops?.wikibase_item;if(other&&(!a||!b||a===b)){if(lang==='en')zh=other;else en=other;}}catch(_){} }
  if(en&&!acceptable(word,en.title,en.extract||''))throw Error('对应语言条目与当前词义不符');
  const pack=(p,l)=>p?{title:p.title,text:summary(p.extract||'',l),source:'https://'+l+'.wikipedia.org/wiki/'+encodeURIComponent(p.title),pageId:p.pageid,entity:p.pageprops?.wikibase_item||''}:null;
  const a={schema:2,en:pack(en,'en'),zh:pack(zh,'zh'),title:zh?.title||en?.title||initial.title,language:zh?'zh':'en',summary:summary((zh||en||initial).extract||'',zh?'zh':'en'),source:'https://'+(zh?'zh':'en')+'.wikipedia.org/wiki/'+encodeURIComponent((zh||en||initial).title)};
  // Some language editions have no usable photo; try both and already confirmed seed.
  const files=[...new Set([en?.pageimage,zh?.pageimage].filter(Boolean))];
  for(const file of files){try{a.image=await commonsImage(file,ctrl.signal);if(a.image)break;}catch(_){}}
  const seed=own(seeds,word);if(!a.image&&seed&&normalizeTitle(seed.title)===normalizeTitle(en?.title||title))a.image=seed.image;
  node=currentTarget(node,word,ctrl);if(!node)return;pending.set(node,ctrl);
  remember(key,a);saveChoice(word,title,lang);window.RootLabMeanings?.fromTopic(word,a);
  node.innerHTML=articleMarkup(a)+'<button class="rd-text" data-wiki="search">换一个主题</button>';rememberDOM(node);
 }catch(e){const target=currentTarget(node,word,ctrl);if(target)fallback(target,e.name==='AbortError'?'图文读取超时，已有词义仍可阅读。':e.message||'读取失败');}finally{clearTimeout(timer);}
}
function zoom(button){const figure=button.closest('figure'),img=figure?.querySelector('img');if(!img||img.hidden)return;let dialog=document.getElementById('visualLightbox');if(!dialog){dialog=document.createElement('dialog');dialog.id='visualLightbox';dialog.className='visual-lightbox';dialog.setAttribute('aria-label','单词图片大图');document.body.append(dialog);}dialog.innerHTML='<button type="button" data-wiki="close-zoom" class="visual-close" aria-label="关闭大图">×</button><div class="visual-large-image"></div>';const copy=figure.cloneNode(true),nested=copy.querySelector('.visual-zoom');if(nested){const image=nested.querySelector('img');image.loading='eager';nested.replaceWith(image);}dialog.querySelector('.visual-large-image').append(copy);dialog.addEventListener('close',()=>button.isConnected&&button.focus({preventScroll:true}),{once:true});dialog.showModal();dialog.querySelector('.visual-close')?.focus();}
function setAuto(value){auto=!!value;try{localStorage.setItem(PREF,auto?'on':'off');}catch(_){}document.querySelectorAll('[data-wiki="toggle-auto"]').forEach(b=>{b.setAttribute('aria-pressed',String(auto));b.textContent='相关图片自动查找：'+(auto?'开启':'关闭');});}
function preferences(){return'<div class="visual-preference"><button type="button" class="outline-btn" data-wiki="toggle-auto" aria-pressed="'+auto+'">相关图片自动查找：'+(auto?'开启':'关闭')+'</button><p>已整理的配图直接显示；具体事物和词根词进入视野后会查询相关主题。关闭后仍可手动找图。</p></div>';}
document.addEventListener('click',e=>{const b=e.target.closest('[data-wiki]');if(!b)return;const action=b.dataset.wiki;if(action==='close-zoom'){e.preventDefault();document.getElementById('visualLightbox')?.close();return;}if(action==='toggle-auto'){e.preventDefault();setAuto(!auto);return;}const n=b.closest('.wiki-enrichment');if(!n)return;e.preventDefault();e.stopPropagation();if(action==='search')search(n);if(action==='article')article(n,b.dataset.title,b.dataset.lang);if(action==='zoom')zoom(b);});
window.RootLabEncyclopedia={mount,search,article,preferences,setAuto,placeholder,acceptable,auditSnapshot,get auto(){return auto;},get stats(){return{seeds:Object.keys(seeds).length,candidates:Object.keys(hints).length};},clear(){operations.clear();searches.clear();articles.clear();dom.clear();pairAudit.clear();for(const key of Object.keys(choices))delete choices[key];try{localStorage.removeItem(KEY);localStorage.removeItem(CHOICES);}catch(_){}}};
})();
