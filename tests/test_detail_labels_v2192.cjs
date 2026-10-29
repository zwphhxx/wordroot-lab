const assert=require('node:assert/strict');
const O=require('../reader-overview-v2192.js');
const test=(name,fn)=>{fn();console.log('PASS',name)};
const senses=[
 {id:'r1',displayId:'r1',pos:'n',zh:'信仰或行动的合理动机',en:'a rational motive for a belief or action',displayKind:'sense'},
 {id:'r2',displayId:'r2',pos:'n',zh:'解释造成某些现象的原因',en:'an explanation of the cause of some phenomenon',displayKind:'sense'},
 {id:'r3',displayId:'r3',pos:'n',zh:'理性思考或推理的能力',en:'the capacity for rational thought or inference',displayKind:'sense'},
 {id:'r4',displayId:'r4',pos:'n',zh:'理智和正确判断的状态',en:'the state of having good sense and judgment',displayKind:'sense'},
 {id:'r5',displayId:'r5',pos:'v',zh:'通过推理作出决定',en:'decide by reasoning',displayKind:'sense'},
 {id:'native-r',displayId:'native-r',pos:'n',zh:'n. 理由, 原因, 理性',en:'native word list',displayKind:'source-meaning'}
];
const plan={sections:[{modules:[{type:'senses',cards:senses.map((s,i)=>({group:'abstract-'+i,titleZh:['名词·动机与目的','名词·表达与交流','名词·思维与知识','名词·状态','动词用法','名词用法'][i],keys:[s.id]}))}]}]};
const m={word:'reason',displayMeanings:senses};
test('Overview cards contain real Chinese meanings, not lexicographer categories',()=>{
 const out=O.build(m,plan);assert.equal(out.items.length,5);assert.equal(out.total,6);
 assert.equal(out.items[0].zh,'信仰或行动的合理动机');assert.equal(out.items[1].zh,'解释造成某些现象的原因');
 assert(!out.items.some(s=>s.zh.includes('名词用法')||s.zh.includes('动机与目的')||s.zh.includes('表达与交流')));
});
test('Include verb meaning before less useful dictionary-source summary',()=>{
 const out=O.build(m,plan);assert(out.items.some(s=>s.id==='r5'));assert(!out.items.some(s=>s.id==='native-r'));
});
test('Every preview links to an original sense id',()=>{assert(O.build(m,plan).items.every(x=>senses.some(y=>y.id===x.id&&y.displayKind!=='source-meaning')))});
test('No original meaning changes',()=>{const before=JSON.stringify(m);O.build(m,plan);assert.equal(JSON.stringify(m),before)});
test('A single class with distinct senses still shows individual explanations',()=>{
 const x={displayMeanings:senses.slice(0,3)};const p={sections:[{modules:[{type:'senses',cards:senses.slice(0,3).map(s=>({group:'same-group',keys:[s.id]}))}]}]};
 assert.equal(O.build(x,p).items.length,3);
});
test('Fallback native gloss is readable when no source senses exist',()=>{
 const row={displayKind:'source-meaning',id:'native-only',zh:'n. 一种特定物品',en:'a particular object',pos:'n'};
 assert.equal(O.build({displayMeanings:[row,row]},{sections:[]}).items[0].zh,'一种特定物品');
});
test('Source excerpt is shortened only in overview, without changing full data',()=>{
 const row={id:'long',zh:'一种特别长的原始中文定义，涵盖不同的用途和适用条件。'.repeat(4),en:'a detailed original meaning '.repeat(20)};
 const out=O.build({displayMeanings:[row,row,{...row,id:'long2'}]},{sections:[]});
 assert(out.items[0].zh.length<row.zh.length);assert(out.items[0].fullZh.length===row.zh.length);
});
test('Exact-ID-and-English reviewed reason labels have source guards',()=>{
 const sense={id:'wn30:reason%1:16:00::',pos:'n',zh:'信仰或行动的合理动机',en:'a rational motive for a belief or action'};
 const plan={sections:[{modules:[{type:'senses',cards:[{keys:[sense.id],group:'reason-group'}]}]}]};
 const reviewed=O.build({word:'reason',displayMeanings:[sense,{id:'n2',zh:'额外词义',en:'another sense'}]},plan).items.find(x=>x.id===sense.id);
 assert.equal(reviewed.zh,'理由；动机');assert(reviewed.noteZh.includes('合理根据'));
 const changed=O.build({word:'reason',displayMeanings:[{...sense,en:'source text changed'},{id:'n2',zh:'额外词义',en:'another sense'}]},plan).items.find(x=>x.id===sense.id);
 assert.equal(changed.zh,'信仰或行动的合理动机');assert.equal(changed.noteZh,'');
});
test('One source meaning plus unmerged native gloss still shows two actual meanings',()=>{
 const a={id:'s',displayKind:'sense',zh:'第一种释义',en:'first meaning'};
 const b={id:'n',displayKind:'source-meaning',pos:'n',zh:'n. 第二种释义',en:'second meaning'};
 const p={sections:[{modules:[{type:'senses',cards:[{keys:['s'],group:'g1'},{keys:['n'],group:'g2'}]}]}]};
 const result=O.build({word:'example',displayMeanings:[a,b]},p);
 assert(result.show);assert.deepEqual(result.items.map(x=>x.zh),['第一种释义','第二种释义']);
});
test('Detail labels use the same exact source-guarded meaning and unchanged original',()=>{
 const s={id:'wn30:reason%1:16:00::',pos:'n',zh:'信仰或行动的合理动机',en:'a rational motive for a belief or action'};
 const d=O.describe(s,'reason');assert.equal(d.zh,'理由；动机');assert.equal(d.originalZh,s.zh);assert.equal(d.noteZh,'某种行动或观点背后的合理根据');assert.equal(d.en,s.en);
 const changed=O.describe({...s,en:'different source english'},'reason');assert.equal(changed.zh,s.zh);assert.equal(changed.noteZh,'');
});
console.log('SUMMARY 10 / 10');