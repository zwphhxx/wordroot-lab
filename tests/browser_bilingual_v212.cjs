/* Isolated local preview only. Does not modify the user's actual browser profile. */
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9280)),out=[],origin='http://localhost:8800';
 const check=(name,ok,details)=>{out.push({name,ok:!!ok,details:details??''});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(details??''));};
 const until=async(expr,max=80)=>{for(let i=0;i<max;i++){try{if(await c.val(expr))return true}catch(_){}await c.wait(150)}return false};
 await c.call('Page.navigate',{url:origin+'/?v=2.12.0&word=carrier'});await until('window.RootLabReader?.context?.word==="carrier"&&window.RootLabBilingual?.has("carrier")');
 await c.val(`localStorage.setItem('rootlab_visual_auto_v29','off');localStorage.setItem('rootlab_standalone_demo_v3',JSON.stringify({favorites:['success'],review:{success:{step:3,due:'2031-02-03',last:'2026-10-25'}},mistakes:[]}))`);
 await c.call('Page.reload',{});await until('window.RootLabReader?.context?.word==="carrier"&&window.RootLabBilingual?.has("carrier")');
 check('Candidate version and dictionary retained',await c.val(`document.querySelector('meta[name="application-version"]').content==='2.12.0'&&RootLabTest.lexiconCount===49426`));
 check('Preview not mislabeled as published',await c.val(`document.querySelector('.bi-preview-notice')?.textContent.includes('未发布')`));
 check('15 carrier senses individually identified',await c.val(`RootLabBilingual.get('carrier').senses.length===15&&document.querySelectorAll('#readerV24 .bi-sense').length===15`));
 check('Stable source IDs replace list positions',await c.val(`RootLabBilingual.get('carrier').senses.every(s=>/^(editorial:|wn30:|ecdict:)/.test(s.id)&&s.sourceRefs?.length)`));
 check('Carrier mobile and aircraft senses separately explained',await c.val(`(()=>{const senses=RootLabBilingual.get('carrier').senses;const mobile=senses.find(s=>s.labelZh==='移动通信运营商');const aircraft=senses.find(s=>s.labelZh==='航空母舰');return !!mobile&&!!aircraft&&mobile.id!==aircraft.id&&mobile.en.includes('mobile phone')&&aircraft.en.includes('naval ship');})()`));
 check('Paired explanatory paragraphs show Chinese first',await c.val(`Array.from(document.querySelectorAll('#readerV24 .bi-pair')).every(n=>n.querySelector('[lang="en"]')&&n.querySelector('[lang="zh-CN"]')&&n.querySelector('p')?.lang==='zh-CN')`));
 check('Examples all have matching bilingual fields',await c.val(`RootLabBilingual.get('carrier').examples.every(e=>e.en&&e.zh&&e.senseIds?.length)`));
 check('Related definition belongs to target not carrier',await c.val(`(()=>{let x=RootLabBilingual.get('carrier');let r=x.relations.find(r=>r.word==='warship');return r&&r.en.includes('government ship')&&!r.en.includes('carries planes')&&r.fromSenseId!==r.toSenseId;})()`));
 check('Unhelpful being relation omitted from recommendations',await c.val(`!RootLabBilingual.get('carrier').relations.some(r=>r.word==='being')`));
 check('Context question no random success distractor',await c.val(`letQ=RootLabBilingual.quiz(RootLabReader.context);!!letQ&&!letQ.options.includes('成功')&&letQ.q.includes('mobile carrier')`));
 check('No collapsed learning modules',await c.val(`!document.querySelector('#readerV24 details')`));
 await c.val(`RootLabReaderBridge.open('bank')`);await until(`RootLabReader.context?.word==='bank'&&RootLabBilingual.has('bank')`);
 check('Nonseed word lazy loads checked current build',await c.val(`RootLabBilingual.get('bank')?.word==='bank'&&RootLabDictionaryRepository.buildId===ROOTLAB_BILINGUAL_META.buildId`));
 check('Word URL follows lookup',await c.val(`new URL(location.href).searchParams.get('word')==='bank'`));
 check('Polysemous bank has distinct definitions',await c.val(`RootLabBilingual.get('bank').senses.length>3`));
 check('Unreviewed machine meanings do not generate quiz',await c.val(`RootLabBilingual.quiz(RootLabReader.context)===null`));
 await c.call('Page.reload',{});await until(`window.RootLabReader?.context?.word==='bank'&&window.RootLabBilingual?.has('bank')`);
 check('Refresh preserves word and input',await c.val(`RootLabReader.context.word==='bank'&&document.querySelector('#searchInput').value==='bank'`));
 check('Favorites and scheduled review date preserved',await c.val(`RootLabTest.state.favorites.includes('success')&&RootLabTest.state.review.success.due==='2031-02-03'`));
 await c.val(`RootLabReaderBridge.open('carrier')`);await until(`RootLabReader.context?.word==='carrier'`);
 for(const width of [320,390,768,1365,1920]){
  await c.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<800});
  const box=await c.val(`({width:innerWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth,reader:document.querySelector('#readerV24').getBoundingClientRect().width})`);
  check('Bilingual cards fit '+width,box.body===box.client&&box.reader<=box.client,box);
 }
 await c.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await c.val(`document.querySelector('#readerV24 .bi-sense-list').scrollIntoView({block:'start',behavior:'instant'})`);
 fs.mkdirSync(path.join(__dirname,'../reports/screenshots'),{recursive:true});await c.shot(path.join(__dirname,'../reports/screenshots/carrier-bilingual.png'));
 await c.val(`navigator.serviceWorker.ready`);await c.wait(400);
 const offlineReady=await c.val(`(async()=>{const keys=await caches.keys();const key=keys.find(k=>k.includes(ROOTLAB_BILINGUAL_META.buildId.slice(5)));if(!key)return false;const cache=await caches.open(key);const urls=(await cache.keys()).map(k=>k.url);return urls.some(x=>x.endsWith('/dictionary-repository-v212.js'));})()`);
 check('Offline shell includes versioned repository',offlineReady);
 await c.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await c.call('Page.reload',{});const loaded=await until(`window.RootLabReader?.context?.word==='carrier'&&window.RootLabBilingual?.has('carrier')`);
 check('Offline carrier and saved dates remain',loaded&&await c.val(`!navigator.onLine&&RootLabTest.state.review.success.due==='2031-02-03'&&RootLabBilingual.get('carrier').senses.length===15`));
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 const errors=c.events.filter(e=>e.method==='Runtime.exceptionThrown').map(e=>e.params.exceptionDetails.text);check('No uncaught browser exceptions',errors.length===0,errors);
 const build=await c.val('ROOTLAB_BILINGUAL_META.buildId');fs.writeFileSync(path.join(__dirname,'../reports/browser-results.json'),JSON.stringify({status:out.every(x=>x.ok)?'PASS':'FAIL',buildId:build,checks:out,scope:'Targeted candidate browser checks only; does not certify full old regression or semantic quality'},null,2));
 console.log('SUMMARY',out.filter(x=>x.ok).length,'/',out.length);c.close();if(out.some(x=>!x.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=2});
