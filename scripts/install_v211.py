from pathlib import Path
import re,json
R=Path(__file__).resolve().parent.parent
reader=(R/'reader-v210.js').read_text()
# Link every committed selection, including suggestions, related words and routes.
reader=reader.replace('function beforeOpen(){remember();', 'function beforeOpen(){window.RootLabNavigation?.position();remember();',1)
needle=' const node=$(\'readerV24\');node.hidden=false;if(changed)node.innerHTML=\'\';paint();save();'
assert needle in reader
reader=reader.replace(needle," window.RootLabNavigation?.commit(c.word,'learn');\n"+needle,1)
needle="function setView(view){visible=view==='learn';"
assert needle in reader
reader=reader.replace(needle,"function setView(view){window.RootLabNavigation?.commit(landing?'':ctx?.word||'',view);visible=view==='learn';",1)
needle="function showHome(){remember();landing=true;"
assert needle in reader
reader=reader.replace(needle,"function showHome(){window.RootLabNavigation?.position();remember();landing=true;window.RootLabNavigation?.commit('','learn');",1)
needle='initializing=false;updateHome();routePicker();'
assert needle in reader
reader=reader.replace(needle,needle+"window.RootLabNavigation?.start({bridge,home:showHome,isHome:()=>landing});",1)
reader=reader.replace('词根实验室 · V2.9','词根实验室 · V2.11').replace('词根实验室 · V2.10','词根实验室 · V2.11')
(R/'reader-v211.js').write_text(reader)
# Retain editorial explanations. Drop only the mistakenly paired album topic.
meaning=(R/'meaning-explainer-v210.js').read_text()
needle=' function entry(word)'
assert needle in meaning
meaning=meaning.replace(needle," if(topics.revolution&&/REvolution|Lynch|专辑|專輯|album/i.test(topics.revolution.label+' '+topics.revolution.source)){delete topics.revolution;try{localStorage.setItem(KEY,JSON.stringify(topics));}catch(_){}}\n"+needle,1)
(R/'meaning-explainer-v211.js').write_text(meaning)
p=R/'index.html';s=p.read_text()
for old,new in [('content="2.10.0"','content="2.11.0"'),('reader-v210.css','reader-v211.css'),('reader-v210.js','reader-v211.js'),('encyclopedia-v210.js','encyclopedia-v211.js'),('meaning-explainer-v210.js','meaning-explainer-v211.js'),('rootlab-offline-20261025-v2100-clearmeaning','rootlab-offline-20261026-v2110-state')]:
 assert old in s,old;s=s.replace(old,new)
needle='<script src="./reader-v211.js"></script>'
assert needle in s
s=s.replace(needle,'<script src="./navigation-v211.js"></script>\n'+needle,1)
p.write_text(s)
p=R/'sw.js';s=p.read_text()
for old,new in [('rootlab-offline-20261025-v2100-clearmeaning','rootlab-offline-20261026-v2110-state'),('reader-v210.js','reader-v211.js'),('reader-v210.css','reader-v211.css'),('encyclopedia-v210.js','encyclopedia-v211.js'),('meaning-explainer-v210.js','meaning-explainer-v211.js')]:
 assert old in s,old;s=s.replace(old,new)
s=s.replace("'./reader-v211.js'","'./navigation-v211.js','./reader-v211.js'",1)
p.write_text(s)
p=R/'manifest.webmanifest';m=json.loads(p.read_text());m['description']='词根实验室：图文词典、中英百科与持续阅读；当前单词可分享和刷新保留';p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('V2.11 navigation, selected-topic repair and new asset names installed')
