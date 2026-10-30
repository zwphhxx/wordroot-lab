/* V2.19.2: unified overview and detail displays source-backed meanings, never WordNet topic labels.
 * Every preview points to one exact, existing sense. No generated paraphrases. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingOverview=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
const cleanZh=x=>norm(x).replace(/^(?:n|v|vt|vi|a|adj|adv|r|prep|pron|conj)\.\s*/i,'');
const identity=r=>r?.displayId||r?.id||'';
const posKey=s=>({vt:'v',vi:'v',adj:'a',adv:'r'})[s?.pos]||s?.pos||'other';
const labels={n:['名词','Noun'],v:['动词','Verb'],a:['形容词','Adjective'],r:['副词','Adverb']};
// Small, source-checked editorial labels for the screenshot's actual headword.
// Match both immutable sense ID and exact English meaning; never alter source data.
const reviewedReason={
 'wn30:reason%1:16:00::':['a rational motive for a belief or action','理由；动机','某种行动或观点背后的合理根据'],
 'wn30:reason%1:10:01::':['an explanation of the cause of some phenomenon','原因；缘由的解释','说明一件事情为什么会发生'],
 'wn30:reason%1:09:00::':['the capacity for rational thought or inference or discrimination','理性思考与辨别能力','能够合理思考、推理和区分事物'],
 'wn30:reason%2:31:01::':['decide by reasoning; draw or come to a conclusion','推理；得出结论','通过逻辑思考作出判断'],
 'wn30:reason%1:26:00::':['the state of having good sense and sound judgment','理智；良好的判断力','有理智、能够作出明智判断']
};
const compact=(text,max)=>{const full=norm(text);if(full.length<=max)return full;
 let cut=full.slice(0,max);
 const stop=Math.max(cut.lastIndexOf('；'),cut.lastIndexOf('。'),cut.lastIndexOf(';'));
 if(stop>=max*0.55)cut=cut.slice(0,stop);
 return cut.trimEnd()+'…';
};
function describe(s,word){
 const notes=typeof window!=='undefined'?window.RootLabLearningNotes:require('./learning-notes-v221.js');
 const corrected=notes?.label(word,s);if(corrected){const category=labels[posKey(s)]||['词义','Meaning'];return {id:identity(s),zh:corrected.zh,noteZh:corrected.noteZh,originalZh:cleanZh(s.zh),en:norm(s.en),posZh:category[0],posEn:category[1],isReviewed:true};}
 const reviewed=word==='reason'?reviewedReason[s.id]:null;
 const match=reviewed&&norm(s.en)===reviewed[0]?reviewed:null;
 const category=labels[posKey(s)]||['词义','Meaning'];
 return {id:identity(s),zh:match?match[1]:cleanZh(s.source==='Editorial'&&norm(s.labelZh)?s.labelZh:s.zh),
  originalZh:cleanZh(s.zh),noteZh:match?match[2]:'',en:norm(s.en),posZh:category[0],posEn:category[1],isReviewed:!!match};
}
function build(m,plan,limit=5){
 const meanings=Array.isArray(m?.displayMeanings)?m.displayMeanings:[];
 const real=meanings.filter(s=>s&&s.displayKind!=='source-meaning');
 const eligible=real.length?real:meanings;
 const max=Math.max(0,Math.min(8,Number(limit)||5));
 const senseModule=(plan?.sections||[]).flatMap(section=>section.modules||[]).find(x=>x.type==='senses');
 const keysToGroup=new Map();
 for(const card of senseModule?.cards||[])for(const key of card.keys||[])keysToGroup.set(key,card.group||'');
 const groupOf=s=>keysToGroup.get(identity(s))||'individual:'+identity(s);
 const selected=[],usedIds=new Set(),usedGroups=new Set(),usedPos=new Set();
 const add=s=>{const id=identity(s);if(!id||usedIds.has(id)||selected.length>=max)return false;
  const description=describe(s,m.word);
  if(!description.zh)return false;
  usedIds.add(id);usedGroups.add(groupOf(s));usedPos.add(posKey(s));
  selected.push({id,zh:compact(description.zh,50),en:compact(description.en,115),noteZh:description.noteZh,
   fullZh:description.originalZh,posZh:description.posZh,posEn:description.posEn});
  return true;
 };
 // First: source-ordered representative meanings from distinct source-backed groups.
 for(const sense of eligible){if(selected.length>=Math.min(3,max))break;if(!usedGroups.has(groupOf(sense)))add(sense);}
 // Also represent a verb/adjective when a word has multiple parts of speech.
 for(const sense of eligible){if(selected.length>=max)break;if(!usedPos.has(posKey(sense))&&!usedGroups.has(groupOf(sense)))add(sense);}
 // Fill remaining places with genuinely different meanings, not translated taxonomy labels.
 for(const sense of eligible){if(selected.length>=max)break;if(!usedGroups.has(groupOf(sense)))add(sense);}
 // For words with only one source category, show distinct specific definitions.
 if(selected.length<Math.min(3,max))for(const sense of eligible){if(selected.length>=Math.min(3,max))break;add(sense);}
 // Some entries have one sourced meaning plus distinct, unresolved native glosses.
 // Show at least two real records when two exist; never fabricate another category.
 if(selected.length<Math.min(2,max,meanings.length))for(const sense of meanings){if(selected.length>=Math.min(2,max,meanings.length))break;add(sense);}
 return {items:selected,total:meanings.length,allSenses:meanings.length,show:selected.length>1};
}
return {build,describe,cleanZh,compact,posKey};
});