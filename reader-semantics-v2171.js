/* V2.17: semantic presentation over immutable source records.
 * Merge only exact bilingual equivalents, fully covered reviewed alignments, or
 * explicit guarded editorial mappings. Unknown overlaps remain visible in meanings.
 * No online generation, model calls, source mutation or study-state writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingSemantics=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const list=x=>Array.isArray(x)?x:[];
const revision='meaning-layout-v217-1';
const references={bank:'https://dictionary.cambridge.org/dictionary/english/bank',embankment:'https://www.oxfordlearnersdictionaries.com/definition/english/embankment',local:'published:stable-sense-identifiers-and-reviewed-bilingual-pairs'};
function sourcePOS(p){const k=String(p.zh||p.sourceText||'').match(/^(n|v|vt|vi|a|adj|adv|r|prep|pron|conj)\./i)?.[1]?.toLowerCase();return({vt:'v',vi:'v',adj:'a',adv:'r'})[k]||k||'';}
function plainZh(s){return norm(s).replace(/^(?:n|v|vt|vi|a|adj|adv|r|prep|pron|conj)\.\s*/i,'');}
function comparable(s){return norm(s).replace(/[。.!]+$/,'').toLowerCase();}
function plainEn(s){return norm(s).replace(/^(?:noun|verb|transitive verb|intransitive verb|adjective|adverb|preposition|pronoun|conjunction):\s*/i,'');}
function rawRow(p,extra={}){return {...p,id:p.id,displayId:p.id,displayKind:'source-meaning',sourceRecordIds:[p.id],nativeSourceIds:[p.id],pos:sourcePOS(p),...extra};}
function reviewedNative(word,p,rows){
 const exists=id=>rows.some(s=>s.id===id),prefix='editorial:carrier:carrier-';
 if(word==='carrier'&&p.sourceText==='n. 运送者, 邮递员, 带菌者'&&p.en==='noun: a person or thing that carries something; a mail carrier; a carrier of a pathogen.'){
  const targets=['person','vehicle','post','infection'].map(k=>prefix+k);if(targets.every(exists))return {method:'reviewed-coverage',targets,evidence:references.local,segments:['运送者','邮递员','带菌者'],added:[]};
 }
 if(word==='carrier'&&p.sourceText==='[计] 载波'&&p.en==='computing: a carrier wave.'&&exists(prefix+'wave'))return {method:'reviewed-coverage',targets:[prefix+'wave'],evidence:references.local,segments:['载波'],added:[]};
 if(word==='bank'&&p.sourceText==='n. 银行, 堤, 岸'&&p.en==='noun: a bank or banking institution; an embankment; a bank or shore beside water.'){
  const targets=['wn30:bank%1:14:00::','wn30:bank%1:17:01::'];if(targets.every(exists)){
   const id=p.id+':embankment';return {method:'reviewed-split-and-merge',targets:[...targets,id],segments:['银行','堤','岸'],evidence:[references.bank,references.embankment],added:[rawRow(p,{id,displayId:id,pos:'n',labelZh:'堤；堤岸',labelEn:'embankment',zh:'沿水体等筑起或形成的隆起地带。',en:'An embankment or raised strip of ground, often alongside water.',translation:'edited',displayReview:'assistant_linguistic_review',sourceRefs:[...list(p.sourceRefs),{source:'Editorial explanation',url:references.embankment}]})]};
  }
 }
 if(word==='bank'&&p.sourceText==='[医] 库'&&p.en==='medicine: a bank or repository for stored material, such as a blood bank.'){
  return {method:'reviewed-expanded-meaning',targets:[p.id],segments:['库'],evidence:references.bank,added:[rawRow(p,{pos:'n',labelZh:'储存库；储存机构',labelEn:'storage facility',zh:'收集并保存特定材料、供以后使用的库或机构，如血库、眼库。',en:'A facility that collects and keeps material for later use, such as donated blood or corneas.',translation:'edited',displayReview:'assistant_linguistic_review',sourceRefs:[...list(p.sourceRefs),{source:'Editorial explanation',url:references.bank}]})]};
 }
 return null;
}
function alignedNative(p,rows){
 if(p.reviewStatus!=='editorial'||/\[[^\]]+\]/.test(p.zh||''))return null;
 const segments=list(p.segmentAlignment),parts=plainZh(p.zh).split(/[,，;；]/).map(norm).filter(Boolean);
 if(!segments.length||parts.length!==segments.length||!parts.every((t,i)=>t===norm(segments[i].zh)))return null;
 const targets=[];for(const segment of segments){const matches=rows.filter(s=>(!sourcePOS(p)||s.pos===sourcePOS(p))&&list(s.sourceRefs).some(r=>list(segment.sourceSynsetIds).includes(r.synsetId))&&norm(s.en)===norm(segment.originalSourceEn||segment.en));if(matches.length!==1)return null;targets.push(matches[0].id);}
 return {method:'reviewed-segment-alignment',targets:[...new Set(targets)],segments:parts,evidence:references.local,added:[]};
}
function exactNative(p,rows){
 if(!sourcePOS(p)||/\[[^\]]+\]/.test(p.zh||''))return null;
 const matches=rows.filter(s=>s.pos===sourcePOS(p)&&comparable(s.zh)===comparable(plainZh(p.zh))&&comparable(s.en)===comparable(plainEn(p.en)));
 return matches.length===1?{method:'exact-bilingual-equivalence',targets:[matches[0].id],evidence:'exact bilingual text and part of speech',added:[]}:null;
}
function integrate(m){
 const meanings=m.senses.map(s=>({...s,displayId:s.id,displayKind:'sense',sourceRecordIds:[s.id],nativeSourceIds:[]})),dispositions=[];
 for(const p of m.native){let decision=reviewedNative(m.word,p,meanings)||alignedNative(p,meanings)||exactNative(p,meanings);
  if(!decision){meanings.push(rawRow(p));decision={method:'retained-unresolved',targets:[p.id],evidence:'No proven duplicate; full bilingual source text is retained.',added:[]};}
  else {meanings.push(...decision.added);for(const id of decision.targets){const row=meanings.find(s=>s.id===id);if(!row)throw Error('Invalid reviewed meaning target '+id);if(!row.sourceRecordIds.includes(p.id))row.sourceRecordIds.push(p.id);if(!row.nativeSourceIds.includes(p.id))row.nativeSourceIds.push(p.id);}}
  dispositions.push({sourceId:p.id,original:{en:p.en,zh:p.zh,sourceText:p.sourceText},method:decision.method,targetIds:decision.targets,segments:decision.segments||[],evidence:decision.evidence,revision});
 }
 // Keep parts of speech together without using a dictionary source as a separate section.
 const order=[...new Set(meanings.map(s=>s.pos||'other'))],displayMeanings=order.flatMap(pos=>meanings.filter(s=>(s.pos||'other')===pos));
 return {...m,displayMeanings,nativeDisposition:dispositions,semanticRevision:revision};
}
const bankPhrases={
 'state bank':{en:'a bank chartered by a state rather than by the federal government',key:'finance',zh:'金融与银行业务',titleEn:'Banking & finance',target:'wn30:bank%1:14:00::'},
 'bank line':{en:'the maximum credit that a customer is allowed',key:'finance',zh:'金融与银行业务',titleEn:'Banking & finance',target:'wn30:bank%1:14:00::'},
 'bank rate':{en:'the discount rate fixed by a central bank',key:'finance',zh:'金融与银行业务',titleEn:'Banking & finance',target:'wn30:bank%1:14:00::'},
 'eye bank':{en:'a place for storing and preserving corneas that are obtained from human corpses immediately after death; used for corneal transplantation to patients with corneal defects',key:'storage',zh:'储存机构',titleEn:'Storage facilities',target:'native:bank:c5a6460c9ec19d0b18'}
};
const linkedDomains={
 '运输工具':['transport','运输与运载工具','Transport & vehicles'],'舰船':['transport','运输与运载工具','Transport & vehicles'],
 '递送工作':['daily','递送与日常','Delivery & everyday use'],'英式日常用语':['daily','递送与日常','Delivery & everyday use'],
 '通信服务':['communication','通信与信号','Communication & signals'],'电子通信':['communication','通信与信号','Communication & signals']
};
function phraseGroups(m){const groups=new Map();
 for(const p of m.phrases){let group;const rule=m.word==='bank'?bankPhrases[norm(p.en).toLowerCase()]:null;
  if(rule&&norm(p.definition||p.definitionPair?.en)===rule.en&&(m.displayMeanings||m.senses).some(s=>s.id===rule.target))group={key:rule.key,zh:rule.zh,en:rule.titleEn,method:'reviewed-meaning',targetIds:[rule.target]};
  if(!group){const ids=[...new Set([p.headwordSenseId,...list(p.headwordSenseIds),...(p.senseScope==='headword'?[p.senseId,...list(p.senseIds)]:[])].filter(Boolean))];const linked=ids.map(id=>m.senses.find(s=>s.id===id)).filter(Boolean);
   if(linked.length===1){const s=linked[0],d=s.source==='Editorial'?linkedDomains[s.domainZh]:null;group=d?{key:'domain:'+d[0],zh:d[1],en:d[2],method:'linked-reviewed-domain',targetIds:ids}:{key:'sense:'+s.id,zh:s.labelZh||s.domainZh||'同一用法',en:s.labelEn||s.domainEn||'Same usage',method:'explicit-headword-sense',targetIds:ids};}
  }
  group=group||{key:'unassigned',zh:'常见搭配',en:'Common expressions',method:'unassigned-no-inference',targetIds:[]};
  if(!groups.has(group.key))groups.set(group.key,{...group,rows:[],links:[]});const g=groups.get(group.key);g.rows.push(p);g.links.push({phraseId:p.id||p.displayId,method:group.method,targetIds:group.targetIds});
 }
 return [...groups.values()];
}
function displayWeight(row){const unique=[...new Set([row.en,row.zh,row.definitionPair?.en||row.definition,row.definitionPair?.zh||row.definitionZh].map(norm).filter(Boolean))];return unique.join(' ').replace(/[\u3400-\u9fff]/g,'AA').length+70;}
function expressionChunks(rows,budget=1250){if(!rows.length)return [];const total=rows.reduce((s,r)=>s+displayWeight(r),0);if(total<=budget)return [rows];
 const out=[];let part=[],sum=0;for(const r of rows){const w=displayWeight(r);if(part.length&&sum+w>budget){out.push(part);part=[];sum=0;}part.push(r);sum+=w;}if(part.length)out.push(part);
 // Do not strand a short fourth item merely because the preceding card hit a count.
 if(out.length>1&&out.at(-1).length===1){const last=out.at(-1),prev=out.at(-2);if(prev.length>2){last.unshift(prev.pop());}else if([...prev,...last].reduce((s,r)=>s+displayWeight(r),0)<=budget*1.2){out.splice(-2,2,[...prev,...last]);}}
 return out;
}
return {integrate,phraseGroups,expressionChunks,displayWeight,revision,references,sourcePOS};
});
