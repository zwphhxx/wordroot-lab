#!/usr/bin/env python3
"""Repair distribution checks; do not modify original lexical or personal data."""
from pathlib import Path
import re,json
R=Path(__file__).resolve().parent.parent
page=(R/'index.html').read_text();nav=(R/'navigation-v211.js').read_text();wiki=(R/'encyclopedia-v211.js').read_text();reader=(R/'reader-v211.js').read_text();css=(R/'reader-v211.css').read_text();sw=(R/'sw.js').read_text()
core=json.loads((R/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0])
checks=[
 ('Release version and active modules',all(x in page for x in ['content="2.11.0"','navigation-v211.js','encyclopedia-v211.js','reader-v211.js','reader-v211.css'])),
 ('49426 lexical entries remain unchanged',len(core)==49426),
 ('Old favorites and learning keys preserved','rootlab_standalone_demo_v3' in page and "KEY='rootlab_reader_v24'" in reader),
 ('Navigation saves and restores history','history.pushState' in nav and 'history.replaceState' in nav and "addEventListener('popstate'" in nav),
 ('Word and tab URLs are explicit',"searchParams.set('word',word)" in nav and "searchParams.set('view',view)" in nav),
 ('Hydration avoids duplicate history','if(same)' in nav),
 ('Legacy URL modes handled',"searchParams.delete('mode')" in nav),
 ('Outside dictionary lookup can be restored','api.bridge.lookup' in nav and 'lookup:lookupOnline' in page),
 ('Home clears old word parameter',"searchParams.delete('word')" in nav),
 ('Bilingual articles are paired using language links',"lllang:l==='en'?'zh':'en'" in wiki and 'wikibase_item' in wiki),
 ('Two languages shown simultaneously','wiki-languages' in wiki and "block(zh,'zh-CN'" in wiki and "block(en,'en'" in wiki),
 ('No invented Chinese translation','暂缺中文版' in wiki and '非逐句翻译' in wiki),
 ('Case-confusable revolution album is blocked',"title:'Revolution'" in wiki and 'acceptable(word,title' in wiki and 'studio album' in wiki),
 ('Old topic cache is safely versioned',"rootlab_wikipedia_cache_v211" in wiki),
 ('Only wrong saved topic is invalidated','delete choices[w]' in wiki and 'topics.revolution' in (R/'meaning-explainer-v211.js').read_text()),
 ('Placeholder is labeled and escapes title','文字占位 · 非实物图' in wiki and "esc(title)" in wiki),
 ('Real image failure shows placeholder',"classList.add('image-unavailable')" in wiki and "placeholder(word,'图片暂未加载')" in wiki),
 ('Page preserves full open learning cards','<details' not in reader and '<summary' not in reader),
 ('Wide screens retain centered readable column','max-width:808px' in css and 'margin-left:auto;margin-right:auto' in css),
 ('Long language text wraps','overflow-wrap:anywhere' in css and '.wiki-language-block' in css),
 ('New shell caches all repair assets',all(x in sw for x in ['navigation-v211.js','encyclopedia-v211.js','reader-v211.js','meaning-explainer-v211.js'])),
 ('Prior offline images are still migrated','/images/visual-v29/' in sw and '/images/visual-v210/' in sw),
 ('Composition-safe search retained','search-control-v27.js' in page),
 ('No added tracking or uploads','sendBeacon' not in nav+wiki),
 ('Media author and license credit retained','creditMarkup' in wiki and 'CC BY-SA 4.0' in wiki),
]
for label,result in checks:print(('PASS ' if result else 'FAIL ')+label)
assert all(x[1] for x in checks)
print('PASS',len(checks),'V2.11 repair, migration and presentation checks')
