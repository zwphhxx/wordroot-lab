/* All source packages and every reading-card owner are checked; no lexical file changes. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const R=path.resolve(__dirname,'..'),A=require('../reader-adapters-v2171.js'),P=require('../reader-plan-v221.js'),O=require('../reader-overview-v221.js'),U=require('../unified-presentation-v221.js'),C=require('../dictionary-corrections-v215.js');
const out=process.env.REPORT_DIR||path.join(R,'.work/v215');fs.mkdirSync(out,{recursive:true});
const M=JSON.parse(fs.readFileSync(path.join(R,'data/bilingual-v212-manifest.json'))),env={window:{},console};vm.createContext(env);
for(const f of ['word-history-v22.js','word-etymology-curated-v23.js','reading-cards-v210.js','basic-learning-v210.js','plain-objects-v210.js','visual-seeds-v29.js','visual-extra-v210.js','meaning-notes-v210.js','visual-caption-v212.js','visual-reviewed-v215.js'])vm.runInContext(fs.readFileSync(path.join(R,f),'utf8'),env);
const w=env.window,counts={exactDuplicateSourceRows:0,unifiedMeanings:0,provenanceGlosses:0,concretePreviews:0,words:0,senses:0,examples:0,phrases:0,relations:0,native:0,packages:0,cards:0,correctedEntries:0,displayMeanings:0,mergedNative:0,integratedNative:0,reviewedNative:0,exactNative:0,alignedNative:0},failures=[],changes=[],samples={};
for(const b of Object.values(M.bundles)){
 const bytes=fs.readFileSync(path.join(R,b.url.slice(2)));if(bytes.length!==b.bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==b.sha256){failures.push({file:b.url,issue:'Base-package integrity'});continue;}counts.packages++;
 for(const [word,raw]of Object.entries(JSON.parse(bytes).words)){
  counts.words++;const original=JSON.stringify(raw),x=C.apply(word,raw);if(x!==raw){counts.correctedEntries++;changes.push({word,originalIds:raw.senses.map(s=>s.id),correctedIds:x.senses.map(s=>s.id)});}
  const c={word,meaning:x.summaryZh||x.nativeZh?.[0]||'',learning:{basic:w.ROOTLAB_BASIC_CARDS?.[word],history:w.ROOTLAB_WORD_HISTORY?.[word]||w.ROOTLAB_CURATED_ETYM?.[word]||null,examples:[],forms:[]}};
  const extra={buildId:M.buildId,plain:w.ROOTLAB_MEANING_NOTES?.[word],custom:w.ROOTLAB_READING_CARDS?.[word],knownImage:!!w.ROOTLAB_VISUAL_SEEDS?.[word]||!!w.ROOTLAB_ENCYCLOPEDIA_SEEDS?.[word],quiz:x.quiz};
  try{const m=A.adapt(c,x,extra),p=P.buildReadingPlan(m);if(JSON.stringify(p)!==JSON.stringify(P.buildReadingPlan(m)))throw Error('Nondeterministic cards');if(JSON.stringify(raw)!==original)throw Error('Source mutated');const preview=O.build(m,p),seenOverview=new Set();counts.concretePreviews+=preview.items.length;
   for(const item of preview.items){const matching=m.displayMeanings.find(y=>y.id===item.id);if(!matching||!item.zh||!item.en||seenOverview.has(item.id))throw Error('Invalid concrete preview '+item.id);seenOverview.add(item.id);}for(const row of m.displayMeanings){
    const description=O.describe(row,m.word);
    if(!description.zh||!description.en||!description.id||description.id!==(row.displayId||row.id)||!description.originalZh)throw Error('Invalid sense description: '+row.id);
   }
   if(preview.items.length>5||preview.total!==m.displayMeanings.length)throw Error('Unaccounted overview count');
   if(m.displayMeanings.length>1&&!preview.show)throw Error('Multi-meaning word lost overview');const unified=U.build(m,p),ids=[...unified.rows,...unified.sourceRows].map(U.identity);
   if(ids.length!==new Set(m.displayMeanings.map(U.identity)).size||new Set(ids).size!==ids.length||!m.displayMeanings.every(r=>ids.includes(U.identity(r))))throw Error('Unified source partition mismatch');
   if(!unified.rows.length&&m.displayMeanings.length)throw Error('Missing primary meaning');
   if(unified.mainIds.some(id=>!unified.rows.some(r=>U.identity(r)===id)))throw Error('Preview points outside primary meanings');
   if(unified.sourceRows.some(r=>p.placements.bySense[r.id]?.examples.length||p.placements.bySense[r.id]?.phrases.length))throw Error('Source-only row lost learning material');
   counts.exactDuplicateSourceRows+=unified.exactDuplicateCount;counts.unifiedMeanings+=unified.rows.length;counts.provenanceGlosses+=unified.sourceRows.length;


   for(const kind of ['senses','examples','phrases','relations']){counts[kind]+=raw[kind].length;if(JSON.stringify(raw[kind].map(r=>r.id))!==JSON.stringify(x[kind].map(r=>r.id)))throw Error('Source IDs changed: '+kind);}
   counts.native+=(raw.nativeSourceSummary?.pairs||[]).length;counts.cards+=p.cards.length;counts.displayMeanings+=m.displayMeanings.length;
   for(const disposition of m.nativeDisposition){
    const retained=disposition.method==='retained-unresolved';counts[retained?'integratedNative':'mergedNative']++;
    if(disposition.method==='exact-bilingual-equivalence')counts.exactNative++;
    else if(disposition.method==='reviewed-segment-alignment')counts.alignedNative++;
    else if(!retained)counts.reviewedNative++;
    if(!disposition.targetIds.length||!disposition.targetIds.every(id=>m.displayMeanings.some(s=>s.id===id&&s.sourceRecordIds.includes(disposition.sourceId))))throw Error('Unrepresented native coverage');
    if(retained&&!m.displayMeanings.some(s=>s.id===disposition.sourceId&&s.en===disposition.original.en&&s.zh===disposition.original.zh))throw Error('Unresolved source text modified');
   }
   if(p.sections.some(s=>s.modules.some(m=>m.type==='native')))throw Error('Standalone source section still present');

   for(const item of m.inventory){const owners=p.ledger.filter(r=>r.kind===item.kind&&r.id===item.id);if(!owners.length||owners.some(o=>!p.cards.find(c=>c.cardId===o.cardId&&c.moduleId===o.moduleId&&c.sourceRecordIds.includes(item.id))))throw Error('Missing card owner '+item.id);}
   if(new Set(p.cards.map(c=>c.cardId)).size!==p.cards.length)throw Error('Duplicate card identity');
   if(p.cards.some(c=>!c.groupHeadingOnce))throw Error('Card lacks heading ownership');
   const groups=require('../reader-layout-v218.js').meaningGroups(m.displayMeanings,word);if(groups.flatMap(g=>g.rows).length!==m.displayMeanings.length)throw Error('Grouped meanings lost');
   if(word==='bank'&&groups.some(g=>g.method!=='reviewed-id-and-definition'))throw Error('Bank reviewed mapping drift');
   if(['carrier','species','dogwood','photograph','apple','siting','bank'].includes(word))samples[word]={senses:x.senses.length,meanings:m.displayMeanings.length,dispositions:m.nativeDisposition.map(x=>({id:x.sourceId,method:x.method,targets:x.targetIds})),phraseGroups:require('../reader-semantics-v2171.js').phraseGroups(m).map(g=>({key:g.key,meaning:g.zh,words:g.rows.map(r=>r.en),links:g.links})),cards:p.cards.length,types:p.cards.map(c=>c.type),sections:p.sections.map(s=>s.id)};
  }catch(e){failures.push({word,issue:String(e)});}
 }
}
const result={status:failures.length?'FAIL':'PASS',uiVersion:'2.21.0',baseBuild:M.buildId,counts,failures,samples,changes,scope:'All source packages/IDs and card ownership preserved. Unproven native overlaps remain visible. Reviewed merges and new display wording are finite, not full-corpus semantic verification.'};
fs.writeFileSync(path.join(out,'cards-integrity.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,changes:changes.slice(0,8)},null,2));if(failures.length)process.exitCode=1;
