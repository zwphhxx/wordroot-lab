/* Static captions were explicitly translated; test exact pairing and preserved image actions. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{const c=await require('./cdp_helper.cjs')(Number(process.env.CDP_PORT||9284)),checks=[];
const check=(n,o,d='')=>{checks.push({name:n,ok:!!o,details:d});console.log((o?'PASS ':'FAIL ')+n+' '+JSON.stringify(d));};
await c.call('Network.setBypassServiceWorker',{bypass:true});await c.call('Page.navigate',{url:'http://localhost:8800/?word=apple&test=visual-pairs'});
for(let i=0;i<100;i++){if(await c.val('!!window.RootLabReader?.ready&&!!window.ROOTLAB_VISUAL_BILINGUAL'))break;await c.wait(80);}
await c.val('RootLabEncyclopedia.setAuto(false);RootLabEncyclopedia.clear();RootLabReaderBridge.refresh()');await c.wait(80);
const data=await c.val(`(()=>{const a=ROOTLAB_VISUAL_SEEDS,b=ROOTLAB_VISUAL_BILINGUAL;return{total:Object.keys(a).length,translated:Object.keys(b).length,bad:Object.entries(a).filter(([w,s])=>!b[w]||b[w].zh!==s.caption||!b[w].en||!b[w].sourceCaptionHash).map(([w])=>w)}})()`);
check('All 122 exact caption sources have reviewed counterparts',data.total===122&&data.translated===122&&!data.bad.length,data);
for(const word of ['apple','banana','water','photograph','portable','microscope']){
 await c.val(`RootLabReaderBridge.open('${word}')`);await c.wait(100);
 const x=await c.val(`(()=>{const p=document.querySelector('.visual-caption-pair'),img=document.querySelector('.visual-figure img');return{zh:p?.querySelector('[lang="zh-CN"]')?.textContent,en:p?.querySelector('[lang="en"]')?.textContent,alt:img?.alt,source:!!document.querySelector('.visual-figure figcaption a'),canZoom:!!document.querySelector('.visual-zoom[data-wiki="zoom"]')}})()`);
 const expected=await c.val(`ROOTLAB_VISUAL_BILINGUAL['${word}']`);
 check(word+' preserves exact bilingual caption, picture and licence',x.zh===expected.zh&&x.en===expected.en&&x.alt.includes(expected.en)&&x.source&&x.canZoom,x.en);
}
await c.val(`document.querySelector('.visual-zoom').click()`);check('Image enlargement still works',await c.val('document.querySelector("#visualLightbox")?.open===true'));
await c.val(`document.querySelector('[data-wiki="close-zoom"]').click()`);
check('Title placeholder label is bilingual and honest',await c.val(`RootLabEncyclopedia.placeholder('abstract').includes('非实物图')&&RootLabEncyclopedia.placeholder('abstract').includes('Not a photograph')`));
check('No learning accordion introduced',await c.val(`!document.querySelector('#readerV24 details')`));
const build=await c.val('ROOTLAB_BILINGUAL_META.buildId');const result={status:checks.every(x=>x.ok)?'PASS':'FAIL',buildId:build,checks,scope:'static editorial image captions only',sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../visual-caption-v212.js'))).digest('hex')};
fs.writeFileSync(path.join(__dirname,'../reports/browser-visual-pairs-v212.json'),JSON.stringify(result,null,2));console.log('SUMMARY',checks.filter(x=>x.ok).length,'/',checks.length);c.close();if(checks.some(x=>!x.ok))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=2});
