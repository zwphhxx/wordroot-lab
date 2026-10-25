/* V2.5 shell upgrade preserves previously downloaded dictionary bundles. */
const CACHE_NAME='rootlab-offline-20261025-v261-adaptive';
const APP_SHELL=['./','./index.html','./lexicon-core-v24.js','./roots-v21.js','./word-history-v22.js','./word-etymology-curated-v23.js','./history-ui-v24.js','./memory-engine-v2.js','./reader-v261.js','./basic-learning-v261.js','./reader-v261.css','./reading-cards-v24.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./credits.html','./data/reader-v24-manifest.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
 const next=await caches.open(CACHE_NAME);
 for(const key of await caches.keys()){
  if(!key.startsWith('rootlab-offline-')||key===CACHE_NAME)continue;
  const old=await caches.open(key);
  for(const req of await old.keys()){
   const url=new URL(req.url);
   if(url.origin===self.location.origin&&url.pathname.includes('/data/reader-v24/')&&!(await next.match(req))){const saved=await old.match(req);if(saved?.ok)await next.put(req,saved);}
  }
  await caches.delete(key);
 }
 await self.clients.claim();
})());});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const isIndex=req.mode==='navigate'&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html'));
 if(isIndex){event.respondWith((async()=>{const c=await caches.open(CACHE_NAME);try{const r=await fetch(req);if(r.ok)await c.put('./index.html',r.clone());return r;}catch(_){return(await c.match('./index.html'))||Response.error();}})());return;}
 event.respondWith((async()=>{const c=await caches.open(CACHE_NAME),cached=await c.match(req);if(cached)return cached;try{const r=await fetch(req);if(r.ok&&(url.pathname.includes('/data/reader-v24/')||APP_SHELL.some(x=>url.pathname.endsWith(x.slice(2)))))await c.put(req,r.clone());return r;}catch(_){return Response.error();}})());
});
