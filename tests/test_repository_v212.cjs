const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');const source=fs.readFileSync(require('node:path').join(__dirname,'../dictionary-repository-v212.js'),'utf8');
const build='v212-1234567890abcd';const hash=bytes=>require('node:crypto').createHash('sha256').update(bytes).digest('hex');
const record=w=>({word:w,wordId:'en:'+w,senses:[{id:'ecdict:'+w+':123',en:'A test meaning.',zh:'测试释义。',sourceRefs:[{source:'test'}]}]});
function fixture(mode='valid'){
 const raw=Buffer.from(JSON.stringify({schema:3,schemaVersion:3,buildId:mode==='wrongBuild'?'v212-00000000000000':build,words:{bank:record('bank'),band:mode==='badRecord'?{word:'band'}:record('band')}}));
 const path='./data/bilingual-v212/'+build+'/ba.json';let calls=0;
 const manifest={schema:3,schemaVersion:3,buildId:build,entryCount:49426,bundles:{ba:{url:path,sha256:mode==='badHash'?'0'.repeat(64):hash(raw),bytes:raw.length,words:2}}};
 let rejectOnce=mode==='retry';
 const fetch=async url=>{calls++;if(url.endsWith('/manifest.json'))return {ok:true,json:async()=>manifest};if(rejectOnce){rejectOnce=false;throw Error('network interruption');}return{ok:true,arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};};
 const window={ROOTLAB_BILINGUAL_META:{schemaVersion:3,buildId:build,releaseStatus:'candidate-not-approved'},ROOTLAB_BILINGUAL_SEEDS:{carrier:record('carrier')}};
 const sandbox={window,fetch,crypto:webcrypto,TextDecoder,AbortController,setTimeout,clearTimeout,Map,console,location:{hostname:'localhost'}};vm.runInNewContext(source,sandbox);
 return {repo:window.RootLabDictionaryRepository,calls:()=>calls};
}
(async()=>{let passed=0;const check=(name,fn)=>Promise.resolve().then(fn).then(()=>{passed++;console.log('PASS '+name);});
 await check('Validated seeds do not fetch',async()=>{const f=fixture();assert.equal(f.repo.get('carrier').word,'carrier');await f.repo.ensure('carrier');assert.equal(f.calls(),0)});
 await check('Correct version and digest load whole package atomically',async()=>{const f=fixture();await f.repo.ensure('bank');assert(f.repo.has('band'));assert.equal(f.repo.size,3);assert.equal(f.calls(),2)});
 await check('Repeated word uses cache',async()=>{const f=fixture();await f.repo.ensure('bank');await f.repo.ensure('band');assert.equal(f.calls(),2)});
 await check('Concurrent requests share package fetch',async()=>{const f=fixture();await Promise.all([f.repo.ensure('bank'),f.repo.ensure('band')]);assert.equal(f.calls(),2)});
 for(const mode of ['badHash','wrongBuild','badRecord'])await check(mode+' rejects without partial records',async()=>{const f=fixture(mode);await assert.rejects(f.repo.ensure('bank'));assert(!f.repo.has('bank'));assert(!f.repo.has('band'));assert(f.repo.has('carrier'))});
 await check('Network failure can retry',async()=>{const f=fixture('retry');await assert.rejects(f.repo.ensure('bank'));assert(!f.repo.has('bank'));await f.repo.ensure('bank');assert(f.repo.has('bank'))});
 await check('Unsafe input rejected',async()=>{const f=fixture();await assert.rejects(f.repo.ensure('../bank'));assert.equal(f.calls(),0)});
 await check('Missing manifest range does not guess a URL',async()=>{const f=fixture();await assert.rejects(f.repo.ensure('zebra'));assert(!f.repo.has('zebra'))});
 console.log('SUMMARY',passed,'/',passed);
})().catch(e=>{console.error(e);process.exitCode=1});
