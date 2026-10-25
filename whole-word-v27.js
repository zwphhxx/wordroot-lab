/* Whole-word learning is a rule for every dictionary entry, not three exceptions.
 * Linguistic claims and expressions come from supplied data; no made-up roots,
 * dates, countability, idioms or example sentences are generated here.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabWholeWords=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const POS=[['n.','名词'],['v.','动词'],['vt.','及物动词'],['vi.','不及物动词'],['a.','形容词'],['adj.','形容词'],['adv.','副词'],['prep.','介词'],['pron.','代词'],['conj.','连词'],['interj.','感叹词']];
 const matches=(text)=>{const m=/^(n\.|v\.|vt\.|vi\.|a\.|adj\.|adv\.|prep\.|pron\.|conj\.|interj\.)\s*/i.exec(String(text));return m?{code:m[1].toLowerCase(),meaning:String(text).slice(m[0].length),name:POS.find(x=>x[0]===m[1].toLowerCase())?.[1]||'词义'}:{code:'',meaning:String(text),name:'词义'};};
 function classify(data){if(data.manual&&typeof data.manual==='object')return'whole';const supported=['documented','curated','attested'].includes(data.pieceType);return supported&&Array.isArray(data.pieces)&&data.pieces.length>1?'root':'whole';}
 function build(data){if(data.manual&&typeof data.manual==='object')return data.manual;if(classify(data)==='root')return null;
  const senses=(data.definitions||[]).filter(x=>typeof x==='string'&&x.trim()).map(matches);
  const names=[...new Set(senses.map(s=>s.name).filter(x=>x!=='词义'))];
  const phrases=(data.usage?.phrases||[]).filter(p=>p&&typeof p.en==='string'&&p.en.includes(data.word));
  const related=(data.usage?.related||[]).filter(x=>x&&x.word&&x.word!==data.word);
  return {generated:true,route:'whole',senses,definitions:data.definitions||[],forms:data.forms||[],phrases,related,history:data.history||null,
   title:data.history?'词义与来历':'词义与用法',
   hook:names.length>1?data.word+' 的'+names.slice(0,3).join('、')+'用法有什么不同？':data.word+' 放进句子里，怎样理解和使用？',
   posNote:names.length>1?'先判断句中的词性，再选相应的意思。':'',
   sources:[{label:'表达与词义资料',url:'./credits.html'}]};
 }
 function headline(text){const sense=matches(text),first=sense.meaning.split(/[，,；;]/).map(x=>x.trim()).find(Boolean)||sense.meaning;return(sense.code?sense.code+' ':'')+first;}
 return{classify,build,parseSense:matches,headline};
});
