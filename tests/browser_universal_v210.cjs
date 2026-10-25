/* Run only in an isolated Chrome test profile. */
const fs=require('node:fs');
(async()=>{
 const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9262)),checks=[];
 const check=(name,ok,details='')=>{checks.push({name,ok:!!ok,details});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(details));};
 const v=async(name,expression)=>{const data=await c.val(expression);check(name,data?.ok??data,data?.details??'');};
 const click=sel=>c.val(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw Error('Missing '+${JSON.stringify(sel)});e.click()})()`);
 const waitFor=async(expr,max=8000)=>{for(let i=0;i<max/100;i++){if(await c.val(expr))return true;await c.wait(100);}return false;};
 await c.call('Network.setBypassServiceWorker',{bypass:false});await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await c.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.val(`(async()=>{for(const key of await caches.keys())await caches.delete(key);for(const reg of await navigator.serviceWorker.getRegistrations())await reg.unregister();RootLabReader.clearData();localStorage.setItem('rootlab_standalone_demo_v3',JSON.stringify({favorites:['apple'],review:{apple:{step:2,due:'2030-01-02',last:'2026-10-20'}},mistakes:[],quizRuns:4,quizCorrect:6}));})()`);
 await c.call('Page.navigate',{url:'http://localhost:8799/?word=apple&v=27'});await waitFor('!!window.RootLabSearchController&&!!window.RootLabReader?.ready');
 await c.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await v('Old favorites and exact due date preserved',`RootLabTest.state.favorites.includes('apple')&&RootLabTest.state.review.apple.due==='2030-01-02'`);
 await v('Reviewed apple profile unchanged',`RootLabReader.context.learning.basic&&!RootLabReader.context.learning.basic.generated&&document.querySelectorAll('#readerV24 .lr-phrase-row').length===6`);
 // Input value replacement: this exact workflow previously produced applewater.
 await c.val(`document.querySelector('#searchInput').focus()`);await c.wait(60);
 await v('Re-entering a searched word selects it for replacement',`(()=>{const q=document.querySelector('#searchInput');return q.selectionStart===0&&q.selectionEnd===5})()`);
 await c.call('Input.insertText',{text:'water'});await c.wait(160);
 await v('New typed word replaces old input instead of concatenating',`document.querySelector('#searchInput').value==='water'`);
 await click('#searchSuggestions [data-word="water"]');await c.wait(180);
 await v('Click suggestion commits exactly one complete word',`document.querySelector('#searchInput').value==='water'&&RootLabReader.context.word==='water'&&document.querySelector('#searchSuggestions').classList.contains('hidden')`);
 await c.val(`(()=>{const q=document.querySelector('#searchInput');q.focus();q.value='coff';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);await c.wait(160);
 await c.call('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown'});
 await v('Arrow navigation does not overwrite typed prefix',`document.querySelector('#searchInput').value==='coff'&&!!document.querySelector('#searchInput').getAttribute('aria-activedescendant')`);
 await c.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'});await c.wait(170);
 await v('Enter selects highlighted word once',`document.querySelector('#searchInput').value==='coffee'&&RootLabReader.context.word==='coffee'`);
 await c.val(`(()=>{const q=document.querySelector('#searchInput');q.focus();q.value='do';q.dispatchEvent(new Event('input',{bubbles:true}));RootLabReaderBridge.open('dog')})()`);await c.wait(170);
 await v('Stale debounce cannot reopen old popup',`document.querySelector('#searchInput').value==='dog'&&document.querySelector('#searchSuggestions').classList.contains('hidden')`);
 await c.val(`(()=>{const q=document.querySelector('#searchInput');q.focus();q.value='tabl';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);await c.wait(150);
 await c.val(`document.querySelector('#searchInput').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))`);
 await v('Escape preserves user text and closes suggestions',`document.querySelector('#searchInput').value==='tabl'&&document.querySelector('#searchInput').getAttribute('aria-expanded')==='false'`);
 // Simulated mobile composition sequence including late composition/input finalization.
 await c.val(`(()=>{const q=document.querySelector('#searchInput');q.value='apple';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);await c.wait(160);
 await c.val(`(()=>{const q=document.querySelector('#searchInput');q.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:'appl'}));q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,keyCode:229,bubbles:true,cancelable:true}))})()`);
 await v('IME Enter does not submit half-composed word',`RootLabReader.context.word==='dog'&&RootLabSearchController.composing`);
 await click('#searchSuggestions [data-word="apple"]');
 await c.val(`(()=>{const q=document.querySelector('#searchInput');q.value='appleapple';q.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'apple'}));q.dispatchEvent(new InputEvent('input',{inputType:'insertFromComposition',data:'apple',bubbles:true}))})()`);await c.wait(170);
 await v('Late IME commit cannot append to selected suggestion',`document.querySelector('#searchInput').value==='apple'&&RootLabReader.context.word==='apple'`);
 await c.val(`(()=>{const q=document.querySelector('#searchInput');q.focus();q.value='wat';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);await c.wait(160);
 await c.val(`(()=>{const el=document.querySelector('#searchSuggestions [data-word="water"]');el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:8,pointerType:'touch',clientX:60,clientY:120}));el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:8,pointerType:'touch',clientX:60,clientY:120}));el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));})()`);await c.wait(170);
 await v('Touch plus compatibility click does not double select',`RootLabReader.context.word==='water'&&document.querySelector('#searchInput').value==='water'&&RootLabReader.state.trail.filter(x=>x.word==='water').length<=2`);
 await c.wait(550);await c.val(`(()=>{const q=document.querySelector('#searchInput');q.focus();q.value='狗';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);await c.wait(180);
 await v('Chinese search suggestions still work',`document.querySelectorAll('#searchSuggestions [data-word]').length>0`);
 // Entire dictionary model audit: not just the three original basic words.
 const audit=await c.val(`(()=>{const stats={whole:0,root:0},bad=[];for(const row of ROOTLAB_LEXICON){const d=RootLabTest.cardModel(row[0]);stats[d.route]++;if(!d.definitions?.length||d.route==='whole'&&(d.pieces.length||d.family))bad.push(row[0]);}return{stats,bad}})()`);
 check('All 49,426 entries route to supported root or whole-word model',audit.stats.whole+audit.stats.root===49426&&!audit.bad.length,audit);
 for(const word of ['dog','table','time','coffee','read','happy','friend','house','rain']){
  await c.val(`RootLabReaderBridge.open('${word}')`);await waitFor(`RootLabReaderBridge.loaded('${word}')`);
  await v(word+' has whole-word usage, no guessed roots or blank card',`RootLabReader.context.learning.route==='whole'&&!document.querySelector('#readerV24 .lr-parts')&&document.querySelectorAll('#readerV24 .lr-phrase-row').length>=4&&!/暂无明确|这个词尚未收录/.test(document.querySelector('#readerV24').textContent)`);
 }
 await c.val(`RootLabReaderBridge.open('light')`);await waitFor(`RootLabReaderBridge.loaded('light')`);
 await v('light multi-part-of-speech content is displayed',`RootLabReader.context.learning.basic.generated&&document.querySelector('#readerV24').textContent.includes('light a candle')&&RootLabReader.context.learning.definitions.length>1`);
 await c.val(`RootLabReaderBridge.open('concession')`);await waitFor(`RootLabReaderBridge.loaded('concession')`);
 await v('Genuine root word keeps four cards and contextual con- meaning',`RootLabReader.context.learning.route==='root'&&document.querySelectorAll('#readerV24 [data-module]').length===4&&document.querySelector('#readerV24 .lr-part').textContent.includes('强调')`);
 await c.val(`RootLabReaderBridge.open('constructor')`);await waitFor(`RootLabReaderBridge.loaded('constructor')`);
 await v('constructor never resolves Object.prototype as word content',`RootLabReader.context.word==='constructor'&&document.querySelector('#readerV24 h1').textContent==='constructor'&&typeof RootLabReader.context.learning.basic==='object'`);
 await c.val(`RootLabReaderBridge.open('abaca')`);await waitFor(`RootLabReaderBridge.loaded('abaca')`);
 await v('Sparse entries show real available material, not invented stories',`RootLabReader.context.learning.route==='whole'&&!document.querySelector('#readerV24 .lr-parts')&&!/暂无明确|没有足够|未经逐词/.test(document.querySelector('#readerV24').textContent)&&document.querySelectorAll('#readerV24 [data-module]').length>=1`);
 await c.val(`RootLabReaderBridge.open('dog')`);await waitFor(`RootLabReaderBridge.loaded('dog')`);
 await click('#readerV24 [data-reader="favorite"]');await v('Favorite still independent of review',`RootLabTest.state.favorites.includes('dog')&&!RootLabTest.state.review.dog`);
 await click('#readerV24 [data-reader="plan"]');await v('Whole word explicitly added to adaptive review',`!!RootLabTest.state.review.dog`);
 await v('No folded cards reintroduced',`!document.querySelector('#readerV24 details')&&!document.querySelector('#readerV24 summary')`);
 for(const width of [320,390,768,1365]){await c.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});await v('Whole-word cards fit '+width+'px',`({ok:document.body.scrollWidth===innerWidth,details:{vw:innerWidth,body:document.body.scrollWidth}})`);}
 await c.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await c.val('scrollTo({top:0,behavior:"instant"})');await c.shot('/tmp/rootlab-v28-dog-top.png');await c.val(`document.querySelector('#readerV24 [data-module="family"]').scrollIntoView({block:'start',behavior:'instant'})`);await c.shot('/tmp/rootlab-v28-dog-phrases.png');
 const cache=await c.val(`(async()=>{await navigator.serviceWorker.ready;const names=await caches.keys();const key=names.find(n=>n.includes('v2100-clearmeaning'));const c=await caches.open(key);return{key,files:(await c.keys()).map(x=>new URL(x.url).pathname)}})()`);
 check('New input controller and usage chunks cached',cache.files.some(f=>f.endsWith('/search-control-v27.js'))&&cache.files.some(f=>f.endsWith('/data/usage-v27/d.json')),cache.key);
 await c.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await c.call('Page.navigate',{url:'http://localhost:8799/?word=dog&offline=1'});await waitFor('!!window.RootLabReader?.ready');await waitFor(`RootLabReaderBridge.loaded('dog')`);
 await v('Whole-word collocations and search stay available offline',`!navigator.onLine&&document.querySelector('#readerV24').textContent.includes('guide dog')&&!!RootLabSearchController`);
 await v('Existing and new learning records survive refresh',`RootLabTest.state.review.apple.due==='2030-01-02'&&RootLabTest.state.favorites.includes('dog')`);
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 const errors=c.events.filter(x=>x.method==='Runtime.exceptionThrown').map(x=>x.params.exceptionDetails.text);check('No browser exceptions',!errors.length,errors);
 fs.writeFileSync('/tmp/rootlab-v28-browser-results.json',JSON.stringify(checks,null,2));console.log('SUMMARY',checks.filter(x=>x.ok).length,'/',checks.length);c.close();if(checks.some(x=>!x.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(2)});
