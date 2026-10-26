/* Verify every lexical record survives the UI grouping/deduplication boundary.
 * No claims of new linguistic review; approved source data remain unchanged. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'data/bilingual-v212-manifest.json')));
let current={};const sandbox={window:{ROOTLAB_LEXICON:[],ROOTLAB_BILINGUAL_SEEDS:{},RootLabDictionaryRepository:{get:w=>current[w],has:w=>Boolean(current[w])}}};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'bilingual-v213.js'),'utf8'),sandbox);
const ui=sandbox.window.RootLabBilingual,counts={words:0,senses:0,relations:0,presentationRelations:0,packages:0},fail=[];
for(const b of Object.values(manifest.bundles)){
 const raw=fs.readFileSync(path.join(root,b.url.replace(/^\.\//,''))),hash=crypto.createHash('sha256').update(raw).digest('hex');
 if(hash!==b.sha256||raw.length!==b.bytes){fail.push({file:b.url,error:'hash mismatch'});continue;}
 const pack=JSON.parse(raw);current=pack.words;counts.packages++;
 for(const [word,obj]of Object.entries(current)){
  counts.words++;counts.senses+=obj.senses.length;counts.relations+=obj.relations.length;
  const before=JSON.stringify(obj),groups=ui.senseGroups(obj),ids=groups.flatMap(g=>g.items.map(x=>x.id));
  if(ids.length!==obj.senses.length||new Set(ids).size!==ids.length||obj.senses.some(s=>!ids.includes(s.id)))fail.push({word,error:'sense lost or duplicated'});
  const rel=ui.relationGroups({word});const edges=rel.flatMap(g=>g.rows.flatMap(r=>r.sourceRecordIds));counts.presentationRelations+=rel.reduce((n,g)=>n+g.rows.length,0);
  if(edges.length!==obj.relations.length||obj.relations.some(r=>!edges.includes(r.id)))fail.push({word,error:'relationship source dropped'});
  for(const g of rel)for(const r of g.rows)for(const id of r.sourceRecordIds){const original=obj.relations.find(x=>x.id===id);if(!original||original.word!==r.word||original.en!==r.en||original.zh!==r.zh||original.label!==r.label||(original.fromSenseId||original.senseId)!==g.id)fail.push({word,error:'cross-sense presentation merge',id});}
  if(JSON.stringify(obj)!==before)fail.push({word,error:'source mutation'});
 }
}
const report={status:!fail.length&&counts.words===49426?'PASS':'FAIL',lexicalBuild:manifest.buildId,counts,failures:fail.slice(0,30),method:'All original sense IDs and all relation IDs retained; only equivalent displayed edges grouped; source objects unchanged; every package digest checked.'};
const out=process.env.UI_REPORT_DIR||path.resolve(root,'../wordroot-lab-workspace/runtime/ui-v213');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'content-integrity.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(report.status!=='PASS')process.exitCode=1;
