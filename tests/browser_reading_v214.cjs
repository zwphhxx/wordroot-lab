/* Real-origin acceptance gate, with an isolated browser profile only. */
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9314));
 const origin=(process.env.ROOTLAB_TEST_ORIGIN||'http://localhost:8824/').replace(/\/?$/,'/');
 const checks=[],check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail??''));};
 const until=async expr=>{for(let i=0;i<120;i++){try{if(await c.val(expr))return;}catch(_){}await c.wait(200);}throw Error('Timeout '+expr);};
 const open=async w=>{await c.val(`RootLabReaderBridge.open(${JSON.stringify(w)})`);await until(`RootLabReader.context.word===${JSON.stringify(w)}&&RootLabReader.plan?.loaded&&RootLabReaderBridge.loaded(${JSON.stringify(w)})`);await c.wait(120);};
 await c.call('Page.navigate',{url:origin+'?v=2.14.0&word=carrier'});await until('window.RootLabReader?.plan?.loaded');
 check('Actual V2.14 shell',await c.val(`document.querySelector('meta[name="application-version"]').content==='2.14.0'&&location.protocol!=='about:'`));
 for(const word of ['carrier','bank','photograph','successful','apple','banana','andiron','resilient','equity','revolution','mellow','siting']){
  await open(word);
  const r=await c.val(`(()=>{const root=document.querySelector('#readerV24'),p=RootLabReader.plan,m=RootLabReader.model,x=RootLabBilingual.get(${JSON.stringify(word)});return{stages:[...root.querySelectorAll('[data-module]')].map(n=>n.dataset.module),plan:p.sections.map(s=>s.id),senses:root.querySelectorAll('.bi-sense').length,expected:x.senses.length,examples:root.querySelectorAll('.rp-example-record').length,expectedExamples:m.examples.length,folds:root.querySelectorAll('details').length,unaccounted:m.inventory.filter(r=>!p.ledger.some(l=>l.kind===r.kind&&l.id===r.id)).length}})()`);
  check('Uniform source-complete page: '+word,JSON.stringify(r.stages)===JSON.stringify(r.plan)&&r.senses===r.expected&&r.examples===r.expectedExamples&&!r.folds&&!r.unaccounted,r);
 }
 await open('banana');await until(`(()=>{const x=document.querySelector('.visual-zoom img');return x?.complete&&x.naturalWidth>0})()`);
 check('Real local photo decoded',await c.val(`document.querySelector('.visual-zoom img').naturalWidth>0`));
 await c.val(`document.querySelector('#searchInput').focus()`);await c.wait(60);await c.call('Input.insertText',{text:'water'});await until(`!!document.querySelector('#searchSuggestions [data-word="water"]')`);await c.val(`document.querySelector('#searchSuggestions [data-word="water"]').click()`);await until(`RootLabReader.context.word==='water'`);
 check('Search and URL single word',await c.val(`document.querySelector('#searchInput').value==='water'&&new URL(location.href).searchParams.get('word')==='water'`));
 await c.call('Page.reload',{});await until(`window.RootLabReader?.context?.word==='water'&&RootLabReader.plan?.loaded`);
 check('Refresh stays on selected word',await c.val(`RootLabReader.context.word==='water'&&new URL(location.href).searchParams.get('v')==='2.14.0'`));
 await open('carrier');await c.val(`document.querySelector('[href="#read-section-usage"]').click()`);await c.wait(500);
 check('Chapter jump does not hide meanings or obscure focus',await c.val(`document.querySelectorAll('.bi-sense').length===15&&document.activeElement.id==='read-section-usage'&&document.activeElement.getBoundingClientRect().top>=48`));
 await open('bank');await c.val('history.back()');await until(`RootLabReader.context.word==='carrier'`);check('Back restores preceding word',true);
 await c.val('history.forward()');await until(`RootLabReader.context.word==='bank'`);check('Forward restores following word',true);
 for(const width of [320,390,768,1365,1920]){await c.call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});check('No overflow at '+width,await c.val('document.body.scrollWidth===document.documentElement.clientWidth'));}
 await open('carrier');await c.val(`localStorage.setItem('rootlab_standalone_demo_v3',JSON.stringify({...RootLabTest.state,favorites:['carrier'],review:{carrier:{step:3,due:'2031-02-03',last:'2026-10-25'}}}))`);
 await c.val(`navigator.serviceWorker.ready`);await c.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await c.call('Page.reload',{});await until(`window.RootLabReader?.plan?.loaded&&RootLabReader.context.word==='carrier'`);
 check('Offline shell, 15 meanings and review date preserved',await c.val(`!navigator.onLine&&document.querySelectorAll('.bi-sense').length===15&&RootLabTest.state.review.carrier.due==='2031-02-03'&&RootLabTest.state.favorites.includes('carrier')`));
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 const errors=c.events.filter(e=>e.method==='Runtime.exceptionThrown');check('No uncaught exceptions',errors.length===0,errors);
 const result={status:checks.every(x=>x.ok)?'PASS':'FAIL',origin,checks,scope:'Actual-origin isolated browser; no real user profile'};const file=process.env.READING_REPORT||path.join(__dirname,'../.work/reading-v214/browser-results.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2));console.log('RESULT',result.status,checks.length);c.close();if(result.status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(2)});
