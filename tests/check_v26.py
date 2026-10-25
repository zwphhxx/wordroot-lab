#!/usr/bin/env python3
"""Current V2.6 contract: four fully exposed teaching cards, source data retained."""
from pathlib import Path
import re,json,hashlib
R=Path(__file__).resolve().parent.parent
html=(R/'index.html').read_text('utf8');js=(R/'reader-v26.js').read_text('utf8');css=(R/'reader-v26.css').read_text('utf8');sw=(R/'sw.js').read_text('utf8')
old=json.loads(re.search(r'window.ROOTLAB_LEXICON=(\[.*\]);',(R/'lexicon-v21.js').read_text('utf8'),re.S).group(1))
core=json.loads((R/'lexicon-core-v24.js').read_text('utf8').split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0])
meta=json.loads((R/'data/reader-v24-manifest.json').read_text('utf8'))
recovered=[];examples=[]
for letter,m in meta['bundles'].items():
 p=R/m['url'].replace('./','',1);assert hashlib.sha256(p.read_bytes()).hexdigest()==m['sha256'];d=json.loads(p.read_text());recovered+=d['entries'];examples+=d['examples']
original_examples=json.loads(re.search(r'window.ROOTLAB_WORDNET=(\[.*\]);',(R/'wordnet-v21.js').read_text('utf8'),re.S).group(1))
checks=[
 ('Latest version and renderer',all(x in html for x in ('content="2.6.0"','reader-v26.js','reader-v26.css'))),
 ('No two competing live readers','src="./reader-v25.js"' not in html and 'href="./reader-v25.css"' not in html),
 ('Four original teaching modules',all('data-module="'+m+'"' in js for m in ('origin','family','meanings','applications'))),
 ('Reader emits no disclosure elements','<details' not in js and '<summary' not in js),
 ('No quick/explore mode UI gate','mode===\'quick\'?' not in js and 'data-reader="mode"' not in js),
 ('Existing data fully preserved',len(core)==49426 and sorted(recovered)==sorted(old)),
 ('Examples and synonyms unchanged',sorted(examples)==sorted(original_examples)),
 ('All 26 verified detail files intact',len(meta['bundles'])==26),
 ('Basic Chinese meanings remain usable offline',all(a[:6]==b[:6] for a,b in zip(old,core))),
 ('Structured context not scraped from full HTML','readerCardData(word)' in html and 'learning:readerCardData(word)' in html),
 ('Word family and semantic groups available',all(x in js for x in ['lr-semantic-groups','lr-group-row','familyItems(c)'])),
 ('Per-word story fixes still effective','wordSpecificNotes(w)' in html and 'storyFor(c)' in js),
 ('Manual prefix corrections retained','history.components' in html and 'documented' in html),
 ('Detail loading automatic for current word','if(!bridge.loaded(c.word))' in js and 'bridge.hydrate(word)' in js),
 ('Automatic hydration handles failures and stale results',"ctx?.word!==word||landing" in js and 'retry-detail' in js),
 ('No network telemetry','fetch(' not in js and 'sendBeacon' not in js),
 ('Old study and reading state keys preserved','rootlab_standalone_demo_v3' in html and "KEY='rootlab_reader_v24'" in js),
 ('Sources and CC attribution kept','CC BY-SA 4.0' in js and 'credits.html' in js),
 ('Infinite scroll not introduced','finish-home' in js and 'active.done=true' in js),
 ('Optional quiz is visible but no mandatory completion','class="lr-recall rd-check"' in js and 'data-reader="advance"' in js),
 ('Cached full word bundles migrate','/data/reader-v24/' in sw and 'await next.put(req,saved)' in sw),
 ('New cache and current assets only','rootlab-offline-20261025-v260-cards' in sw and "'./reader-v26.js'" in sw and "'./reader-v25.js'" not in sw),
 ('Secondary views use genuine open panels','function unfoldPanels(root)' in js and 'MutationObserver' in js),
 ('Responsive and reduced-motion styling','prefers-reduced-motion' in css and 'max-width:350px' in css),
]
for name,ok in checks:print(('PASS ' if ok else 'FAIL ')+name)
assert all(c[1] for c in checks)
print('PASS',len(checks),'V2.6 cards, data, privacy, and cache checks')
