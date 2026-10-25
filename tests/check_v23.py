#!/usr/bin/env python3
"""V2.3 distribution checks: curated Wiktionary-origin source coverage.
Dataset extracted from en.wiktionary under CC BY-SA 4.0; no invented dates.
"""
from pathlib import Path
import json,re,collections
root=Path(__file__).resolve().parent.parent
s=(root/'index.html').read_text('utf8')
curated=json.loads(re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',s,re.S).group(1))
manual=json.loads(re.search(r'window.ROOTLAB_WORD_HISTORY=(\{.*\});',(root/'word-history-v22.js').read_text('utf8'),re.S).group(1))
additional=json.loads(re.search(r'window.ROOTLAB_CURATED_ETYM=(\{.*\});', (root/'word-etymology-curated-v23.js').read_text('utf8'),re.S).group(1))
meta=json.loads((root/'data/curated-etymology-coverage.json').read_text('utf8'))
names={w['word'].lower() for r in curated for g in r['groups'] for w in g['entries']}
covered=set(manual)|set(additional)
status=collections.Counter(item.get('status') for item in additional.values())
cache=(root/'sw.js').read_text()
module=(root/'history-ui-v24.js').read_text()
checks=[
 ('All curated distinct words covered',len(names)==335 and names<=covered),
 ('Manual curated and other records retained',len(manual)==7 and len(names&manual.keys())==5),
 ('330 additional etymology entries',len(additional)==330),
 ('Source-backed language paths and compounds',status['source_path']>=150 and status['source_formation']>=100),
 ('No fabricated historical dates in unsupported entries',all(not any(re.search(r'\d{3,4}\s*年',str(p)) for p in v['timeline']) for v in additional.values())),
 ('Teaching-only hints clearly tagged',status['teaching_formation']==6 and all(len(v['timeline'])==2 for v in additional.values() if v['status']=='teaching_formation')),
 ('Data citation to Wiktionary',all(v.get('sourceUrl','').startswith('https://en.wiktionary.org/wiki/') for v in additional.values())),
 ('Extracted excerpts safely short',all(not v.get('excerpt') or len(v['excerpt'].split())<=23 for v in additional.values())),
 ('All coverage metadata reconciles',meta['totalCurated']==335 and meta['previouslyManual']==5 and meta['newEtymologyEntries']==330 and not meta['missing']),
 ('All standalone public assets exist',all((root/f).exists() for f in ('word-etymology-curated-v23.js','word-history-v22.js','history-ui-v24.js'))),
 ('V2.3 version and page scripts',all(x in s for x in ('content="2.5.0"','word-etymology-curated-v23.js','history-ui-v24.js'))),
 ('On-device histories cached',all(f in cache for f in ('word-etymology-curated-v23.js','history-ui-v24.js','word-history-v22.js'))),
 ('Offline cache refreshed','rootlab-offline-20261025-v250-minimal' in cache),
 ('Wiktionary contributor attribution in product', 'Wiktionary 贡献者' in module and 'CC BY-SA 4.0' in module),
 ('Wiktionary attribution in credits','Kaikki.org' in (root/'credits.html').read_text('utf8')),
 ('Manual chronological history remains',len(manual['concession']['timeline'])==6 and len(manual['antecedent']['timeline'])>=4),
 ('Source path shown as related forms instead of invented chronology', 'historical-forms-grid' in module),
 ('Full dictionary preserved','lexicon-core-v24.js' in s and 'roots-v21.js' in s),
 ('Old study state preserved','rootlab_standalone_demo_v3' in s and 'memory-engine-v2.js' in s),
]
for name,result in checks:print(('PASS ' if result else 'FAIL ')+name)
assert all(x[1] for x in checks)
print('PASS',len(checks),'V2.3 provenance and coverage checks')
print('CURATED',len(names),'AUTO',len(additional),'MANUAL_CURATED',len(names&manual.keys()),'STATUSES',dict(status))
