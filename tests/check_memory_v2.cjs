// Regression tests for V2.0 adaptive scheduling, pure JS with no browser deps.
'use strict';
const assert=require('node:assert/strict');
const MEM=require('../memory-engine-v2.js');
let passed=0;function check(label,fn){fn();passed++;console.log('PASS '+label);}
const today='2026-10-25';
check('calendar math crosses months',()=>{assert.equal(MEM.addDays('2026-10-31',1),'2026-11-01');assert.equal(MEM.addDays('2026-03-01',-1),'2026-02-28');});
check('V1 due dates and steps migrate without loss',()=>{
 const p=MEM.normalize({step:3,due:'2026-11-04',last:'2026-10-20'},today);
 assert.equal(p.due,'2026-11-04');assert.equal(p.interval,7);assert.equal(p.repetitions,3);assert.equal(p.ease,2.5);
});
check('new word good rating schedules one day',()=>{
 const p=MEM.grade({due:today,step:0},'good',today);
 assert.equal(p.due,'2026-10-26');assert.equal(p.repetitions,1);assert.equal(p.correct,1);
});
check('multiple good ratings expand intervals',()=>{
 let p=MEM.normalize({due:today},today);
 for(let i=0;i<3;i++)p=MEM.grade(p,'good',today);
 assert.equal(p.interval,8);assert.equal(p.reviews,3);
});
check('hard does not schedule longer than good on same record',()=>{
 const rec={step:3,repetitions:3,interval:8,ease:2.4,due:today};
 const a=MEM.grade(rec,'hard',today),b=MEM.grade(rec,'good',today);
 assert.ok(a.interval<b.interval);assert.ok(a.ease<b.ease);
});
check('easy schedules longer than good',()=>{
 const rec={step:3,repetitions:3,interval:7,ease:2.5,due:today};
 assert.ok(MEM.grade(rec,'easy',today).interval>MEM.grade(rec,'good',today).interval);
});
check('again resets repetition but preserves lapse history',()=>{
 const p=MEM.grade({step:4,repetitions:4,interval:20,ease:2.1,lapses:2,due:today},'again',today);
 assert.equal(p.repetitions,0);assert.equal(p.lapses,3);assert.equal(p.due,'2026-10-26');
});
check('ease remains within guardrails',()=>{
 let p={due:today,step:0};
 for(let i=0;i<40;i++)p=MEM.grade(p,'again',today);
 assert.equal(p.ease,1.3);
 for(let i=0;i<40;i++)p=MEM.grade(p,'easy',today);
 assert.equal(p.ease,3);
});
check('mastery stages and counts',()=>{
 let p=MEM.normalize({due:today},today),rank=MEM.level(p,today);
 assert.equal(rank.key,'new');
 for(let i=0;i<5;i++)p=MEM.grade(p,'good',today);
 assert.equal(MEM.level(p,today).key,'mastered');
 const total=MEM.totals({success:p,miss:{step:1,due:'2026-10-20'}},today);
 assert.equal(total.total,2);assert.equal(total.mastered,1);assert.equal(total.due,1);
});
check('streak handles today and yesterday',()=>{
 const hist={'2026-10-22':{reviews:1},'2026-10-23':{reviews:3},'2026-10-24':{reviews:1}};
 assert.equal(MEM.streak(hist,today),3);
 hist[today]={reviews:2};assert.equal(MEM.streak(hist,today),4);
});
check('14 day chart retains zeros and readings',()=>{
 const days=MEM.activeDays({'2026-10-25':{reviews:5,correct:3}},today,14);
 assert.equal(days.length,14);assert.equal(days.at(-1).reviewed,5);assert.equal(days[0].reviewed,0);
});
console.log('ALL '+passed+' ENGINE TESTS PASSED');
