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
function buildReadingPlan(m){const sections=[],ledger=[],used=new Map(),modules=[];const early=firstExample(m);
 const add=(section,type,rows=[],scope='word')=>{const ids=rows.flatMap(r=>r.sourceRecordIds||[r.id]).filter(Boolean);const o={moduleId:section+':'+type,type,scope,sourceRecordIds:ids,senseIds:rows.flatMap(r=>r.senseIds||[r.senseId]).filter(Boolean),availability:'ready',presentationLocation:section};modules.push(o);return o;};
 add('meaning','headword');if(m.knownImage)add('meaning','media');if(early)add('meaning','first-example',[early],'sense');
 if(m.plain?.text)add('understanding','plain');if(m.pieces.length)add('understanding','morphology');if(m.paragraphs.length)add('understanding','story');
 if(m.history&&(m.history.summary||m.history.excerpt||m.history.timeline?.length))add('understanding','history');
 if(m.breakdown)add('understanding','definition-breakdown');
 if(m.senses.length)add('usage','senses',m.senses,'sense');if(m.native.length)add('usage','native',m.native,'source-block');
 if(m.phrases.length)add('usage','phrases',m.phrases,'phrase');if(m.usage.length)add('usage','authored-usage');if(m.forms.length)add('usage','forms');
 const rest=m.examples.filter(e=>e!==early);if(rest.length)add('usage','examples',rest,'sense');
 if(m.family?.groups?.some(g=>g.items?.length))add('explore','family');if(m.relations.length)add('explore','relations',m.relations,'sense');if(m.quiz)add('explore','quiz');
 for(const key of Object.keys(titles)){const selected=modules.filter(v=>v.presentationLocation===key);if(selected.length)sections.push({id:key,titleZh:titles[key][0],titleEn:titles[key][1],modules:selected});}
 for(const item of m.inventory){let owner;
  if(item.kind==='senses')owner='usage:senses';else if(item.kind==='native')owner='usage:native';else if(item.kind==='phrases')owner='usage:phrases';else if(item.kind==='relations')owner='explore:relations';
  else if(item.kind==='examples')owner=early?.sourceRecordIds.includes(item.id)?'meaning:first-example':'usage:examples';
  const module=modules.find(v=>v.moduleId===owner);const key=item.kind+'\0'+item.id;
  if(!item.id||(used.has(key)&&used.get(key)!==item.identity)||!module?.sourceRecordIds.includes(item.id))throw Error('Unaccounted reading record: '+m.word+' '+item.kind+' '+item.id);
  const duplicate=used.has(key);used.set(key,item.identity);ledger.push({...item,moduleId:owner,status:duplicate?'merged-exact-duplicate':'rendered'});
 }
 const plan={schema:1,uiVersion:'2.15.0',word:m.word,wordId:m.wordId,lexicalBuildId:m.lexicalBuildId,loaded:m.loaded,sections,earlyExampleId:early?.displayId||null,ledger,
  capabilities:{morphology:!!m.pieces.length,history:!!m.history,plain:!!m.plain,media:m.knownImage,meanings:m.senses.length,examples:m.examples.length,phrases:m.phrases.length,relations:m.relations.length},
  sourceRefs:m.senses.flatMap(s=>s.sourceRefs||[])};
 const cards=typeof window!=='undefined'?window.RootLabReadingCards:require('./reader-cards-v215.js');return cards.attachCards(plan,m);
}
return {buildReadingPlan,firstExample,titles};
});
