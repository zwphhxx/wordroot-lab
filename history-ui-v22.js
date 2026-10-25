(function(){
'use strict';
const cache=new Map();
const record=word=>(window.ROOTLAB_WORD_HISTORY||{})[String(word||'').toLowerCase()]||null;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const safeLink=url=>typeof url==='string'&&/^https:\/\//.test(url);
function morphDescription(word,part){
 const obj=record(word);if(!obj)return '';
 const segment=String(part||'').replace(/^-|-$/g,'').toLowerCase();
 const item=(obj.components||[]).find(x=>String(x.part||'').replace(/^-|-$/g,'').toLowerCase()===segment);
 return item?.meaning||'';
}
function morphology(word){
 const obj=record(word);if(!obj?.components?.length)return '';
 let blocks=obj.components.map(item=>'<div class="morph-piece">'+
  '<span>'+esc(item.role)+'</span><b>'+esc(item.part)+'</b><small>'+esc(item.meaning)+'</small></div>');
 let details=obj.components.map(item=>'<p><b>'+esc(item.part)+'</b> · '+esc(item.detail||item.meaning)+'</p>').join('');
 return '<div class="morph-sequence">'+blocks.join('<div class="morph-plus">+</div>')+'</div><div class="historical-components">'+details+'</div>';
}
function guide(){
 return '<details class="morph-primer"><summary>前缀、词根、后缀分别有什么作用？</summary>'+
 '<div class="morph-primer-grid">'+
 '<div><b>前缀 prefix</b><p>出现在词根前，常改变方向、范围或语气；在不同历史词中含义可能不同。</p></div>'+
 '<div><b>词根 root</b><p>承载词族的核心线索。例如 ced / cess 与“行进、退让”有关。</p></div>'+
 '<div><b>后缀 suffix</b><p>位于词根后，常帮助形成名词、形容词等形式，如 -ion 常用于构成名词。</p></div>'+
 '</div></details>';
}
function timeline(obj){
 let rows=(obj.timeline||[]).map(item=>'<div class="history-step"><div class="history-era">'+esc(item.era)+'</div>'+
 '<div class="history-content"><b>'+esc(item.term)+'</b><p>'+esc(item.note)+'</p></div></div>').join('');
 return '<div class="history-summary">'+esc(obj.summary||'')+'</div><div class="history-timeline">'+rows+'</div>';
}
function sources(obj){
 const seen=new Set();
 const links=(obj.sources||[]).filter(x=>safeLink(x.url)&&!seen.has(x.url)&&seen.add(x.url));
 if(!links.length)return '';
 return '<div class="history-sources"><span>参考资料</span>'+
 links.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label||'词源资料')+' ↗</a>').join('')+'</div>';
}
function render(word,style){
 const name=String(word||'').toLowerCase(),obj=record(name),u=encodeURIComponent(name);
 const direct=obj?timeline(obj)+sources(obj):'<p class="dictionary-hint">这条单词暂未整理中文历史年表，可以查询公开词源记录。</p>';
 const external='<div class="historical-source-action">'+
 '<button class="outline-btn" data-action="wiktionary-etymology" data-word="'+esc(name)+'">查看开放词源原文 ↗</button>'+
 '<div id="wiktionaryEtymology" class="wiktionary-source-result hidden" data-word="'+esc(name)+'" aria-live="polite"></div>'+
 '</div><div class="historical-reference">'+
 '<a target="_blank" rel="noopener noreferrer" href="https://en.wiktionary.org/wiki/'+u+'#English">Wiktionary 词源</a>'+
 '<span> · </span><a target="_blank" rel="noopener noreferrer" href="https://www.etymonline.com/word/'+u+'">在线词源辞典</a>'+
 '</div>';
 if(style==='dictionary'){
  return '<div class="dictionary-section"><div class="dictionary-section-heading"><span class="dictionary-icon">04</span>'+
  '<h3>历史渊源 · 词义演变</h3></div>'+direct+external+'</div>';
 }
 return '<section class="history-inline"><h3>历史渊源 · 词义演变</h3>'+direct+external+'</section>';
}
function safeText(raw){
 const tree=new DOMParser().parseFromString(String(raw||''),'text/html');
 tree.querySelectorAll('.mw-editsection,script,style,sup,.reference,.mw-heading').forEach(node=>node.remove());
 return (tree.body?.textContent||'').replace(/\[[0-9]+\]/g,'').replace(/\s+/g,' ').trim().slice(0,1050);
}
async function fetchRemote(word){
 const name=String(word||'').trim().toLowerCase(),node=document.querySelector('#learnLayout.dictionary-mode #lexiconDetail #wiktionaryEtymology')||document.querySelector('#learningSections #wiktionaryEtymology');
 if(!/^[a-z-]{2,35}$/.test(name)||!node||node.dataset.word!==name)return;
 const base='https://en.wiktionary.org/wiki/'+encodeURIComponent(name)+'#English';
 const footer='<div class="historical-attribution">内容：<a href="'+esc(base)+'" target="_blank" rel="noopener noreferrer">Wiktionary 贡献者</a> · '+
  '<a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>。显示英文原文，不是自动翻译。</div>';
 node.classList.remove('hidden');
 node.textContent='正在查询公开词源记录…';
 const fallback='<a target="_blank" rel="noopener noreferrer" href="'+esc(base)+'">打开原始词条 ↗</a>';
 if(cache.has(name)){
  const value=cache.get(name);
  node.innerHTML=value?'<p>'+esc(value)+'</p>'+footer:'<p>暂无独立的英语词源说明。</p>'+fallback;
  return;
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 const url='https://en.wiktionary.org/w/api.php?origin=*&action=parse&page='+encodeURIComponent(name)+'&format=json&prop=';
 try{
  const response=await fetch(url+'sections',{signal:controller.signal});
  if(!response.ok)throw Error('暂时无法连接词源服务');
  const payload=await response.json(),sections=payload?.parse?.sections||[];
  let inEnglish=false,sectionId=null;
  for(const section of sections){
   const heading=String(section.line||'').replace(/<[^>]*>/g,'').trim();
   if(String(section.level)==='2'){inEnglish=heading==='English';continue;}
   if(inEnglish&&/^Etymology(?:\s+\d+)?$/i.test(heading)){sectionId=section.index;break;}
  }
  if(!sectionId){cache.set(name,'');throw Error('未找到这个词的独立英语词源条目');}
  const sectionResponse=await fetch(url+'text&section='+encodeURIComponent(sectionId),{signal:controller.signal});
  if(!sectionResponse.ok)throw Error('词源内容暂时无法读取');
  const section=await sectionResponse.json(),value=safeText(section?.parse?.text?.['*']);
  if(!value)throw Error('词源资料未提供可显示的文本');
  cache.set(name,value);
  if(!node.isConnected||node.dataset.word!==name)return;
  node.innerHTML='<p>'+esc(value)+'</p>'+footer;
 }catch(err){
  if(!node.isConnected||node.dataset.word!==name)return;
  const message=err.name==='AbortError'?'请求超时，请查看原始词条':(err.message||'暂时无法查询');
  node.innerHTML='<p>'+esc(message)+'</p>'+fallback;
 }finally{clearTimeout(timer);}
}
window.RootLabHistoryUI={record,morphology,morphDescription,guide,render,fetchRemote};
})();
