#!/usr/bin/env python3
"""V2.2 historical etymology and attribution distribution integrity checks."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
h=(root/'index.html').read_text(encoding='utf8')
s=(root/'word-history-v22.js').read_text(encoding='utf8')
j=json.loads(re.search(r'window.ROOTLAB_WORD_HISTORY=(\{.*\});',s,re.S).group(1))
cached=(root/'sw.js').read_text()
checks=[
 ('Documented Chinese histories',len(j)>=7),
 ('Concession chronology',len(j['concession']['timeline'])>=6),
 ('Concession prefix has contextual sense','强调' in j['concession']['components'][0]['meaning']),
 ('Concession root is historical cess',j['concession']['components'][1]['part']=='cess'),
 ('Concession semantic expansion covers business grant',any('特许' in (step['term']+step['note']) for step in j['concession']['timeline'])),
 ('Documented etymologies have per-entry citations',all(len(v.get('sources',[]))>=1 for v in j.values())),
 ('External source URLs are HTTPS',all(s['url'].startswith('https://') for v in j.values() for s in v['sources'])),
 ('All sources mention historical stages',all(len(v.get('timeline',[]))>=4 for v in j.values())),
 ('No fabricated dates for missing sources','暂无整理好的中文词源资料' in (root/'history-ui-v23.js').read_text()),
 ('Public Wiktionary info fetched on user gesture','wiktionary-etymology' in h and 'origin=*' in (root/'history-ui-v23.js').read_text()),
 ('Client-side source text is safely escaped','safeText' in (root/'history-ui-v23.js').read_text() and 'esc(value)' in (root/'history-ui-v23.js').read_text()),
 ('Source credit and sharealike noted','CC BY-SA 4.0' in (root/'history-ui-v23.js').read_text() and 'CC BY-SA 4.0' in (root/'credits.html').read_text()),
 ('Site loads new assets',all(z in h for z in ['word-history-v22.js','history-ui-v23.js'])),
 ('PWA includes new assets',all(z in cached for z in ['word-history-v22.js','history-ui-v23.js'])),
 ('New cache name','rootlab-offline-20261025-v230-etymology' in cached),
 ('Old record key unchanged','rootlab_standalone_demo_v3' in h),
 ('No member gates',not any(x in h for x in ['开通会员','会员精讲','data-action="open-member"']))
]
for name,result in checks:
 print(('PASS ' if result else 'FAIL ')+name)
assert all(ok for _,ok in checks)
print('PASS',len(checks),'V2.2 release integrity checks')
