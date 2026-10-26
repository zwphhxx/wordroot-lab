/* Export only already-public authored learning prose, never local learner data. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),box={window:{}};vm.createContext(box);
for(const file of ['reading-cards-v210.js','basic-learning-v210.js','plain-objects-v210.js','meaning-notes-v210.js','word-history-v22.js','word-etymology-curated-v23.js','roots-v21.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),box,{filename:file});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
box.window.ROOTLAB_DATA=JSON.parse(html.match(/window\.ROOTLAB_DATA=(\[.*?\]);<\/script>/s)[1]);
box.window.WORD_NOTES=JSON.parse(html.match(/const WORD_NOTES=(\{.*?\});\s*function wordSpecificNotes/s)[1]);
const rows=new Map(),paired=new Map();
const norm=x=>String(x).replace(/\s+/g,' ').trim();
function walk(x,at){if(typeof x==='string'){const zh=norm(x);if(/[\u3400-\u9fff]/.test(zh)&&!/^https?:/.test(zh)){if(!rows.has(zh))rows.set(zh,{zh,contexts:[]});rows.get(zh).contexts.push(at)}return;}
 if(Array.isArray(x)){if(x.length===2&&typeof x[0]==='string'&&typeof x[1]==='string'&&!/[\u3400-\u9fff]/.test(x[0])&&/[\u3400-\u9fff]/.test(x[1]))paired.set(norm(x[1]),norm(x[0]));x.forEach((v,i)=>walk(v,at+'.'+i));return;}
 if(x&&typeof x==='object'){if(x.en&&x.zh&&typeof x.en==='string'&&typeof x.zh==='string')paired.set(norm(x.zh),norm(x.en));if(x.example&&x.translation&&typeof x.example==='string'&&typeof x.translation==='string')paired.set(norm(x.translation),norm(x.example));for(const[k,v]of Object.entries(x))walk(v,at+'.'+k);}}
for(const[k,v]of Object.entries(box.window))if(!k.startsWith('RootLab'))walk(v,k);
const out=[...rows.values()].map(x=>({...x,en:paired.get(x.zh)||'',source:paired.has(x.zh)?'source_bilingual':'pending'}));
fs.writeFileSync(path.join(root,'.work/bilingual-v212/authored-source-objects.json'),JSON.stringify(box.window));
const dest=path.join(root,'.work/bilingual-v212/authored-text-input.json');fs.writeFileSync(dest,JSON.stringify(out,null,2));
console.log('AUTHORED_TEXTS',out.length,'ALREADY_PAIRED',out.filter(x=>x.en).length,'OUTPUT',dest);
