/* Regression for the user's remaining Noun uses / continued screenshot. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const L=require('../reader-layout-v218.js'),C=require('../reader-cards-v218.js');const checks=[];function test(n,f){f();checks.push({name:n,ok:true});console.log('PASS',n)}
const rows=Array.from({length:7},(_,i)=>({id:'s'+i,displayId:'s'+i,pos:'n',en:'meaning '+i,zh:'含义'+i,sourceRecordIds:['s'+i]}));
test('Four short meanings stay together rather than three plus one',()=>assert.equal(L.pack(rows.slice(0,4)).length,1));
test('Seven short meanings are not governed by an item count',()=>assert.equal(L.pack(rows).length,1));
test('Long bilingual records are never cut or lost',()=>{const a=rows.map(r=>({...r,en:r.en+' words'.repeat(150),zh:r.zh+'说明'.repeat(90)}));assert.deepEqual(L.pack(a,850).flat(),a)});
test('A single oversized record remains readable and complete',()=>{const a={id:'long',en:'x'.repeat(6000),zh:'中'.repeat(3000)};assert.deepEqual(L.pack([a],500),[[a]])});
test('Repeated invocation does not mutate the source order',()=>{const before=JSON.stringify(rows);L.pack(rows);L.meaningGroups(rows,'sample');assert.equal(JSON.stringify(rows),before)});
test('WordNet motion is not mistranslated as perception',()=>assert.equal(L.sourceCategory({id:'wn30:bank%2:38:00::'}).en,'Motion'));
test('All reviewed bank mappings require both stable ID and exact definition',()=>{for(const [id,en,kind]of L.bankRules){const g=L.meaningGroups([{id,en,pos:id.includes('%2:')?'v':'n'}],'bank')[0];assert.equal(g.key,'reviewed-bank-'+kind);assert.equal(g.method,'reviewed-id-and-definition');const changed=L.meaningGroups([{id,en:'a changed definition',pos:'n'}],'bank')[0];assert.notEqual(changed.method,'reviewed-id-and-definition')}});
test('Same broad source category never merges definitions or POS',()=>{const a=[{id:'wn30:x%1:14:00::',pos:'n',en:'group one',zh:'一'},{id:'wn30:x%1:14:01::',pos:'n',en:'group two',zh:'二'},{id:'n2',pos:'v',en:'unknown',zh:'别的'}];assert.equal(L.meaningGroups(a).flatMap(g=>g.rows).length,3);assert.equal(L.meaningGroups(a).length,2)});
test('Unknown meanings remain present without invented semantic topics',()=>{const g=L.meaningGroups(rows);assert.equal(g.length,1);assert.equal(g[0].method,'unassigned-pos-only');assert.equal(g[0].rows.length,7)});
function cards(type,m,section='usage'){return C.buildCards({type,moduleId:section+':'+type,presentationLocation:section},m,{earlyExampleId:null})}
test('Sense cards no longer use fixed-three packing',()=>assert.equal(cards('senses',{word:'sample',displayMeanings:rows.slice(0,4)}).length,1));
test('Examples no longer use fixed-two packing',()=>assert.equal(cards('examples',{word:'sample',displayMeanings:rows,examples:rows.map((r,i)=>({...r,senseId:'s0'}))}).length,1));
test('Word families no longer use fixed-four packing',()=>assert.equal(cards('family',{family:{groups:[{items:rows.map(r=>({word:r.id,meaning:r.zh}))}]}},'explore').length,1));
test('Background paragraphs share one logical group, not one card per sentence',()=>{const a=cards('story',{paragraphs:['第一段','第二段','第三段']},'understanding');assert.equal(a.length,1);assert.equal(a[0].keys.length,3)});
test('Timeline steps have no fixed-two maximum',()=>assert.equal(cards('history',{paragraphs:[],history:{timeline:rows.map(r=>({term:r.id,note:r.zh}))}},'understanding').length,1));
test('Card ownership records survive every group',()=>{const a=cards('senses',{word:'sample',displayMeanings:rows});assert.deepEqual(a.flatMap(r=>r.sourceRecordIds),rows.map(r=>r.id));assert(a.every(r=>r.groupHeadingOnce))});
const out={status:'PASS',checks,scope:'Deterministic unit contracts with synthetic cases; synthetic words are not shipped as vocabulary.'};const file=process.env.LAYOUT_UNIT_REPORT||path.join(__dirname,'../.work/v218/unit.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(out,null,2));console.log('SUMMARY',checks.length,'/',checks.length);
