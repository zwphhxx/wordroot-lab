/* Deterministic short-card layout. Content records, not pixels, define identities.
 * A bilingual pair/formula is indivisible. Limits group records; they never truncate. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingCards=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
const hash=s=>{let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};
const identity=r=>r.displayId||r.id||JSON.stringify(r);
const ids=r=>r.sourceRecordIds||[r.id].filter(Boolean);
const layout=typeof window!=='undefined'?window.RootLabReadingLayout:require('./reader-layout-v218.js');
const weight=layout.weight;const chunks=(rows,budget=1150)=>layout.pack(rows,budget);
const senseGroups=(rows,word='')=>layout.meaningGroups(rows,word);
function buildCards(mod,m,plan){const cards=[];const add=(type,rows,zh,en,extra={})=>{const sourceRecordIds=rows.flatMap(ids);
 if(type==='senses'&&plan.placements)for(const r of rows){
  const u=plan.placements.bySense[r.id];
  if(u)sourceRecordIds.push(...u.examples.flatMap(ids),...u.phrases.flatMap(ids));
 }
 const keys=rows.map(identity);const c={cardId:'card-'+mod.moduleId.replace(':','-')+'-'+hash(JSON.stringify([keys,extra])),stageId:mod.presentationLocation,moduleId:mod.moduleId,type,keys,sourceRecordIds,titleZh:zh,titleEn:en,...extra};cards.push(c);return c;};
 const pack=(type,rows,zh,en,budget=1100,extra={})=>chunks(rows,budget).forEach((part,i)=>add(type,part,zh,en,{...extra,part:i+1}));
 switch(mod.type){
 case 'headword':add('headword',[],'词义','Meaning');break;
 case 'media':add('media',[],'看图理解','Picture meaning');break;
 case 'first-example':add('first-example',m.examples.filter(e=>e.displayId===plan.earlyExampleId),'先看一句','A first example');break;
 case 'senses':{
  let index=1;
  for(const group of senseGroups(m.displayMeanings,m.word)){
   // Each meaning and all its linked examples are one auditable learning unit.
   // Physical cards have one meaning each; the surrounding semantic topic remains continuous.
   const batches=group.rows.map(row=>[row]);
   for(let i=0;i<batches.length;i++){
    add('senses',batches[i],group.zh,group.en,{group:group.key,visualGroup:'senses:'+group.key,
     groupMethod:group.method,firstInGroup:i===0,startNumber:index,part:i+1});
    index+=batches[i].length;
   }
  }
  break;
 }
 case 'phrases':{
  const semantics=typeof window!=='undefined'?window.RootLabReadingSemantics:require('./reader-semantics-v2171.js');
  const accepted=new Set(plan.placements.loosePhrases.map(identity));
  const groups=semantics.phraseGroups(m);
  for(const g of groups){
   const rows=g.rows.filter(r=>accepted.has(identity(r)));
   const parts=chunks(rows,1250);
   for(let i=0;i<parts.length;i++)add('phrases',parts[i],g.zh,g.en,{
    semanticGroup:g.key,visualGroup:'phrases:'+g.key,groupEvidence:g.links,part:i+1,
    hideTitle:groups.length===1&&g.key==='unassigned'});
  }
  break;
 }
 case 'examples':{
  const accepted=plan.placements.looseExamples,byId=new Map(senseGroups(m.displayMeanings,m.word)
   .flatMap(g=>g.rows.map(x=>[x.id,g]))),buckets=new Map();
  for(const e of accepted){
   const links=[...new Set([e.senseId,...(e.senseIds||[])].filter(Boolean))]
    .map(id=>byId.get(id)).filter(Boolean);
   const g=links.length&&links.every(x=>x.key===links[0].key)?links[0]:
    {key:'unassigned',zh:'其他例句',en:'Other examples'};
   if(!buckets.has(g.key))buckets.set(g.key,{...g,rows:[]});
   buckets.get(g.key).rows.push(e);
  }
  for(const g of buckets.values())pack('examples',g.rows,g.zh,g.en,1100,{visualGroup:'examples:'+g.key});
  break;
 }

 case 'relations':{const groups=new Map();for(const r of m.relations){const k=r.fromSenseId||r.senseId;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}for(const [senseId,rows]of groups)pack('relations',rows,'词义关联','Meaning connections',700,{senseId,visualGroup:'relations:'+senseId});break;}
 case 'family':for(const [i,g]of(m.family?.groups||[]).entries())pack('family',g.items||[],'同根词与词族','Root family',1100,{familyGroup:i,visualGroup:'family:'+i});break;
 case 'story':pack('story',m.paragraphs.map((text,i)=>({id:'story:'+i,text})),'词语来历','Word background',1050);break;
 case 'history':{
  if(m.history?.summary&&!m.paragraphs.some(p=>norm(p)===norm(m.history.summary)))add('history-summary',[{id:'history-summary',text:m.history.summary}],'历史线索','Historical background');
  pack('history-steps',(m.history?.timeline||[]).map((s,i)=>({...s,id:'history-step:'+i})),'词形与词义演变','Word history',1000);
  if(m.history?.excerpt)add('history-excerpt',[{id:'history-excerpt',text:m.history.excerpt}],'词源原文对照','Etymology excerpt');break;}
 case 'plain':{
  add('plain-main',[{id:'plain-main',text:m.plain.text}],'具体理解','Understanding the meaning');
  for(const [i,p]of(m.plain.additional||[]).entries())add('plain-additional',[{id:'plain-additional:'+i,text:p.text}],p.label||'另一种用法','Another use',{additionalIndex:i});break;}
 case 'authored-usage':for(const [i,u]of m.usage.entries())add('authored-usage',[{id:'authored-usage:'+i,text:u.body}],u.title||'用法说明','Usage notes',{usageIndex:i});break;
 case 'morphology':add('morphology',[],'构词拆解','Word formation');break;
 case 'definition-breakdown':add('definition-breakdown',[],'读懂英文定义','Understanding the definition');break;
 case 'forms':add('forms',[],'词形变化','Word forms');break;
 case 'quiz':add('quiz',[],'结合语境判断','Check the context');break;
 }
 for(const card of cards){if(!card.visualGroup)card.visualGroup=card.type+(card.additionalIndex!==undefined?':'+card.additionalIndex:card.usageIndex!==undefined?':'+card.usageIndex:'');card.groupHeadingOnce=true;}
 return cards;
}
function attachCards(plan,m){const next={...plan,sections:plan.sections.map(s=>({...s,modules:s.modules.map(mod=>({...mod,cards:buildCards(mod,m,plan)}))}))};
 const all=next.sections.flatMap(s=>s.modules.flatMap(mod=>mod.cards)),names=new Set();for(const card of all){if(names.has(card.cardId))throw Error('Duplicate card ID: '+card.cardId);names.add(card.cardId);}
 next.cards=all;next.ledger=plan.ledger.map(record=>{const card=all.find(c=>c.moduleId===record.moduleId&&c.sourceRecordIds.includes(record.id));if(!card)throw Error('Record has no reading card: '+record.id);return {...record,cardId:card.cardId};});
 next.uiVersion='2.19.0';next.cardLayoutVersion=2;return next;
}
return {chunks,senseGroups,buildCards,attachCards,identity,weight};
});
