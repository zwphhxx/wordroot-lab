/* Root Lab V2.0 — transparent adaptive interval engine (SM-2-inspired, not FSRS).
 * Dates are YYYY-MM-DD in the learner's local calendar. No server account.
 * Keep legacy .step/.due/.last fields intact for compatibility with V1 backups.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.RootLabMemory=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
 'use strict';
 const RATINGS=['again','hard','good','easy'];
 const VALID_DATE=/^\d{4}-\d{2}-\d{2}$/;
 const clamp=(x,min,max)=>Math.min(max,Math.max(min,Number(x)||0));
 const calendarDay=(date)=>{const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return y+'-'+m+'-'+d};
 const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');if(!Number.isFinite(+d))return iso;d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 function normalize(item,day){
  const p=item&&typeof item==='object'&&!Array.isArray(item)?item:{};
  const legacy=clamp(p.step,0,6),repetitions=clamp(p.repetitions===undefined?legacy:p.repetitions,0,999);
  const legacyIntervals=[0,1,3,7,14,30,60];
  const interval=clamp(p.interval===undefined?legacyIntervals[Math.min(legacy,6)]:p.interval,0,3650);
  const due=typeof p.due==='string'&&VALID_DATE.test(p.due)?p.due:day;
  const last=typeof p.last==='string'&&VALID_DATE.test(p.last)?p.last:'';
  return {...p,step:Math.min(repetitions,6),due,last,repetitions,interval,ease:clamp(p.ease===undefined?2.5:p.ease,1.3,3.0),lapses:clamp(p.lapses,0,99999),reviews:clamp(p.reviews,0,999999),correct:clamp(p.correct,0,999999),lastRating:RATINGS.includes(p.lastRating)?p.lastRating:''};
 }
 function grade(item,rating,day){
  if(!RATINGS.includes(rating))throw new Error('Unsupported review rating');
  if(!VALID_DATE.test(day))throw new Error('Review day must be YYYY-MM-DD');
  const p=normalize(item,day),r=p.repetitions,iv=p.interval;let interval,reps=r,ease=p.ease,lapses=p.lapses;
  switch(rating){
   case 'again': reps=0;lapses++;ease=Math.max(1.3,ease-.20);interval=1;break;
   case 'hard': reps=Math.max(1,r);ease=Math.max(1.3,ease-.15);interval=Math.max(1,Math.ceil(iv*1.2));break;
   case 'good': reps=r+1;interval=reps===1?1:reps===2?3:Math.max(4,Math.ceil(Math.max(1,iv)*ease));break;
   case 'easy': reps=r+1;ease=Math.min(3,ease+.15);interval=r===0?3:Math.max(4,Math.ceil(Math.max(1,iv)*ease*1.3));break;
  }
  interval=Math.min(3650,interval);
  return {...p,repetitions:reps,step:Math.min(reps,6),interval,ease:Number(ease.toFixed(2)),lapses,reviews:p.reviews+1,correct:p.correct+(rating==='again'?0:1),lastRating:rating,last:day,due:addDays(day,interval),algorithm:'sm2-inspired-v2'};
 }
 function level(item,day){
  if(!item)return{key:'new',text:'未开始',score:0};
  const p=normalize(item,day);
  if(!p.reviews&&!p.repetitions)return{key:'new',text:'待学习',score:0};
  if(p.repetitions>=4&&p.interval>=21&&p.lastRating!=='again')return{key:'mastered',text:'已掌握',score:3};
  if(p.repetitions>=2&&p.interval>=3)return{key:'growing',text:'巩固中',score:2};
  return{key:'learning',text:'学习中',score:1};
 }
 function activeDays(byDay,endDate,n){
  const results=[];for(let i=n-1;i>=0;i--){
   const date=addDays(endDate,-i),s=byDay?.[date]||{};
   results.push({date,reviewed:Number(s.reviews)||0,remembered:Number(s.correct)||0,mistakes:Number(s.misses)||0,quizzes:Number(s.quizRuns)||0});
  }
  return results;
 }
 function streak(byDay,day){
  let at=day,days=0;
  if(!((byDay?.[at]?.reviews||0)>0)){at=addDays(day,-1)}
  for(let i=0;i<365;i++){if((byDay?.[at]?.reviews||0)<=0)break;days++;at=addDays(at,-1)}
  return days;
 }
 function totals(review,day){
  const counts={new:0,learning:0,growing:0,mastered:0,due:0,total:0};
  for(const v of Object.values(review||{})){
    const item=normalize(v,day),rank=level(item,day);counts[rank.key]++;counts.total++;
    if(item.due<=day)counts.due++;
  }
  return counts;
 }
 return {RATINGS,calendarDay,addDays,normalize,grade,level,activeDays,streak,totals};
});
