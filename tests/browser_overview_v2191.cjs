/* V2.19.1 browser acceptance: concrete source-backed overview with existing learning behavior. */
const fs=require('node:fs');
(async()=>{const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9451));
const origin=(process.env.ROOTLAB_TEST_ORIGIN||'http://localhost:8897/').replace(/\/?$/,'/'),checks=[];
const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail??''));};
const until=async expr=>{for(let i=0;i<260;i++){try{if(await c.val(expr))return;}catch(_){}await c.wait(100)}throw Error('Timeout: '+expr)};
const open=async word=>{await c.call('Page.navigate',{url:origin+'?word='+word+'&v=2.19.1&check=overview'});await until("RootLabReader?.plan?.loaded&&RootLabReader.context.word==="+JSON.stringify(word))};
await c.call('Network.enable',{});await c.call('Network.clearBrowserCache',{});await c.call('Network.setCacheDisabled',{cacheDisabled:true});await c.call('Network.setBypassServiceWorker',{bypass:true});
await open('reason');
check('Browser shell and reading plan both V2.19.1',await c.val("document.querySelector('meta[name=application-version]').content==='2.19.1'&&RootLabReader.plan.uiVersion==='2.19.1'"));
const reason=await c.val("(()=>{const nav=document.querySelector('.unit-overview'),a=[...nav.querySelectorAll('.unit-overview-links a')];return {titles:a.map(n=>n.querySelector('strong')?.textContent),notes:a.map(n=>n.querySelector('.unit-preview-note')?.textContent),english:a.map(n=>n.querySelector('small[lang=en]')?.textContent),validAnchors:a.every(n=>{const t=document.querySelector(n.getAttribute('href'));return t?.hasAttribute('data-meaning-id')}),abstract:/名词[· ]+(动机与目的|表达与交流|思维与知识|状态)|名词用法/.test(nav.textContent),total:RootLabReader.model.displayMeanings.length,source:RootLabReader.model.senses.length,examples:RootLabReader.model.examples.length,renderedExamples:document.querySelectorAll('.rp-example-record').length,unmatched:RootLabAuthored.audit().unmatched}})()");
check('Reason shows specific, short Chinese meanings rather than WordNet categories',reason.titles.join('|')==='理由；动机|原因；缘由的解释|理性思考与辨别能力|推理；得出结论|理智；良好的判断力'&&!reason.abstract,reason.titles);
check('Explanation and original English accompany every meaning',reason.notes.every(Boolean)&&reason.english.every(Boolean),reason.notes);
check('Overview cards link to exact source senses without losing examples',reason.validAnchors&&reason.total===12&&reason.source===9&&reason.examples===reason.renderedExamples,reason);
check('Added overview creates no unpaired Chinese UI text',!reason.unmatched.length,reason.unmatched);
await c.val("document.querySelector('.unit-overview-links a').click()");await c.wait(110);
check('Clicking overview navigates to original meaning',await c.val("document.querySelector('#module-usage-senses .unit-targeted')?.dataset.meaningId==='wn30:reason%1:16:00::'"));
await c.val("document.querySelector('.unit-overview .unit-all-meanings').click()");
check('Complete meanings directory opens',await c.val("document.getElementById('readingContentsDialog').open&&document.querySelectorAll('#readingContentsDialog a.contents-sense').length===12"));
await c.val("document.querySelector('#readingContentsDialog [data-ui=close-contents]').click()");
for(const word of ['bank','light','carrier','apple','dogwood','species','equity','photograph']){
 await open(word);
 const d=await c.val("(()=>{const m=RootLabReader.model,r=document.getElementById('readerV24'),a=[...r.querySelectorAll('.unit-overview-links a')];return{word:m.word,previews:a.length,valid:a.every(n=>{const e=r.querySelector(n.getAttribute('href'));return !!e?.getAttribute('data-meaning-id')}),noCategories:a.every(n=>!/(名词用法|noun uses|动机与目的|表达与交流)/i.test(n.querySelector('strong')?.textContent||'')),source:m.senses.length,rendered:r.querySelectorAll('.bi-sense').length,examples:m.examples.length,renderedExamples:r.querySelectorAll('.rp-example-record').length,phrases:m.phrases.length,renderedPhrases:r.querySelectorAll('.lr-phrase-row').length,ledger:RootLabReader.plan.ledger.every(x=>RootLabReader.plan.cards.some(c=>c.cardId===x.cardId&&c.sourceRecordIds.includes(x.id)))}})()");
 check('Complete entry and precise preview for '+word,d.previews>0&&d.valid&&d.noCategories&&d.source===d.rendered&&d.examples===d.renderedExamples&&d.phrases===d.renderedPhrases&&d.ledger,d);
}
await open('reason');
for(const width of [320,390,768,1365,1920]){
 await c.call('Emulation.setDeviceMetricsOverride',{width,height:890,deviceScaleFactor:1,mobile:width<600});
 const d=await c.val("(()=>{const a=[...document.querySelectorAll('.unit-overview-links a')];return{width:document.documentElement.clientWidth,horizontalOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,columns:getComputedStyle(document.querySelector('.unit-overview-links')).gridTemplateColumns.split(' ').length,cardTextVisible:a.every(n=>n.querySelector('strong').getBoundingClientRect().height>10),cards:a.length,clipped:a.some(n=>n.scrollHeight>n.clientHeight+3&&getComputedStyle(n).overflowY!=='visible')}})()");
 check('Readable overview at '+width+'px',!d.horizontalOverflow&&d.cardTextVisible&&d.cards===5&&!d.clipped,d);
}
await c.call('Emulation.clearDeviceMetricsOverride',{});
const exceptions=c.events.filter(e=>e.method==='Runtime.exceptionThrown');
check('No uncaught browser errors',exceptions.length===0,exceptions);
const out={status:checks.every(x=>x.ok)?'PASS':'FAIL',checks,scope:'Isolated Chromium, real local-origin lexical bundles, actual DOM and five simulated viewport widths; not comprehensive human dictionary translation review.'};
if(process.env.OVERVIEW_BROWSER_REPORT)fs.writeFileSync(process.env.OVERVIEW_BROWSER_REPORT,JSON.stringify(out,null,2));
console.log('SUMMARY',checks.filter(x=>x.ok).length,'/',checks.length);c.close();if(out.status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=2});