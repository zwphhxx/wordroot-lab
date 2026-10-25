#!/usr/bin/env python3
from pathlib import Path
import json,re,hashlib
from urllib.parse import urlparse
R=Path(__file__).resolve().parent.parent
page=(R/'index.html').read_text();module=(R/'encyclopedia-v29.js').read_text();reader=(R/'reader-v29.js').read_text();sw=(R/'sw.js').read_text()
s=(R/'visual-seeds-v29.js').read_text();seed=json.loads(s.split('window.ROOTLAB_VISUAL_SEEDS=',1)[1].split(';\nwindow.ROOTLAB_VISUAL_HINTS=')[0]);hints=json.loads(s.split('window.ROOTLAB_VISUAL_HINTS=',1)[1].rstrip(';\n'))
core=json.loads((R/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0]);known={r[0] for r in core};coverage=json.loads((R/'data/visual-coverage-v29.json').read_text())
license_rx=re.compile(r'(?:Public domain|CC0(?: 1\.0)?|CC[- ]BY(?:-SA)?(?:[ -][0-9.]+)?)',re.I)
images=[]
for word,r in seed.items():
    f=R/r['image']['src'].removeprefix('./');raw=f.read_bytes();images.append((f,raw));assert word in known and r['senseConfirmed'];assert raw.startswith((b'\xff\xd8',b'\x89PNG',b'RIFF'))
    assert len(raw)==r['image']['bytes'] and license_rx.fullmatch(r['image']['license']);assert urlparse(r['image']['source']).hostname=='commons.wikimedia.org'
checks=[
 ('Version and active visual assets',all(x in page for x in ['content="2.9.0"','reader-v29.js','reader-v29.css','visual-seeds-v29.js','encyclopedia-v29.js'])),
 ('Original whole dictionary kept',len(core)==49426),
 ('Reviewed image records reconcile',len(seed)>=80 and coverage['localPictures']==len(seed) and coverage['imageBytes']==sum(len(b) for _,b in images)),
 ('Concrete candidate hints remain in actual dictionary',set(hints)<=known and len(hints)==coverage['concreteCandidateWords']),
 ('All pictures keep source author license',all(all(x['image'].get(k) for k in ['source','credit','license']) for x in seed.values())),
 ('Confirmed word-sense captions present',all(x.get('zhTitle') and x.get('caption') for x in seed.values())),
 ('Free licensed originals not nonfree wiki thumbnails',"pilicense:'free'" in module and 'allowedLicense' in module),
 ('English and Chinese dictionary resources unchanged','lexicon-core-v24.js' in page and 'data/reader-v24/' in page and 'data/usage-v27/' in page),
 ('Requests are not triggered by typing','IntersectionObserver' in module and 'addEventListener(\'input\'' not in module),
 ('Unknown topics require selection','选择当前想了解的主题' in module and "data-wiki=\"article\"" in module),
 ('Chosen sense saved by word','saveChoice(word,title,lang)' in module and 'rootlab_visual_choices_v29' in module),
 ('Auto image preference can be disabled','rootlab_visual_auto_v29' in module and 'toggle-auto' in module and 'preferences()' in reader),
 ('Zoom has keyboard and attribution','showModal()' in module and 'figcaption' in module and 'aria-label' in module),
 ('No collapsed learning cards','<details' not in reader and '<summary' not in reader),
 ('Andiron local illustration and explanation retained','plain-objects-v28.js' in page and 'andiron-in-use.png' in sw and (R/'images/andiron-in-use.png').exists()),
 ('New offline cache and visual shell','v290-visual' in sw and 'visual-seeds-v29.js' in sw and 'encyclopedia-v29.js' in sw),
 ('Viewed image files cached and migrated',sw.count('/images/visual-v29/')>=2),
 ('Complete download includes local reviewed pictures','Object.values(window.ROOTLAB_VISUAL_SEEDS||{})' in page and '...pictures' in page),
 ('Search composition fix preserved','search-control-v27.js' in page and 'RootLabSearch.create' in page),
 ('Favorites and review remain local and same keys','rootlab_standalone_demo_v3' in page and "KEY='rootlab_reader_v24'" in reader),
 ('Source HTML and URLs guarded','DOMParser' in module and 'urlOK' in module and 'esc(a.summary' in module),
 ('No analytics added','sendBeacon' not in module and 'sendBeacon' not in reader),
]
for label,result in checks:print(('PASS ' if result else 'FAIL ')+label)
assert all(x[1] for x in checks)
print('PASS',len(checks),'V2.9 visual data and privacy checks')
print('DICTIONARY',len(core),'LOCAL_PICTURES',len(seed),'CANDIDATE_ROUTING',len(hints),'IMAGE_BYTES',sum(len(b) for _,b in images))
