#!/usr/bin/env python3
"""V2.5 minimal UI contract; source/reading data and previous storage must stay intact."""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parent.parent
h=(R/'index.html').read_text('utf8');js=(R/'reader-v25.js').read_text('utf8');css=(R/'reader-v25.css').read_text('utf8');sw=(R/'sw.js').read_text('utf8')
old=json.loads(re.search(r'window.ROOTLAB_LEXICON=(\[.*\]);',(R/'lexicon-v21.js').read_text('utf8'),re.S).group(1))
raw=(R/'lexicon-core-v24.js').read_text('utf8');core=json.loads(raw.split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0])
manifest=json.loads((R/'data/reader-v24-manifest.json').read_text('utf8'));restored=[]
for v in manifest['bundles'].values():
 p=R/v['url'].removeprefix('./');assert hashlib.sha256(p.read_bytes()).hexdigest()==v['sha256'];restored+=json.loads(p.read_text('utf8'))['entries']
checks=[
 ('Version and scripts', 'content="2.5.0"' in h and 'src="./reader-v25.js"' in h and 'href="./reader-v25.css"' in h),
 ('No double reader CSS or JS', 'src="./reader-v24.js"' not in h and 'href="./reader-v24.css"' not in h),
 ('Headline, duplicate brand and promotional DOM deleted',all(t not in h for t in ('YOUR DAILY ENGLISH BOOST','BUILD YOUR VOCABULARY','class="brand-icon"','class="brand-en"','class="hero-deco"','class="popular"','class="mini-promo"'))),
 ('Reader no repeated mode switch or marketing labels',all(t not in js for t in ('class="rd-mode"','class="rd-word-label"','class="rd-local-note"','class="rd-kicker"'))),
 ('Single usage disclosure in normal reader',js.count('<summary>更多释义与用法</summary>')==1),
 ('Optional quiz really folded', 'class="rd-optional-check" data-reader-key="check"' in js and 'skip-quiz' in js),
 ('One main next-word and collapsible alternatives','rd-next-primary' in js and 'class="rd-others" data-reader-key="others"' in js),
 ('Empty home before any lookup','landing=true' in js and 'article.hidden=true' in js),
 ('Routes reside in library','readerRoutesV25' in js and "$('rootsView').querySelector('.page-intro').after(el)" in js),
 ('Favorite and plan remain separate actions',"cmd==='favorite')bridge.favorite" in js and "cmd==='plan')bridge.plan" in js),
 ('Speaker symbol is SVG, with accessible names','sound:' in js and 'aria-label="朗读 ' in js and 'aria-pressed="' in js),
 ('Reading and learning storage keys preserved','rootlab_reader_v24' in js and 'rootlab_standalone_demo_v3' in h),
 ('No reading telemetry','sendBeacon' not in js and 'fetch(' not in js),
 ('Dictionary, phonetics and full details lossless',len(core)==49426 and all(a[:6]==b[:6] for a,b in zip(old,core)) and sorted(old)==sorted(restored)),
 ('26 data bundles unchanged',len(manifest['bundles'])==26),
 ('Previously cached details migrate on upgrade','for(const req of await old.keys())' in sw and 'next.put(req,saved)' in sw),
 ('Shell uses V2.5 only','rootlab-offline-20261025-v250-minimal' in sw and 'reader-v25.js' in sw and 'reader-v25.css' in sw and 'reader-v24.js' not in sw),
 ('Reduced motion and keyboard focus retained','prefers-reduced-motion' in css and ':focus-visible' in css),
 ('Closed details cannot leak width/content','details:not([open])>:not(summary)' in css),
 ('Sources still accessible','词源记录与出处' in js and '资料来源' in js and '关于与隐私' in js and (R/'credits.html').exists()),
]
for n,ok in checks:print(('PASS ' if ok else 'FAIL ')+n)
assert all(ok for _,ok in checks)
print('PASS',len(checks),'V2.5 design, data, privacy and offline upgrade checks')
