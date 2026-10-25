const CACHE_NAME='rootlab-offline-20261025-v240-reader';
const APP_SHELL=['./','./index.html','./lexicon-core-v24.js','./roots-v21.js','./word-history-v22.js','./word-etymology-curated-v23.js','./history-ui-v24.js','./memory-engine-v2.js','./reader-v24.js','./reader-v24.css','./reading-cards-v24.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./credits.html','./data/reader-v24-manifest.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rootlab-offline-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 const isIndex=req.mode==='navigate'&&(url.pathname.endsWith('/')||url.pathname.endsWith('/index.html'));
 if(isIndex){event.respondWith((async()=>{const c=await caches.open(CACHE_NAME);try{const r=await fetch(req);if(r.ok)await c.put('./index.html',r.clone());return r;}catch(_){return(await c.match('./index.html'))||Response.error();}})());return;}
 event.respondWith((async()=>{const c=await caches.open(CACHE_NAME),cached=await c.match(req);if(cached)return cached;try{const r=await fetch(req);if(r.ok&&(url.pathname.includes('/data/reader-v24/')||APP_SHELL.some(x=>url.pathname.endsWith(x.slice(2)))))await c.put(req,r.clone());return r;}catch(_){return Response.error();}})());
});
