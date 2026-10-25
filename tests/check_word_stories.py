#!/usr/bin/env python3
"""Guard against root-group stories leaking into unrelated word entries."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parent.parent
s=(ROOT/'index.html').read_text(encoding='utf-8')
m=re.search(r'window\.ROOTLAB_DATA=(\[.*?\]);</script>',s,re.S)
assert m
roots=json.loads(m.group(1))
entries=[(r,g,w) for r in roots for g in r['groups'] for w in g['entries']]
n=re.search(r'const WORD_NOTES=(\{.*?\});\s*function wordSpecificNotes\(',s,re.S)
assert n,'Per-word notes not embedded'
notes=json.loads(n.group(1))
ced=next(r for r in roots if r['id']=='ced')
checks=[
 ('Source root ced metadata is generic',all('success' not in ced[k].lower() for k in ['source','mnemonic'])),
 ('All curated entries still present',len(roots)==37 and len(entries)==343),
 ('Each manual note targets a real word',set(notes)<=set(w['word'] for _,_,w in entries)),
 ('Every note has story and memory cue',all(isinstance(v.get('story'),str) and isinstance(v.get('memory'),str) and v['story'] and v['memory'] for v in notes.values())),
 ('Procedure has its own history and mnemonic','procedure' in notes and 'procedure' in notes['procedure']['story'].lower() and 'success' not in (notes['procedure']['story']+notes['procedure']['memory']).lower()),
 ('Process and proceed have separate notes',all(w in notes and w in notes[w]['story'].lower() for w in ['process','proceed'])),
 ('Story rendering uses selected word','wordSpecificNotes(w)' in s and 'wordNote.story' in s and 'wordNote.memory' in s),
 ('Old shared story binding removed',not ('<b>词源故事</b><span>'+chr(36)+'{esc(r.source)}' in s)),
 ('Old shared mnemonic binding removed',not ('记忆线索：'+chr(36)+'{esc(r.mnemonic)}' in s)),
 ('Fallback explanation uses queried word',"'（'+meaning+'）可以按 '" in s and "'记住 '+name" in s),
 ('Original V2 learning data key retained','rootlab_standalone_demo_v3' in s)
]
for name,v in checks:print(('PASS ' if v else 'FAIL ')+name)
assert all(p for _,p in checks)
print('PASSED',len(checks),'word-level explanation checks')
