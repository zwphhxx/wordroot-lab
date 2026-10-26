/* Run against a clean release directory or the public site in an isolated browser profile. */
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9290));
 const origin=(process.env.ROOTLAB_TEST_ORIGIN||'http://localhost:8800/').replace(/\/?$/,'/'),build=process.env.EXPECT_BUILD||'v212-d99509bea02c69',checks=[];
 const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail??''));};
 const until=async(expr)=>{for(let i=0;i<120;i++){try{if(await c.val(expr))return true}catch(_){}await c.wait(200)}throw Error('Timeout: '+expr)};
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await c.call('Network.setBypassServiceWorker',{bypass:false});
 await c.call('Page.navigate',{url:origin+'?v=2.12.0&word=carrier&verify='+Date.now()});await until('window.RootLabReader?.context?.word==="carrier"&&window.RootLabBilingual?.has("carrier")');
 check('Published shell and approved data build agree',await c.val(`document.querySelector('meta[name="application-version"]').content==='2.12.0'&&ROOTLAB_BILINGUAL_META.buildId===${JSON.stringify(build)}&&ROOTLAB_BILINGUAL_META.releaseStatus==='approved'&&!document.querySelector('.bi-preview-notice')`));
 const receipt=await c.val(`(async()=>{const a=await(await fetch('./data/release-approval-v212.json',{cache:'no-store'})).json();const r=await fetch('./reports/accepted-gate-'+a.buildId+'.json',{cache:'no-store'});const bytes=await r.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');return {status:a.status,build:a.buildId,hashMatches:hash===a.gateSha256,checks:a.gateChecks}})()`);
 check('Published approval receipt matches actual acceptance evidence',receipt.status==='approved'&&receipt.build===build&&receipt.hashMatches&&receipt.checks===22,receipt);
 check('49,426 words and 15 carrier meanings retained',await c.val(`RootLabTest.lexiconCount===49426&&RootLabBilingual.get('carrier').senses.length===15&&document.querySelectorAll('#readerV24 .bi-sense').length===15`));
 check('Carrier senses, phrases and examples display two languages',await c.val(`[...document.querySelectorAll('#readerV24 .bi-pair,#readerV24 .bi-example')].every(n=>n.querySelector('[lang="zh-CN"]')?.textContent.trim()&&n.querySelector('[lang="en"]')?.textContent.trim())`));
 await c.val(`RootLabReaderBridge.open('bank')`);await until(`RootLabReader.context.word==='bank'&&RootLabBilingual.has('bank')`);
 check('Non-seed multiple meanings load from verified package',await c.val(`(()=>{const s=RootLabBilingual.get('bank').senses,a=s.find(x=>x.id==='wn30:bank%1:17:01::'),b=s.find(x=>x.id==='wn30:bank%1:14:00::');return s.length>=10&&a?.en.includes('body of water')&&a.zh.includes('坡岸')&&b?.en.includes('financial institution')&&b.zh.includes('金融机构')&&a.id!==b.id})()`));
 await c.val(`RootLabReaderBridge.open('apple')`);await until(`RootLabReader.context.word==='apple'`);await c.wait(300);
 check('Existing photo and bilingual caption preserved',await c.val(`!!document.querySelector('.visual-zoom img[src*="apple"]')&&!!document.querySelector('.visual-caption-pair [lang="zh-CN"]')&&!!document.querySelector('.visual-caption-pair [lang="en"]')`));
 await c.val(`document.getElementById('searchInput').focus()`);await c.wait(70);await c.call('Input.insertText',{text:'water'});await c.wait(180);
 check('New search replaces rather than appends old word',await c.val(`document.getElementById('searchInput').value==='water'`));
 await until(`!!document.querySelector('#searchSuggestions [data-word="water"]')`);await c.val(`document.querySelector('#searchSuggestions [data-word="water"]').click()`);await until(`RootLabReader.context.word==='water'`);
 check('Selected word and share URL stay synchronized',await c.val(`document.getElementById('searchInput').value==='water'&&new URL(location.href).searchParams.get('word')==='water'`));
 await c.call('Page.reload',{});await until(`window.RootLabReader?.context?.word==='water'&&RootLabBilingual.has('water')`);
 check('Refreshing restores current query',await c.val(`document.getElementById('searchInput').value==='water'&&document.querySelector('#readerV24 h1').textContent==='water'`));
 for(const width of [390,1365]){await c.call('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<700});check('Published cards fit '+width+' viewport',await c.val(`document.body.scrollWidth===document.documentElement.clientWidth`));}
 await c.val(`RootLabReaderBridge.open('carrier')`);await until(`RootLabReader.context.word==='carrier'`);await c.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await c.val(`scrollTo({top:0,behavior:'instant'})`);
 const shot=process.env.RELEASE_SCREENSHOT;if(shot)await c.shot(shot);
 check('Cards remain open and no membership prompt',await c.val(`!document.querySelector('#readerV24 details')&&!document.querySelector('#readerV24').textContent.includes('开通会员')`));
 await c.val(`(async()=>{await navigator.serviceWorker.ready;localStorage.setItem('rootlab_standalone_demo_v3',JSON.stringify({...RootLabTest.state,favorites:['carrier'],review:{carrier:{step:3,due:'2031-02-03',last:'2026-10-25'}}}));})()`);
 await c.call('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await c.call('Page.reload',{});await until(`window.RootLabReader?.context?.word==='carrier'&&window.RootLabBilingual?.has('carrier')`);
 check('Published offline page keeps meanings and exact saved review date',await c.val(`!navigator.onLine&&RootLabBilingual.get('carrier').senses.length===15&&RootLabTest.state.favorites.includes('carrier')&&RootLabTest.state.review.carrier.due==='2031-02-03'`));
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 const errors=c.events.filter(x=>x.method==='Runtime.exceptionThrown').map(x=>x.params.exceptionDetails.text);check('No uncaught browser errors',errors.length===0,errors);
 const out={status:checks.every(x=>x.ok)?'PASS':'FAIL',origin,buildId:build,checkedAt:new Date().toISOString(),checks,scope:'Isolated browser with test learning state; does not read or overwrite a real user browser.'};
 fs.writeFileSync(process.env.RELEASE_REPORT||path.join(__dirname,'../reports/published-browser-v212.json'),JSON.stringify(out,null,2));console.log('SUMMARY',checks.filter(x=>x.ok).length,'/',checks.length);c.close();if(out.status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(2)});
