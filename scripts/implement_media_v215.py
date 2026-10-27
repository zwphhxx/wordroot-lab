#!/usr/bin/env python3
from pathlib import Path
R=Path(__file__).resolve().parent.parent
p=R/'encyclopedia-v215.js';s=p.read_text()
def swap(start,end,code):
 global s
 a=s.index(start);b=s.index(end,a+len(start));s=s[:a]+code.rstrip()+'\n'+s[b:]
s=s.replace('visual-v(?:29|210)','visual-v(?:29|210|215)')
s=s.replace("const KEY='rootlab_wikipedia_cache_v211',CHOICES", "const KEY='rootlab_wikipedia_cache_v215',CHOICES")
s=s.replace("const loadJSON=k=>", "const topicMaps=window.ROOTLAB_TOPIC_MAPS_V215||{},articleViews=new Map(),discoveryTimers=new Map();\nconst loadJSON=k=>",1)
s=s.replace("const normalizeTitle=t=>", "pinned.species=[{title:'Species',zhTitle:'物种',sense:'生物分类 Biological classification'}];\npinned.dogwood=[{title:'Cornus',zhTitle:'山茱萸属',sense:'属名；dogwood 的植物义项'},{title:'Cornus florida',zhTitle:'大花四照花',sense:'该属中的一种植物'},{title:'Cornus kousa',zhTitle:'四照花',sense:'该属中的一种植物'},{title:'Cornus sericea',zhTitle:'红瑞木类植物',sense:'该属中的一种植物'}];\nconst normalizeTitle=t=>",1)
s=s.replace("const target=node&&live(node)?node:document.querySelector('#readerV24 .wiki-enrichment')", "const target=node&&live(node)?node:document.querySelector('#readerV24 .wiki-enrichment[data-wiki-word=\"'+CSS.escape(word)+'\"]')")
s=s.replace("function rememberDOM(node){if(live(node))dom.set(node.dataset.wikiWord,node.innerHTML);}","function rememberDOM(node){if(live(node)&&!['network-error','image-error'].includes(node.dataset.mediaState))dom.set(node.dataset.wikiWord,node.innerHTML);}")
s=s.replace("'<figure class=\"wiki-figure visual-figure\"><button", "'<figure class=\"wiki-figure visual-figure '+(img.kind==='diagram'?'is-diagram':'')+'\"><button",1)
s=s.replace("'<img src=\"'+esc(img.src)+'\" alt=", "'<img src=\"'+esc(img.src)+'\"'+(img.remote&&urlOK(img.remote,'image')?' data-fallback-src=\"'+esc(img.remote)+'\"':'')+' alt=",1)
a=s.index('function articleMarkup');s=s[:a]+r'''
function identityMarkup(word,a){const title=a?.en?.title||a?.canonicalTitle||a?.title||'',map=topicMaps[word],exact=map&&normalizeTitle(map.title)===normalizeTitle(title);if(!word)return '';
 const zh=exact?map.identityZh:'百科名称来自所选主题，不替换当前查询词；请按具体义项理解。';const en=exact?map.identityEn:'This source title identifies the selected topic, not a replacement for your search word. Match it to the relevant meaning.';
 return '<div class="v215-topic-identity" data-authored-done="1"><p><b lang="en">'+esc(word)+'</b> · <span lang="zh-CN">百科主题</span> <span lang="en">Topic: '+esc(title)+'</span></p><p lang="zh-CN">'+esc(zh)+'</p><p lang="en">'+esc(en)+'</p></div>';
}
function summaryParts(value,lang){const pieces=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(lang,{granularity:'sentence'}).segment(value)].map(x=>x.segment):[value];const out=[];let chunk='';const limit=lang==='en'?650:260;for(const x of pieces){if(chunk&&chunk.length+x.length>limit){out.push(chunk);chunk='';}chunk+=x;}if(chunk)out.push(chunk);return out;}
function state(node,value){node.dataset.mediaState=value;const entry=document.querySelector('#readerV24 [data-media-entry="'+CSS.escape(node.dataset.wikiWord)+'"]');if(entry){const labels={loading:'正在查图 · Finding pictures',candidates:'选择图片主题 · Choose a topic',ready:'查看图文 · Picture topics','network-error':'图片查询失败，重试 · Retry pictures','no-compatible-image':'查看可用图文 · Picture topics','image-error':'图片未加载，重试 · Retry image'};entry.textContent=labels[value]||labels.ready;}}
function mediaEntry(root,word){const target=root.querySelector('[data-v214-media="primary"]');if(!target||target.querySelector('[data-media-entry]'))return;const line=document.createElement('div');line.className='v215-media-entry';line.innerHTML='<a data-ui-jump data-media-entry="'+esc(word)+'" href="#picture-topic-'+esc(word)+'">查看图文 · Picture topics →</a>';target.append(line);}
function presentArticle(node,a,word){if(!live(node))return;articleViews.set(word,a);node.innerHTML=articleMarkup(a,word)+'<button class="rd-text" data-wiki="search">换一个主题 · Choose another topic</button>';const root=node.closest('#readerV24'),photo=node.querySelector('.wiki-photo-card'),primary=root?.querySelector('[data-v214-media="primary"]');
 const before=window.RootLabReader?.capturePosition?.(),y=scrollY;root?.querySelector('.v215-image-preview')?.remove();
 if(photo&&a.image&&primary){const preview=document.createElement('section');preview.className='v215-image-preview';preview.dataset.wikiWord=word;preview.dataset.canonicalTitle=a.en?.title||a.title;preview.append(photo);primary.prepend(preview);node.dataset.mediaPosition='more';root.querySelector('[data-v214-media="more"]').append(node);}
 state(node,a.image?'ready':a.imageCandidates?.length?'candidates':'no-compatible-image');mediaEntry(root,word);rememberDOM(node);if(before)requestAnimationFrame(()=>window.RootLabReader?.restorePosition?.(before,y));}
function protectKnownImage(node,word){if(node.dataset.mediaPosition!=='primary')return;const root=node.closest('#readerV24'),photo=node.querySelector('.wiki-card');if(photo){const preview=document.createElement('section');preview.className='v215-image-preview';preview.dataset.wikiWord=word;preview.append(photo);root.querySelector('[data-v214-media="primary"]').prepend(preview);}node.dataset.mediaPosition='more';root.querySelector('[data-v214-media="more"]').append(node);}
''' + s[a:]
swap('function articleMarkup(a){','function seedMarkup(s){',r'''
function articleMarkup(a,word=''){
 if(!a||!urlOK(a.source))return '';const evidence=pairEvidence(a);const en=a.en||(a.language==='en'?{title:a.title,text:a.summary,source:a.source}:null),zh=a.zh||(['zh','zh-editorial'].includes(a.language)?{title:a.zhTitle||a.title,text:a.summary,source:a.source}:null);
 const photo='<section class="wiki-card wiki-photo-card"><div class="wiki-heading"><h3>'+esc(word||zh?.title||a.title)+'</h3><span>图文 · Picture topic</span></div>'+identityMarkup(word,a)+(imageMarkup(a.image)||placeholder(zh?.title||a.title,en?.title||'百科主题'))+'</section>';
 const start='<article class="wiki-article" data-query-word="'+esc(word)+'" data-canonical-title="'+esc(en?.title||a.title)+'" data-entity="'+esc(en?.entity||zh?.entity||'')+'" data-bi-state="'+(evidence.paired?'paired-independent-summaries':'pending-source-pair')+'" data-source-key="'+esc(a.source)+'">';
 if(!evidence.paired)return start+photo+'<section class="wiki-card bi-source-pending"><p lang="zh-CN">这个主题暂缺完整中英对照；单词的双语释义仍然保留。</p><p lang="en">This topic does not yet have both language overviews. The bilingual dictionary meanings remain available.</p><a href="'+esc(a.source)+'" target="_blank" rel="noopener noreferrer">原始来源 · Original source ↗</a></section></article>';
 const block=(x,lang,label)=>x?.text?summaryParts(x.text,lang==='en'?'en':'zh').map((part,i)=>'<section class="wiki-card wiki-language-block" data-language="'+lang+'"><div class="wiki-language-label">'+label+(i?' · '+(i+1):'')+'</div><p class="wiki-summary" lang="'+lang+'">'+esc(part)+'</p>'+(urlOK(x.source)?'<a class="wiki-language-source" href="'+esc(x.source)+'" target="_blank" rel="noopener noreferrer">'+(lang==='en'?'English source':'中文来源')+' ↗</a>':'')+'</section>').join(''):'';
 const candidates=(a.imageCandidates||[]).length?'<section class="wiki-card"><h3>此条目中的其他图片 · More article images</h3><p class="wiki-note">这些图片尚未绑定当前义项，请选择合适的画面。<br><span lang="en">These article images are not assigned to a meaning. Choose an appropriate illustration.</span></p><div class="visual-candidates">'+a.imageCandidates.map((img,i)=>'<article class="visual-candidate"><button data-wiki="choose-image" data-image-index="'+i+'"><img src="'+esc(img.src)+'" alt="'+esc(img.file||'Source image')+'" loading="lazy"><span>选择图片 · Select</span></button><div class="visual-thumb-credit">'+creditMarkup(img)+'</div></article>').join('')+'</div></section>':'';
 return start+photo+'<div class="wiki-languages">'+block(zh,'zh-CN','中文百科 · Chinese overview')+block(en,'en','英文百科 · English overview')+'</div>'+candidates+'<p class="wiki-attribution">Wikipedia 贡献者 · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> · 中英为同主题独立摘要，非逐句翻译 / Independent language summaries, not a sentence-by-sentence translation.</p></article>';
}
''')
swap('function fallback(node,msg){',"const watcher=",r'''
function fallback(node,msg,reason='network-error'){if(!live(node))return;const word=node.dataset.wikiWord;state(node,reason);dom.delete(word);node.innerHTML='<section class="wiki-card"><h3>图文 · Picture topics</h3><div class="v215-image-state" role="status"><span lang="zh-CN">'+esc(msg)+'</span><span lang="en">Existing dictionary content is unchanged. You can retry the picture request.</span></div><button class="rd-text" data-wiki="search">重新找图 · Retry</button> · <a class="rd-text" href="https://en.wikipedia.org/wiki/Special:Search?search='+encodeURIComponent(word)+'" target="_blank" rel="noopener noreferrer">原站 · Source ↗</a></section>';}
''')
swap('function mount(root,c){','async function api(',r'''
function mount(root,c){if(!root)return;const existing=root.querySelector('.wiki-enrichment');if(existing){contexts.set(existing,c);mediaEntry(root,c.word);return;}
 const word=c.word,holder=document.createElement('section');holder.className='wiki-enrichment visual-learning';holder.dataset.wikiWord=word;holder.id='picture-topic-'+word;holder.setAttribute('aria-label','图文 / Pictures: '+word);contexts.set(holder,c);
 const selected=own(choices,word),saved=selected?articles.get(selected.lang+':'+selected.title):null,seed=own(seeds,word),old=own(legacy,word);holder.dataset.mediaPosition=seed&&!saved?'primary':'more';root.querySelector('[data-v214-media="'+holder.dataset.mediaPosition+'"]').append(holder);
 if(saved&&acceptable(word,saved.en?.title||saved.title,saved.en?.text||'')){presentArticle(holder,saved,word);if(!saved.image&&auto&&navigator.onLine)setTimeout(()=>{if(live(holder))article(holder,selected.title,selected.lang,true);},250);}
 else if(seed){holder.innerHTML='<section class="wiki-card">'+identityMarkup(word,{title:seed.title})+seedMarkup(seed)+'</section>';state(holder,'ready');}
 else if(old){presentArticle(holder,old,word);}
 else if(dom.has(word)){holder.innerHTML=dom.get(word);state(holder,'candidates');mediaEntry(root,word);}
 else{holder.innerHTML='<section class="visual-compact"><h3>图文主题 · Picture topics</h3><p class="wiki-note">按当前词义选择图片，不会更改查询词。<br><span lang="en">Choose an image for this meaning; your search word stays unchanged.</span></p><button class="rd-text" data-wiki="search">查找图文 · Find pictures</button></section>';mediaEntry(root,word);
  const sensitive=/(?:porn|nude|genital|corpse|suicide|dissect)/i.test(word);if(auto&&navigator.onLine&&!sensitive){clearTimeout(discoveryTimers.get(word));discoveryTimers.set(word,setTimeout(()=>{discoveryTimers.delete(word);if(auto&&live(holder))search(holder);},220));}}
}
''')
swap('async function commonsImage(name,signal){','function candidateDescription(row){',r'''
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
''')
swap('async function search(node){','async function article(node,title,lang){',r'''
async function search(node,force=false){const word=node.dataset.wikiWord;if(!/^[a-z][a-z'-]{0,49}$/i.test(word))return;pending.get(node)?.abort();protectKnownImage(node,word);const token=new AbortController();pending.set(node,token);operations.set(word,token);state(node,'loading');node.innerHTML='<section class="wiki-card"><div class="v215-image-state" role="status"><span lang="zh-CN">正在寻找图片主题…</span><span lang="en">Finding picture topics…</span></div></section>';
 try{const rows=await findTopics(word,force);node=currentTarget(node,word,token);if(!node)return;pending.set(node,token);if(!rows.length){fallback(node,'暂无匹配的百科主题，已有释义与例句仍可阅读。','no-compatible-image');return;}
 node.innerHTML='<section class="wiki-card"><div class="visual-heading"><h3>为 '+esc(word)+' 选择主题 <small lang="en">Choose a topic</small></h3></div><p class="wiki-note">候选主题不是自动判定的词义。<br><span lang="en">A candidate topic is not an automatically assigned meaning.</span></p><div class="wiki-candidates visual-candidates">'+rows.map(r=>'<article class="visual-candidate" data-topic-entity="'+esc(r.entity)+'"><button type="button" data-wiki="article" data-title="'+esc(r.title)+'" data-lang="en">'+(r.image?'<img src="'+esc(r.image.src)+'" alt="'+esc(r.zhTitle||r.title)+' / '+esc(r.title)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer">':placeholder(r.zhTitle||r.title,r.title,true))+(r.image?'<b lang="zh-CN">'+esc(r.zhTitle||r.title)+'</b><small lang="en">'+esc(r.title)+'</small>':'')+candidateDescription(r)+'<span class="visual-open-label"><span lang="zh-CN">查看图文</span><span lang="en">Open →</span></span></button>'+(r.image?'<div class="visual-thumb-credit">'+creditMarkup(r.image)+'</div>':'')+'</article>').join('')+'</div></section>';state(node,'candidates');rememberDOM(node);
 }catch(e){const target=currentTarget(node,word,token);if(target)fallback(target,e.name==='AbortError'?'图片查询超时，可以重试。':'图片来源暂时不可用，可以重试。','network-error');}}
''')
swap('async function article(node,title,lang){','function zoom(button){',r'''
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
''')
# Image errors are handled at the reading surface: they do not erase the word or its meanings.
a=s.index("document.addEventListener('click',e=>{const b=e.target.closest('[data-wiki]')")
b=s.index('window.RootLabEncyclopedia=',a)
s=s[:a]+r'''
document.addEventListener('error',e=>{const image=e.target;if(image?.tagName!=='IMG'||!image.closest('#readerV24 .visual-learning,#readerV24 .v215-image-preview'))return;
 const alternate=image.dataset.fallbackSrc;if(alternate&&urlOK(alternate,'image')&&!image.dataset.fallbackTried){image.dataset.fallbackTried='1';image.src=alternate;return;}
 const fig=image.closest('figure');if(!fig)return;const scope=image.closest('[data-wiki-word]'),word=scope?.dataset.wikiWord||window.RootLabReader?.context?.word;image.hidden=true;const zoom=image.closest('.visual-zoom');if(zoom)zoom.hidden=true;fig.classList.add('image-unavailable');
 if(!fig.querySelector('.v215-image-retry')){const button=document.createElement('button');button.className='rd-text v215-image-retry';button.dataset.wiki='retry-image';button.textContent='图片未加载，重试 · Retry image';button.dataset.src=image.getAttribute('src');zoom?.after(button);}
 const controller=document.querySelector('#readerV24 .wiki-enrichment[data-wiki-word="'+CSS.escape(word||'')+'"]');if(controller)state(controller,'image-error');},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-wiki]');if(!b)return;const action=b.dataset.wiki;if(action==='close-zoom'){e.preventDefault();document.getElementById('visualLightbox')?.close();return;}if(action==='toggle-auto'){e.preventDefault();setAuto(!auto);return;}
 const scope=b.closest('.wiki-enrichment,.v215-image-preview');if(!scope)return;const word=scope.dataset.wikiWord,n=document.querySelector('#readerV24 .wiki-enrichment[data-wiki-word="'+CSS.escape(word)+'"]');if(!n)return;e.preventDefault();e.stopPropagation();
 if(action==='zoom'){zoom(b);return;}
 if(action==='retry-image'){const fig=b.closest('figure'),img=fig?.querySelector('img');if(img){fig.classList.remove('image-unavailable');img.hidden=false;img.dataset.fallbackTried='';img.closest('.visual-zoom').hidden=false;const src=b.dataset.src;b.remove();img.src=src;state(n,'loading');img.addEventListener('load',()=>state(n,'ready'),{once:true});}return;}
 if(action==='search')search(n,true);if(action==='article'||action==='retry-article')article(n,b.dataset.title,b.dataset.lang,action==='retry-article');
 if(action==='choose-image'){const a=articleViews.get(word),i=Number(b.dataset.imageIndex);if(a&&Number.isInteger(i)&&a.imageCandidates?.[i]){a.image={...a.imageCandidates[i],caption:'用户为此百科主题选择的图片。',captionEn:'An image selected for this encyclopedia topic.'};a.imageCandidates=[];const choice=choices[word];if(choice)remember(choice.lang+':'+choice.title,a);presentArticle(n,a,word);}}
});
''' +s[b:]
s=s.replace('placeholder,acceptable,auditSnapshot,','placeholder,acceptable,auditSnapshot,findTopics,bodyImages,commonsImage,identityMarkup,')
s=s.replace('operations.clear();searches.clear();articles.clear();dom.clear();pairAudit.clear();','operations.clear();searches.clear();articles.clear();dom.clear();pairAudit.clear();articleViews.clear();for(const t of discoveryTimers.values())clearTimeout(t);discoveryTimers.clear();')
p.write_text(s)
# Preserve a selected image across same-word hydration, without moving encyclopedia text into the dictionary.
p=R/'reader-v215.js';s=p.read_text();s=s.replace("plain:window.RootLabMeanings?.entry(c.word)","plain:window.RootLabMeanings?.entry(c.word)?.kind==='selected-topic'?null:window.RootLabMeanings?.entry(c.word)")
s=s.replace("const media=node.querySelector('.wiki-enrichment');", "const preview=node.querySelector('.v215-image-preview');const media=node.querySelector('.wiki-enrichment');",1)
s=s.replace("window.RootLabEncyclopedia?.mount(node,c);", "if(preview?.dataset.wikiWord===c.word)node.querySelector('[data-v214-media=primary]')?.prepend(preview);\n window.RootLabEncyclopedia?.mount(node,c);",1)
p.write_text(s)
print('MEDIA_DISCOVERY_AND_TOPIC_IDENTITIES_READY')
