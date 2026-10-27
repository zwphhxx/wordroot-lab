/* Bilingual learning data are pairs attached to lexical sense IDs, not parallel
 * unaligned lists. Machine translations are explicit; the original stays visible.
 * Public static bundles only: no user's queries, notes or progress are uploaded. */
(function(){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').replace(/\s+/g,' ').trim(),key=s=>norm(s).toLowerCase();
const records=new Map(Object.entries(window.ROOTLAB_BILINGUAL_SEEDS||{})),tasks=new Map();
const heads=new Map((window.ROOTLAB_LEXICON||[]).map(r=>[r[0],(Array.isArray(r[2])?r[2].join('；'):r[2])||'']));
const pos={n:'名词 noun',v:'动词 verb',a:'形容词 adjective',adj:'形容词 adjective',adv:'副词 adverb',r:'副词 adverb',vt:'及物动词 transitive verb',vi:'不及物动词 intransitive verb',prep:'介词 preposition',pron:'代词 pronoun',conj:'连词 conjunction'};
const soundIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const good=s=>typeof s==='string'&&s.trim();
function get(word){const r=window.RootLabDictionaryRepository.get(word)||null;return window.RootLabDictionaryCorrections.apply(String(word).toLowerCase(),r);}
async function ensure(word){await window.RootLabDictionaryRepository.ensure(word);return get(word);}
function isMachine(kind){return String(kind||'').startsWith('machine');}
function badge(kind){return isMachine(kind)?'<span class="bi-method" title="自动翻译的参考文本，可结合原文核对">'+(kind==='machine-en'?'英文机译 · English MT':'中文机译 · Chinese MT')+'</span>':kind==='untranslated'?'<span class="bi-method bi-pending">译名待核对 · Term check needed</span>':'';}
function pair(en,zh,kind,cls=''){return '<div class="bi-pair '+cls+'" data-bi-pair="true" data-translation="'+esc(kind||'source')+'"><p class="bi-zh" lang="zh-CN">'+esc(zh)+'</p><p class="bi-en" lang="en">'+esc(en)+'</p>'+badge(kind)+'</div>';}
function senseLabel(s){return s?.source==='Editorial'&&s?.labelZh?s.labelZh:s?.zh||'';}
function coreMeaning(word){return String(heads.get(word)||'').replace(/^(?:n|v|vt|vi|a|adj|adv)\.\s*/,'');}
function headline(c){const x=get(c.word);return x?.summaryZh?'n. '+x.summaryZh:c.meaning;}
function enrich(c){const x=get(c.word);if(!x)return c;const d=c.learning||{};d.bilingual=x;d.definitions=x.nativeZh;
const merge=[],seen=new Set();const compiled=new Map((x.examples||[]).map(e=>[key(e.en),e]));
for(const e of [...(d.examples||[]),...(x.examples||[])]){if(!e?.en||seen.has(key(e.en)))continue;const match=compiled.get(key(e.en));const out={...e,...match};if(e.zh&&!String(e.kind||'').startsWith('开放')){out.zh=e.zh;out.translation='edited';}if(!out.zh)continue;seen.add(key(e.en));merge.push(out);}
if(x.word==='carrier')d.examples=x.examples.slice();else d.examples=merge;
if(d.basic){const b={...d.basic,definitions:x.nativeZh};const manual=(b.phrases||[]).filter(p=>p.zh),pmap=new Map(x.phrases.map(p=>[key(p.en),p]));
if(!b.generated&&x.word!=='carrier'){
 b.phrases=manual.map(p=>({...pmap.get(key(p.en)),...p}));
 b.supplementalPhrases=x.phrases.filter(p=>!manual.some(q=>key(q.en)===key(p.en)));
}else{
 b.phrases=(x.word==='carrier'?x.phrases:[...manual,...x.phrases]).filter((p,i,arr)=>arr.findIndex(q=>key(q.en)===key(p.en))===i).map(p=>({...pmap.get(key(p.en)),...p}));b.supplementalPhrases=[];
}
b.related=x.relations;b.senses=x.senses;d.basic=b;}
c.learning=d;return c;}
function senseGroups(x){
 const rows=x.senses||[];if(rows.length<8)return [{key:'all',label:'',en:'',items:rows}];
 const editorial=rows.every(s=>s.source==='Editorial'),groups=new Map();
 const domains=[['everyday','日常与运输','Everyday & transport',/日常|物流|运输|航空|舰船|车辆|递送|保险/],['technology','通信与技术','Communication & technology',/通信|信号|电子|物理|化学|材料/],['life','生命与医学','Life & medicine',/医学|遗传|生物/]];
 for(const row of rows){let g;if(editorial)g=domains.find(d=>d[3].test(row.domainZh||''));
 const k=editorial?(g?.[0]||'other'):(row.pos==='a'?'adj':row.pos==='r'?'adv':row.pos||'other');
 const labels=editorial?[g?.[1]||'其他用法',g?.[2]||'Other uses']:[{n:'名词用法',v:'动词用法',adj:'形容词用法',adv:'副词用法'}[k]||'其他用法',{n:'Noun uses',v:'Verb uses',adj:'Adjective uses',adv:'Adverb uses'}[k]||'Other uses'];
 if(!groups.has(k))groups.set(k,{key:k,label:labels[0],en:labels[1],items:[]});groups.get(k).items.push(row);
 }return groups.size>1?[...groups.values()]:[{key:'all',label:'',en:'',items:rows}];
}
function senses(c){const x=get(c.word);if(!x)return '<div class="bi-loading" role="status">正在载入逐项中英释义…<br><span lang="en">Loading the complete bilingual meanings…</span></div>';
 const groups=senseGroups(x),indices=new Map(groups.flatMap(g=>g.items).map((v,i)=>[v.id,i+1]));
 const menu=groups.length>1?'<nav class="bi-group-jumps" aria-label="义项分组 / Meaning groups">'+groups.map(g=>'<a data-ui-jump href="#sense-group-'+esc(g.key)+'"><span lang="zh-CN">'+esc(g.label)+'</span><small lang="en">'+esc(g.en)+'</small></a>').join('')+'</nav>':'';
 const row=s=>'<section class="bi-sense" data-sense-id="'+esc(s.id)+'"><div class="bi-sense-top"><span class="bi-index">'+String(indices.get(s.id)).padStart(2,'0')+'</span><span>'+esc(pos[s.pos]||'词义 sense')+'</span><span>'+esc(s.domainZh||'')+(s.domainEn?' · '+esc(s.domainEn):'')+'</span></div>'+(s.source==='Editorial'&&s.labelZh?'<h4>'+esc(s.labelZh)+(s.labelEn?' <span lang="en">'+esc(s.labelEn)+'</span>':'')+'</h4>':'')+pair(s.en,s.zh,s.translation)+'</section>';
 return '<div class="bi-sense-heading"><h3>逐项中英释义 <span lang="en">Meanings in context</span></h3><span>'+x.senses.length+' 个义项 · '+x.senses.length+' senses</span></div>'+menu+'<div class="bi-sense-list lr-english-senses">'+groups.map(g=>'<section class="bi-sense-group" id="sense-group-'+esc(g.key)+'" tabindex="-1">'+(g.label?'<h3><span lang="zh-CN">'+esc(g.label)+'</span><small lang="en">'+esc(g.en)+'</small></h3>':'')+g.items.map(row).join('')+'</section>').join('')+'</div>';
}

function nativeSummary(c){
 const source=get(c.word)?.nativeSourceSummary,rows=source?.pairs||[];
 if(!rows.length)return '';
 return '<section class="bi-native-source"><h3>原词库释义对照 <span lang="en">Additional source meanings</span></h3>'+rows.map(p=>'<section class="bi-native-block" data-native-source-id="'+esc(p.id)+'">'+pair(p.en||'English counterpart pending review.',p.zh,p.translation)+'</section>').join('')+'</section>';
}
function supplementalPhrases(c){
 const rows=c.learning?.basic?.supplementalPhrases||[];if(!rows.length)return '';
 return '<section class="bi-supplement-phrases"><h3>更多资料中的表达 <span lang="en">Further source expressions</span></h3>'+rows.map(p=>'<section class="bi-supplement-phrase-row" data-phrase-id="'+esc(p.id||'')+'">'+pair(p.en,p.zh,p.translation)+(p.definition&&p.definitionZh?pair(p.definition,p.definitionZh,p.definitionTranslation):'')+'</section>').join('')+'</section>';
}
function intro(c){const x=get(c.word);if(!x)return '';return x.summaryEn?'<section class="lr-plain-explanation bi-intro" aria-label="双语词义概览">'+pair(x.summaryEn,x.summaryZh,'edited')+'</section>':'';}

function phrases(c){const d=c.learning||{},x=get(c.word),rows=d.basic?.phrases||x?.phrases||[];
if(!rows.length)return '';
return '<div class="lr-collocations bi-collocations">'+rows.map(p=>'<section class="lr-phrase-row"><div>'+(p.meaningDisplay==='sense_definition'?'<h4 class="bi-phrase-title" lang="en">'+esc(p.en)+'</h4>':pair(p.en,p.zh,p.translation||'edited','bi-phrase-title'))+(p.definition&&p.definitionZh?pair(p.definition,p.definitionZh,p.definitionTranslation,'bi-phrase-gloss'):'')+'</div><button class="rd-icon" data-reader="speak-line" data-text="'+esc(p.en)+'" aria-label="朗读 '+esc(p.en)+'">'+soundIcon+'</button></section>').join('')+'</div>';
}
function relationGroups(c){
 const x=get(c.word),groups=new Map();for(const r of x?.relations||[]){const id=r.fromSenseId||r.senseId;if(!groups.has(id))groups.set(id,new Map());
 // Coalesce identical presentation only; retain every original edge and target ID.
 const k=JSON.stringify([r.word,r.label,r.labelEn,norm(r.en),norm(r.zh)]),bucket=groups.get(id);
 if(!bucket.has(k))bucket.set(k,{...r,sourceRecordIds:[],targetIds:[]});const v=bucket.get(k);v.sourceRecordIds.push(r.id);if(!v.targetIds.includes(r.toSenseId||r.targetSenseId))v.targetIds.push(r.toSenseId||r.targetSenseId);
 }return [...groups].map(([id,rows])=>({id,rows:[...rows.values()]}));
}
function relations(c){const x=get(c.word),groups=relationGroups(c);if(!groups.length)return '';
 return '<div class="bi-relations">'+groups.map(({id,rows})=>{const sense=x.senses.find(s=>s.id===id);return '<section class="bi-relation-group"><h4>'+esc(sense?senseLabel(sense):rows[0].contextZh)+'</h4><p class="bi-context-en" lang="en">'+esc(sense?.en||rows[0].contextEn)+'</p>'+rows.map(r=>'<button class="bi-relation" data-reader="next" data-word="'+esc(r.word)+'" data-source-sense="'+esc(id)+'" data-target-sense="'+esc(r.targetIds[0])+'" data-relation-ids="'+esc(JSON.stringify(r.sourceRecordIds))+'" data-target-senses="'+esc(JSON.stringify(r.targetIds))+'"><span class="bi-relation-title"><b lang="en">'+esc(r.word)+'</b>'+(key(r.wordZh)!==key(r.zh)?'<span>'+esc(r.wordZh)+'</span>':'')+'</span><small>'+esc(r.label)+' · '+esc(r.labelEn)+'</small>'+pair(r.en,r.zh,r.translation)+'</button>').join('')+'</section>';}).join('')+'</div>';
}

function recommendations(c){const x=get(c.word),seen=new Set([c.word]),out=[];
for(const r of x?.relations||[]){if(seen.has(r.word))continue;seen.add(r.word);out.push({word:r.word,meaning:r.wordZh,label:r.label,labelEn:r.labelEn,reason:r.zh,reasonEn:r.en,translation:r.translation});if(out.length===3)break;}return out;}
function example(c,e,i){const word=c.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');let en=esc(e.en);try{const rx=new RegExp('\\b('+word+'(?:s|es)?)\\b','ig');en=en.replace(rx,'<mark>$1</mark>');}catch(_){}
const sense=get(c.word)?.senses.find(s=>s.id===e.senseId);
return '<div class="lr-example bi-example" data-stage="example-'+i+'" data-sense-id="'+esc(e.senseId||'')+'" data-bi-pair="true">'+(sense?'<div class="bi-example-context">'+esc(sense.source==='Editorial'&&sense.labelZh?sense.labelZh:sense.domainZh)+' · '+esc(sense.labelEn||sense.domainEn)+'</div>':'')+'<p class="bi-en" lang="en">'+en+'</p><p class="lr-example-zh bi-zh" lang="zh-CN">'+esc(e.zh||'中文译文尚未就绪')+'</p><div>'+badge(e.translation)+'<span>'+esc(e.kind||'双语学习例句')+'</span><button class="rd-text" data-reader="speak-line" data-text="'+esc(e.en)+'">'+soundIcon+'<span>听例句 · Listen</span></button></div></div>';}
function quiz(c){
 const x=get(c.word);
 // Only explicitly authored, context-bound items are used. Machine candidate
 // senses do not produce scored questions until their semantics are reviewed.
 if(x?.quiz)return {...x.quiz,signature:'v212-'+c.word+'-editorial'};
 return null;
}
function historyPair(word,original){const p=window.ROOTLAB_BILINGUAL_HISTORY?.[word];return p&&norm(p.en)===norm(original)?pair(p.en,p.zh,p.translation,'bi-history-excerpt'):'';}
function pairFromWord(word,en){const x=get(word);if(!x)return null;for(const a of [...x.senses,...x.examples,...x.phrases])if(key(a.en)===key(en))return a;return null;}
window.RootLabBilingual={get,has:w=>window.RootLabDictionaryRepository.has(w),ensure,enrich,headline,coreMeaning,senses,senseGroups,relationGroups,soundIcon,nativeSummary,supplementalPhrases,intro,phrases,relations,recommendations,example,quiz,historyPair,pair,badge,pairFromWord,get loadedCount(){return window.RootLabDictionaryRepository.size;}};
})();
