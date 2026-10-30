/* Shared expanded components for every vocabulary entry. Editorial/source material
 * stays separate from navigation labels; no source data are translated at runtime. */
(function(){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const domid=s=>'record-'+encodeURIComponent(s).replace(/%/g,'_');
const attrs=r=>' data-record-ids="'+esc(JSON.stringify(r.sourceRecordIds||[r.id].filter(Boolean)))+'"';
function prose(zh){if(!zh)return '';const p=window.RootLabAuthored?.lookup(zh);return '<div class="rp-prose"'+(p?' data-authored-done="1"':'')+'><p lang="zh-CN">'+esc(zh)+'</p>'+(p?'<p lang="en" data-provenance="'+esc(p.status)+'">'+esc(p.en)+'</p>':'')+'</div>';}
function heading(zh,en){return '<h3 class="rp-subtitle" data-authored-done="1"><span lang="zh-CN">'+esc(zh)+'</span><small lang="en">'+esc(en)+'</small></h3>';}
const reviewedReasonExamples={
 'example:reason:75dbb1fadead9a79a3':['the reason that war was declared','宣战的原因'],
 'example:reason:b02fc9be55d29fc5fa':['the reason a steady state was never reached was that the back pressure built up too slowly','始终未能达到稳定状态，是因为背压上升得太慢。'],
 'example:reason:81932ba8930c44975a':['he had to rely less on reason than on rousing their emotions','他需要更多地激发他们的情绪，而不是依赖理性说服。'],
 'example:reason:937959d7529a20a971':['We reasoned that it was cheaper to rent than to buy a house','我们分析后认为，租房比买房更省钱。'],
 'example:reason:af6940381c17aea8fb':['The children must learn to reason','孩子们必须学会理性思考。']
};
function reviewedExample(c,row){
 if(c.word!=='reason')return row;
 const match=(row.sourceRecordIds||[row.id]).map(id=>reviewedReasonExamples[id]).find(v=>v&&norm(v[0])===norm(row.en));
 return match?{...row,zh:match[1],translation:'edited'}:row;
}
function example(c,row){
 const r=RootLabUnified.example(c.word,row),forms=[c.word,...(c.learning?.forms||[]).map(x=>x[1])].filter(v=>typeof v==='string');
 const words=[...new Set(forms)].sort((a,b)=>b.length-a.length).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const rx=new RegExp('\\b('+words.join('|')+')\\b','ig');
 const en=esc(r.en).replace(rx,'<mark>$1</mark>');
 return '<section class="rp-example-record unified-example" id="'+domid(row.displayId)+'"'+attrs(row)+' data-translation="'+esc(r.translation||'source')+'">'+
 '<div class="example-copy"><p class="bi-en" lang="en">'+en+'</p><p class="bi-zh" lang="zh-CN">'+esc(r.zh)+'</p></div>'+
 '<button type="button" class="rd-icon example-audio" data-reader="speak-line" data-text="'+esc(r.en)+'" aria-label="朗读例句 / Listen: '+esc(r.en)+'">'+RootLabBilingual.soundIcon+'</button></section>';
}
function phrases(rows){return '<div class="lr-collocations bi-collocations">'+rows.map(p=>{
 const title=p.meaningDisplay==='sense_definition'?'<h4 class="bi-phrase-title" lang="en">'+esc(p.en)+'</h4>':RootLabBilingual.pair(p.en,p.zh,p.translation,'bi-phrase-title');
 const def=p.definitionPair||(p.definition&&p.definitionZh?{en:p.definition,zh:p.definitionZh,translation:p.definitionTranslation}:null);
 return '<section class="lr-phrase-row" id="'+domid(p.displayId||p.id)+'"'+attrs(p)+'><div>'+title+(def&&!(norm(def.en)===norm(p.en)&&norm(def.zh)===norm(p.zh))?RootLabBilingual.pair(def.en,def.zh,def.translation,'bi-phrase-gloss'):'')+'</div><button class="rd-icon" data-reader="speak-line" data-text="'+esc(p.en)+'" aria-label="朗读 / Listen: '+esc(p.en)+'">'+RootLabBilingual.soundIcon+'</button></section>';}).join('')+'</div>';}
function relations(m){
 const rows=m.relations||[],render=r=>{const id=r.fromSenseId||r.senseId,s=m.displayMeanings.find(x=>x.id===id)||m.senses.find(x=>x.id===id);
 const d=s?RootLabReadingOverview.describe(s,m.word):{zh:r.contextZh||'',en:r.contextEn||''},type=RootLabUnified.relation(r);
 const scope=RootLabReadingOverview.compact(d.zh,42);
 return '<article class="relation-tile"'+attrs(r)+'><div class="relation-top" data-authored-done="1"><button class="relation-word" data-reader="next" data-word="'+esc(r.word)+'" data-source-sense="'+esc(id)+'" data-target-sense="'+esc(r.toSenseId||r.targetSenseId)+'">'+esc(r.word)+' <span aria-hidden="true">↗</span></button><span>'+esc(type.zh)+'<small lang="en">'+esc(type.en)+'</small></span></div>'+
 '<p class="relation-scope" data-authored-done="1"><span lang="zh-CN">关联到 '+esc(m.word)+' 的「'+esc(scope)+'」这一义项</span><small lang="en">Linked to this specific sense of '+esc(m.word)+'.</small></p>'+
 RootLabBilingual.pair(r.en,r.zh,r.translation,'relation-definition')+
 '<p class="relation-warning" data-authored-done="1"><span lang="zh-CN">词义关系，不表示可在所有句子中互换。</span><small lang="en">Sense-specific; not always interchangeable.</small></p></article>';
 };
 return '<div class="relation-grid">'+rows.slice(0,6).map(render).join('')+'</div>'+(rows.length>6?'<details class="more-relations"><summary data-authored-done="1">查看其余 '+(rows.length-6)+' 个关联 <small lang="en">More connections</small></summary><div class="relation-grid">'+rows.slice(6).map(render).join('')+'</div></details>':'');
}
function family(m,services){const f=m.family;if(!f)return '';return '<div class="lr-root-anchor"><div><b>'+esc(f.label)+'</b>'+prose(f.meaning)+'</div><button class="rd-text" data-action="open-root" data-root="'+esc(f.id)+'" data-authored-done="1"><span lang="zh-CN">词根词库</span> <span lang="en">Root library ↗</span></button></div><div class="lr-semantic-groups">'+(f.groups||[]).map(g=>'<section class="lr-semantic-group">'+prose(g.title)+(g.note?prose(g.note):'')+(g.items||[]).map(w=>'<button class="lr-group-row '+(w.word===m.word?'is-current':'')+'" data-reader="next" data-word="'+esc(w.word)+'"><b lang="en">'+services.marked(w.word,f.forms)+'</b><span lang="zh-CN">'+esc(w.meaning)+'</span></button>').join('')+'</section>').join('')+'</div>';}
function forms(m){
 const names={'0':['原形','Base form'],s:['复数','Plural'],'3':['第三人称单数','Third-person singular'],i:['现在分词','Present participle'],p:['过去式','Past tense'],d:['过去分词','Past participle'],r:['比较级','Comparative'],t:['最高级','Superlative']};
 return '<dl class="unified-forms" data-authored-done="1">'+RootLabUnified.forms(m).map(([k,v])=>'<div><dt><span lang="zh-CN">'+esc((names[k]||[k,k])[0])+'</span><small lang="en">'+esc((names[k]||[k,k])[1])+'</small></dt><dd>'+(window.RootLabReaderBridge?.known(v)?'<button data-reader="next" data-word="'+esc(v)+'" lang="en">'+esc(v)+'</button>':'<b lang="en">'+esc(v)+'</b>')+'</dd></div>').join('')+'</dl>';
}
function authoredUsage(m){return m.usage.map(u=>{const ex=m.examples.find(e=>norm(e.en)===norm(u.en)&&norm(e.zh)===norm(u.zh));return '<section class="lr-usage-item">'+prose(u.title)+prose(u.body)+(ex?'<a class="rd-text" data-ui-jump href="#'+domid(ex.displayId)+'" data-authored-done="1"><span lang="zh-CN">读对应例句</span> <span lang="en">Read the example →</span></a>':u.en&&u.zh?RootLabBilingual.pair(u.en,u.zh,'edited'):'')+'</section>';}).join('');}
function decoder(d){return '<section class="definition-decoder">'+heading('读懂英文定义','Understanding the definition')+RootLabBilingual.pair(d.original,d.translation,'edited')+'<div class="definition-parts">'+(d.parts||[]).map(([en,zh])=>'<div><b lang="en">'+esc(en)+'</b><span lang="zh-CN">'+esc(zh)+'</span></div>').join('')+'</div></section>';}

const pos={n:'名词 · noun',v:'动词 · verb',a:'形容词 · adjective',r:'副词 · adverb',adj:'形容词 · adjective',adv:'副词 · adverb',vt:'及物动词 · transitive verb',vi:'不及物动词 · intransitive verb'};
function chosen(rows,card){const keys=new Set(card.keys);return rows.filter(r=>keys.has(RootLabReadingCards.identity(r)));}
function senses(rows,card,m,plan){
 const overview=window.RootLabReadingOverview;
 return '<div class="bi-sense-list lr-english-senses">'+rows.map((s,i)=>{
  const original=s.displayKind!=='source-meaning',nativeIds=s.nativeSourceIds||[],sourceIds=s.sourceRecordIds||[s.id];
  const rowClass=original?'bi-sense':'bi-native-block rp-integrated-meaning';
  const kind=original?' data-sense-id="'+esc(s.id)+'"':' data-native-source-id="'+esc(nativeIds[0]||s.id)+'"';
  const details=overview.describe(s,m.word),label=norm(details.zh),same=label===norm(details.originalZh);
  const related=plan.placements?.bySense?.[s.id]||{examples:[],phrases:[]};
  const examples=related.examples||[],phrasesLinked=related.phrases||[];
  const hasTitle=!!label&&!same;
  const shortTitle=hasTitle?'<h4 class="unit-heading" data-authored-done="1" lang="zh-CN">'+esc(label)+'</h4>':'';
  const explanation=details.noteZh?'<p class="unit-short-explanation" data-authored-done="1" lang="zh-CN">'+esc(details.noteZh)+'</p>':'';
  const sentence=examples.length?'<section class="unit-context"><h5 data-authored-done="1"><span lang="zh-CN">例句</span><small lang="en">Examples in context</small></h5>'+
   examples.map(e=>'<div class="unit-example">'+(!window.RootLabReadingUnits.inWord(e.en,m.word)?'<small class="unit-contextual" data-authored-done="1"><span lang="zh-CN">相关语境</span> · <span lang="en">Related context</span></small>':'')+
    example(m.context,e,true)+'</div>').join('')+'</section>':'';
  const phraseBody=phrasesLinked.length?'<section class="unit-related-phrases"><h5 data-authored-done="1"><span lang="zh-CN">相关搭配</span><small lang="en">Related expressions</small></h5>'+
   phrases(phrasesLinked)+'</section>':'';
  return '<section class="'+rowClass+' unit-meaning '+(hasTitle?'has-short-title':'source-is-title')+'" id="'+domid(s.id)+'" data-meaning-id="'+esc(s.id)+'"'+kind+
   ' data-native-source-ids="'+esc(JSON.stringify(nativeIds))+'" data-record-ids="'+esc(JSON.stringify(sourceIds))+'">'+
   '<div class="bi-sense-top" data-authored-done="1"><span class="bi-index">'+String(card.startNumber+i).padStart(2,'0')+'</span>'+
   '<span lang="zh-CN">'+esc(details.posZh)+'</span>'+(original?'':'<span lang="zh-CN"> · 原词库补充释义</span>')+'</div>'+
   shortTitle+explanation+
   '<div class="unit-definition">'+(hasTitle?'<p class="unit-source-caption" data-authored-done="1"><span lang="zh-CN">词典原始释义</span><small lang="en">Dictionary source</small></p>':'')+
   RootLabBilingual.pair(s.en,s.zh,s.translation)+'</div>'+
   (s.noteZh&&s.noteEn?'<div class="rp-sense-note">'+RootLabBilingual.pair(s.noteEn,s.noteZh,'edited')+'</div>':'')+
   sentence+phraseBody+'</section>';
 }).join('')+'</div>';
}

function plainPart(m,card){const t=document.createElement('template');t.innerHTML=window.RootLabMeanings?.render(m.context)||'';const more=[...t.content.querySelectorAll('.lr-meaning-additional')];if(card.type==='plain-additional')return more[card.additionalIndex]?.outerHTML||'';more.forEach(n=>n.remove());return t.innerHTML;}
function historyPart(m,card,services){
 if(card.type==='history-summary')return prose(m.history.summary);
 if(card.type==='history-excerpt')return RootLabBilingual.historyPair(m.word,m.history.excerpt);
 const t=document.createElement('template');t.innerHTML=services.history();const steps=[...t.content.querySelectorAll('.lr-history-step')];return '<div class="lr-history"><div class="lr-timeline">'+card.keys.map(k=>steps[Number(k.split(':').at(-1))]?.outerHTML||'').join('')+'</div></div>';
}
function body(card,plan,m,services){const c=m.context;switch(card.type){
 case 'senses':return senses(chosen(m.displayMeanings,card),card,m,plan);
 case 'native':return '<div class="bi-native-source">'+chosen(m.native,card).map(p=>'<section class="bi-native-block" data-native-source-id="'+esc(p.id)+'"'+attrs(p)+'>'+RootLabBilingual.pair(p.en,p.zh,p.translation)+'</section>').join('')+'</div>';
 case 'phrases':return phrases(chosen(m.phrases,card));
 case 'examples':case 'first-example':return chosen(m.examples,card).map(e=>example(c,e)).join('');
 case 'relations':return relations({...m,relations:chosen(m.relations,card)});
 case 'family':{const g=m.family.groups[card.familyGroup];return family({...m,family:{...m.family,groups:[{...g,items:chosen(g.items||[],card)}]}},services);}
 case 'story':return card.keys.map(k=>prose(m.paragraphs[Number(k.split(':').at(-1))])).join('');
 case 'history-summary':case 'history-steps':case 'history-excerpt':return historyPart(m,card,services);
 case 'plain-main':case 'plain-additional':return plainPart(m,card);
 case 'morphology':return services.morphology();
 case 'forms':return forms(m);
 case 'definition-breakdown':return decoder(m.breakdown);
 case 'authored-usage':return authoredUsage({...m,usage:[m.usage[card.usageIndex]]});
 case 'quiz':return services.recall();
 default:return '';
}}
function shortCard(card,html){if(!html.trim())return '';const title=card.hideTitle?'':'<header class="rp-card-head" data-authored-done="1"><h3><span lang="zh-CN">'+esc(card.titleZh)+'</span><small lang="en">'+esc(card.titleEn)+'</small></h3></header>';return '<article class="lr-card rp-card rp-card-'+esc(card.type)+'" id="'+esc(card.cardId)+'" data-reading-card="'+esc(card.cardId)+'" data-card-type="'+esc(card.type)+'" data-semantic-group="'+esc(card.semanticGroup||card.group||'')+'" data-visual-group="'+esc(card.visualGroup||card.type)+'" data-card-sources="'+esc(JSON.stringify(card.sourceRecordIds))+'" tabindex="-1">'+title+html+'</article>';}
const moduleLabels={senses:['不同意思','Meanings'],phrases:['搭配','Phrases'],'authored-usage':['用法说明','Usage notes'],forms:['词形','Forms'],examples:['例句','Examples']};
function moduleRender(mod,plan,m,services){
 const groups=new Map();for(const card of mod.cards){const k=card.visualGroup||card.type;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(card);}
 const overall={senses:['具体词义','Meanings in context'],phrases:['搭配与表达','Expressions'],examples:['例句与应用','Examples in context'],relations:['词义关联','Meaning connections'],family:['同根词与词族','Root family']};
 const moduleTitle=overall[mod.type];let rendered='';
 for(const [key,cards]of groups){const first=cards[0],label=[first.titleZh,first.titleEn];const hasSub=!moduleTitle||label[0]!==moduleTitle[0]&&!(cards.every(c=>c.hideTitle));
 const groupTitle=mod.type==='senses'?'':hasSub?'<header class="rp-group-title" data-group-heading="'+esc(key)+'" data-authored-done="1"><h3><span lang="zh-CN">'+esc(label[0])+'</span><small lang="en">'+esc(label[1])+'</small></h3></header>':'';
 const accessibleLabel=mod.type==='senses'?'具体义项 / Individual meanings':label.join(' / ');
 rendered+='<section class="rp-semantic-section" data-content-group="'+esc(key)+'" aria-label="'+esc(accessibleLabel)+'">'+groupTitle+cards.map(card=>{const html=body(card,plan,m,services);return (card.firstInGroup?'<div id="sense-group-'+esc(card.group)+'" class="rp-group-anchor" tabindex="-1"></div>':'')+shortCard({...card,hideTitle:true},html);}).join('')+'</section>';
 }
 const units=window.RootLabReadingUnits,assigned=plan.placements||{};
 const linked=mod.type==='phrases'?m.phrases.filter(p=>units.ids(p).some(id=>assigned.phraseTarget?.[id])):
  mod.type==='examples'?m.examples.filter(e=>units.ids(e).some(id=>assigned.exampleTarget?.[id])):[];
 const linkIndex=linked.length?'<nav class="unit-link-index" data-authored-done="1" aria-label="已按义项展示的位置 / In-place learning items">'+
  '<p>以下内容已放在对应义项中，点击可直接到达。<small lang="en">These items are shown in their matching meanings. Jump to each item.</small></p>'+
  linked.map(r=>'<a data-ui-jump href="#'+domid(r.displayId||r.id)+'"><span lang="en">'+esc(r.en)+'</span><span lang="zh-CN">'+esc(units.snippet(r.zh,24))+'</span></a>').join('')+'</nav>':'';
 const title=moduleTitle?'<header class="rp-module-title" data-authored-done="1"><h3><span lang="zh-CN">'+esc(moduleTitle[0])+'</span><small lang="en">'+esc(moduleTitle[1])+'</small></h3></header>':'';
 return '<div class="rp-module" id="module-'+esc(mod.moduleId.replace(':','-'))+'" data-plan-module="'+esc(mod.moduleId)+'" tabindex="-1">'+title+linkIndex+rendered+'</div>';
}

function levels(m){const labels={'中考':'High school entrance','高考':'College entrance','四级':'CET-4','六级':'CET-6','考研':'Postgraduate exam','雅思':'IELTS','托福':'TOEFL'};
 return m.levels.length?'<div class="rp-levels word-study-scope" aria-label="学习范围参考 / Study scope reference" data-authored-done="1">'+m.levels.map(v=>'<span class="study-scope-item"><span lang="zh-CN">'+esc(v)+'</span> <small lang="en">'+esc(labels[v]||v)+'</small></span>').join('<span class="study-scope-separator" aria-hidden="true">·</span>')+'</div>':'';
}

function render(plan,m,services){const c=m.context,early=m.examples.find(e=>e.displayId===plan.earlyExampleId),first=plan.sections.find(s=>s.id==='meaning');
 const word='<article class="lr-word-card" data-reading-card="headword" data-card-type="headword"><div class="rd-word-row"><div><h1 lang="en">'+esc(m.word)+'</h1>'+(c.phonetic?'<p class="rd-ipa">'+esc(c.phonetic)+'</p>':'')+'</div><div class="rd-word-buttons"><button class="rd-icon" data-reader="speak" aria-label="朗读 / Listen: '+esc(m.word)+'">'+services.icons.sound+'</button><button class="rd-icon '+(c.favorite?'is-saved':'')+'" data-reader="favorite" aria-label="'+(c.favorite?'取消收藏 / Remove favorite':'收藏 / Favorite')+'" aria-pressed="'+Boolean(c.favorite)+'">'+services.icons.star+'</button></div></div><p class="rd-meaning" data-content-role="headword-gloss" lang="zh-CN">'+esc(m.custom?.meaning||RootLabBilingual.headline(c)||'')+'</p>'+(m.dictionary.summaryEn?'<p class="rd-meaning-en" lang="en">'+esc(m.dictionary.summaryEn)+'</p>':'')+levels(m)+'<div class="lr-word-actions"><button class="rd-text" data-reader="plan">'+(c.planned?'✓ 已加入复习':'＋ 加入复习')+' <small lang="en"> · Review</small></button></div></article>';
 // A meaning preview must contain the original meaning, not a generic WordNet category.
 // Use only exact source-linked senses; all full meanings remain below.
 const overviewData=window.RootLabReadingOverview.build(m,plan);
 const overview=overviewData.show?'<nav class="unit-overview" data-authored-done="1" aria-label="具体词义速览 / Key meanings">'+
  '<h2>核心词义速览 <small lang="en">Meanings at a glance</small></h2>'+
  '<p class="unit-overview-lead">先看这个词具体是什么意思，点击卡片查看完整释义和例句。 <small lang="en">Tap a meaning to read its full definition and examples.</small></p>'+
  '<div class="unit-overview-links">'+overviewData.items.map((t,i)=>'<a data-ui-jump href="#'+domid(t.id)+'" aria-label="查看完整义项：'+esc(t.fullZh)+'">'+
  '<span class="unit-preview-meta"><span class="unit-preview-number">'+String(i+1).padStart(2,'0')+'</span><span lang="zh-CN">'+esc(t.posZh)+'</span></span>'+
  '<strong lang="zh-CN">'+esc(t.zh)+'</strong>'+(t.noteZh?'<span class="unit-preview-note" lang="zh-CN">'+esc(t.noteZh)+'</span>':'')+
  '<small lang="en">'+esc(t.en)+'</small></a>').join('')+
  '</div><button type="button" data-ui="contents" class="unit-all-meanings">查看全部 '+overviewData.total+' 个义项 <small lang="en">All meanings →</small></button></nav>':'';
 const search='<section class="unit-entry-search" role="search" aria-label="在本词中查找 / Find within this entry">'+
  '<label for="entrySearchInput" data-authored-done="1"><span lang="zh-CN">在本词中查找</span> <small lang="en">Find within this entry</small></label>'+
  '<input id="entrySearchInput" type="search" data-entry-search autocomplete="off" spellcheck="false" '+
  'placeholder="中文、英文、搭配或例句 / Meanings, phrases, examples" aria-controls="entrySearchResults" />'+
  '<div class="unit-search-results" id="entrySearchResults" aria-live="polite" hidden></div></section>';
 const intro='<section class="rp-stage rp-meaning" id="read-section-meaning" data-reading-stage data-module="meaning" data-stage="meaning" tabindex="-1">'+word+overview+search+'<div class="rp-media-slot" data-v214-media="primary"></div>'+ '</section>';
 const rest=plan.sections.filter(s=>s.id!=='meaning').map(s=>{const nav=s.id==='usage'?'<nav class="rp-section-links" data-authored-done="1" aria-label="用法内容 / Usage contents">'+
  (s.modules.some(v=>v.type==='senses')?'<a data-ui-jump href="#module-usage-senses"><span lang="zh-CN">义项</span><small lang="en">Meanings</small></a>':'')+
  (m.phrases.length?'<a data-ui-jump href="#module-usage-phrases"><span lang="zh-CN">搭配</span><small lang="en">Phrases</small></a>':'')+
  (m.quiz?'<a data-ui-jump href="#module-explore-quiz"><span lang="zh-CN">练习</span><small lang="en">Practice</small></a>':
   '<button type="button" data-action="navigate" data-view="review"><span lang="zh-CN">练习</span><small lang="en">Practice</small></button>')+
  '</nav>':'';
 return '<section class="rp-stage rp-'+s.id+'" id="read-section-'+s.id+'" data-reading-stage data-module="'+s.id+'" data-stage="'+s.id+'" tabindex="-1"><header class="rp-stage-head" data-authored-done="1"><span class="rp-stage-number" aria-hidden="true">'+String(plan.sections.indexOf(s)+1).padStart(2,'0')+'</span><h2><span lang="zh-CN">'+s.titleZh+'</span><small lang="en">'+s.titleEn+'</small></h2></header>'+nav+s.modules.map(mod=>moduleRender(mod,plan,m,services)).join('')+(s.id==='understanding'?services.sources():'')+'</section>';}).join('');
 const links=m.sources.filter(x=>/^https:\/\//.test(x.url||'')||x.url==='./credits.html');const refs=links.length?'<div class="lr-sources rp-profile-sources">'+links.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label||'来源 / Source')+' ↗</a>').join('')+'</div>':'';
 return intro+'<div class="lr-stream">'+rest+'</div>'+refs+'<aside class="rp-resource-area" data-v214-media="more" aria-label="补充图文 / Optional picture topics"></aside>';
}

function sourceLabel(r){return String(r.translation||'').startsWith('machine')?'机译参考 / Machine-translated reference':r.translation==='edited'?'已校订 / Edited':'原始资料 / Source text';}
function sourceInfo(row,examples){
 const refs=(row.sourceRefs||[]).filter(x=>/^https:\/\//.test(x.url||''));
 return '<details class="meaning-sources"><summary data-authored-done="1">来源与翻译说明 <small lang="en">Sources</small></summary><div data-authored-done="1"><p>'+esc(sourceLabel(row))+'</p><p lang="zh-CN">'+esc(row.zh)+'</p>'+refs.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.source||'来源')+' ↗</a>').join(' · ')+examples.map(e=>'<p class="example-origin"><span lang="en">'+esc(e.en)+'</span><small>'+esc(sourceLabel(RootLabUnified.example(window.RootLabReader?.context?.word||'',e)))+' · '+esc(e.kind||'词典例句')+'</small></p>').join('')+'</div></details>';
}

function meaningPanel(row,index,p,m,initial){
 const d=RootLabReadingOverview.describe(row,m.word),u=p.placements.bySense[row.id]||{examples:[],phrases:[]};
 const card=p.cards.find(c=>c.type==='senses'&&c.keys.includes(row.displayId||row.id)),original=row.displayKind!=='source-meaning';
 const originalZh=RootLabReadingOverview.cleanZh(row.zh),short=RootLabReadingOverview.compact(d.zh,52),lead=d.noteZh||(short!==originalZh?originalZh:'');
 return '<details class="meaning-panel '+(original?'bi-sense':'source-meaning')+'" id="'+domid(row.id)+'" data-meaning-id="'+esc(row.id)+'"'+(original?' data-sense-id="'+esc(row.id)+'"':'')+attrs(row)+' data-native-source-ids="'+esc(JSON.stringify(row.nativeSourceIds||[]))+'" data-reading-card="'+esc(card?.cardId||'')+'" data-card-type="senses"'+(initial?' open':' hidden')+'>'+
 '<summary data-authored-done="1"><span class="meaning-number">'+String(index+1).padStart(2,'0')+'</span><span class="meaning-pos">'+esc(d.posZh)+'</span><strong lang="zh-CN">'+esc(short)+'</strong><span class="meaning-chevron" aria-hidden="true">⌄</span></summary>'+
 '<div class="meaning-content" data-bi-pair="true"><span class="legacy-card-anchor" id="'+esc(card?.cardId||'anchor-'+index)+'"></span>'+
 '<div class="meaning-definition" data-translation="'+esc(row.translation||'')+'">'+(lead?'<p class="bi-zh" lang="zh-CN">'+esc(lead)+'</p>':'')+'<p class="bi-en" lang="en">'+esc(row.en)+'</p>'+(row.noteZh&&row.noteEn?RootLabBilingual.pair(row.noteEn,row.noteZh,'edited'):'')+'</div>'+
 (u.examples.length?'<div class="meaning-examples"><h4 data-authored-done="1">例句 <small lang="en">Examples</small></h4>'+u.examples.map(e=>example(m.context,e)).join('')+'</div>':'')+
 (u.phrases.length?'<div class="meaning-phrases"><h4 data-authored-done="1">搭配 <small lang="en">Phrases</small></h4>'+phrases(u.phrases)+'</div>':'')+sourceInfo(row,u.examples)+'</div></details>';
}
function coreMeanings(m,p){
 const v=RootLabUnified.build(m,p),o=RootLabReadingOverview;
 const main=new Set(v.mainIds),chips=v.rows.map((r,i)=>{const d=o.describe(r,m.word);return '<button type="button" data-meaning-select="'+esc(r.id)+'" aria-controls="'+domid(r.id)+'" aria-expanded="'+(r.id===v.firstId)+'" class="meaning-chip '+(r.id===v.firstId?'is-selected':'')+'"'+(!main.has(r.id)?' hidden data-extra-chip':'')+'><span class="chip-meta">'+String(i+1).padStart(2,'0')+' · '+esc(d.posZh)+'</span><strong lang="zh-CN">'+esc(o.compact(d.zh,18))+'</strong><small lang="en">'+esc(o.compact(d.en,38))+'</small></button>';}).join('');
 const sourceRows=v.sourceRows.map(r=>'<div class="source-record" id="'+domid(r.id)+'"'+attrs(r)+' data-native-source-ids="'+esc(JSON.stringify(r.nativeSourceIds||[]))+'">'+RootLabBilingual.pair(r.en,r.zh,r.translation)+'</div>').join('');
 const extras=p.placements.looseExamples||[];
 return '<section class="unified-core unified-section" id="module-usage-senses" data-plan-module="usage:senses" data-v220-section data-section-label="核心词义速览" data-section-en="Meanings" data-reading-stage data-module="meaning" data-word="'+esc(m.word)+'">'+
 '<h2 data-authored-done="1">核心词义速览 <small lang="en">Meanings at a glance</small></h2><p class="section-hint" data-authored-done="1">点选义项，释义、例句与搭配在本卡片内展开。 <small lang="en">Select a meaning to read in place.</small></p>'+
 '<div class="meaning-chips" data-authored-done="1" aria-label="选择义项 / Select a meaning">'+chips+'</div><div class="meaning-panels">'+v.rows.map((r,i)=>meaningPanel(r,i,p,m,r.id===v.firstId)).join('')+'</div>'+
 (v.rows.length>1?'<button type="button" class="show-all-meanings" data-meaning-all aria-expanded="false" data-count="'+v.rows.length+'" data-authored-done="1">展开全部 '+v.rows.length+' 个义项 <small lang="en">All meanings ↓</small></button>':'')+
 (extras.length?'<details class="unassigned-examples"><summary data-authored-done="1">通用例句（未绑定特定义项） <small lang="en">General examples</small></summary><div id="module-usage-examples" data-plan-module="usage:examples">'+extras.map(e=>example(m.context,e)).join('')+'</div></details>':'')+
 (sourceRows?'<details class="origin-sources"><summary data-authored-done="1">词典来源对照 <small lang="en">Original source glosses</small></summary><p data-authored-done="1">保留原词库信息，不作为额外编号义项。 <small lang="en">Source glosses, not additional numbered meanings.</small></p>'+sourceRows+'</details>':'')+'</section>';
}
function section(id,zh,en,html){return html.trim()?'<section class="unified-section" id="'+id+'" data-v220-section data-section-label="'+esc(zh)+'" data-section-en="'+esc(en)+'" data-reading-stage data-module="'+id+'"><h2 data-authored-done="1">'+zh+' <small lang="en">'+en+'</small></h2>'+html+'</section>':'';}
function renderUnified(plan,m,services){
 const c=m.context;
 const word='<section id="read-section-meaning" class="lr-word-card"><div class="rd-word-row"><div><h1 lang="en">'+esc(m.word)+'</h1><p class="rd-ipa">'+esc(c.phonetic||'')+'</p></div><div class="rd-word-buttons"><button class="rd-icon" data-reader="speak" aria-label="朗读单词 / Listen">'+services.icons.sound+'</button><button class="rd-icon '+(c.favorite?'is-saved':'')+'" data-reader="favorite" aria-pressed="'+!!c.favorite+'" aria-label="收藏 / Favorite">'+services.icons.star+'</button><button class="rd-text" data-reader="plan" data-authored-done="1">'+(c.planned?'✓ 已加入复习':'＋ 加入复习')+' <small lang="en">Review</small></button></div></div>'+levels(m)+'</section>';
 const media=section('encyclopedia-snapshot','百科词解','Encyclopedia snapshot','<div class="rp-media-slot" data-v214-media="primary"></div>');
 const search='<div class="unified-entry-search" role="search" data-authored-done="1"><label for="entrySearchInput">在本词中查找 <small lang="en">Find in entry</small></label><input id="entrySearchInput" type="search" data-entry-search autocomplete="off" placeholder="释义、搭配、例句 / Meanings, phrases, examples" aria-controls="entrySearchResults"><div class="unit-search-results" id="entrySearchResults" aria-live="polite" hidden></div></div>';
 const byType=t=>plan.sections.flatMap(s=>s.modules).filter(x=>x.type===t);
 const loose=plan.placements.loosePhrases||[],linked=m.phrases.filter(r=>!loose.includes(r));
 const phraseLinks=linked.length?'<div class="linked-phrase-chips" data-authored-done="1">'+linked.map(r=>'<a href="#'+domid(r.displayId||r.id)+'" data-ui-jump><b lang="en">'+esc(r.en)+'</b><span lang="zh-CN">'+esc(RootLabReadingOverview.compact(r.zh,34))+'</span></a>').join('')+'</div>':'';
 const phraseArea=m.phrases.length?section('module-usage-phrases','常用搭配','Common phrases','<div data-plan-module="usage:phrases">'+phraseLinks+phrases(loose)+'</div>'):'';
 const extraTypes=new Set(['plain','morphology','story','history','definition-breakdown','authored-usage','family']);
 const extras=plan.sections.flatMap(s=>s.modules).filter(mod=>extraTypes.has(mod.type)).map(mod=>moduleRender(mod,plan,m,services)).join('');
 const quiz=byType('quiz').map(mod=>moduleRender(mod,plan,m,services)).join('');
 return word+media+search+coreMeanings(m,plan)+(m.forms.length?section('module-usage-forms','词形变化','Word forms',forms(m)):'')+phraseArea+
 section('word-background','构词与来历','Word background',extras)+(m.relations.length?section('module-explore-relations','相关词与区别','Related words',relations(m)):'')+
 section('context-practice','语境练习','Practice',quiz)+'<div class="lr-sources unified-source-footer"><a href="./credits.html" target="_blank" rel="noopener noreferrer">资料与许可 · Sources</a></div>';
}

window.RootLabReaderComponents={render:renderUnified,prose,example,domid};
})();
