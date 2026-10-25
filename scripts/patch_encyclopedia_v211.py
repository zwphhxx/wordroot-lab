from pathlib import Path
R=Path(__file__).resolve().parent.parent
s=(R/'encyclopedia-v210.js').read_text()
s=s.replace("const KEY='rootlab_wikipedia_cache_v28'", "const KEY='rootlab_wikipedia_cache_v211'")
needle="const choices=loadJSON(CHOICES);let auto=true;"
policy="""// Topic identity is case-sensitive after the initial letter. REvolution is an album,
// Revolution is a concept: spelling alone must never collapse those two entities.
const pinned={revolution:[{title:'Revolution',zhTitle:'革命',sense:'政治与社会变革'},{title:'Rotation',zhTitle:'旋转',sense:'转动一周'},{title:'Industrial Revolution',zhTitle:'工业革命',sense:'重大的技术与社会变革'}]};
const normalizeTitle=t=>{t=String(t||'').trim().replace(/_/g,' ');return t?t[0].toUpperCase()+t.slice(1):'';};
const workRx=/\\b(?:studio album|compilation album|soundtrack|debut album|album by|song by|single by|film directed|television series|video game developed|novel by|rock band|music video)\\b/i;
function acceptable(word,title,description=''){
 const set=pinned[word];if(set)return set.some(x=>normalizeTitle(x.title)===normalizeTitle(title));
 const seed=own(seeds,word);if(seed&&normalizeTitle(seed.title)===normalizeTitle(title))return true;
 return !workRx.test(description)&&!/(?:\\((?:album|film|song|band|TV series|video game|novel)\\))$/i.test(title);
}
function placeholder(title,subtitle='',small=false){return '<figure class="visual-placeholder '+(small?'is-small':'')+'" role="img" aria-label="文字占位图：'+esc(title)+'"><span class="placeholder-label">文字占位 · 非实物图</span><strong>'+esc(title)+'</strong>'+(subtitle?'<span class="placeholder-subtitle">'+esc(subtitle)+'</span>':'')+'</figure>';}
const choices=loadJSON(CHOICES);for(const [w,x]of Object.entries(choices)){if(!x||!acceptable(w,x.title))delete choices[w];}
try{localStorage.setItem(CHOICES,JSON.stringify(choices));}catch(_){}
let auto=true;"""
assert needle in s;s=s.replace(needle,policy,1)
a=s.index('function articleMarkup(');b=s.index('function seedMarkup(',a)
s=s[:a]+"""function articleMarkup(a){
 if(!a||!urlOK(a.source))return'';
 const en=a.en||(a.language==='en'?{title:a.title,text:a.summary,source:a.source}:null);
 const zh=a.zh||(['zh','zh-editorial'].includes(a.language)?{title:a.zhTitle||a.title,text:a.summary,source:a.source}:null);
 const photo=imageMarkup(a.image)||placeholder(zh?.title||a.title,en?.title||'百科主题');
 const block=(x,lang,label)=>x?.text?'<section class="wiki-language-block" data-language="'+lang+'"><div class="wiki-language-label">'+label+'</div><p class="wiki-summary" lang="'+lang+'">'+esc(x.text)+'</p>'+(urlOK(x.source)?'<a class="wiki-language-source" href="'+esc(x.source)+'" target="_blank" rel="noopener noreferrer">'+(lang==='en'?'English source':'中文来源')+' ↗</a>':'')+'</section>':'';
 return '<article class="wiki-article"><div class="wiki-heading"><h3>'+esc(zh?.title||a.title)+'</h3><span>'+(en&&zh?'中英百科':zh?'中文百科':'英文百科原文')+'</span></div>'+photo+'<div class="wiki-languages">'+block(zh,'zh-CN',a.language==='zh-editorial'?'中文整理':'中文百科')+block(en,'en','English overview')+'</div>'+(!zh?'<p class="wiki-note">该主题暂缺中文版；保留英文来源。</p>':'')+(!en?'<p class="wiki-note">英文对应内容暂不可用。</p>':'')+'<p class="wiki-attribution">Wikipedia 贡献者 · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>'+(en&&zh?' · 中英为同主题独立摘要，非逐句翻译':'')+'</p></article>';
}
"""+s[b:]
# Placeholder for real-image download failure, without pretending it is an illustration.
a=s.index(" holder.addEventListener('error'");b=s.index('\n const split=',a)
s=s[:a]+""" holder.addEventListener('error',e=>{if(e.target.tagName!=='IMG')return;const image=e.target;image.hidden=true;const fig=image.closest('figure')||image.parentElement;fig?.classList.add('image-unavailable');if(fig&&!fig.querySelector('.visual-placeholder')){const wrap=image.closest('.visual-zoom');const box=document.createElement('div');box.innerHTML=placeholder(word,'图片暂未加载');if(wrap){wrap.hidden=true;wrap.after(box.firstElementChild);}else image.after(box.firstElementChild);}},true);"""+s[b:]
# All no-image states use a visually explicit local, dynamic title card. No remote image generation.
s=s.replace("'<div class=\"visual-compact\"><h3>看图理解 '+esc(word)+'</h3><p class=\"wiki-note\">'", "'<div class=\"visual-compact\">'+placeholder(word,contexts.get(node)?.meaning||'百科图文')+'<h3>看图理解 '+esc(word)+'</h3><p class=\"wiki-note\">'",1)
# The second instance is inside mount, where c, not node, carries current meaning.
s=s.replace("'<div class=\"visual-compact\"><h3>看图理解 '+esc(word)+'</h3><p class=\"wiki-note\">'", "'<div class=\"visual-compact\">'+placeholder(word,c.meaning||'词义与来历')+'<h3>看图理解 '+esc(word)+'</h3><p class=\"wiki-note\">'",1)
a=s.index('async function findTopics(');b=s.index('async function search(',a)
s=s[:a]+"""async function findTopics(word){
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
"""+s[b:]
s=s.replace("'<span class=\"visual-no-thumbnail\">'+(r.disambiguation?'多个含义':'暂无配图')+'</span>'", "placeholder(r.zhTitle||r.title,r.title,true)")
s=s.replace("esc(r.disambiguation?'先确认具体主题':r.summary||'查看这个主题的介绍')", "esc(r.disambiguation?'先确认具体主题':r.sense||r.summary||'查看这个主题的介绍')")
s=s.replace("node.innerHTML='<div class=\"visual-loading\" role=\"status\">正在寻找 '+esc(word)+' 的相关图文…</div>';", "node.innerHTML=placeholder(word,contexts.get(node)?.meaning||'百科图文')+'<div class=\"visual-loading\" role=\"status\">正在寻找相关图文…</div>';")
a=s.index('async function article(');b=s.index('function zoom(',a)
s=s[:a]+"""async function article(node,title,lang){
 if(!title||title.length>180||!['en','zh'].includes(lang))return;
 const word=node.dataset.wikiWord;
 if(lang==='en'&&!acceptable(word,title)){dom.delete(word);delete choices[word];try{localStorage.setItem(CHOICES,JSON.stringify(choices));}catch(_){}return search(node);}
 const key=lang+':'+title,cached=articles.get(key);
 if(cached&&cached.schema===2&&acceptable(word,cached.en?.title||cached.title,cached.en?.text||'')){saveChoice(word,title,lang);window.RootLabMeanings?.fromTopic(word,cached);node.innerHTML=articleMarkup(cached)+'<button class="rd-text" data-wiki="search">换一个主题</button>';rememberDOM(node);return;}
 pending.get(node)?.abort();const ctrl=new AbortController();pending.set(node,ctrl);const timer=setTimeout(()=>ctrl.abort(),18000);
 node.innerHTML=placeholder(title,contexts.get(node)?.meaning||'百科图文')+'<p class="wiki-note" role="status">正在读取中英图文…</p>';
 try{
  const params={prop:'extracts|pageimages|info|pageprops|langlinks',redirects:1,exintro:1,explaintext:1,exchars:650,piprop:'name',pilicense:'free',inprop:'url',llprop:'url',lllimit:5};
  const fetchPage=async(l,t)=>{const x=await api(l,{...params,titles:t,lllang:l==='en'?'zh':'en',...(l==='zh'?{variant:'zh-cn'}:{})},ctrl.signal);const p=x.query?.pages?.[0];if(!p||p.missing||Object.hasOwn(p.pageprops||{},'disambiguation'))return null;return p;};
  const initial=await fetchPage(lang,title);if(!initial)throw Error('该主题是目录或暂时没有正文，请选择具体主题');
  if(lang==='en'&&!acceptable(word,initial.title,initial.extract+' '+initial.pageprops?.['wikibase-shortdesc']))throw Error('这个同名条目不对应当前词义，请重新选择');
  let en=lang==='en'?initial:null,zh=lang==='zh'?initial:null;
  const otherTitle=initial.langlinks?.find(l=>l.lang===(lang==='en'?'zh':'en'))?.title;
  if(otherTitle){try{const other=await fetchPage(lang==='en'?'zh':'en',otherTitle);const a=initial.pageprops?.wikibase_item,b=other?.pageprops?.wikibase_item;if(other&&(!a||!b||a===b)){if(lang==='en')zh=other;else en=other;}}catch(_){} }
  if(en&&!acceptable(word,en.title,en.extract||''))throw Error('对应语言条目与当前词义不符');
  const pack=(p,l)=>p?{title:p.title,text:text(p.extract||'').slice(0,650),source:'https://'+l+'.wikipedia.org/wiki/'+encodeURIComponent(p.title),pageId:p.pageid,entity:p.pageprops?.wikibase_item||''}:null;
  const a={schema:2,en:pack(en,'en'),zh:pack(zh,'zh'),title:zh?.title||en?.title||initial.title,language:zh?'zh':'en',summary:text((zh||en||initial).extract||'').slice(0,650),source:'https://'+(zh?'zh':'en')+'.wikipedia.org/wiki/'+encodeURIComponent((zh||en||initial).title)};
  // Some language editions have no usable photo; try both and already confirmed seed.
  const files=[...new Set([en?.pageimage,zh?.pageimage].filter(Boolean))];
  for(const file of files){try{a.image=await commonsImage(file,ctrl.signal);if(a.image)break;}catch(_){}}
  const seed=own(seeds,word);if(!a.image&&seed&&normalizeTitle(seed.title)===normalizeTitle(en?.title||title))a.image=seed.image;
  if(!live(node)||pending.get(node)!==ctrl)return;
  remember(key,a);saveChoice(word,title,lang);window.RootLabMeanings?.fromTopic(word,a);
  node.innerHTML=articleMarkup(a)+'<button class="rd-text" data-wiki="search">换一个主题</button>';rememberDOM(node);
 }catch(e){if(pending.get(node)===ctrl)fallback(node,e.name==='AbortError'?'图文读取超时，已有词义仍可阅读。':e.message||'读取失败');}finally{clearTimeout(timer);}
}
"""+s[b:]
s=s.replace('window.RootLabEncyclopedia={mount,search,article,preferences,setAuto,','window.RootLabEncyclopedia={mount,search,article,preferences,setAuto,placeholder,acceptable,')
(R/'encyclopedia-v211.js').write_text(s)
print('Created bilingual, topic-bound encyclopedia; preserves unrelated learning keys')
