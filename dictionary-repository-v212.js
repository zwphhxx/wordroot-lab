/* Version-bound dictionary repository. Hash-verify complete packages before committing
 * any of their entries. Never mix an older shell with another data build.
 * Candidate quality is evaluated by the separate release gate, not by a hash. */
(function(){'use strict';
 const meta=window.ROOTLAB_BILINGUAL_META||{};
 const expected=meta.buildId;
 const entries=new Map(),inflight=new Map();let manifestTask=null;
 const wordOK=w=>typeof w==='string'&&/^[a-z]{2,30}$/.test(w);
 const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const error=(zh,en)=>new Error(zh+' / '+en);
 function validRecord(word,r){return wordOK(word)&&r&&r.word===word&&r.wordId==='en:'+word&&Array.isArray(r.senses)&&r.senses.every(s=>typeof s.id==='string'&&typeof s.en==='string'&&typeof s.zh==='string'&&Array.isArray(s.sourceRefs));}
 if(meta.schemaVersion===3&&/^v212-[0-9a-f]{14}$/.test(expected||'')){
  for(const [word,r]of Object.entries(window.ROOTLAB_BILINGUAL_SEEDS||{})){if(validRecord(word,r))entries.set(word,r);}
 }
 async function manifest(){
  if(!/^v212-[0-9a-f]{14}$/.test(expected||''))throw error('资料版本信息无效','Invalid dictionary build');
  if(!manifestTask){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
   manifestTask=fetch('./data/bilingual-v212/'+expected+'/manifest.json',{signal:controller.signal}).then(async r=>{
    if(!r.ok)throw error('双语资料目录暂不可用','Dictionary manifest unavailable');
    const m=await r.json();if(m.schemaVersion!==3||m.schema!==3||m.buildId!==expected||!m.bundles||m.entryCount!==49426)throw error('资料与页面版本不一致','Dictionary build mismatch');
    return m;
   }).catch(e=>{manifestTask=null;throw e;}).finally(()=>clearTimeout(timer));
  }
  return manifestTask;
 }
 async function ensure(word){
  word=String(word||'').toLowerCase();if(!wordOK(word))throw error('单词格式无效','Invalid word');
  if(entries.has(word))return entries.get(word);
  const m=await manifest();let selected=null;
  for(let n=Math.min(8,word.length);n>=2;n--){const prefix=word.slice(0,n);if(m.bundles[prefix]){selected={prefix,...m.bundles[prefix]};break;}}
  if(!selected)throw error('未找到该词的双语资料包','No bilingual package for this word');
  if(!inflight.has(selected.prefix)){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   const task=(async()=>{
    const path='./data/bilingual-v212/'+expected+'/'+selected.prefix+'.json';
    if(selected.url!==path||!/^[a-f0-9]{64}$/.test(selected.sha256))throw error('资料路径校验失败','Invalid package metadata');
    const response=await fetch(path,{signal:controller.signal});if(!response.ok)throw error('双语资料暂未加载','Bilingual package unavailable');
    const bytes=await response.arrayBuffer();if(bytes.byteLength!==selected.bytes||await digest(bytes)!==selected.sha256)throw error('资料校验失败，请重新加载','Package integrity check failed');
    const data=JSON.parse(new TextDecoder().decode(bytes));
    if(data.schemaVersion!==3||data.schema!==3||data.buildId!==expected||!data.words)throw error('双语资料版本不匹配','Package version mismatch');
    const rows=Object.entries(data.words);if(rows.length!==selected.words||rows.some(([w,r])=>!validRecord(w,r)))throw error('双语资料结构不完整','Invalid bilingual entry structure');
    // Commit only once every row has passed. A failed request never partly mutates cache.
    for(const [w,r]of rows)entries.set(w,r);
   })().finally(()=>{clearTimeout(timer);inflight.delete(selected.prefix);});
   inflight.set(selected.prefix,task);
  }
  await inflight.get(selected.prefix);if(!entries.has(word))throw error('资料包未包含所查单词','Word absent from package');return entries.get(word);
 }
 window.RootLabDictionaryRepository={ensure,get:w=>entries.get(String(w||'').toLowerCase())||null,has:w=>entries.has(String(w||'').toLowerCase()),manifest,buildId:expected,get size(){return entries.size;}};
})();
