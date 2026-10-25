/* Plain Chinese meaning is orthogonal to word-root routing.
 * Editorial definitions are independent writing; user-confirmed Chinese encyclopedia
 * topics remain explicitly topic-scoped and never overwrite dictionary meanings. */
(function(){'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const notes=window.ROOTLAB_MEANING_NOTES||Object.create(null),KEY='rootlab_meaning_topics_v210';
 const sourceOK=s=>{try{const u=new URL(s);return u.protocol==='https:'&&['en.wiktionary.org','en.wikipedia.org','zh.wikipedia.org','dictionary.cambridge.org'].includes(u.hostname);}catch(_){return false;}};
 const validWord=w=>typeof w==='string'&&/^[a-z][a-z'-]{0,49}$/.test(w);
 const topics=Object.create(null);
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');for(const [word,x]of Object.entries(raw).slice(-80)){if(validWord(word)&&x&&typeof x.text==='string'&&sourceOK(x.source)&&x.kind==='selected-topic'&&Date.now()-Number(x.time)<30*86400000)topics[word]=x;}}catch(_){}
 if(topics.revolution&&/REvolution|Lynch|专辑|專輯|album/i.test(topics.revolution.label+' '+topics.revolution.source)){delete topics.revolution;try{localStorage.setItem(KEY,JSON.stringify(topics));}catch(_){}}
 function entry(word){const w=String(word||'').toLowerCase();return Object.hasOwn(notes,w)?notes[w]:topics[w]||null;}
 function render(c){const d=entry(c.word);if(!d?.text)return '';
 const other=(d.additional||[]).map(x=>'<div class="lr-meaning-additional"><strong>'+esc(x.label)+'</strong><p>'+esc(x.text)+'</p></div>').join('');
 const topic=d.kind==='selected-topic';
 return '<section class="lr-plain-explanation" aria-label="'+(topic?'所选主题的中文介绍':'中文释义')+'" data-meaning-word="'+esc(c.word)+'"><div class="lr-meaning-label">'+(topic?'所选主题：':'')+esc(d.label||'中文释义')+'</div><p class="lr-meaning-text">'+esc(d.text)+'</p>'+(d.note?'<p class="lr-meaning-note">'+esc(d.note)+'</p>':'')+other+(sourceOK(d.source)?'<a class="lr-meaning-source" href="'+esc(d.source)+'" target="_blank" rel="noopener noreferrer">'+(topic?'Wikipedia 贡献者 · CC BY-SA 4.0':'词义参考')+' ↗</a>':'')+'</section>';
 }
 function example(word){const d=Object.hasOwn(notes,word)?notes[word]:null,x=d?.example;return Array.isArray(x)&&x.length===2&&x[0]&&x[1]?{en:x[0],zh:x[1],kind:'自编学习例句'}:null;}
 function fromTopic(word,a){const w=String(word||'').toLowerCase();if(!validWord(w)||!a||a.language!=='zh'||typeof a.summary!=='string'||!sourceOK(a.source)||!/[\u3400-\u9fff]/.test(a.summary))return false;
 topics[w]={kind:'selected-topic',label:String(a.zhTitle||a.title||w).slice(0,100),text:a.summary.slice(0,850),source:a.source,time:Date.now()};
 try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(Object.entries(topics).slice(-80))));}catch(_){}
 return true;
 }
 window.RootLabMeanings={entry,render,example,fromTopic,get count(){return Object.keys(notes).length;},clear(){for(const w of Object.keys(topics))delete topics[w];try{localStorage.removeItem(KEY);}catch(_){}}};
})();
