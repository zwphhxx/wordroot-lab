/* V2.6 complete learning cards. No external telemetry or account required.
 * Word visits and seconds describe browsing, not mastery. All storage is local.
 */
(function(){'use strict';
const KEY='rootlab_reader_v24',cards=window.ROOTLAB_READING_CARDS||{},routes=window.ROOTLAB_READING_ROUTES||[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 sound:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
 star:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>'};
function motion(){return matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';}
const $=id=>document.getElementById(id),validWord=w=>typeof w==='string'&&/^[a-z]{2,35}$/.test(w);
let landing=true;
let bridge=null,ctx=null,ready=false,visible=true,restore=null,loading=false,error='',lastInput=Date.now(),inViewport=true,stamp=Date.now(),offlineController=null;
const blank=()=>({schema:1,mode:'quick',last:null,trail:[],route:null,answers:{},events:[],counts:{views:0,expands:0,started:0,completed:0,answered:0,correct:0,seconds:0}});
function clean(raw){const out=blank();if(!raw||raw.schema!==1)return out;
 out.mode=raw.mode==='explore'?'explore':'quick';
 out.trail=(Array.isArray(raw.trail)?raw.trail:[]).filter(x=>validWord(x?.word)).slice(-12).map(x=>({word:x.word,y:Math.max(0,Math.min(100000,Number(x.y)||0)),open:Array.isArray(x.open)?x.open.filter(z=>typeof z==='string').slice(0,12):[]}));
 out.last=validWord(raw.last?.word)?{word:raw.last.word,y:Math.max(0,Math.min(100000,Number(raw.last.y)||0)),open:Array.isArray(raw.last.open)?raw.last.open.slice(0,12):[]}:null;
 const r=routes.find(x=>x.id===raw.route?.id);if(r)out.route={id:r.id,index:Math.max(0,Math.min(r.words.length-1,Number(raw.route.index)||0)),seen:(Array.isArray(raw.route.seen)?raw.route.seen:[]).filter(x=>r.words.includes(x)),done:raw.route.done===true};
 for(const k of Object.keys(out.counts))out.counts[k]=Math.max(0,Math.min(1e8,Number(raw.counts?.[k])||0));
 out.events=(Array.isArray(raw.events)?raw.events:[]).filter(e=>typeof e?.type==='string'&&Number.isFinite(e.at)).slice(-300);
 for(const [w,v] of Object.entries(raw.answers||{}))if(validWord(w)&&Number.isInteger(v?.index)&&v.index>=0&&v.index<4)out.answers[w]={index:v.index,correct:v.correct===true};
 return out;
}
let store;try{store=clean(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(_){store=blank();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store));}catch(_){/* Read-only/private mode must not block dictionary use. */}}
function event(type,word){store.events.push({type,word:word||'',at:Date.now()});store.events=store.events.slice(-300);save();}
function remember(){if(!ctx||!visible||landing)return;const node=$('readerV24'),open=node?Array.from(node.querySelectorAll('details[open][data-reader-key]')).map(x=>x.dataset.readerKey):[];
 const row={word:ctx.word,y:window.scrollY||0,open};store.last=row;
 const t=store.trail.at(-1);if(t?.word===ctx.word)Object.assign(t,row);save();}
function beforeOpen(){window.RootLabNavigation?.position();remember();landing=false;error='';loading=false;}
function sourceLinks(word,custom){const list=custom?.source?[{url:custom.source,label:'词源参考'}]:[];return list.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label)+' ↗</a>').join('');}
function storyFor(c){const custom=cards[c.word],record=window.RootLabHistoryUI?.record(c.word),local=c.notes||{};
 if(custom)return{hook:custom.hook,lead:custom.lead,paragraphs:custom.story,custom,source:sourceLinks(c.word,custom)};
 if(record)return{hook:record.status==='source_formation'||record.status==='teaching_formation'?'拆开 '+c.word+'，能发现什么构词线索？':'“'+c.word+'”的来历，藏在哪些旧词形里？',lead:record.summary||local.story||c.meaning,paragraphs:[local.story||record.summary,local.memory].filter(Boolean),custom:null,source:''};
 return{hook:'除了中文意思，'+c.word+' 还有哪些用法？',lead:'先理解常见义项，再结合例句和词源资料继续看。',paragraphs:[],custom:null,source:''};}
function quiz(c){const custom=cards[c.word];if(custom?.quiz)return custom.quiz;
 // A definition recall question uses only existing meanings, never invented etymology.
 if(!c.meaning||!c.distractor)return null;const flip=c.word.length%2;
 return{q:'回想一下，'+c.word+' 在这里对应哪个意思？',options:flip?[c.distractor,c.meaning]:[c.meaning,c.distractor],answer:flip?1:0,why:'本词的释义是：'+c.meaning+'。这道题只练习词义回忆，不评定掌握度。'};
}
function example(c,story){const ex=story.custom?.example||(c.example?[c.example,c.translation||'']:null);
 if(!ex)return '';
 return '<div class="rd-example"><p lang="en">'+esc(ex[0])+'</p>'+(ex[1]?'<p class="rd-example-zh">'+esc(ex[1])+'</p>':'')+'<button data-reader="speak-example" class="rd-text" aria-label="朗读例句">听例句</button></div>';
}
function crumb(){if(store.trail.length<2)return '';const previous=store.trail.at(-2);
 return '<nav class="rd-breadcrumb" aria-label="返回上一词"><button data-reader="return" data-word="'+esc(previous.word)+'">← '+esc(previous.word)+'</button></nav>';
}
function routeBar(c){const active=store.route,r=routes.find(x=>x.id===active?.id);if(!r||active.done||!r.words.includes(c.word))return '';
 const n=r.words.indexOf(c.word);return '<aside class="rd-route-bar" aria-label="当前路线"><div><b>'+esc(r.title)+'</b><span class="rd-route-position">'+(n+1)+' / '+r.words.length+'</span></div><button class="rd-text" data-reader="leave-route">退出路线</button></aside>';
}
function recommendations(c){const picks=[],seen=new Set([c.word]);for(const entry of cards[c.word]?.links||[]){if(bridge.known(entry[0])&&!seen.has(entry[0])){picks.push({word:entry[0],label:entry[1],reason:entry[2]});seen.add(entry[0]);}}
 for(const e of c.related||[]){if(!seen.has(e.word)){picks.push(e);seen.add(e.word);}if(picks.length>=3)break;}
 return picks.slice(0,3);}
function nextStep(c){const active=store.route,r=routes.find(x=>x.id===active?.id);if(!r||active.done||!r.words.includes(c.word))return '';
 const idx=r.words.indexOf(c.word),last=idx===r.words.length-1;
 return '<div class="rd-route-next"><button class="rd-primary" data-reader="advance">'+(last?'完成本轮':'下一词 · '+esc(r.words[idx+1]))+' →</button></div>';
}
/* V2.6. The reference's four learning functions, shown in full, not accordions. */
function unfoldPanels(root){if(!root)return;for(const old of [...root.querySelectorAll('details')].reverse()){const panel=document.createElement('section');panel.className=old.className+' open-panel';if(old.id)panel.id=old.id;for(const child of [...old.childNodes]){if(child.nodeName==='SUMMARY'){const h=document.createElement('h3');h.className='open-panel-title';while(child.firstChild)h.append(child.firstChild);panel.append(h);}else panel.append(child);}old.replaceWith(panel);}}
function cardHead(n,title,question){return '<header class="lr-card-head"><span class="lr-number" aria-hidden="true">'+n+'</span><div><h2>'+esc(title)+'</h2>'+(question?'<p>'+esc(question)+'</p>':'')+'</div></header>';}
function marked(text,forms){const parts=(forms||[]).filter(x=>typeof x==='string'&&x.length>=3).sort((a,b)=>b.length-a.length);if(!parts.length)return esc(text);const safe=parts.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');const rx=new RegExp('('+safe+')','ig');return String(text).split(rx).map((p,i)=>i%2?'<em>'+esc(p)+'</em>':esc(p)).join('');}
function sourceRow(c,story){const all=[...(c.learning?.history?.sources||[])];if(c.learning?.history?.sourceUrl)all.push({url:c.learning.history.sourceUrl,label:'Wiktionary'});if(story.custom?.source)all.push({url:story.custom.source,label:'词源参考'});const seen=new Set(),links=all.filter(x=>/^https:\/\//.test(x.url||'')&&!seen.has(x.url)&&seen.add(x.url));return links.length?'<div class="lr-sources">'+links.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label||'词源资料')+' ↗</a>').join('')+(c.learning?.history?.sourceUrl?'<span>Wiktionary 贡献者 · CC BY-SA 4.0</span>':'')+'</div>':'';}
function historyOpen(c){const rec=c.learning?.history;if(!rec)return '';const steps=rec.timeline||[];const chronological=!rec.status;let output='';
 if(steps.length)output='<div class="lr-history" data-stage="history"><h3>'+(chronological?'这个意思是怎样形成的？':rec.status==='source_path'?'沿着旧词形，找到今天的意思':'从组成关系，到今天的用法')+'</h3><div class="'+(chronological?'lr-timeline':'lr-history-forms')+'">'+steps.map(x=>'<div class="lr-history-step"><span>'+esc(x.era)+'</span><div><b>'+esc(x.term)+'</b><p>'+esc(x.note)+'</p></div></div>').join('')+'</div></div>';
 if(rec.excerpt)output+='<p class="lr-source-excerpt" lang="en">'+esc(rec.excerpt)+'</p>';return output;
}
function morphologyOpen(c){const d=c.learning||{},parts=d.pieces||[];if(!parts.length)return '';
 return '<div class="lr-parts '+(d.pieceType==='affix'?'lr-affix-only':'')+'">'+parts.map((p,i)=>'<div class="lr-part '+(/词根/.test(p.role)?'lr-core':'')+'"><span>'+esc(p.role)+'</span><b lang="en">'+esc(p.part)+'</b><small>'+esc(p.meaning)+'</small></div>').join(d.pieceType==='affix'?'':'<span class="lr-plus" aria-hidden="true">+</span>')+'</div>'+
 (d.pieceType==='affix'?'<p class="lr-muted">词缀联想，用于辅助记忆。</p>':'<p class="lr-formula">'+parts.map(p=>'<b lang="en">'+esc(p.part)+'</b>').join('<span> + </span>')+'<span> → </span><strong lang="en">'+esc(c.word)+'</strong></p>');
}

function everydayPhrases(c){const b=c.learning.basic,rows=b.phrases||[];if(!rows.length)return '';
 const groups=[...new Set(rows.map(x=>x.kind))];
 return '<section class="lr-card lr-everyday" data-module="family" data-stage="family">'+cardHead('02','常用搭配','从一个词，长成日常可以直接说出口的表达。')+'<div class="lr-collocations">'+groups.map(kind=>'<section class="lr-collocation-group"><h3>'+esc(kind)+'</h3>'+rows.filter(x=>x.kind===kind).map(x=>'<div class="lr-phrase-row"><div><b lang="en">'+esc(x.en)+'</b><p>'+esc(x.zh)+'</p></div><button class="rd-icon" data-reader="speak-line" data-text="'+esc(x.en)+'" aria-label="朗读 '+esc(x.en)+'">'+icons.sound+'</button></div>').join('')+'</section>').join('')+'</div></section>';
}
function everydayUsage(c){const b=c.learning.basic;
 const rows=(b.usage||[]).map(x=>'<section class="lr-usage-item"><h3>'+esc(x.title)+'</h3><p>'+esc(x.body)+'</p><blockquote><span lang="en">'+esc(x.en)+'</span><small>'+esc(x.zh)+'</small></blockquote></section>').join('');
 const refs=(b.sources||[]).filter(x=>/^https:\/\//.test(x.url)).map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label)+' ↗</a>').join('');
 return '<section class="lr-card lr-everyday" data-module="meanings" data-stage="meanings">'+cardHead('03','用法与固定表达','认识它只是开始，放进表达中才会真正用。')+rows+'<div class="lr-sources">'+refs+'</div></section>';
}

function wholeMeaningCard(c,story){const d=c.learning,b=d.basic;const rows=displayDefinitions(d.definitions?.length?d.definitions:[c.meaning]);
 let content=(window.RootLabMeanings?.render(c)||'')+'<div class="lr-whole-senses">'+rows.map(definitionRow).join('')+'</div>';
 if(b.posNote)content+='<p class="lr-pos-note">'+esc(b.posNote)+'</p>';
 if(d.english?.length)content+='<div class="lr-english-senses" lang="en">'+d.english.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>';
 if(story.custom)content+='<div class="lr-origin-text"><p class="lr-insight">'+esc(story.lead)+'</p>'+story.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>';
 else if(d.history?.summary)content+='<p class="lr-insight">'+esc(d.history.summary)+'</p>';
 content+=historyOpen(c)+sourceRow(c,story);
 return '<section class="lr-card lr-whole-word" data-module="origin" data-stage="origin">'+cardHead('01',d.history||story.custom?'词义与来历':'词义与用法',story.custom?.hook||b.hook)+content+'</section>';
}
function wholeRelations(c){const d=c.learning,b=d.basic;const fromSource=window.RootLabSenseGuard?window.RootLabSenseGuard.filter(c.word,b.related):b.related||[],seen=new Set([c.word]),rows=[];
 for(const x of fromSource)if(bridge.known(x.word)&&!seen.has(x.word)){seen.add(x.word);rows.push(x);}
 for(const word of d.synonyms||[])if(bridge.known(word)&&!seen.has(word)&&(!window.RootLabSenseGuard||window.RootLabSenseGuard.filter(c.word,[{word}]).length)){seen.add(word);rows.push({word,label:'近义词参考',sense:''});if(rows.length>=6)break;}
 if(!rows.length)return '';
 return '<div class="lr-semantic-links">'+rows.map(x=>'<button data-reader="next" data-word="'+esc(x.word)+'"><span><b lang="en">'+esc(x.word)+'</b><small>'+esc(x.label)+'</small></span>'+(x.sense?'<p lang="en">'+esc(x.sense)+'</p>':'')+'</button>').join('')+'</div>';
}
function wholePhrasesCard(c){const b=c.learning.basic,phrases=b.phrases||[];if(!phrases.length){const related=wholeRelations(c);return related?'<section class="lr-card" data-module="family" data-stage="family">'+cardHead('02','词义关联','从意思相近或概念相关的词，继续理解当前词。')+related+'</section>':'';}
 return '<section class="lr-card lr-everyday" data-module="family" data-stage="family">'+cardHead('02','搭配与表达','把整个词放进表达里，看看它怎样与其他词搭配。')+'<div class="lr-collocations">'+phrases.map(x=>'<div class="lr-phrase-row"><div><b lang="en">'+esc(x.en)+'</b>'+(x.zh?'<p>'+esc(x.zh)+'</p>':'')+(x.definition?'<p class="lr-phrase-definition" lang="en">'+esc(x.definition)+'</p>':'')+'</div><button class="rd-icon" data-reader="speak-line" data-text="'+esc(x.en)+'" aria-label="朗读 '+esc(x.en)+'">'+icons.sound+'</button></div>').join('')+'</div><div class="lr-sources"><a href="./credits.html" target="_blank" rel="noopener noreferrer">搭配与词义资料说明</a></div></section>';
}
function wholeUsageCard(c){const d=c.learning,b=d.basic,names={'0':'原形',s:'复数','3':'第三人称单数',i:'现在分词',p:'过去式',d:'过去分词',r:'比较级',t:'最高级'};
 const forms=(d.forms||[]).filter(([k,v])=>names[k]&&v!==c.word);let content='';
 if(forms.length)content+='<div class="lr-forms"><h3>词形变化</h3><div>'+forms.map(([k,v])=>'<span><small>'+esc(names[k])+'</small>'+(bridge.known(v)?'<button data-reader="next" data-word="'+esc(v)+'">'+esc(v)+'</button>':'<b>'+esc(v)+'</b>')+'</span>').join('')+'</div></div>';
 if(b.phrases?.length){const related=wholeRelations(c);if(related)content+='<h3 class="lr-group-intro">按词义继续联想</h3>'+related;}
 if(!content)return '';
 return '<section class="lr-card" data-module="meanings" data-stage="meanings">'+cardHead('03','词形与用法关联','留意词形怎样变化，并按具体词义理解相关词。')+content+'</section>';
}

function openingCard(c,story){if(c.learning?.basic?.generated)return wholeMeaningCard(c,story);const d=c.learning||{},record=d.history;let paragraphs=[];
 if(!d.basic&&!story.custom&&!c.notes?.story&&!record&&!d.pieces?.length)return '';
 if(story.custom)paragraphs=[story.lead,...story.paragraphs];else if(c.notes?.story)paragraphs=[c.notes.story];else if(record?.summary)paragraphs=[record.summary];
 paragraphs=[...new Set(paragraphs.filter(Boolean))];
 const text=paragraphs.length?paragraphs.map((x,i)=>'<p class="'+(i===0?'lr-insight':'')+'">'+esc(x)+'</p>').join(''):'';
 const morphology=morphologyOpen(c);
 const title=d.basic?.introTitle||(morphology?'词根记词':'词义与来历');
 return '<section class="lr-card lr-origin" data-module="origin" data-stage="origin">'+cardHead('01',title,story.custom?story.hook:'从 '+c.word+' 出发，先理解它的组成和来历。')+(window.RootLabMeanings?.render(c)||'')+morphology+'<div class="lr-origin-text">'+text+'</div>'+historyOpen(c)+sourceRow(c,story)+(!record&&!story.custom?'<div class="historical-source-action"><button class="rd-text" data-action="wiktionary-etymology" data-word="'+esc(c.word)+'">查询公开词源 ↗</button><div class="wiktionary-source-result hidden" data-word="'+esc(c.word)+'" aria-live="polite"></div></div>':'')+'</section>';
}
function familyItems(c){const groups=c.learning?.family?.groups||[],seen=new Set();return groups.flatMap(g=>g.items).filter(x=>!seen.has(x.word)&&seen.add(x.word));}
function familyCard(c){if(c.learning?.basic?.generated)return wholePhrasesCard(c);if(c.learning?.basic)return everydayPhrases(c);const f=c.learning?.family,items=familyItems(c),picks=recommendations(c);const first=items.filter(x=>x.word!==c.word).sort((a,b)=>{const ra=picks.findIndex(p=>p.word===a.word),rb=picks.findIndex(p=>p.word===b.word);return(ra<0?99:ra)-(rb<0?99:rb);}).slice(0,6);
 const related=f?first:picks.map(x=>({word:x.word,meaning:x.reason,label:x.label}));
 let body='';if(f)body='<div class="lr-root-anchor"><div><span>共同的词根线索</span><b>'+esc(f.label)+'</b><p>'+esc(f.meaning)+'</p></div><button data-action="open-root" data-root="'+esc(f.id)+'" class="rd-text">词根词库 ↗</button></div>';
 if(related.length)body+='<div class="lr-family-grid">'+related.map(x=>'<button class="lr-family-word" data-reader="next" data-word="'+esc(x.word)+'"><b lang="en">'+marked(x.word,f?.forms)+'</b><span>'+esc(x.label||x.meaning)+'</span>'+(x.label?'<small>'+esc(x.meaning)+'</small>':'')+'</button>').join('')+'</div>';
 else if(!f)return '';
 return '<section class="lr-card" data-module="family" data-stage="family">'+cardHead('02',f?'同根词串联':'词形与相关词',f?'同一条词根线索，为什么会走向不同的意思？':'从已有的构词或词义联系，认识下一个词。')+body+'</section>';
}
function displayDefinitions(list){const plain=s=>String(s).replace(/^(n\.|a\.|adj\.|adv\.|v\.|vt\.|vi\.)\s*/i,'').trim();return list.filter((x,i)=>{const v=plain(x);return !list.some((y,j)=>j!==i&&plain(y).length>v.length&&plain(y).split(/[，,；;]/).map(z=>z.trim()).includes(v));});}
function definitionRow(text){const m=/^(n\.|a\.|adj\.|adv\.|v\.|vt\.|vi\.|prep\.|pron\.|conj\.|interj\.)\s*/i.exec(text);return '<div class="lr-definition">'+(m?'<span class="lr-pos">'+esc(m[1])+'</span>':'')+'<p>'+esc(m?text.slice(m[0].length):text)+'</p></div>';}
function meaningsCard(c){const d=c.learning||{},f=d.family;if(d.basic?.generated)return wholeUsageCard(c);if(d.basic)return everydayUsage(c);let body='<div class="lr-own-senses"><h3>'+esc(c.word)+' · 词义</h3>'+displayDefinitions(d.definitions?.length?d.definitions:[c.meaning]).map(definitionRow).join('')+'</div>';
 if(d.english?.length)body+='<div class="lr-english-senses" lang="en">'+d.english.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>';
 if(f?.groups?.length)body+='<h3 class="lr-group-intro">把词族分开记，比混在一起更清楚</h3><div class="lr-semantic-groups">'+f.groups.map(g=>'<section class="lr-semantic-group"><h4>'+esc(g.title)+'</h4>'+g.items.map(x=>'<button class="lr-group-row '+(x.word===c.word?'is-current':'')+'" data-reader="next" data-word="'+esc(x.word)+'"><b lang="en">'+marked(x.word,f.forms)+'</b><span>'+esc(x.meaning)+'</span></button>').join('')+'</section>').join('')+'</div>';
 const names={'0':'原形',s:'复数','3':'第三人称单数',i:'现在分词',p:'过去式',d:'过去分词',r:'比较级',t:'最高级'};
 if(d.forms?.length)body+='<div class="lr-forms"><h3>词形变化</h3><div>'+d.forms.map(([k,v])=>'<span><small>'+esc(names[k])+'</small>'+(bridge.known(v)?'<button data-reader="next" data-word="'+esc(v)+'">'+esc(v)+'</button>':'<b>'+esc(v)+'</b>')+'</span>').join('')+'</div></div>';
 return '<section class="lr-card" data-module="meanings" data-stage="meanings">'+cardHead('03','释义分组',f?'词根相同不等于意思相同，先按用法分清。':'同一个单词，放进不同语境会是什么意思？')+body+'</section>';
}
function exampleMarkup(c,x,i){const word=c.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),rx=new RegExp('(\\b'+word+'(?:s|es)?\\b)','ig');const sentence=x.en.split(rx).map((p,j)=>j%2?'<mark>'+esc(p)+'</mark>':esc(p)).join('');return '<div class="lr-example" data-stage="example-'+i+'"><p lang="en">'+sentence+'</p>'+(x.zh?'<p class="lr-example-zh">'+esc(x.zh)+'</p>':'')+'<div><span>'+esc(x.kind)+'</span><button data-reader="speak-line" data-text="'+esc(x.en)+'" class="rd-text" aria-label="朗读例句 '+(i+1)+'">'+icons.sound+'<span>听例句</span></button></div></div>';}
function recallMarkup(c){const q=quiz(c);if(!q)return '';const a=store.answers[c.word];return '<section class="lr-recall rd-check" aria-label="可选回忆题" data-stage="recall"><h3>读过以后，试着判断一句</h3><p>'+esc(q.q)+'</p><div class="rd-answers">'+q.options.map((v,i)=>'<button data-reader="answer" data-index="'+i+'" '+(a?'disabled':'')+' class="'+(a&&i===q.answer?'is-correct':a&&i===a.index?'is-wrong':'')+'">'+esc(v)+'</button>').join('')+'</div><div class="rd-feedback" aria-live="polite">'+(a?(a.correct?'答对了。':'正确答案：'+esc(q.options[q.answer])+'。')+' '+esc(q.why):'')+'</div></section>';}
function applicationsCard(c){const d=c.learning||{};const tags=d.levels?.length?'<div class="lr-levels"><span>学习范围</span>'+d.levels.map(x=>'<b>'+esc(x)+'</b>').join('')+'</div>':'';
 if(!d.examples?.length&&!quiz(c))return '';let content=tags+(d.examples?.length?d.examples.map((x,i)=>exampleMarkup(c,x,i)).join(''):'');
 content+=recallMarkup(c);
 return '<section class="lr-card" data-module="applications" data-stage="applications">'+cardHead('04',d.examples?.length?'例句与应用':'回忆与应用',d.examples?.length?'回到句子里，看看这个词究竟怎样使用。':'用一道小题，检查刚才读到的词义。')+content+'</section>';
}
function nextReading(c){const picks=recommendations(c);return '<footer class="lr-finale rd-next" data-stage="next"><div class="lr-next-title"><h2>带着这个联系，接着读</h2><button data-reader="plan" class="rd-text">'+(c.planned?'✓ 已加入复习':'＋ 加入复习')+'</button></div><div class="lr-next-list">'+picks.map(x=>'<button data-reader="next" data-word="'+esc(x.word)+'"><span><b>'+esc(x.word)+'</b><small>'+esc(x.label)+'</small><i aria-hidden="true">→</i></span><p>'+esc(x.reason)+'</p></button>').join('')+'</div>'+nextStep(c)+'<p class="lr-end-note">例句和学习标签仅作学习参考。<a href="./credits.html" target="_blank" rel="noopener noreferrer">资料与许可</a></p></footer>';}
function paint(){if(!ready||!ctx||landing)return;const node=$('readerV24'),c=ctx,story=storyFor(c);const d=c.learning||{};
 const header='<section class="lr-word-card" data-stage="word"><div class="rd-word-row"><div><h1 lang="en">'+esc(c.word)+'</h1>'+(c.phonetic?'<p class="rd-ipa">'+esc(c.phonetic)+'</p>':'')+'</div><div class="rd-word-buttons"><button class="rd-icon" data-reader="speak" aria-label="朗读 '+esc(c.word)+'">'+icons.sound+'</button><button class="rd-icon '+(c.favorite?'is-saved':'')+'" data-reader="favorite" aria-label="'+(c.favorite?'取消收藏':'收藏单词')+'" aria-pressed="'+c.favorite+'">'+icons.star+'</button></div></div><p class="rd-meaning">'+esc(story.custom?.meaning||(c.learning?.basic?.generated?RootLabWholeWords.headline(c.meaning):c.meaning))+'</p></section>';
 const status=error?'<span>'+esc(error)+'</span> <button data-reader="retry-detail" class="rd-text">重试</button>':loading?'正在补充英文释义与例句…':'';
 node.innerHTML=crumb()+routeBar(c)+header+'<div class="lr-stream">'+openingCard(c,story)+familyCard(c)+meaningsCard(c)+applicationsCard(c)+'</div><div class="lr-data-status" role="status">'+status+'</div>'+nextReading(c);
 node.querySelectorAll('.lr-stream > [data-module] .lr-number').forEach((n,i)=>n.textContent=String(i+1).padStart(2,'0'));
 window.RootLabEncyclopedia?.mount(node,c);
 updateHome();observe();
}
async function loadDetails(){if(!ready||!ctx||landing||loading||bridge.loaded(ctx.word))return;const word=ctx.word;loading=true;error='';const slot=$('readerV24')?.querySelector('.lr-data-status');if(slot)slot.textContent='正在补充英文释义与例句…';
 try{await bridge.hydrate(word);if(ctx?.word!==word||landing)return;loading=false;error='';const y=scrollY;const anchor=[...$('readerV24').querySelectorAll('[data-stage]')].reverse().find(x=>x.getBoundingClientRect().top<=90);const key=anchor?.dataset.stage,offset=anchor?.getBoundingClientRect().top;bridge.refresh();if(y>100&&key){const same=$('readerV24').querySelector('[data-stage="'+key+'"]');if(same)window.scrollTo({top:same.getBoundingClientRect().top+scrollY-offset,behavior:'instant'});}else window.scrollTo({top:y,behavior:'instant'});}
 catch(_){if(ctx?.word!==word||landing)return;loading=false;error='扩展资料暂未加载；已有词义和词根可继续阅读。';const slot=$('readerV24')?.querySelector('.lr-data-status');if(slot)slot.innerHTML=esc(error)+' <button data-reader="retry-detail" class="rd-text">重试</button>';}}
function routePicker(){let el=$('readerRoutesV26');if(!el){el=document.createElement('section');el.id='readerRoutesV26';el.className='rd-route-picker open-panel';$('rootsView').querySelector('.page-intro').after(el);}el.innerHTML='<h3>词族路线 <span>每组 4 词</span></h3><div class="rd-route-grid">'+routes.map(r=>'<button data-reader="start-route" data-route="'+esc(r.id)+'"><b>'+esc(r.title)+'</b><span>'+esc(r.description)+'</span><small>'+esc(r.kind)+'</small></button>').join('')+'</div>';}
function setView(view){window.RootLabNavigation?.commit(landing?'':ctx?.word||'',view);visible=view==='learn';document.body.dataset.appView=view;stamp=Date.now();if(view==='roots')routePicker();if(view==='profile'){$('readingStatsV24')?.remove();$('profileBody')?.insertAdjacentHTML('beforeend',statsMarkup());const about=$('profileBody')?.querySelector('#readingStatsV24 .visual-preference');if(!about)$('readingStatsV24')?.insertAdjacentHTML('beforeend',window.RootLabEncyclopedia?.preferences()||'');}unfoldPanels($(view+'View'));}

function paintComplete(){const r=routes.find(x=>x.id===store.route?.id);if(!r||!store.route.done)return;
 const reviewed=store.route.seen,correct=reviewed.filter(w=>store.answers[w]?.correct).length;
 $('readerV24').innerHTML='<section class="rd-complete"><h2>本轮阅读完成</h2><p>'+esc(r.title)+'</p><div class="rd-complete-numbers"><div><b>'+reviewed.length+'</b><span>浏览过的词</span></div><div><b>'+correct+'</b><span>回忆题首答正确</span></div></div><div class="rd-complete-words">'+reviewed.map(w=>'<button data-reader="next" data-word="'+esc(w)+'">'+esc(w)+'</button>').join('')+'</div><p class="rd-muted">浏览过不等于已经掌握，可加入复习继续巩固。</p><button class="rd-primary" data-reader="save-route">把这组词加入复习</button><button class="rd-text" data-reader="finish-home">返回查词</button></section>';updateHome();}
let observer;
function observe(){if(!('IntersectionObserver' in window))return;observer?.disconnect();observer=new IntersectionObserver(entries=>{inViewport=entries.some(e=>e.isIntersecting);});observer.observe($('readerV24'));}
function show(c){if(!ready||!c)return;if(landing){$('readerV24').hidden=true;updateHome();return;}const changed=ctx?.word!==c.word;ctx=c;
 if(changed){error='';loading=false; if(restore?.word!==c.word){const last=store.trail.at(-1);if(last?.word!==c.word){store.trail.push({word:c.word,y:0,open:[]});store.trail=store.trail.slice(-12);}}if(!initializing){store.counts.views++;event('word_view',c.word);} }
 window.RootLabNavigation?.commit(c.word,'learn');
 const node=$('readerV24');node.hidden=false;if(changed)node.innerHTML='';paint();save();if(!bridge.loaded(c.word)){const opened=c.word;setTimeout(()=>{if(ctx?.word===opened&&!landing)loadDetails();},0);}}
function afterOpen(){if(!ready)return false;if(landing)return true;
 const pending=restore;restore=null;setTimeout(()=>{if(pending?.word===ctx?.word){for(const d of $('readerV24').querySelectorAll('details[data-reader-key]'))d.open=!!pending.open?.includes(d.dataset.readerKey);window.scrollTo({top:pending.y||0,behavior:'instant'});}else $('readerV24').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});},90);return true;}
function go(word,reason){if(!bridge.known(word))return;beforeOpen();if(reason==='next')event('related_next',word);bridge.open(word);}
function updateHome(){const el=$('readerHomeV24');if(!el||!ready)return;el.hidden=!landing;
 if(!landing)return;
 const last=store.last,recent=[...new Set(store.trail.map(x=>x.word).reverse())].slice(0,4);
 el.innerHTML=(last?'<button class="rd-resume" data-reader="resume">继续上次 · '+esc(last.word)+' →</button>':'')+
 '<div class="rd-home-words"><p>'+ (recent.length?'最近查询':'试着查一个词')+'</p><div>'+(recent.length?recent:['resilient','concession','procedure']).map(w=>'<button class="rd-text" data-reader="home-word" data-word="'+esc(w)+'">'+esc(w)+'</button>').join('')+'</div></div><button class="rd-text" data-reader="browse-routes">去词库，挑一条词族路线 →</button>';
}
function showHome(){window.RootLabNavigation?.position();remember();landing=true;window.RootLabNavigation?.commit('','learn');(bridge.home||(()=>bridge.navigate('learn')))();$('readerV24').hidden=true;$('searchInput').value='';$('searchSuggestions').classList.add('hidden');updateHome();window.scrollTo({top:0,behavior:motion()});}
function statsMarkup(){const c=store.counts;return '<section id="readingStatsV24" class="rd-local-stats"><section class="page-fold open-panel"><h3 class="open-panel-title">阅读足迹</h3><div class="page-fold-body"><p>只记录本机操作，没有上传数据；浏览记录不是学习效果评分。</p><div class="rd-stats-grid"><div><b>'+c.views+'</b><span>查词浏览</span></div><div><b>'+c.expands+'</b><span>探索展开</span></div><div><b>'+c.completed+'</b><span>路线完成</span></div><div><b>'+Math.floor(c.seconds/60)+'</b><span>前台活跃分钟（估计）</span></div></div><p>回忆题首答：'+c.correct+' / '+c.answered+'。后台及长时间未操作不计入活跃时间。</p><button data-reader="export" class="outline-btn">导出阅读记录</button><button data-reader="clear" class="rd-text">清空阅读足迹</button></div></section><section class="page-fold open-panel"><h3 class="open-panel-title">离线资料</h3><div class="page-fold-body"><p>基本释义与精选词源可离线使用；完整英文释义、例句和已整理的图片按需缓存，也可下载全部本地扩展资料。在线新找的图片仍可能需要联网。</p><button data-reader="offline" class="outline-btn">下载完整资料</button><button data-reader="cancel-offline" class="rd-text">停止下载</button><p id="rdOfflineProgress" role="status">尚未下载全部扩展资料。</p></div></section><section class="page-fold open-panel"><h3 class="open-panel-title">关于与隐私</h3><div class="page-fold-body"><p>免费使用，无需会员。收藏、复习计划和阅读足迹仅保存在当前浏览器；清除浏览器数据前请导出备份。</p><p>在线查询会把当前单词发送至第三方词典；开启自动找图时，进入阅读视野的具体事物会向维基百科查询主题，可在下方关闭。例句及词源资料的来源、许可均保留在完整资料中。</p><a href="./credits.html" target="_blank" rel="noopener noreferrer">资料版权与许可 →</a><p class="about-version">词根实验室 · V2.11</p></div></section></section>';}

function startRoute(id){const r=routes.find(x=>x.id===id);if(!r)return;store.route={id,index:0,seen:[],done:false};store.mode='explore';store.counts.started++;event('route_start',r.words[0]);go(r.words[0]);}
function act(btn){const cmd=btn.dataset.reader;
 if(cmd==='home'){showHome();return;}
 else if(cmd==='browse-routes'){bridge.navigate('roots');routePicker();$('readerRoutesV26').scrollIntoView({block:'start',behavior:motion()});}
 else if(cmd==='home-word'){store.mode='quick';go(btn.dataset.word);}
 else if(cmd==='mode'){remember();store.mode=btn.dataset.mode==='explore'?'explore':'quick';if(store.mode==='explore'){store.counts.expands++;event('explore_open',ctx.word);}paint();save();const target=store.mode==='explore'?$('rdStoryHeading'):$('readerV24');requestAnimationFrame(()=>{target?.scrollIntoView({block:'start',behavior:motion()});if(store.mode==='explore')target?.focus({preventScroll:true});});}
 else if(cmd==='speak')bridge.speak(ctx.word);
 else if(cmd==='speak-line')bridge.speak(btn.dataset.text||ctx.word);
 else if(cmd==='speak-example'){const ex=cards[ctx.word]?.example?.[0]||ctx.example; if(ex)bridge.speak(ex);}
 else if(cmd==='favorite')bridge.favorite(ctx.word);
 else if(cmd==='plan')bridge.plan(ctx.word);
 else if(cmd==='full'){$('readerV24').querySelector('[data-module=meanings]')?.scrollIntoView({block:'start',behavior:motion()});loadDetails();}
 else if(cmd==='retry-detail')loadDetails();
 else if(cmd==='next'){if(store.route?.done)store.route=null;go(btn.dataset.word,'next');}
 else if(cmd==='return'){remember();const at=store.trail.map(x=>x.word).lastIndexOf(btn.dataset.word);if(at<0)return;restore={...store.trail[at]};store.trail=store.trail.slice(0,at+1);go(btn.dataset.word,'back');}
 else if(cmd==='resume'){if(store.last){const last={...store.last};restore=last;store.mode='explore';go(last.word,'resume');}}
 else if(cmd==='start-route')startRoute(btn.dataset.route);
 else if(cmd==='route-word'){const r=routes.find(x=>x.id===store.route?.id);if(r?.words.includes(btn.dataset.word)){store.route.index=r.words.indexOf(btn.dataset.word);go(btn.dataset.word);}}
 else if(cmd==='leave-route'){store.route=null;save();paint();}
 else if(cmd==='advance'){const active=store.route,r=routes.find(x=>x.id===active?.id);if(!r)return;if(!active.seen.includes(ctx.word))active.seen.push(ctx.word);const n=r.words.indexOf(ctx.word);
  if(n<r.words.length-1){active.index=n+1;go(r.words[n+1]);}else{if(!active.done){active.done=true;store.counts.completed++;event('route_finish',ctx.word);}paintComplete();}save();}
 else if(cmd==='save-route'){const r=routes.find(x=>x.id===store.route?.id);for(const w of r?.words||[])bridge.plan(w);paintComplete();bridge.toast('这组词已加入复习，不会标记为已掌握。');}
 else if(cmd==='finish-home'){store.route=null;store.mode='quick';save();showHome();}
 else if(cmd==='answer'){if(store.answers[ctx.word])return;const q=quiz(ctx),i=Number(btn.dataset.index);if(!q||!Number.isInteger(i)||i<0||i>=q.options.length)return;store.answers[ctx.word]={index:i,correct:i===q.answer};store.counts.answered++;if(i===q.answer)store.counts.correct++;event('quiz_answer',ctx.word);const y=window.scrollY;paint();window.scrollTo({top:y,behavior:'instant'});}
 else if(cmd==='skip-quiz'){event('quiz_skip',ctx.word);const el=$('readerV24').querySelector('.rd-optional-check');if(el){el.open=false;el.querySelector('summary')?.focus({preventScroll:true});}}
 else if(cmd==='offline'){if(offlineController)return;offlineController=new AbortController();const slot=()=>document.getElementById('rdOfflineProgress');if(slot())slot().textContent='正在准备完整资料…';bridge.downloadAll(offlineController.signal,(done,total)=>{if(slot())slot().textContent='已缓存 '+done+' / '+total+' 个资料包。';}).then(()=>{if(slot())slot().textContent='完整离线资料已就绪。';}).catch(err=>{if(slot())slot().textContent=err.name==='AbortError'?'下载已停止；已缓存资料保留。':'网络暂不可用，已有资料仍可阅读。再次点击可继续。';}).finally(()=>{offlineController=null;});}
 else if(cmd==='cancel-offline'){offlineController?.abort();}
 else if(cmd==='export'){remember();const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='词根实验室_阅读足迹.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 else if(cmd==='clear'){if(confirm('只清空阅读足迹；原来的收藏和复习计划不会删除。')){store=blank();save();setView('profile');updateHome();}}
}
let initializing=false;
function init(api){if(ready)return;bridge=api;ready=true;document.body.classList.add('reader-v24','minimal-v25','cards-v26');document.body.dataset.appView='learn';
 const parent=$('learnLayout');const article=document.createElement('article');article.id='readerV24';article.className='rd-reader';parent.parentNode.insertBefore(article,parent);
 const home=document.createElement('div');home.id='readerHomeV24';$('learnView').querySelector('.hero').after(home);
 initializing=true;const url=new URL(location.href),word=(url.searchParams.get('word')||'').toLowerCase();if(validWord(word)&&bridge.known(word)){if(['quick','explore'].includes(url.searchParams.get('mode')))store.mode=url.searchParams.get('mode');bridge.open(word);}else{landing=true;article.hidden=true;}initializing=false;updateHome();routePicker();window.RootLabNavigation?.start({bridge,home:showHome,isHome:()=>landing});
 const panelsObserver=new MutationObserver(()=>{for(const name of ['roots','review','profile'])unfoldPanels($(name+'View'));});for(const name of ['roots','review','profile'])panelsObserver.observe($(name+'View'),{childList:true,subtree:true});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-reader]');if(b){e.preventDefault();e.stopImmediatePropagation();lastInput=Date.now();act(b);return;}
 const hist=e.target.closest('#readerV24 [data-action="wiktionary-etymology"]');if(hist){e.preventDefault();e.stopImmediatePropagation();const node=hist.closest('.historical-source-action').querySelector('[data-word] .wiktionary-source-result')||hist.parentNode.querySelector('.wiktionary-source-result');window.RootLabHistoryUI.fetchRemote(hist.dataset.word,node);}},true);
 for(const ev of ['pointerdown','keydown','touchstart','wheel'])document.addEventListener(ev,()=>{lastInput=Date.now();},{passive:true});
 let scrollTimer=0;addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(remember,200);},{passive:true});
 document.addEventListener('visibilitychange',()=>{stamp=Date.now();if(document.hidden)remember();});
 addEventListener('pagehide',remember);
 setInterval(()=>{const now=Date.now(),dt=Math.min(5,Math.max(0,(now-stamp)/1000));stamp=now;if(visible&&inViewport&&!document.hidden&&document.hasFocus()&&now-lastInput<30000){store.counts.seconds+=dt;save();}},5000);
}
window.RootLabReader={init,show,beforeOpen,afterOpen,view:setView,get ready(){return ready;},get state(){return store;},get context(){return ctx;},get isHome(){return landing;},home:showHome,recommendations,
 exportState(){remember();return JSON.parse(JSON.stringify(store));},importState(raw){if(raw){store=clean(raw);save();updateHome();}},clearData(){store=blank();save();updateHome();},startRoute};
})();
