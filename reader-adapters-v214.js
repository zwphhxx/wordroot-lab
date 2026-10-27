/* V2.14 source adapter. No network, storage writes, generated definitions or source mutation.
 * Published lexical records are authoritative; existing editorial additions stay traceable. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingAdapters=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
const list=v=>Array.isArray(v)?v:[];
function merge(word,kind,sources){const map=new Map(),identities=new Map();for(const [origin,rows]of sources)for(const [i,r]of list(rows).entries()){
 if(!r||typeof r!=='object')continue;
 if(origin!=='dictionary'&&['examples','phrases'].includes(kind)&&(!norm(r.en)||!norm(r.zh)))continue;
 let id=r.id||origin+':'+kind+':'+word+':'+i;
 const scope=kind==='relations'?[r.fromSenseId||r.senseId,r.toSenseId||r.targetSenseId,r.label,r.labelEn,r.word]:kind==='phrases'?[r.senseScope||'',r.senseId||'',r.definition||'',r.definitionZh||'',r.meaningDisplay||'']:kind==='examples'?[r.senseId||'',...(r.senseIds||[])]:[];
 const key=JSON.stringify([norm(r.en),norm(r.zh),...scope]);
 if(identities.has(id)&&identities.get(id)!==key)id=origin+':'+kind+':'+word+':'+i;identities.set(id,key);
 if(!map.has(key))map.set(key,{...r,sourceRecordIds:[],origin,displayId:'rp:'+kind+':'+word+':'+id});
 const out=map.get(key);if(!out.sourceRecordIds.includes(id))out.sourceRecordIds.push(id);
 }return [...map.values()];}
function adapt(c,x,extra={}){if(!c||!c.word)throw Error('Reading context needs a word');const d=c.learning||{},basic=d.basic||{},word=c.word;
 const dictionary=x||{word,senses:[],phrases:[],examples:[],relations:[],nativeSourceSummary:{pairs:[]}};
 const examples=merge(word,'examples',[['dictionary',dictionary.examples],['editorial',d.examples]]);
 const phrases=merge(word,'phrases',[['dictionary',dictionary.phrases],['editorial',basic.phrases],['supplement',basic.supplementalPhrases]]);
 const relations=merge(word,'relations',[['dictionary',dictionary.relations]]);
 const custom=extra.custom||null,history=d.history||null;
 const prose=[custom?.lead,...list(custom?.story),c.notes?.story,...(!custom?list(basic.story):[])].filter(v=>typeof v==='string'&&v.trim());
 const seen=new Set();const paragraphs=prose.filter(v=>!seen.has(norm(v))&&seen.add(norm(v)));
 const inventory=[];for(const kind of ['senses','examples','phrases','relations'])for(const [ordinal,row] of list(dictionary[kind]).entries())inventory.push({kind,id:row.id,ordinal,identity:JSON.stringify([row.en,row.zh,row.fromSenseId,row.toSenseId])});
 for(const [ordinal,row] of list(dictionary.nativeSourceSummary?.pairs).entries())inventory.push({kind:'native',id:row.id,ordinal,identity:JSON.stringify([row.en,row.zh])});
 return {schema:1,word,wordId:dictionary.wordId||'en:'+word,lexicalBuildId:extra.buildId||'',context:c,dictionary,loaded:Boolean(x),
  senses:list(dictionary.senses),native:list(dictionary.nativeSourceSummary?.pairs),examples,phrases,relations,
  pieces:list(d.pieces),pieceType:d.pieceType||'',history,paragraphs,plain:extra.plain||null,custom,
  family:d.family||null,forms:list(d.forms),levels:list(d.levels),usage:list(basic.usage),breakdown:basic.definitionBreakdown||null,
  deferredExtras:[...list(d.examples),...list(basic.phrases)].filter(r=>r?.en&&!norm(r.zh)).map(r=>({en:r.en,reason:'awaiting_bilingual_counterpart'})),sources:list(basic.sources),quiz:extra.quiz||null,knownImage:Boolean(extra.knownImage),inventory};
}
return {adapt,merge,norm};
});
