/* Deterministic short-card layout. Content records, not pixels, define identities.
 * A bilingual pair/formula is indivisible. Limits group records; they never truncate. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingCards=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
const hash=s=>{let h=2166136261;for(const c of s){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(36);};
const identity=r=>r.displayId||r.id||JSON.stringify(r);
const ids=r=>r.sourceRecordIds||[r.id].filter(Boolean);
function weight(r){const text=typeof r==='string'?r:[r.en,r.zh,r.definition,r.definitionZh,r.note,r.text,r.term].filter(Boolean).join(' ');return String(text).replace(/[\u3400-\u9fff]/g,'AA').length;}
function chunks(rows,max=3,budget=780){const out=[];let a=[],n=0;for(const row of rows){const w=weight(row);if(a.length&&(a.length>=max||n+w>budget)){out.push(a);a=[];n=0;}a.push(row);n+=w;}if(a.length)out.push(a);return out;}
function senseGroups(rows){
 const editorial=rows.length>=8&&rows.every(s=>s.source==='Editorial');const domains=[['everyday','日常与运输','Everyday & transport',/日常|物流|运输|航空|舰船|车辆|递送|保险/],['technology','通信与技术','Communication & technology',/通信|信号|电子|物理|化学|材料/],['life','生命与医学','Life & medicine',/医学|遗传|生物/]];
 const differentPOS=new Set(rows.map(s=>s.pos)).size>1,groups=new Map();
 for(const s of rows){const d=editorial?domains.find(x=>x[3].test(s.domainZh||'')):null;const key=editorial?(d?.[0]||'other'):differentPOS?(s.pos||'other'):'all';
 const labels=editorial?[d?.[1]||'其他用法',d?.[2]||'Other uses']:({n:['名词用法','Noun uses'],v:['动词用法','Verb uses'],a:['形容词用法','Adjective uses'],r:['副词用法','Adverb uses']}[key]||['词义详解','Meanings in context']);
 if(!groups.has(key))groups.set(key,{key,zh:labels[0],en:labels[1],rows:[]});groups.get(key).rows.push(s);}
 return [...groups.values()];
}
function buildCards(mod,m,plan){const cards=[];const add=(type,rows,zh,en,extra={})=>{const sourceRecordIds=rows.flatMap(ids);const keys=rows.map(identity);const c={cardId:'card-'+mod.moduleId.replace(':','-')+'-'+hash(JSON.stringify([keys,extra])),stageId:mod.presentationLocation,moduleId:mod.moduleId,type,keys,sourceRecordIds,titleZh:zh,titleEn:en,...extra};cards.push(c);return c;};
 const pack=(type,rows,zh,en,max,budget,extra={})=>chunks(rows,max,budget).forEach((part,i)=>add(type,part,zh,en,{...extra,part:i+1}));
 switch(mod.type){
 case 'headword':add('headword',[],'词义','Meaning');break;
 case 'media':add('media',[],'看图理解','Picture meaning');break;
 case 'first-example':add('first-example',m.examples.filter(e=>e.displayId===plan.earlyExampleId),'先看一句','A first example');break;
 case 'senses':{let index=1;for(const group of senseGroups(m.senses)){const parts=chunks(group.rows,3,780);for(let i=0;i<parts.length;i++){add('senses',parts[i],group.zh,group.en,{group:group.key,firstInGroup:i===0,startNumber:index,part:i+1});index+=parts[i].length;}}break;}
 case 'native':pack('native',m.native,'补充释义','Additional source meanings',2,700);break;
 case 'phrases':pack('phrases',m.phrases,'搭配与表达','Expressions',3,680);break;
 case 'examples':pack('examples',m.examples.filter(e=>e.displayId!==plan.earlyExampleId),'例句与应用','Examples in context',2,650);break;
 case 'relations':{const groups=new Map();for(const r of m.relations){const k=r.fromSenseId||r.senseId;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}for(const [senseId,rows]of groups)pack('relations',rows,'词义关联','Meaning connections',2,650,{senseId});break;}
 case 'family':for(const [i,g]of(m.family?.groups||[]).entries())pack('family',g.items||[],'同根词与词族','Root family',4,700,{familyGroup:i});break;
 case 'story':pack('story',m.paragraphs.map((text,i)=>({id:'story:'+i,text})),'词语来历','Word background',1,650);break;
 case 'history':{
  if(m.history?.summary&&!m.paragraphs.some(p=>norm(p)===norm(m.history.summary)))add('history-summary',[{id:'history-summary',text:m.history.summary}],'历史线索','Historical background');
  pack('history-steps',(m.history?.timeline||[]).map((s,i)=>({...s,id:'history-step:'+i})),'词形与词义演变','Word history',2,650);
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
 return cards;
}
function attachCards(plan,m){const next={...plan,sections:plan.sections.map(s=>({...s,modules:s.modules.map(mod=>({...mod,cards:buildCards(mod,m,plan)}))}))};
 const all=next.sections.flatMap(s=>s.modules.flatMap(mod=>mod.cards)),names=new Set();for(const card of all){if(names.has(card.cardId))throw Error('Duplicate card ID: '+card.cardId);names.add(card.cardId);}
 next.cards=all;next.ledger=plan.ledger.map(record=>{const card=all.find(c=>c.moduleId===record.moduleId&&c.sourceRecordIds.includes(record.id));if(!card)throw Error('Record has no reading card: '+record.id);return {...record,cardId:card.cardId};});
 next.uiVersion='2.15.0';next.cardLayoutVersion=1;return next;
}
return {chunks,senseGroups,buildCards,attachCards,identity,weight};
});
