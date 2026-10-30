/* V2.20 presentation inventory. The published lexical model is immutable.
 * A record has exactly one full-text home; source gloss aggregates are provenance,
 * not extra numbered meanings when source-specific meanings already exist. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabUnified=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
const identity=r=>r.displayId||r.id;
const overview=()=>typeof window!=='undefined'?window.RootLabReadingOverview:require('./reader-overview-v221.js');
function build(m,p){
 const original=m.displayMeanings||[],unique=new Map(),place=p.placements?.bySense||{};
 for(const r of original){const id=identity(r),old=unique.get(id);if(!old){unique.set(id,r);continue;}
  if(norm(old.en)!==norm(r.en)||norm(old.zh)!==norm(r.zh)||old.pos!==r.pos)throw Error('Conflicting source identity '+id);
  unique.set(id,{...old,sourceRecordIds:[...new Set([...(old.sourceRecordIds||[]),...(r.sourceRecordIds||[])])],nativeSourceIds:[...new Set([...(old.nativeSourceIds||[]),...(r.nativeSourceIds||[])])]});
 }
 const all=[...unique.values()];
 let rows=all.filter(s=>s.displayKind!=='source-meaning'||s.displayReview||s.editorialRevision||place[s.id]?.examples?.length||place[s.id]?.phrases?.length);
 if(!rows.length)rows=all.slice();
 const selected=new Set(rows.map(identity)),sourceRows=all.filter(s=>!selected.has(identity(s)));
 const order=new Map((p.cards||[]).filter(c=>c.type==='senses').flatMap(c=>c.keys).map((id,i)=>[id,i]));
 rows=rows.slice().sort((a,b)=>(order.get(identity(a))??1e6)-(order.get(identity(b))??1e6));
 const preview=overview().build({...m,displayMeanings:rows},p,5);
 const notes=typeof window!=='undefined'?window.RootLabLearningNotes:require('./learning-notes-v221.js');
 const priority=(notes?.get(m.word)?.priority||[]).filter(id=>rows.some(s=>s.id===id&&notes.label(m.word,s)));
 const mainIds=priority.length?priority.slice(0,5):preview.items.map(i=>i.id);if(!mainIds.length&&rows.length)mainIds.push(identity(rows[0]));
 const ranks=new Map(mainIds.map((id,i)=>[id,i]));rows=rows.slice().sort((a,b)=>(ranks.get(identity(a))??999)-(ranks.get(identity(b))??999));
 const home=new Map();for(const row of rows){home.set(identity(row),'meaning');for(const r of [...(place[row.id]?.examples||[]),...(place[row.id]?.phrases||[])])home.set(identity(r),'meaning');}
 return {rows,sourceRows,preview,mainIds,firstId:mainIds[0]||'',home,exactDuplicateCount:original.length-all.length};
}
const reviewedReasonExamples={
 'example:reason:75dbb1fadead9a79a3':['the reason that war was declared','宣战的原因'],
 'example:reason:b02fc9be55d29fc5fa':['the reason a steady state was never reached was that the back pressure built up too slowly','始终未能达到稳定状态，是因为背压上升得太慢。'],
 'example:reason:81932ba8930c44975a':['he had to rely less on reason than on rousing their emotions','他需要更多地激发他们的情绪，而不是依赖理性说服。'],
 'example:reason:937959d7529a20a971':['We reasoned that it was cheaper to rent than to buy a house','我们分析后认为，租房比买房更省钱。'],
 'example:reason:af6940381c17aea8fb':['The children must learn to reason','孩子们必须学会理性思考。']
};
function example(word,r){if(word!=='reason')return r;const match=(r.sourceRecordIds||[r.id]).map(id=>reviewedReasonExamples[id]).find(v=>v&&norm(v[0])===norm(r.en));return match?{...r,zh:match[1],translation:'edited'}:r;}
function relation(r){const kind=norm(r.labelEn).toLowerCase();if(kind.includes('specific'))return {zh:'更具体的含义',en:'More specific meaning',direction:'narrower'};if(kind.includes('broad')||kind.includes('general'))return{zh:'更宽泛的含义',en:'Broader meaning',direction:'broader'};if(kind.includes('opposite')||kind.includes('antonym'))return{zh:'反义关系',en:'Opposite meaning',direction:'opposite'};if(kind.includes('synonym')||kind.includes('same meaning'))return{zh:'同义关系',en:'Same sense',direction:'same'};return{zh:r.label||'词义关系',en:r.labelEn||'Lexical relation',direction:'related'};}
const formOrder=['0','s','p','d','i','3','r','t'];
function forms(m){const rows=[['0',m.word],...(m.forms||[]).filter(([k,v])=>v&&String(k)!=='0')];return rows.map(([k,v])=>[String(k),v]).sort((a,b)=>{const x=formOrder.indexOf(a[0]),y=formOrder.indexOf(b[0]);return(x<0?99:x)-(y<0?99:y)}).filter((r,i,a)=>a.findIndex(v=>v[0]===r[0]&&v[1]===r[1])===i);}
return {build,example,relation,forms,identity,norm};
});