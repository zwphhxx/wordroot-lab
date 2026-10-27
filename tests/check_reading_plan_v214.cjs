const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const R=path.resolve(__dirname,'..'),A=require('../reader-adapters-v214.js'),P=require('../reader-plan-v214.js');
const M=JSON.parse(fs.readFileSync(path.join(R,'data/bilingual-v212-manifest.json'))),out=process.env.REPORT_DIR||path.join(R,'.work/reading-v214');fs.mkdirSync(out,{recursive:true});
const environment={window:{},console};vm.createContext(environment);
for(const f of ['word-history-v22.js','word-etymology-curated-v23.js','reading-cards-v210.js','basic-learning-v210.js','plain-objects-v210.js','visual-seeds-v29.js','visual-extra-v210.js','meaning-notes-v210.js'])vm.runInContext(fs.readFileSync(path.join(R,f),'utf8'),environment);
const w=environment.window,counts={words:0,senses:0,examples:0,phrases:0,relations:0,native:0,packages:0},failures=[],capabilities={},samples={};
const sampleWords=['carrier','bank','photograph','successful','apple','banana','andiron','resilient','equity','revolution','mellow','siting','aardvark','aalii'];
for(const pack of Object.values(M.bundles)){
 const raw=fs.readFileSync(path.join(R,pack.url.slice(2)));if(raw.length!==pack.bytes||crypto.createHash('sha256').update(raw).digest('hex')!==pack.sha256){failures.push({error:'Package hash',path:pack.url});continue;}counts.packages++;
 for(const [word,x] of Object.entries(JSON.parse(raw).words)){
  counts.words++;const before=JSON.stringify(x),basic=w.ROOTLAB_BASIC_CARDS?.[word];
  const c={word,meaning:x.nativeZh?.[0]||'',learning:{basic,history:w.ROOTLAB_WORD_HISTORY?.[word]||w.ROOTLAB_CURATED_ETYM?.[word]||null,examples:[],forms:[]}};
  const extras={buildId:M.buildId,plain:w.ROOTLAB_MEANING_NOTES?.[word],custom:w.ROOTLAB_READING_CARDS?.[word],knownImage:!!w.ROOTLAB_VISUAL_SEEDS?.[word]||!!w.ROOTLAB_ENCYCLOPEDIA_SEEDS?.[word],quiz:x.quiz};
  try{
   const m=A.adapt(c,x,extras),plan=P.buildReadingPlan(m);if(JSON.stringify(plan)!==JSON.stringify(P.buildReadingPlan(m)))throw Error('Nondeterministic plan');
   if(JSON.stringify(x)!==before)throw Error('Source mutated');
   const found=new Set(plan.ledger.map(r=>r.kind+'\0'+r.id));for(const r of m.inventory)if(!found.has(r.kind+'\0'+r.id))throw Error('Lost source '+r.id);
   for(const section of plan.sections){if(!section.modules.length)throw Error('Empty section');for(const mod of section.modules){if(mod.availability!=='ready')throw Error('Unavailable card');}}
   for(const k of ['senses','examples','phrases','relations'])counts[k]+=x[k].length;counts.native+=(x.nativeSourceSummary?.pairs||[]).length;
   const stages=plan.sections.map(s=>s.id).join('>');capabilities[stages]=(capabilities[stages]||0)+1;
   if(sampleWords.includes(word))samples[word]=x;
  }catch(e){failures.push({word,error:String(e)});}
 }
}
const malformed={word:'single',senses:[],examples:[{id:'e1',en:'A single item.',zh:'一个单独的物品。',translation:'edited'}],phrases:[],relations:[]};
let model=A.adapt({word:'single',learning:{}},malformed);const single=P.buildReadingPlan(model);if(single.earlyExampleId===null||single.sections.some(s=>s.id==='usage'))failures.push({error:'Single example empty section'});
model=A.adapt({word:'empty',learning:{}},{word:'empty',senses:[],examples:[],phrases:[],relations:[]});if(P.buildReadingPlan(model).sections.length!==1)failures.push({error:'Sparse word empty cards'});
fs.writeFileSync(path.join(out,'sample-records.json'),JSON.stringify(samples));
const result={status:failures.length?'FAIL':'PASS',baselineCommit:'5866ec87b30a91ec5863a87dba45f1206d9a80af',lexicalBuild:M.buildId,counts,capabilities,failures:failures.slice(0,40),scope:'All lexical source records, package hashes, pure-plan determinism and non-mutation. Browser layout and external network behavior are separate checks.'};
fs.writeFileSync(path.join(out,'plan-integrity.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(failures.length)process.exitCode=1;
