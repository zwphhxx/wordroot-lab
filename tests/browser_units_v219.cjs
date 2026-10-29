/* V2.19 actual Chromium tests in an isolated profile. */
const fs=require('node:fs');
(async()=>{
 const c=await require('./cdp_helper.cjs')(9419),checks=[];
 const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail??''));};
 const until=async expression=>{for(let i=0;i<200;i++){try{if(await c.val(expression))return;}catch(e){}await c.wait(120);}throw Error('Timeout '+expression);};
 await c.call('Network.enable',{});await c.call('Network.setCacheDisabled',{cacheDisabled:true});await c.call('Network.clearBrowserCache',{});await c.call('Network.setBypassServiceWorker',{bypass:true});await c.call('Page.navigate',{url:'http://localhost:8899/?v=2.19.0&word=bank&regression=20261029'});
 await until("RootLabReader?.plan?.loaded&&RootLabReader.context.word==='bank'");
 check('New shell and plan are consistent',await c.val("document.querySelector('meta[name=application-version]').content==='2.19.0'&&RootLabReader.plan.uiVersion==='2.19.0'"));
 const census="(()=>{const p=RootLabReader.plan,m=RootLabReader.model,r=document.querySelector('#readerV24'),a=p.placements;return {senses:r.querySelectorAll('.bi-sense').length,expectedSenses:m.senses.length,examples:r.querySelectorAll('.rp-example-record').length,expectedExamples:m.examples.length,phrases:r.querySelectorAll('.lr-phrase-row').length,expectedPhrases:m.phrases.length,linkedExamples:a.linkedExampleCount,linkedPhrases:a.linkedPhraseCount,looseExamples:a.looseExamples.length,loosePhrases:a.loosePhrases.length,unitHeadings:r.querySelectorAll('.unit-heading').length,overview:r.querySelectorAll('.unit-overview a').length,folds:r.querySelectorAll('details').length}})()";
 const v=await c.val(census);check('No missing or repeated bank source records',v.senses===v.expectedSenses&&v.examples===v.expectedExamples&&v.phrases===v.expectedPhrases&&!v.folds,v);
 check('Overview and individual sense labels exist',v.overview>=2&&v.unitHeadings>=20);
 check('Linked river example is inside its meaning',await c.val("(()=>{const x=document.querySelector('[data-sense-id=\"wn30:bank%1:17:01::\"]');return x?.textContent.includes('he sat on the bank of the river')&&x.textContent.includes('他坐在河岸边')})()"));
 check('Bank phrases use reviewed links and index',await c.val("RootLabReader.plan.placements.linkedPhraseCount===4&&document.querySelectorAll('[data-plan-module=\"usage:phrases\"] a[href*=record-]').length===4"));
 await c.val("document.querySelector('#entrySearchInput').value='河岸';document.querySelector('#entrySearchInput').dispatchEvent(new Event('input',{bubbles:true}))");
 check('In-entry search works without hiding definitions',await c.val("!document.querySelector('#entrySearchResults').hidden&&document.querySelector('#entrySearchResults').textContent.includes('河岸')&&document.querySelectorAll('.bi-sense').length===18"));
 check('Search result links to an actual row',await c.val("!!document.querySelector(document.querySelector('#entrySearchResults a').getAttribute('href'))"));
 await c.val("document.querySelector('#entrySearchResults a').click()");await c.wait(150);
 check('Target visibly marked; current query unchanged',await c.val("!!document.querySelector('.unit-targeted')&&RootLabReader.context.word==='bank'"));
 await c.val("document.querySelector('[data-ui=contents]').click()");
 check('Contents deep-links all specific meanings',await c.val("document.querySelectorAll('#readingContentsDialog a.contents-sense').length===RootLabReader.model.displayMeanings.length"));
 await c.val("document.querySelector('#readingContentsDialog [data-ui=close-contents]').click()");
 for(const w of ['carrier','photograph','apple','banana','dogwood','species','equity']){
  await c.val("RootLabReaderBridge.open("+JSON.stringify(w)+")");await until("RootLabReader?.plan?.loaded&&RootLabReader.context.word==="+JSON.stringify(w));
  const r=await c.val("(()=>{const p=RootLabReader.plan,m=RootLabReader.model,r=document.querySelector('#readerV24');return {word:m.word,senses:r.querySelectorAll('.bi-sense').length,expected:m.senses.length,examples:r.querySelectorAll('.rp-example-record').length,exExpected:m.examples.length,phrases:r.querySelectorAll('.lr-phrase-row').length,phExpected:m.phrases.length,ledger:p.ledger.every(l=>p.cards.some(x=>x.cardId===l.cardId&&x.sourceRecordIds.includes(l.id))),folds:r.querySelectorAll('details').length}})()");
  check('Full source representation: '+w,r.senses===r.expected&&r.examples===r.exExpected&&r.phrases===r.phExpected&&r.ledger&&!r.folds,r);
 }
 await c.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await c.val("RootLabReaderBridge.open('bank')");await until("RootLabReader.context.word==='bank'&&RootLabReader.plan?.loaded");
 const layout=await c.val("({overflow:document.body.scrollWidth>document.documentElement.clientWidth,search:document.querySelector('#entrySearchInput').getBoundingClientRect().width})");
 check('Mobile content stays within viewport',!layout.overflow&&layout.search>250,layout);
 await c.val("document.querySelector('#module-usage-senses').scrollIntoView({block:'start',behavior:'instant'})");
 await c.shot('/Users/zhuwenpeng/Developer/wordroot-lab-workspace/runtime/v219/qa/bank-mobile-unit.png');
 const physical=await c.val("(()=>{const a=[...document.querySelectorAll('#module-usage-senses .rp-card-senses')],groups=[...document.querySelectorAll('#module-usage-senses [data-content-group]')];return{longest:Math.max(...a.map(x=>x.offsetHeight)),oneTitle:groups.every(x=>x.querySelectorAll('[data-group-heading]').length===1),nav:[...document.querySelectorAll('.rp-section-links a,.rp-section-links button')].map(n=>n.textContent.replace(/\s+/g,'')),unmatched:RootLabAuthored.audit().unmatched}})()");
 check('Mobile meaning cards remain compact with a single topic title',physical.longest<1800&&physical.oneTitle,physical);
 check('Meaning, expressions and practice navigation are present',physical.nav.length===3&&physical.nav.some(x=>x.includes('练习')),physical.nav);
 check('All newly introduced bilingual controls have paired text',!physical.unmatched.length,physical.unmatched);
 await c.call('Page.reload',{});await until("RootLabReader.plan?.loaded&&RootLabReader.context.word==='bank'");
 check('Refresh keeps the selected word and reading plan',await c.val("new URL(location.href).searchParams.get('word')==='bank'&&RootLabReader.plan.uiVersion==='2.19.0'"));
 await c.call('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});
 await c.call('Page.navigate',{url:'http://localhost:8899/?word=light&v=2.19.0&regression=single-unit'});
 await until("RootLabReader.plan?.loaded&&RootLabReader.context.word==='light'");
 const longWord=await c.val("(()=>{const r=document.querySelector('#readerV24'),cards=[...r.querySelectorAll('#module-usage-senses .rp-card-senses')];return{cards:cards.length,meanings:RootLabReader.model.displayMeanings.length,oneMeaning:cards.every(c=>c.querySelectorAll('[data-meaning-id]').length===1),maxHeight:Math.max(...cards.map(c=>c.offsetHeight)),exampleCount:r.querySelectorAll('.rp-example-record').length,expectedExamples:RootLabReader.model.examples.length,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth}})()");
 check('Dense multi-meaning light renders as manageable one-meaning cards at 320px',longWord.cards===longWord.meanings&&longWord.oneMeaning&&longWord.maxHeight<1800&&longWord.exampleCount===longWord.expectedExamples&&!longWord.overflow,longWord);
 const errors=c.events.filter(e=>e.method==='Runtime.exceptionThrown');check('No uncaught exceptions',errors.length===0,errors);
 const out={status:checks.every(x=>x.ok)?'PASS':'FAIL',checks};fs.writeFileSync('/Users/zhuwenpeng/Developer/wordroot-lab-workspace/runtime/v219/qa/browser-local.json',JSON.stringify(out,null,2));
 console.log('SUMMARY',checks.filter(x=>x.ok).length,'/',checks.length);c.close();if(out.status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=2});
