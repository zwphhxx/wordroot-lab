/* Exercise actual selected encyclopedia articles in an isolated browser.
 * Check INTERNAL inset and gaps, not just the shared outer card width. */
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9441));
 const origin=(process.env.ROOTLAB_TEST_ORIGIN||'http://localhost:8861/').replace(/\/?$/,'/');
 const output=process.env.WIKI_SPACING_REPORT||path.join(__dirname,'../.work/v2161/wiki-spacing.json');
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const checks=[],measurements=[];
 const check=(name,ok,detail)=>{checks.push({name,ok:!!ok,detail});console.log((ok?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail??''));};
 const until=async expr=>{for(let i=0;i<350;i++){try{if(await c.val(expr))return;}catch(_){}await c.wait(100);}throw Error('Timeout '+expr);};
 await c.call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await c.call('Network.setBypassServiceWorker',{bypass:true});await c.call('Network.setCacheDisabled',{cacheDisabled:true});
 await c.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await c.call('Page.navigate',{url:origin+'?v=2.16.1&word=carrier'});
 await until('window.RootLabReader?.plan?.loaded&&window.RootLabEncyclopedia');
 await c.val('RootLabEncyclopedia.setAuto(false)');
 check('Page, URL and reading plan agree on 2.16.1',await c.val("document.querySelector('meta[name=application-version]').content==='2.16.1'&&RootLabReader.plan.uiVersion==='2.16.1'&&new URL(location.href).searchParams.get('v')==='2.16.1'"));
 for(const [word,topic]of [['carrier','Mobile network operator'],['species','Species'],['dogwood','Cornus']]){
  await c.val(`RootLabReaderBridge.open(${JSON.stringify(word)})`);await until(`RootLabReaderBridge.loaded(${JSON.stringify(word)})&&RootLabReader.plan?.loaded`);
  await c.val(`RootLabEncyclopedia.article(document.querySelector('.wiki-enrichment'),${JSON.stringify(topic)},'en',true)`);
  await until("document.querySelectorAll('.wiki-card.wiki-language-block').length>=2");
  const original=await c.val("[...document.querySelectorAll('.wiki-summary')].map(n=>({lang:n.lang,text:n.textContent}));");
  check(word+' retains both source languages and topic identity',await c.val(`document.querySelector('#readerV24 h1').textContent===${JSON.stringify(word)}&&document.querySelector('.wiki-article').dataset.canonicalTitle===${JSON.stringify(topic)}&&!!document.querySelector('.wiki-summary[lang=en]')&&!!document.querySelector('.wiki-summary[lang=zh-CN]')`));
  for(const width of [320,390,768,1365,1920]){
   await c.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});
   const r=await c.val(`(()=>{const nodes=[...document.querySelectorAll('.wiki-card.wiki-language-block')],head=document.querySelector('.lr-word-card').getBoundingClientRect();const rows=nodes.map((n,i)=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n),p=n.querySelector('.wiki-summary'),pr=p.getBoundingClientRect(),label=n.querySelector('.wiki-language-label').getBoundingClientRect(),link=n.querySelector('.wiki-language-source').getBoundingClientRect();const pad=parseFloat(s.getPropertyValue('--reading-pad')),gap=parseFloat(s.getPropertyValue('--reading-gap'));return {lang:n.dataset.language,padding:parseFloat(s.paddingLeft),expectedPadding:pad,inset:pr.left-b.left,gap:i?b.top-nodes[i-1].getBoundingClientRect().bottom:null,expectedGap:gap,border:parseFloat(s.borderTopWidth),outerError:Math.max(Math.abs(b.left-head.left),Math.abs(b.right-head.right)),textAlignment:Math.max(Math.abs(label.left-pr.left),Math.abs(link.left-pr.left)),rightInset:b.right-pr.right,labelAbove:label.bottom<=pr.top,sourceBelow:link.top>=pr.bottom,unclipped:n.scrollHeight<=n.clientHeight+2&&s.overflowY==='visible',font:parseFloat(getComputedStyle(p).fontSize),height:b.height}});return {width:innerWidth,overflow:document.body.scrollWidth>document.documentElement.clientWidth,rows}})()`);
   measurements.push({word,...r});
   check(word+' cards have real padding, separation and aligned text at '+width,!r.overflow&&r.rows.every(x=>x.padding===x.expectedPadding&&Math.abs(x.inset-x.expectedPadding-1)<=1&&x.rightInset>=x.expectedPadding&&x.border>=1&&x.outerError<=1&&x.textAlignment<=1&&(x.gap===null||x.gap>=x.expectedGap-1)&&x.labelAbove&&x.sourceBelow&&x.unclipped&&x.font>=16),r);
  }
  check(word+' reflow preserves every source paragraph and citation',await c.val(`JSON.stringify([...document.querySelectorAll('.wiki-summary')].map(n=>({lang:n.lang,text:n.textContent})))===${JSON.stringify(JSON.stringify(original))}&&document.querySelectorAll('.wiki-language-source').length===${original.length}&&document.querySelectorAll('.bi-sense').length===RootLabBilingual.get(${JSON.stringify(word)}).senses.length&&!document.querySelector('#readerV24 details')`));
  if(word==='carrier'){
   for(const width of [1365,390]){await c.call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<700});await c.val("document.querySelector('.wiki-language-block').scrollIntoView({block:'start',behavior:'instant'});scrollBy(0,-72)");await c.wait(100);await c.shot(path.join(path.dirname(output),'carrier-wiki-'+width+'.png'));}
   await c.val('RootLabReaderBridge.refresh();RootLabReaderBridge.refresh()');await c.wait(100);
   check('Same-word refresh preserves one article and the corrected card shell',await c.val("document.querySelectorAll('.wiki-article').length===1&&document.querySelectorAll('.wiki-enrichment').length===1&&[...document.querySelectorAll('.wiki-language-block')].every(n=>parseFloat(getComputedStyle(n).paddingLeft)>=16)"));
  }
 }
 await c.val("RootLabReaderBridge.open('carrier')");await until("RootLabReader.context.word==='carrier'&&RootLabReader.plan.loaded");
 await c.call('Page.reload',{});await until("window.RootLabReader?.plan?.loaded&&!!document.querySelector('.wiki-article')");
 check('Saved topic reload retains layout, selected query and sources',await c.val("new URL(location.href).searchParams.get('word')==='carrier'&&document.querySelectorAll('.wiki-language-source').length>=2&&parseFloat(getComputedStyle(document.querySelector('.wiki-language-block')).paddingLeft)>=16"));
 const errors=c.events.filter(x=>x.method==='Runtime.exceptionThrown');check('No uncaught browser exceptions',!errors.length,errors);
 const out={status:checks.every(x=>x.ok)?'PASS':'FAIL',origin,uiVersion:'2.16.1',checks,measurements,scope:'Actual Wikipedia selections and five Chromium viewport widths. No real learner profile used; no all-browser certification.'};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(out,null,2));console.log('SUMMARY',checks.filter(x=>x.ok).length,'/',checks.length);c.close();if(out.status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(2)});
