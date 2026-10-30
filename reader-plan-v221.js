/* Pure, deterministic composition: Meaning -> Understanding -> Usage -> Explore.
 * Nothing is hidden to satisfy a count; every adopted record has one auditable home. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingPlan=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const titles={meaning:['词义','Meaning'],understanding:['理解','Understanding'],usage:['用法','Usage'],explore:['拓展','Explore']};
const escapeRE=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function firstExample(m){const forms=new Set([m.word,...m.forms.map(x=>x[1]).filter(v=>typeof v==='string')]);
 const target=new RegExp('(?:^|[^A-Za-z])(?:'+[...forms].map(escapeRE).join('|')+')(?:$|[^A-Za-z])','i');
 const valid=m.examples.filter(e=>e.en&&e.zh&&target.test(e.en));
 return valid.find(e=>/自编|学习例句/.test(e.kind||'')&&!/^开放/.test(e.kind||'')&&!String(e.translation||'').startsWith('machine'))||valid.find(e=>e.translation==='edited')||valid[0]||null;
}
function buildReadingPlan(m){
 const units=typeof window!=='undefined'?window.RootLabReadingUnits:require('./reader-units-v219.js');
 const placements=units.build(m),sections=[],ledger=[],seen=new Map(),modules=[];
 const linkedExamples=m.examples.filter(e=>units.ids(e).some(id=>placements.exampleTarget[id]));
 const linkedPhrases=m.phrases.filter(p=>units.ids(p).some(id=>placements.phraseTarget[id]));
 const add=(section,type,rows=[],scope='word')=>{
  const o={moduleId:section+':'+type,type,scope,sourceRecordIds:rows.flatMap(units.ids),
   senseIds:rows.flatMap(r=>r.senseIds||[r.senseId]).filter(Boolean),availability:'ready',presentationLocation:section};
  modules.push(o);return o;
 };
 add('meaning','headword');if(m.knownImage)add('meaning','media');
 if(m.plain?.text)add('understanding','plain');if(m.pieces.length)add('understanding','morphology');
 if(m.paragraphs.length)add('understanding','story');
 if(m.history&&(m.history.summary||m.history.excerpt||m.history.timeline?.length))add('understanding','history');
 if(m.breakdown)add('understanding','definition-breakdown');
 if(m.displayMeanings.length)add('usage','senses',[...m.displayMeanings,...linkedExamples,...linkedPhrases],'meaning');
 if(m.phrases.length)add('usage','phrases',placements.loosePhrases,'phrase');
 if(m.usage.length)add('usage','authored-usage');if(m.forms.length)add('usage','forms');
 if(m.examples.length)add('usage','examples',placements.looseExamples,'sense');
 if(m.family?.groups?.some(g=>g.items?.length))add('explore','family');
 if(m.relations.length)add('explore','relations',m.relations,'sense');if(m.quiz)add('explore','quiz');
 for(const name of Object.keys(titles)){
  const selected=modules.filter(v=>v.presentationLocation===name);
  if(selected.length)sections.push({id:name,titleZh:titles[name][0],titleEn:titles[name][1],modules:selected});
 }
 for(const item of m.inventory){
  let owner;
  if(['senses','native'].includes(item.kind))owner='usage:senses';
  else if(item.kind==='phrases')owner=placements.phraseTarget[item.id]?'usage:senses':'usage:phrases';
  else if(item.kind==='examples')owner=placements.exampleTarget[item.id]?'usage:senses':'usage:examples';
  else if(item.kind==='relations')owner='explore:relations';
  const mod=modules.find(v=>v.moduleId===owner),k=item.kind+'\0'+item.id;
  if(!item.id||(seen.has(k)&&seen.get(k)!==item.identity)||!mod?.sourceRecordIds.includes(item.id))
   throw Error('Unaccounted learning-unit source: '+m.word+' '+item.kind+' '+item.id);
  const duplicate=seen.has(k);seen.set(k,item.identity);
  const disposition=item.kind==='native'?m.nativeDisposition.find(x=>x.sourceId===item.id):null;
  ledger.push({...item,moduleId:owner,status:disposition?.method|| (duplicate?'merged-exact-duplicate':'rendered'),
   targetMeaningIds:disposition?.targetIds||(placements.exampleTarget[item.id]?[placements.exampleTarget[item.id]]:
   placements.phraseTarget[item.id]?[placements.phraseTarget[item.id]]:[item.id])});
 }
 const plan={schema:1,uiVersion:'2.21.0',word:m.word,wordId:m.wordId,lexicalBuildId:m.lexicalBuildId,
  loaded:m.loaded,sections,placements,earlyExampleId:null,ledger,presentationLayout:'unified-in-place',
  capabilities:{morphology:!!m.pieces.length,history:!!m.history,plain:!!m.plain,media:m.knownImage,
   meanings:m.displayMeanings.length,examples:m.examples.length,phrases:m.phrases.length,relations:m.relations.length},
  sourceRefs:m.senses.flatMap(s=>s.sourceRefs||[])};
 const cards=typeof window!=='undefined'?window.RootLabReadingCards:require('./reader-cards-v221.js');
 return cards.attachCards(plan,m);
}

return {buildReadingPlan,firstExample,titles};
});
