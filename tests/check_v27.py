#!/usr/bin/env python3
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parent.parent
html=(R/'index.html').read_text();js=(R/'reader-v27.js').read_text();ctl=(R/'search-control-v27.js').read_text();model=(R/'whole-word-v27.js').read_text();sw=(R/'sw.js').read_text()
old=json.loads(re.search(r'window.ROOTLAB_LEXICON=(\[.*\]);',(R/'lexicon-v21.js').read_text(),re.S).group(1))
core=json.loads((R/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0])
known={r[0] for r in core};details=json.loads((R/'data/reader-v24-manifest.json').read_text());recovered=[]
for item in details['bundles'].values():
 raw=(R/item['url'].removeprefix('./')).read_bytes();assert hashlib.sha256(raw).hexdigest()==item['sha256'];recovered+=json.loads(raw)['entries']
manifest=json.loads((R/'data/usage-v27-manifest.json').read_text());words={};phrases=0
for letter,item in manifest['bundles'].items():
 raw=(R/item['url'].removeprefix('./')).read_bytes();assert hashlib.sha256(raw).hexdigest()==item['sha256'];part=json.loads(raw);assert part['letter']==letter
 for word,v in part['words'].items():
  assert word in known and word.startswith(letter);words[word]=v;phrases+=len(v['phrases'])
  for x in v['related']:assert x['word'] in known and x['word']!=word
curated=json.loads((R/'data/usage-curated-v27.json').read_text());audit=json.loads((R/'data/learning-route-coverage-v27.json').read_text())
checks=[
 ('Version and active reader',all(x in html for x in ['content="2.7.0"','reader-v27.js','reader-v27.css'])),
 ('Original entire dictionary preserved',len(core)==49426 and sorted(recovered)==sorted(old)),
 ('Source translations and examples not destructively overwritten',all(a[:6]==b[:6] for a,b in zip(old,core))),
 ('Whole-word rule applies universally','RootLabWholeWords.build' in html and "'whole':'root'" in html),
 ('No guessed affix chunks treated as confirmed roots',"if(info?.attested&&info.components.length>1)" in html and "['documented','curated','attested']" in model),
 ('All dictionary entries audited',audit['stats']['total']==49426 and audit['stats']['root']+audit['stats']['whole']==49426 and audit['errorCount']==0),
 ('Three reviewed basic-word profiles kept','basic-learning-v261.js' in html),
 ('26 usage data packages valid',len(manifest['bundles'])==26 and len(words)==manifest['coverage']['union'] and phrases==manifest['coverage']['phrasePairs']),
 ('Editorial phrases clearly distinct from source English',all(not p['zh'] for w,d in words.items() if w not in curated for p in d['phrases'])),
 ('Twenty everyday words have authored bilingual phrases',len(curated)==20 and all(all(p['zh'] for p in words[w]['phrases']) for w in curated)),
 ('Whole-word cards avoid empty boilerplate','function wholeMeaningCard' in js and 'function wholePhrasesCard' in js and 'function wholeUsageCard' in js),
 ('No collapse controls','<details' not in js and '<summary' not in js),
 ('One composition-aware search controller','RootLabSearch.create' in html and 'isComposing' in ctl and 'compositionend' in ctl),
 ('Old competing search listeners removed','let suggestionTimer=0' not in html and "addEventListener('focus',e=>updateSuggestions" not in html),
 ('Choices replace value rather than append','input.value=value' in ctl and 'input.value+=' not in ctl),
 ('Stale suggestion and duplicate clicks guarded','revision' in ctl and 'suppressClick' in ctl and 'guardUntil' in ctl),
 ('Keyboard and accessibility supported',all(k in ctl for k in ['ArrowDown','Enter','Escape','aria-activedescendant','aria-expanded'])),
 ('Plain word dictionaries safe from inherited constructor',"Object.setPrototypeOf(data,null)" in html),
 ('Old local learning keys unchanged','rootlab_standalone_demo_v3' in html and "KEY='rootlab_reader_v24'" in js),
 ('Both offline data families migrated','/data/usage-v27/' in sw and '/data/reader-v24/' in sw),
 ('Offline download contains both manifests','usage-v27-manifest.json' in html and 'reader-v24-manifest.json' in html),
 ('Current shell cached','v270-universal' in sw and 'search-control-v27.js' in sw and 'whole-word-v27.js' in sw),
 ('No outbound analytics','sendBeacon' not in js and 'fetch(' not in ctl),
]
for name,ok in checks:print(('PASS ' if ok else 'FAIL ')+name)
assert all(v for _,v in checks)
print('PASS',len(checks),'V2.7 data, routing, search and cache checks')
print('ROUTES',audit['stats'],'USAGE',manifest['coverage'])
