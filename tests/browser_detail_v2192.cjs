/* V2.19.2: actual-browser acceptance of the simplified full meanings chapter. */
const fs=require('node:fs'),path=require('node:path');
(async()=>{const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9454));
const origin=(process.env.ROOTLAB_TEST_ORIGIN||'http://localhost:8896/').replace(/\/?$/,'/'),checks=[];
const check=(name,ok,details)=>{checks.push({name,ok:!!ok,details});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(details??''));};
const until=async expr=>{for(let i=0;i<230;i++){try{if(await c.val(expr))return}catch(e){}await c.wait(110)}throw Error('Timeout '+expr)};
async function open(word){await c.call('Page.navigate',{url:origin+'?word='+word+'&v=2.19.2&check=detail'});await until("RootLabReader.plan?.loaded&&RootLabReader.context.word==="+JSON.stringify(word))}
await c.call('Network.enable',{});await c.call('Network.clearBrowserCache',{});await c.call('Network.setCacheDisabled',{cacheDisabled:true});await c.call('Network.setBypassServiceWorker',{bypass:true});
await open('reason');
check('V2.19.2 shell and reading plan agree',await c.val("document.querySelector('meta[name=application-version]').content==='2.19.2'&&RootLabReader.plan.uiVersion==='2.19.2'"));
const reason=await c.val("(()=>{const root=document.querySelector('#readerV24'),source=RootLabReader.model,first=root.querySelector('#module-usage-senses .unit-meaning'),a=[...root.querySelectorAll('#module-usage-senses .unit-meaning')];return {sourceSenses:source.senses.length,displayMeanings:source.displayMeanings.length,meaningNodes:a.length,groupHeadings:root.querySelectorAll('#module-usage-senses .rp-group-title').length,meta:first.querySelector('.bi-sense-top').textContent,title:first.querySelector('.unit-heading')?.textContent,note:first.querySelector('.unit-short-explanation')?.textContent,zh:first.querySelector('.unit-definition .bi-zh')?.textContent,en:first.querySelector('.unit-definition .bi-en')?.textContent,zhRepetitions:first.textContent.split('信仰或行动的合理动机').length-1,sourcePairCount:root.querySelectorAll('#module-usage-senses .unit-definition .bi-pair').length,inlineExamples:root.querySelectorAll('#module-usage-senses .rp-example-record').length,allExamples:root.querySelectorAll('.rp-example-record').length,expectedExamples:source.examples.length,inlineCategoryBadges:root.querySelectorAll('#module-usage-senses .bi-example-context').length,seeExampleLinks:root.querySelectorAll('#module-usage-senses .unit-see-example').length,firstExamples:[...first.querySelectorAll('.rp-example-record')].map(x=>[x.querySelector('.bi-example .bi-en')?.textContent,x.querySelector('.bi-example .bi-zh')?.textContent]),unmatched:RootLabAuthored.audit().unmatched}})()");
check('Full meanings have no repeated abstract topic headings',reason.groupHeadings===0&&reason.meta.trim()==='01名词'&&reason.inlineCategoryBadges===0,reason);
check('First meaning is a clear short definition with its bilingual source once',reason.title==='理由；动机'&&reason.note==='某种行动或观点背后的合理根据'&&reason.zh==='信仰或行动的合理动机'&&reason.en==='a rational motive for a belief or action'&&reason.zhRepetitions===1,reason);
check('Original senses and all examples survive once, without redundant example CTA',reason.sourceSenses===9&&reason.displayMeanings===12&&reason.meaningNodes===12&&reason.sourcePairCount===12&&reason.allExamples===11&&reason.allExamples===reason.expectedExamples&&!reason.seeExampleLinks,reason);
check('Inline reason example is naturally revised',reason.firstExamples[0][0]==='the reason that war was declared'&&reason.firstExamples[0][1]==='宣战的原因',reason.firstExamples);
check('All UI text is bilingual-paired where required',reason.unmatched.length===0,reason.unmatched);
const translated=await c.val("(()=>{const r=document.querySelector('#readerV24');return {source:r.querySelector('[data-meaning-id=\"wn30:reason%1:26:00::\"]')?.textContent||'',typed:r.querySelector('[data-meaning-id=\"wn30:reason%2:31:01::\"]')?.textContent||'',rawMachine:RootLabBilingual.get('reason').examples.find(e=>e.en==='We reasoned that it was cheaper to rent than to buy a house')?.zh}})()");
check('Corrected misleading context without changing the source dictionary',translated.source.includes('而不是依赖理性说服')&&translated.typed.includes('我们分析后认为，租房比买房更省钱')&&translated.rawMachine==='我们说租房子比买房子便宜',translated);
await c.val("document.querySelector('[data-ui=contents]').click()");
const directory=await c.val("(()=>{const x=document.getElementById('readingContentsDialog');return {open:x.open,items:x.querySelectorAll('.contents-sense').length,oldGroups:x.querySelectorAll('.contents-group').length,firstMeaning:[...x.querySelectorAll('.contents-sense')][0]?.textContent}})()");
check('Contents contains direct meaning links, no taxonomy navigation',directory.open&&directory.items===12&&directory.oldGroups===0&&directory.firstMeaning.includes('理由；动机'),directory);
await c.val("document.querySelector('#readingContentsDialog [data-ui=close-contents]').click()");
for(const word of ['bank','carrier','light','apple','dogwood','species','equity','photograph','revolution']){
 await open(word);
 const d=await c.val("(()=>{const r=document.querySelector('#readerV24'),m=RootLabReader.model,p=RootLabReader.plan,meanings=[...r.querySelectorAll('#module-usage-senses .unit-meaning')];return {word:m.word,source:m.senses.length,sourceRendered:meanings.filter(n=>n.classList.contains('bi-sense')).length,meanings:m.displayMeanings.length,renderedMeanings:meanings.length,examples:m.examples.length,renderedExamples:r.querySelectorAll('.rp-example-record').length,phrases:m.phrases.length,renderedPhrases:r.querySelectorAll('.lr-phrase-row').length,absGroupTitles:r.querySelectorAll('#module-usage-senses .rp-group-title').length,allPairs:meanings.every(n=>!!n.querySelector('.unit-definition .bi-en')&&!!n.querySelector('.unit-definition .bi-zh')),onlyOneSource:meanings.every(n=>n.querySelectorAll('.unit-definition .bi-pair').length===1),ledger:p.ledger.every(x=>p.cards.some(c=>c.cardId===x.cardId&&c.sourceRecordIds.includes(x.id))),unmatched:RootLabAuthored.audit().unmatched.length}})()");
 check('Every original source record and example retained: '+word,d.source===d.sourceRendered&&d.meanings===d.renderedMeanings&&d.examples===d.renderedExamples&&d.phrases===d.renderedPhrases&&d.absGroupTitles===0&&d.allPairs&&d.onlyOneSource&&d.ledger&&d.unmatched===0,d);
 await c.val('RootLabAuthored.clearAudit()');
}
await open('reason');
for(const width of [320,390,768,1365,1920]){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height:860,deviceScaleFactor:1,mobile:width<600});
 const d=await c.val("(()=>{const cards=[...document.querySelectorAll('#module-usage-senses .rp-card-senses')];return{scrollWidth:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,longest:Math.max(...cards.map(c=>c.offsetHeight)),horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,textMissing:cards.some(c=>!c.querySelector('.unit-definition .bi-zh'))}})()");
 check('Reason detail readable at '+width+'px',!d.horizontalOverflow&&!d.textMissing,d);
}
await c.call('Emulation.clearDeviceMetricsOverride',{});
const errors=c.events.filter(e=>e.method==='Runtime.exceptionThrown');
check('No uncaught JavaScript exceptions',errors.length===0,errors);
const result={status:checks.every(x=>x.ok)?'PASS':'FAIL',checks,scope:'Isolated Chrome real full text; five simulated viewport widths and real loaded bilingual bundles; no manually altered source records.'};
const report=process.env.DETAIL_BROWSER_REPORT;if(report)fs.writeFileSync(report,JSON.stringify(result,null,2));
console.log('SUMMARY',checks.filter(x=>x.ok).length,'/',checks.length);c.close();if(result.status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=2});