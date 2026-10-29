/* V2.19: one sense is one learning unit. Source identifiers are immutable.
 * Examples only attach through one exact source sense; phrases only through
 * an existing explicit or reviewed headword-sense link. No inferred matches. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingUnits=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
const ids=r=>r.sourceRecordIds||[r.id].filter(Boolean);
const key=r=>r.displayId||r.id;
const snippet=(s,limit=34)=>{const x=norm(s);if(x.length<=limit)return x;let cut=x.slice(0,limit);const stop=Math.max(cut.lastIndexOf('；'),cut.lastIndexOf('。'),cut.lastIndexOf(';'));if(stop>=8)cut=cut.slice(0,stop);return cut+'…';};
function label(s){return {zh:snippet(s.labelZh&&s.labelZh.length<=26?s.labelZh:s.zh,25),en:snippet(s.labelEn&&s.labelEn.length<=50?s.labelEn:s.en,42)};}
function build(m){const meanings=new Set((m.displayMeanings||[]).map(x=>x.id)),bySense=Object.create(null),exampleTarget=Object.create(null),phraseTarget=Object.create(null),looseExamples=[],loosePhrases=[];
for(const s of m.displayMeanings||[])bySense[s.id]={examples:[],phrases:[]};
for(const e of m.examples||[]){
 const linked=[...new Set([e.senseId,...(e.senseIds||[])].filter(Boolean))],target=linked.length===1&&meanings.has(linked[0])?linked[0]:null;
 if(target){bySense[target].examples.push(e);for(const id of ids(e))exampleTarget[id]=target;}else looseExamples.push(e);
}
const semantics=typeof window!=='undefined'?window.RootLabReadingSemantics:require('./reader-semantics-v2171.js');
const accepted=new Set(['reviewed-meaning','explicit-headword-sense','linked-reviewed-domain']);
const grouped=semantics.phraseGroups(m),targetByKey=new Map();
for(const g of grouped){if(!accepted.has(g.method))continue;for(const link of g.links||[]){
 if(link.targetIds?.length!==1||!meanings.has(link.targetIds[0]))continue;
 targetByKey.set(link.phraseId,link.targetIds[0]);
}}
for(const p of m.phrases||[]){
 const target=targetByKey.get(p.id)||targetByKey.get(p.displayId)||null;
 if(target){bySense[target].phrases.push(p);for(const id of ids(p))phraseTarget[id]=target;}else loosePhrases.push(p);
}
return {bySense,exampleTarget,phraseTarget,looseExamples,loosePhrases,
 linkedExampleCount:(m.examples||[]).length-looseExamples.length,linkedPhraseCount:(m.phrases||[]).length-loosePhrases.length};
}
function estimatedWeight(s,u){const base=[s.en,s.zh,s.noteEn,s.noteZh].map(norm).join(' ');const extra=[...(u?.examples||[]),...(u?.phrases||[])].map(x=>[x.en,x.zh,x.definition,x.definitionZh].map(norm).join(' ')).join(' ');
 return (base+' '+extra).replace(/[\u3400-\u9fff]/g,'AA').length+100;
}
function inWord(sentence,word){const escaped=String(word||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(!escaped)return false;return new RegExp('(?:^|[^a-z])'+escaped+'(?:s|es|ed|ing)?(?=$|[^a-z])','i').test(String(sentence||''));}
return {build,ids,key,label,snippet,estimatedWeight,inWord};
});
