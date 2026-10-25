from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
p=R/'index.html';s=p.read_text('utf8')
assert 'content="2.7.0"' in s
s=s.replace('content="2.7.0"','content="2.8.0"',1)
s=s.replace('<script src="./basic-learning-v261.js"></script>','<script src="./basic-learning-v261.js"></script>\n  <script src="./plain-objects-v28.js"></script>\n  <script src="./encyclopedia-v28.js"></script>',1)
s=s.replace('src="./reader-v27.js"','src="./reader-v28.js"',1).replace('href="./reader-v27.css"','href="./reader-v28.css"',1)
a=s.index('function readerRelated(word)');b=s.index('function readerCardData(word)',a)
part=s[a:b];assert part.count('return items;')==1
part=part.replace('return items;','return window.RootLabSenseGuard?window.RootLabSenseGuard.filter(word,items):items;',1)
s=s[:a]+part+s[b:]
# Old source content remains untouched; only displayed relation candidates filtered.
p.write_text(s,'utf8')
s=(R/'reader-v27.js').read_text('utf8')
old="const fromSource=b.related||[],seen=new Set([c.word]),rows=[];"
assert old in s
s=s.replace(old,"const fromSource=window.RootLabSenseGuard?window.RootLabSenseGuard.filter(c.word,b.related):b.related||[],seen=new Set([c.word]),rows=[];",1)
s=s.replace("for(const word of d.synonyms||[])if(bridge.known(word)&&!seen.has(word))", "for(const word of d.synonyms||[])if(bridge.known(word)&&!seen.has(word)&&(!window.RootLabSenseGuard||window.RootLabSenseGuard.filter(c.word,[{word}]).length))",1)
old="node.querySelectorAll('.lr-stream > [data-module] .lr-number').forEach((n,i)=>n.textContent=String(i+1).padStart(2,'0'));"
assert old in s
s=s.replace(old,old+"\n window.RootLabEncyclopedia?.mount(node,c);",1)
# Reader summary markup and dictionary originals are kept separately.
(R/'reader-v28.js').write_text(s,'utf8')
css=(R/'reader-v27.css').read_text('utf8')+'\n'+(R/'scripts/wiki-v28.css').read_text('utf8')
(R/'reader-v28.css').write_text(css,'utf8')
p=R/'sw.js';s=p.read_text('utf8')
s=s.replace('rootlab-offline-20261025-v270-universal','rootlab-offline-20261025-v280-encyclopedia')
s=s.replace("'./reader-v27.js'","'./reader-v28.js'").replace("'./reader-v27.css'","'./reader-v28.css'")
s=s.replace("'./basic-learning-v261.js'","'./basic-learning-v261.js','./plain-objects-v28.js','./encyclopedia-v28.js','./images/andiron-in-use.png'")
p.write_text(s,'utf8')
p=R/'manifest.webmanifest';m=json.loads(p.read_text('utf8'));m['description']='免费词典、中文白话解释、百科图文和有语境的词义关联；支持词根学习与智能复习';p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n','utf8')
print('V2.8: visual noun support, exact dictionary explanation, Wikipedia topic picker and sense guards')
