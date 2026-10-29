/* V2.5 shell upgrade preserves previously downloaded dictionary bundles. */
const CACHE_NAME='rootlab-offline-v2191-concrete-overview-20dbabd4241ad0';
const APP_SHELL=['./','./index.html','./lexicon-core-v24.js','./roots-v21.js','./word-history-v22.js','./word-etymology-curated-v23.js','./history-ui-v212.js','./memory-engine-v2.js','./navigation-v2191.js','./bilingual-seeds-v212.js','./dictionary-repository-v212.js','./authored-pairs-v212.js','./authored-ui-v215.js','./bilingual-v215.js','./reading-ui-v219.js','./reader-v219.js','./whole-word-v27.js','./search-control-v27.js','./basic-learning-v210.js','./plain-objects-v210.js','./visual-seeds-v29.js','./visual-extra-v210.js','./meaning-notes-v210.js','./meaning-explainer-v212.js','./visual-caption-v212.js','./encyclopedia-v215.js','./images/andiron-in-use.png','./reader-v213.css','./reader-v215.css','./reader-v2191.css','./reader-v219.css','./reader-v218.css','./reader-v2171.css','./reader-v2161.css','./reader-v216.css','./reader-v214.css','./reader-semantics-v2171.js','./reader-adapters-v2171.js','./reader-units-v219.js','./reader-plan-v2191.js','./reader-layout-v218.js','./reader-cards-v2191.js','./dictionary-corrections-v215.js','./visual-reviewed-v215.js','./reader-overview-v2191.js','./reader-components-v2191.js','./reading-cards-v210.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./credits.html','./data/release-approval-v212.json','./data/reader-v24-manifest.json','./data/usage-v27-manifest.json','./data/bilingual-v212/v212-20dbabd4241ad0/manifest.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL.map(path=>new Request(path,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const next=await caches.open(CACHE_NAME);
 for(const key of await caches.keys()){
  if(!key.startsWith('rootlab-offline-')||key===CACHE_NAME)continue;
  const old=await caches.open(key);
  for(const req of await old.keys()){
   const url=new URL(req.url);
   if(url.origin===self.location.origin&&(url.pathname.includes('/data/reader-v24/')||(url.pathname.includes('/data/usage-v27/')||url.pathname.includes('/data/bilingual-v212/'))||(url.pathname.includes('/images/visual-v29/')||url.pathname.includes('/images/visual-v210/')||url.pathname.includes('/images/visual-v215/')))&&!(await next.match(req))){const saved=await old.match(req);if(saved?.ok)await next.put(req,saved);}
  }
  await caches.delete(key);
 }
 await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const isIndex=req.mode==='navigate'&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html'));
 if(isIndex){event.respondWith((async()=>{const c=await caches.open(CACHE_NAME);try{const r=await fetch(req);if(r.ok)await c.put('./index.html',r.clone());return r;}catch(_){return(await c.match('./index.html'))||Response.error();}})());return;}
 event.respondWith((async()=>{const c=await caches.open(CACHE_NAME),cached=await c.match(req);if(cached)return cached;try{const r=await fetch(req);if(r.ok&&((url.pathname.includes('/data/reader-v24/')||(url.pathname.includes('/data/usage-v27/')||url.pathname.includes('/data/bilingual-v212/'))||(url.pathname.includes('/images/visual-v29/')||url.pathname.includes('/images/visual-v210/')||url.pathname.includes('/images/visual-v215/')))||APP_SHELL.some(x=>url.pathname.endsWith(x.slice(2)))))await c.put(req,r.clone());return r;}catch(_){return Response.error();}})());
});
