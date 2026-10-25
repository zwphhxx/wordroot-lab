#!/usr/bin/env python3
"""Verify reader release and lossless migration to lazy dictionary bundles."""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parent.parent
text=(R/'index.html').read_text('utf8');reader=(R/'reader-v25.js').read_text('utf8');sw=(R/'sw.js').read_text('utf8')
old=json.loads(re.search(r'window.ROOTLAB_LEXICON=(\[.*\]);',(R/'lexicon-v21.js').read_text('utf8'),re.S).group(1))
raw=(R/'lexicon-core-v24.js').read_text('utf8');core=json.loads(raw.split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0])
manifest=json.loads((R/'data/reader-v24-manifest.json').read_text('utf8'))
recovered=[];examples=[]
for letter,m in manifest['bundles'].items():
 p=R/m['url'].replace('./','',1);assert p.is_file();assert hashlib.sha256(p.read_bytes()).hexdigest()==m['sha256'];obj=json.loads(p.read_text('utf8'));assert obj['schema']==1 and obj['letter']==letter;recovered+=obj['entries'];examples+=obj['examples']
original_examples=json.loads(re.search(r'window.ROOTLAB_WORDNET=(\[.*\]);',(R/'wordnet-v21.js').read_text('utf8'),re.S).group(1))
checks=[
('49,426 core words retained',len(core)==len(old)==49426),
('All Chinese definitions and phonetics retained',all(a[:6]==b[:6] for a,b in zip(old,core))),
('Full English definitions and morphology losslessly recover',sorted(old)==sorted(recovered)),
('All WordNet examples and synonyms preserved',sorted(examples)==sorted(original_examples)),
('26 independently hashed detail bundles',len(manifest['bundles'])==26),
('Initial core under half of old two data assets',manifest['coreBytes']<manifest['oldInitialDataBytes']*.5),
('Old heavy scripts removed from initial load','src="./lexicon-v21.js"' not in text and 'src="./wordnet-v21.js"' not in text),
('Version and reader scripts','content="2.5.0"' in text and 'reader-v25.js' in text and 'reader-v25.css' in text),
('Original learning storage retained','rootlab_standalone_demo_v3' in text),
('Reading local storage separate','rootlab_reader_v24' in reader),
('Backup includes reading progress','reader:window.RootLabReader?.exportState()' in text and 'importState(x.reader)' in text),
('Short finite route and explicit exit','finish-home' in reader and '退出路线' in reader and 'advance' in reader),
('Checkpoint skip and browsing vs mastery','skip-quiz' in reader and '不等于已经掌握' in reader),
('Local metrics pause when hidden or idle',"!document.hidden" in reader and 'lastInput<30000' in reader and 'document.hasFocus()' in reader),
('No network telemetry in reading module','fetch(' not in reader and 'sendBeacon' not in reader),
('No forced background full dataset download',"'./lexicon-core-v24.js'" in sw and "'./lexicon-v21.js'" not in sw and "'./wordnet-v21.js'" not in sw),
('Lazy dataset cached for offline use',"'/data/reader-v24/'" in sw and 'cache.put(url' in text),
('Distinct release cache','rootlab-offline-20261025-v250-minimal' in sw),
('Reduced motion and accessible controls','prefers-reduced-motion' in (R/'reader-v25.css').read_text() and 'aria-pressed' in reader),
('Contextual source attribution preserved',(R/'credits.html').is_file() and 'etymonline.com' in (R/'reading-cards-v24.js').read_text()),
]
for label,ok in checks:print(('PASS ' if ok else 'FAIL ')+label)
assert all(x[1] for x in checks)
print('PASS',len(checks),'V2.4 data and distribution checks')
print(json.dumps({'words':len(core),'oldInitialDataBytes':manifest['oldInitialDataBytes'],'newInitialDataBytes':manifest['coreBytes'],'reductionPercent':round(100*(1-manifest['coreBytes']/manifest['oldInitialDataBytes']),1)},ensure_ascii=False))
