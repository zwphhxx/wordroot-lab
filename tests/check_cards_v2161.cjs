/* All source packages and every reading-card owner are checked; no lexical file changes. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const R=path.resolve(__dirname,'..'),A=require('../reader-adapters-v214.js'),P=require('../reader-plan-v2161.js'),C=require('../dictionary-corrections-v215.js');
const out=process.env.REPORT_DIR||path.join(R,'.work/v215');fs.mkdirSync(out,{recursive:true});
const M=JSON.parse(fs.readFileSync(path.join(R,'data/bilingual-v212-manifest.json'))),env={window:{},console};vm.createContext(env);
for(const f of ['word-history-v22.js','word-etymology-curated-v23.js','reading-cards-v210.js','basic-learning-v210.js','plain-objects-v210.js','visual-seeds-v29.js','visual-extra-v210.js','meaning-notes-v210.js','visual-caption-v212.js','visual-reviewed-v215.js'])vm.runInContext(fs.readFileSync(path.join(R,f),'utf8'),env);
const w=env.window,counts={words:0,senses:0,examples:0,phrases:0,relations:0,native:0,packages:0,cards:0,correctedEntries:0},failures=[],changes=[],samples={};
for(const b of Object.values(M.bundles)){
 const bytes=fs.readFileSync(path.join(R,b.url.slice(2)));if(bytes.length!==b.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==b.sha256){failures.push({file:b.url,issue:'Base-package integrity'});continue;}counts.packages++;
 for(const [word,raw]of Object.entries(JSON.parse(bytes).words)){
  counts.words++;const original=JSON.stringify(raw),x=C.apply(word,raw);if(x!==raw){counts.correctedEntries++;changes.push({word,originalIds:raw.senses.map(s=>s.id),correctedIds:x.senses.map(s=>s.id)});}
  const c={word,meaning:x.summaryZh||x.nativeZh?.[0]||'',learning:{basic:w.ROOTLAB_BASIC_CARDS?.[word],history:w.ROOTLAB_WORD_HISTORY?.[word]||w.ROOTLAB_CURATED_ETYM?.[word]||null,examples:[],forms:[]}};
  const extra={buildId:M.buildId,plain:w.ROOTLAB_MEANING_NOTES?.[word],custom:w.ROOTLAB_READING_CARDS?.[word],knownImage:!!w.ROOTLAB_VISUAL_SEEDS?.[word]||!!w.ROOTLAB_ENCYCLOPEDIA_SEEDS?.[word],quiz:x.quiz};
  try{const m=A.adapt(c,x,extra),p=P.buildReadingPlan(m);if(JSON.stringify(p)!==JSON.stringify(P.buildReadingPlan(m)))throw Error('Nondeterministic cards');if(JSON.stringify(raw)!==original)throw Error('Source mutated');
   for(const kind of ['senses','examples','phrases','relations']){counts[kind]+=raw[kind].length;if(JSON.stringify(raw[kind].map(r=>r.id))!==JSON.stringify(x[kind].map(r=>r.id)))throw Error('Source IDs changed: '+kind);}
   counts.native+=(raw.nativeSourceSummary?.pairs||[]).length;counts.cards+=p.cards.length;
   for(const item of m.inventory){const owners=p.ledger.filter(r=>r.kind===item.kind&&r.id===item.id);if(!owners.length||owners.some(o=>!p.cards.find(c=>c.cardId===o.cardId&&c.moduleId===o.moduleId&&c.sourceRecordIds.includes(item.id))))throw Error('Missing card owner '+item.id);}
   if(new Set(p.cards.map(c=>c.cardId)).size!==p.cards.length)throw Error('Duplicate card identity');
   if(['carrier','species','dogwood','photograph','apple','siting','bank'].includes(word))samples[word]={senses:x.senses.length,cards:p.cards.length,types:p.cards.map(c=>c.type),sections:p.sections.map(s=>s.id)};
  }catch(e){failures.push({word,issue:String(e)});}
 }
}
const result={status:failures.length?'FAIL':'PASS',uiVersion:'2.16.1',baseBuild:M.buildId,counts,failures,samples,changes,scope:'Full source preservation and deterministic card ownership. Finite editorial corrections are not whole-corpus language review.'};
fs.writeFileSync(path.join(out,'cards-integrity.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,changes:changes.slice(0,8)},null,2));if(failures.length)process.exitCode=1;
