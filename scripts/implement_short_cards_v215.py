#!/usr/bin/env python3
"""Apply the reviewed V2.15 component split to its isolated worktree only."""
from pathlib import Path
import re
R=Path(__file__).resolve().parent.parent
assert R.name=='wordroot-lab-reading-v215'
p=R/'reader-plan-v215.js';s=p.read_text();s=s.replace(" return {schema:1,uiVersion:'2.14.0'", " const plan={schema:1,uiVersion:'2.15.0'",1);s=s.replace("  sourceRefs:m.senses.flatMap(s=>s.sourceRefs||[])};", "  sourceRefs:m.senses.flatMap(s=>s.sourceRefs||[])};\n const cards=typeof window!=='undefined'?window.RootLabReadingCards:require('./reader-cards-v215.js');return cards.attachCards(plan,m);",1);p.write_text(s)
p=R/'reader-components-v215.js';s=p.read_text();s=s[:s.index('function moduleHTML')]
s=s.replace("return heading('搭配与表达','Expressions')+",'return ',1).replace("return heading('按具体词义继续联想','Connections by meaning')+",'return ',1).replace("return heading('同根词与词族','Root family')+",'return ',1).replace("return heading('词形变化','Word forms')+",'return ',1)
s+=r'''
const pos={n:'名词 · noun',v:'动词 · verb',a:'形容词 · adjective',r:'副词 · adverb',adj:'形容词 · adjective',adv:'副词 · adverb',vt:'及物动词 · transitive verb',vi:'不及物动词 · intransitive verb'};
function chosen(rows,card){const keys=new Set(card.keys);return rows.filter(r=>keys.has(RootLabReadingCards.identity(r)));}
function senses(rows,card){return '<div class="bi-sense-list lr-english-senses">'+rows.map((s,i)=>'<section class="bi-sense" id="'+domid(s.id)+'" data-sense-id="'+esc(s.id)+'" data-record-ids="'+esc(JSON.stringify([s.id]))+'"><div class="bi-sense-top"><span class="bi-index">'+String(card.startNumber+i).padStart(2,'0')+'</span><span>'+esc(pos[s.pos]||'词义 · sense')+'</span>'+(s.domainZh?'<span>'+esc(s.domainZh)+(s.domainEn?' · '+esc(s.domainEn):'')+'</span>':'')+'</div>'+((s.source==='Editorial'||s.editorialRevision)&&s.labelZh?'<h4>'+esc(s.labelZh)+(s.labelEn?'<span lang="en">'+esc(s.labelEn)+'</span>':'')+'</h4>':'')+RootLabBilingual.pair(s.en,s.zh,s.translation)+(s.noteZh&&s.noteEn?'<div class="rp-sense-note">'+RootLabBilingual.pair(s.noteEn,s.noteZh,'edited')+'</div>':'')+'</section>').join('')+'</div>';}
function plainPart(m,card){const t=document.createElement('template');t.innerHTML=window.RootLabMeanings?.render(m.context)||'';const more=[...t.content.querySelectorAll('.lr-meaning-additional')];if(card.type==='plain-additional')return more[card.additionalIndex]?.outerHTML||'';more.forEach(n=>n.remove());return t.innerHTML;}
function historyPart(m,card,services){
 if(card.type==='history-summary')return prose(m.history.summary);
 if(card.type==='history-excerpt')return RootLabBilingual.historyPair(m.word,m.history.excerpt);
 const t=document.createElement('template');t.innerHTML=services.history();const steps=[...t.content.querySelectorAll('.lr-history-step')];return '<div class="lr-history"><div class="lr-timeline">'+card.keys.map(k=>steps[Number(k.split(':').at(-1))]?.outerHTML||'').join('')+'</div></div>';
}
function body(card,plan,m,services){const c=m.context;switch(card.type){
 case 'senses':return senses(chosen(m.senses,card),card);
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
function shortCard(card,html){if(!html.trim())return '';return '<article class="lr-card rp-card rp-card-'+esc(card.type)+'" id="'+esc(card.cardId)+'" data-reading-card="'+esc(card.cardId)+'" data-card-type="'+esc(card.type)+'" data-card-sources="'+esc(JSON.stringify(card.sourceRecordIds))+'" tabindex="-1"><header class="rp-card-head" data-authored-done="1"><h3><span lang="zh-CN">'+esc(card.titleZh)+'</span><small lang="en">'+esc(card.titleEn)+'</small></h3>'+(card.part>1?'<span class="rp-part">'+card.part+'</span>':'')+'</header>'+html+'</article>';}
const moduleLabels={senses:['不同意思','Meanings'],native:['补充释义','Source meanings'],phrases:['搭配','Phrases'],'authored-usage':['用法说明','Usage notes'],forms:['词形','Forms'],examples:['例句','Examples']};
function moduleRender(mod,plan,m,services){let rendered=mod.cards.map(card=>{const html=body(card,plan,m,services);return (card.firstInGroup?'<div id="sense-group-'+esc(card.group)+'" class="rp-group-anchor" tabindex="-1"></div>':'')+shortCard(card,html);}).join('');
 const groups=mod.type==='senses'?RootLabReadingCards.senseGroups(m.senses):[];
 const menu=groups.length>1?'<nav class="bi-group-jumps" aria-label="义项分组 / Meaning groups">'+groups.map(g=>'<a data-ui-jump href="#sense-group-'+esc(g.key)+'"><span lang="zh-CN">'+esc(g.zh)+'</span><small lang="en">'+esc(g.en)+'</small></a>').join('')+'</nav>':'';
 return '<div class="rp-module" id="module-'+esc(mod.moduleId.replace(':','-'))+'" data-plan-module="'+esc(mod.moduleId)+'">'+menu+rendered+'</div>';
}
function levels(m){const labels={'中考':'High school entrance','高考':'College entrance','四级':'CET-4','六级':'CET-6','考研':'Postgraduate exam','雅思':'IELTS','托福':'TOEFL'};return m.levels.length?'<div class="lr-levels rp-levels" data-authored-done="1"><span>学习范围 <small lang="en">Study scope</small></span>'+m.levels.map(v=>'<b>'+esc(v)+' <small lang="en">'+esc(labels[v]||v)+'</small></b>').join('')+'</div>':'';}
function render(plan,m,services){const c=m.context,early=m.examples.find(e=>e.displayId===plan.earlyExampleId),first=plan.sections.find(s=>s.id==='meaning');
 const word='<article class="lr-word-card" data-reading-card="headword" data-card-type="headword"><div class="rd-word-row"><div><h1 lang="en">'+esc(m.word)+'</h1>'+(c.phonetic?'<p class="rd-ipa">'+esc(c.phonetic)+'</p>':'')+'</div><div class="rd-word-buttons"><button class="rd-icon" data-reader="speak" aria-label="朗读 / Listen: '+esc(m.word)+'">'+services.icons.sound+'</button><button class="rd-icon '+(c.favorite?'is-saved':'')+'" data-reader="favorite" aria-label="'+(c.favorite?'取消收藏 / Remove favorite':'收藏 / Favorite')+'" aria-pressed="'+Boolean(c.favorite)+'">'+services.icons.star+'</button></div></div><p class="rd-meaning" data-content-role="headword-gloss" lang="zh-CN">'+esc(m.custom?.meaning||RootLabBilingual.headline(c)||'')+'</p>'+(m.dictionary.summaryEn?'<p class="rd-meaning-en" lang="en">'+esc(m.dictionary.summaryEn)+'</p>':'')+'<div class="lr-word-actions"><button class="rd-text" data-reader="plan">'+(c.planned?'✓ 已加入复习':'＋ 加入复习')+' <small lang="en"> · Review</small></button></div></article>';
 const intro='<section class="rp-stage rp-meaning" id="read-section-meaning" data-reading-stage data-module="meaning" data-stage="meaning" tabindex="-1">'+word+'<div class="rp-media-slot" data-v214-media="primary"></div>'+(early?shortCard(first.modules.find(v=>v.type==='first-example').cards[0],example(c,early)):'')+'</section>';
 const rest=plan.sections.filter(s=>s.id!=='meaning').map(s=>{const nav=s.id==='usage'?'<nav class="rp-section-links" aria-label="用法内容 / Usage contents">'+s.modules.filter(mod=>moduleLabels[mod.type]).map(mod=>{const l=moduleLabels[mod.type];return '<a data-ui-jump href="#module-'+esc(mod.moduleId.replace(':','-'))+'"><span lang="zh-CN">'+l[0]+'</span><small lang="en">'+l[1]+'</small></a>';}).join('')+'</nav>':'';
 return '<section class="rp-stage rp-'+s.id+'" id="read-section-'+s.id+'" data-reading-stage data-module="'+s.id+'" data-stage="'+s.id+'" tabindex="-1"><header class="rp-stage-head" data-authored-done="1"><span class="rp-stage-number" aria-hidden="true">'+String(plan.sections.indexOf(s)+1).padStart(2,'0')+'</span><h2><span lang="zh-CN">'+s.titleZh+'</span><small lang="en">'+s.titleEn+'</small></h2></header>'+nav+(s.id==='usage'?levels(m):'')+s.modules.map(mod=>moduleRender(mod,plan,m,services)).join('')+(s.id==='understanding'?services.sources():'')+'</section>';}).join('');
 const links=m.sources.filter(x=>/^https:\/\//.test(x.url||'')||x.url==='./credits.html');const refs=links.length?'<div class="lr-sources rp-profile-sources">'+links.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label||'来源 / Source')+' ↗</a>').join('')+'</div>':'';
 return intro+'<div class="lr-stream">'+rest+'</div>'+refs+'<aside class="rp-resource-area" data-v214-media="more" aria-label="补充图文 / Optional picture topics"></aside>';
}
window.RootLabReaderComponents={render,prose,example,domid};
})();
'''
p.write_text(s)
p=R/'reader-v215.js';s=p.read_text().replace("'ui-v214'","'ui-v214','ui-v215'").replace('V2.14.1','V2.15').replace('V2.14','V2.15')
s=s.replace("[data-sense-id],.rp-example-record[id],[data-plan-module],[data-module]","[data-sense-id],.rp-example-record[id],[data-reading-card][id],[data-plan-module],[data-module]")
s=s.replace("if(keep)node.querySelector('[data-v214-media=\"'+(keep.dataset.mediaPosition||'more')+'\"]').append(keep);","if(keep)node.querySelector('[data-v214-media=\"'+(keep.dataset.mediaPosition||'more')+'\"]')?.append(keep);")
p.write_text(s)
p=R/'reading-ui-v215.js';s=p.read_text().replace(".lr-word-card[data-module],.lr-stream > [data-module]","[data-reading-stage]").replace("root.querySelector('.lr-word-card')?.after(nav)","root.querySelector('[data-reading-stage][data-module=meaning]')?.after(nav)");p.write_text(s)
p=R/'navigation-v215.js';p.write_text(p.read_text().replace('2.14.1','2.15.0'))
p=R/'index.html';s=p.read_text().replace('2.14.1','2.15.0');names={'reader-v2141.js':'reader-v215.js','navigation-v2141.js':'navigation-v215.js','reader-v214.css':'reader-v215.css','reader-plan-v214.js':'reader-plan-v215.js','reader-components-v214.js':'reader-components-v215.js','reading-ui-v214.js':'reading-ui-v215.js','encyclopedia-v214.js':'encyclopedia-v215.js','bilingual-v213.js':'bilingual-v215.js'}
for a,b in names.items():s=s.replace(a,b)
s=s.replace('<script src="./reader-plan-v215.js"></script>','<script src="./reader-cards-v215.js"></script>\n  <script src="./reader-plan-v215.js"></script>')
s=s.replace('<script src="./bilingual-v215.js"></script>','<script src="./dictionary-corrections-v215.js"></script>\n  <script src="./bilingual-v215.js"></script>')
s=s.replace('<script src="./encyclopedia-v215.js"></script>','<script src="./visual-reviewed-v215.js"></script>\n  <script src="./encyclopedia-v215.js"></script>');p.write_text(s)
p=R/'sw.js';s=p.read_text().replace('v2141-unified','v2150-cards');
for a,b in names.items():s=s.replace(a,b)
s=s.replace("'./reader-v215.css'","'./reader-v215.css','./reader-v214.css'")
s=s.replace("'./reader-plan-v215.js'","'./reader-plan-v215.js','./reader-cards-v215.js','./dictionary-corrections-v215.js','./visual-reviewed-v215.js'")
s=s.replace("url.pathname.includes('/images/visual-v210/')","url.pathname.includes('/images/visual-v210/')||url.pathname.includes('/images/visual-v215/')")
p.write_text(s)
print('SHORT_CARD_PIPELINE_READY')
