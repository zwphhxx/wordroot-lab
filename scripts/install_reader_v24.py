from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'index.html';s=p.read_text('utf8')
assert 'content="2.3.0"' in s and 'reader-v24.js' not in s
s=s.replace('content="2.3.0"','content="2.4.0"',1)
s=s.replace('<title>词根实验室 · 词根联想与英汉词典</title>','<title>词根实验室 · 查一个词，读一段来历</title>',1)
s=s.replace('</head>','<link rel="stylesheet" href="./reader-v24.css" />\n</head>',1)
s=s.replace('<script src="./lexicon-v21.js"></script>','<script src="./lexicon-core-v24.js"></script>',1)
s=s.replace('<script src="./wordnet-v21.js"></script>','',1)
s=s.replace('<script src="./history-ui-v23.js"></script>','<script src="./history-ui-v24.js"></script>',1)
s=s.replace('<script src="./memory-engine-v2.js"></script>','<script src="./memory-engine-v2.js"></script>\n  <script src="./reading-cards-v24.js"></script>\n  <script src="./reader-v24.js"></script>',1)
s=s.replace('<h1>查单词，<em>顺着词根学。</em></h1>','<h1>查一个词，<em>读一段来历。</em></h1>',1)
s=s.replace('查词不止看释义。深入理解词根、构词规律、同根词与真实例句，找到一个词就能学会一组词。','直接查词，或沿一条短路线，发现词与词之间的联系。',1)
s=s.replace('data-word="successful">successful</button>','data-word="concession">concession</button>',1)
# Hook the established word-rendering lifecycle; no duplicate source of learning state.
a='function renderCurrent(){renderWord();renderAside();renderLearningSections();renderLexicon();renderHeader();}'
b='function renderCurrent(){renderWord();renderAside();renderLearningSections();renderLexicon();renderHeader();if(window.RootLabReader?.ready)window.RootLabReader.show(readerContext());}'
assert a in s;s=s.replace(a,b,1)
a="  window.scrollTo({top:0,behavior:'smooth'});\n}"
# actual source may use one initial space
if a not in s:a=" window.scrollTo({top:0,behavior:'smooth'});\n}"
assert a in s
s=s.replace(a," if(window.RootLabReader?.ready)window.RootLabReader.view(to);\n if(to!=='learn'||!window.RootLabReader?.ready)window.scrollTo({top:0,behavior:'smooth'});\n}",1)
a="function jumpToResult(){setTimeout(()=>{const el=$('learnLayout');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},80);}"
assert a in s;s=s.replace(a,"function jumpToResult(){if(window.RootLabReader?.ready){window.RootLabReader.afterOpen();return;}setTimeout(()=>{const el=$('learnLayout');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},80);}",1)
a="function openWord(name,rootId){const w=getWord(name,rootId);"
assert a in s;s=s.replace(a,"function openWord(name,rootId){window.RootLabReader?.beforeOpen();const w=getWord(name,rootId);",1)
a="function openDictionaryWord(name){const key=String(name||'').toLowerCase();"
assert a in s;s=s.replace(a,"function openDictionaryWord(name){window.RootLabReader?.beforeOpen();const key=String(name||'').toLowerCase();",1)
a="function setOnlineMode(on){$('learnLayout').classList.toggle('online-mode',!!on);"
assert a in s;s=s.replace(a,"function setOnlineMode(on){document.body.classList.toggle('rd-online-view',!!on);if($('readerV24'))$('readerV24').hidden=!!on;$('learnLayout').classList.toggle('online-mode',!!on);",1)
# Only render the visible view. Old initialization rendered every catalogue/review dashboard unnecessarily.
s=s.replace('function renderAll(){renderHeader();renderCurrent();renderCatalog();renderReview();renderProfile();}',"function renderAll(){renderHeader();renderCurrent();if(view==='roots')renderCatalog();if(view==='review')renderReview();if(view==='profile')renderProfile();}",1)
# Replace substring preference in sibling recommendation with a source-only relation ranking.
s=s.replace("const cmp=(a.startsWith(word.slice(0,4))?-3:0)-(b.startsWith(word.slice(0,4))?-3:0);\n   return cmp||(LEX_MAP.get(a)?.[4]||999999)-(LEX_MAP.get(b)?.[4]||999999);", "return (LEX_MAP.get(a)?.[4]||999999)-(LEX_MAP.get(b)?.[4]||999999);",1)
# Indexed English prefix search. Exact lookup remains via existing Map.
a=s.index('function directMatches(q){');b=s.index('function fuzzyMatches(q){',a)
s=s[:a]+'''const SORTED_LEX=LEX_ROWS.map(x=>x[0]);
const CN_INDEX=LEX_ROWS.map(x=>translationParts(x).join(' '));
function prefixStart(query){let lo=0,hi=SORTED_LEX.length;while(lo<hi){const m=(lo+hi)>>>1;if(SORTED_LEX[m]<query)lo=m+1;else hi=m;}return lo;}
function directMatches(q){const query=String(q||'').trim().toLowerCase();if(!query)return[];const results=[],seen=new Set();
 const add=(name,score)=>{if(seen.has(name))return;const w=studyItem(name);if(!w)return;seen.add(name);results.push({w,score,rank:LEX_MAP.get(name)?.[4]||99999});};
 if(/^[a-z]+$/.test(query)){
  let i=prefixStart(query),limit=0;while(i<SORTED_LEX.length&&SORTED_LEX[i].startsWith(query)&&limit<600){const name=SORTED_LEX[i++];add(name,name===query?0:WORD_MAP.has(name)?1:2);limit++;}
  for(const w of UNIQUE){if(w.root.label.toLowerCase().includes(query)||w.root.forms.includes(query))add(w.word.toLowerCase(),7);}
  if(!results.length&&query.length>=3)for(const r of LEX_ROWS){if(r[0].includes(query))add(r[0],4);if(results.length>=100)break;}
 }else{
  for(let i=0;i<LEX_ROWS.length;i++)if(CN_INDEX[i].includes(query))add(LEX_ROWS[i][0],6);
  for(const w of UNIQUE)if(w.meaning.includes(query)||w.root.meaning.includes(query))add(w.word.toLowerCase(),5);
 }
 results.sort((a,b)=>a.score-b.score||a.rank-b.rank||a.w.word.localeCompare(b.w.word));return results.slice(0,45);
}
''' +s[b:]
bridge=r'''
const DETAIL_SEEDS=new Set(window.ROOTLAB_DETAIL_SEEDS||[]),DETAIL_BUNDLES=new Set(),DETAIL_PROMISES=new Map();
function readerDetailsLoaded(word){return DETAIL_SEEDS.has(word)||DETAIL_BUNDLES.has(word[0]);}
async function ensureReaderDetails(word){const letter=String(word||'').toLowerCase()[0];if(!/^[a-z]$/.test(letter))throw Error('Invalid word');if(readerDetailsLoaded(word))return;
 if(DETAIL_PROMISES.has(letter))return DETAIL_PROMISES.get(letter);
 const task=(async()=>{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14000);
 try{const response=await fetch('./data/reader-v24/'+letter+'.json',{signal:ctrl.signal});if(!response.ok)throw Error('Word details unavailable');const data=await response.json();if(data.schema!==1||data.letter!==letter||!Array.isArray(data.entries))throw Error('Invalid dictionary chunk');
 for(const row of data.entries){const old=LEX_MAP.get(row[0]);if(old&&Array.isArray(row)&&row.length===8)old.splice(0,old.length,...row);}
 for(const ex of data.examples||[])if(Array.isArray(ex)&&Array.isArray(ex[1])&&Array.isArray(ex[2]))WORDNET_MAP.set(ex[0],ex);
 DETAIL_BUNDLES.add(letter);
 }finally{clearTimeout(timer);}})();DETAIL_PROMISES.set(letter,task);try{await task;}catch(err){DETAIL_PROMISES.delete(letter);throw err;}
}
function readerRelated(word){const items=[],seen=new Set([word]);
 const source=window.RootLabHistoryUI?.record(word);const formula=source?.status==='source_formation'?source.timeline?.[0]?.term:'';
 for(const part of String(formula||'').split(/\s*\+\s*/)){if(/^[a-z]{3,}$/.test(part)&&knownWord(part)&&!seen.has(part)){items.push({word:part,label:'构词关系',reason:'公开词源记录中的组成词，比较它与 '+word+' 的词性和用法。'});seen.add(part);}}
 const ids=[...(RELATED_WORD_ROOTS.get(word)||[])];for(const id of ids){const root=ROOT_BY_ID.get(id)||REF_BY_ID.get(id);if(!root||root.kind==='prefix'||root.kind==='suffix')continue;
 const words=(root.examples||root.groups?.flatMap(g=>g.entries.map(e=>e.word))||[]).map(x=>x.toLowerCase()).filter(knownWord).sort((a,b)=>(LEX_MAP.get(a)?.[4]||99999)-(LEX_MAP.get(b)?.[4]||99999));
 for(const w of words){if(!seen.has(w)){items.push({word:w,label:'词根例词关联',reason:'同见于 '+(root.label||root.key)+' 词根资料，比较意思怎样分开。'});seen.add(w);}if(items.length>=6)break;}if(items.length>=6)break;}
 if(items.length<3)for(const w of WORDNET_MAP.get(word)?.[2]||[]){if(knownWord(w)&&!seen.has(w)){items.push({word:w,label:'近义词参考',reason:'比较近似含义在不同句子中的用法，不直接当作同根词。'});seen.add(w);}if(items.length>=3)break;}
 return items;
}
function readerContext(){const word=String(currentLexicon?.[0]||current.word).toLowerCase(),item=studyItem(word),row=LEX_MAP.get(word),w=getWord(word),custom=window.ROOTLAB_READING_CARDS?.[word];
 const example=custom?.example|| (w?.example?[w.example,w.translation]:WORDNET_MAP.get(word)?.[1]?.[0]?[WORDNET_MAP.get(word)[1][0],'']:[]);
 const advanced=currentLexicon?$('lexiconDetail'):$('learningSections');const cloned=advanced.cloneNode(true);cloned.querySelectorAll('.word-head,.dictionary-head,.mini-label,.side-actions,.dictionary-main-meaning').forEach(n=>n.remove());
 const wrong=UNIQUE.find(x=>x.word!==word&&short(x.meaning)!==short(item?.meaning));
 return {word,curated:!!w,meaning:custom?.meaning|| (Array.isArray(row?.[2])?row[2][0]:short(item?.meaning)),phonetic:row?.[1]?'/ '+phoneticHint(row[1])+' /':'',example:example[0]||'',translation:example[1]||'',favorite:isFavorite(word),planned:!!state.review[word],notes:w?wordSpecificNotes(w):null,related:readerRelated(word),fullHtml:cloned.innerHTML,distractor:wrong?short(wrong.meaning):null};
}
window.RootLabReaderBridge={current:readerContext,known:knownWord,open:openAnyWord,speak,favorite:toggleFavorite,plan:addPlan,toast,refresh:renderCurrent,hydrate:ensureReaderDetails,loaded:readerDetailsLoaded,related:readerRelated,search:directMatches};
'''
marker='window.RootLabTest={'
assert s.count(marker)==1
s=s.replace(marker,bridge+'\n'+marker,1)
# initialize after original testing interface exists; bridge references all defined functions.
marker='})();\n\n</script>'
assert marker in s
s=s.replace(marker,"window.RootLabReader.init(window.RootLabReaderBridge);\n"+marker,1)
# Backups remain v2 compatible, with a new optional nested reading state.
s=s.replace("format:'rootlab_learning_backup_v2',exportedAt:new Date().toISOString(),", "format:'rootlab_learning_backup_v2',exportedAt:new Date().toISOString(),reader:window.RootLabReader?.exportState(),",1)
s=s.replace("state=next;quiz=null;session=null;persist();renderAll();", "state=next;quiz=null;session=null;if(x.reader)window.RootLabReader?.importState(x.reader);persist();renderAll();",1)
s=s.replace("state.dailyGoal=20;quiz=null;session=null;persist();", "state.dailyGoal=20;quiz=null;session=null;window.RootLabReader?.clearData();persist();",1)
# Register upgrades without forcing a reload that discards reading position.
a="if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}"
b="if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));}"
assert a in s;s=s.replace(a,b,1)
p.write_text(s,'utf8')
# Separate cache identity: existing version scripts must not mutate in active old tabs.
p=ROOT/'history-ui-v23.js';h=p.read_text('utf8');h=h.replace('async function fetchRemote(word){','async function fetchRemote(word,targetNode){',1)
h=h.replace("node=document.querySelector('#learnLayout.dictionary-mode #lexiconDetail #wiktionaryEtymology')||document.querySelector('#learningSections #wiktionaryEtymology');", "node=targetNode||document.querySelector('#learnLayout.dictionary-mode #lexiconDetail #wiktionaryEtymology')||document.querySelector('#learningSections #wiktionaryEtymology');",1)
(ROOT/'history-ui-v24.js').write_text(h,'utf8')
print('Reader lifecycle, maps, lazy details, indexed search and backwards-compatible data hooks installed')
