#!/usr/bin/env python3
"""Apply exact-source bilingual excerpt reviews; preserve original text and audit.
These are translations of retained excerpts, not reconstructed full etymologies.
"""
from pathlib import Path
import json,hashlib,re
R=Path(__file__).resolve().parent.parent
snapshot=R/'.work/bilingual-v212/history-final-review-snapshot.json'
rows=json.loads(snapshot.read_text('utf8'));reviewed={};proof=[]
for p in sorted((R/'data').glob('history-excerpts-reviewed-*-v212.json')):
 d=json.loads(p.read_text('utf8'));assert R/d['snapshot']==snapshot
 start,end=d['reviewedRange'];assert 0<=start<end<=len(rows)
 for i in range(start,end):
  zh=d.get('translations',{}).get(str(i));assert isinstance(zh,str) and re.search('[\u3400-\u9fff]',zh),(p,i)
  assert not re.search('[\ue000-\uf8ff\ufffd\u2047]',zh),(p,i)
  assert i not in reviewed,'Overlapping review ranges'
  reviewed[i]=zh
  proof.append({'index':i,'word':rows[i]['word'],'en':rows[i]['en'],'zh':zh,'reviewerType':'assistant_linguistic_review','reviewFile':str(p.relative_to(R))})
assert set(reviewed)==set(range(len(rows))),'Incomplete excerpt review'
p=R/'data/translation-corrections-v212.json';corpus=json.loads(p.read_text('utf8'));pairs={x['en']:x for x in corpus['pairs']}
for x in proof:
 pairs[x['en']]={'en':x['en'],'zh':x['zh'],'reason':'Translate the exact retained etymology excerpt; keep historical forms and do not invent its missing ending.','reviewBatch':x['reviewFile'],'reviewerType':'assistant_linguistic_review','contextWord':x['word']}
corpus['pairs']=list(pairs.values());p.write_text(json.dumps(corpus,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
report={'status':'REVIEWED','count':len(proof),'snapshotHash':hashlib.sha256(snapshot.read_bytes()).hexdigest(),'scope':'Retained etymology excerpts; partial source passages remain excerpts, not complete histories.','reviews':proof}
(R/'reports/history-excerpt-review-v212.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('HISTORY_EXCERPTS_REVIEWED',len(proof),'EXACT_CORRECTIONS',len(pairs))
