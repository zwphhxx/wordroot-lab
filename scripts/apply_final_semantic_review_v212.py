#!/usr/bin/env python3
"""Record a genuinely inspected interval; retain old text and source hashes.
A receipt approves only the inspected pairs, never the unsampled dictionary.
"""
from pathlib import Path
import json,hashlib,sys
R=Path(__file__).resolve().parent.parent
batch=R/sys.argv[1];spec=json.loads(batch.read_text());snap=R/spec['snapshot'];raw=snap.read_bytes();rows=json.loads(raw);start,end=spec['reviewedRange']
assert 0<=start<end<=len(rows)
p=R/'data/translation-corrections-v212.json';allc=json.loads(p.read_text());known={x['en']:x for x in allc['pairs']};records=[]
for i in range(start,end):
 x=rows[i];before=known.get(x['en'],{}).get('zh',x['zh']);after=spec['translations'].get(str(i),before)
 assert isinstance(after,str) and after.strip()
 evidence={'index':i,'word':x.get('word'),'words':x.get('words'), 'senseId':x.get('id'),'en':x['en'],'beforeZh':before,'afterZh':after,'sourceSnapshotHash':hashlib.sha256(raw).hexdigest(),'sourceTextHash':hashlib.sha256(x['en'].encode()).hexdigest(),'reviewerType':'assistant_linguistic_review','decision':'revised' if after!=before else 'reviewed_without_change'}
 records.append(evidence)
 if after!=before:
  entry={'en':x['en'],'zh':after,'reason':spec.get('reason','按已显示的英文与义项语境逐项核对，修订语义错配、漏译和不自然的表达。'),'reviewerType':'assistant_linguistic_review','reviewBatch':batch.name,'sourceSnapshotHash':evidence['sourceSnapshotHash'],'sourceSnapshotIndex':i}
  if x['en'] in known:known[x['en']].update(entry)
  else:allc['pairs'].append(entry);known[x['en']]=entry
q=p.with_suffix('.tmp');q.write_text(json.dumps(allc,ensure_ascii=False,indent=2)+'\n');q.replace(p)
report={'batch':str(batch.relative_to(R)),'snapshot':spec['snapshot'],'reviewedRange':[start,end],'sourceSnapshotHash':hashlib.sha256(raw).hexdigest(),'reviewerType':'assistant_linguistic_review','revised':sum(x['decision']=='revised' for x in records),'reviewed':len(records),'reviews':records,'scope':'Only the inspected source interval, not all dictionary translations.'}
(R/'reports'/('applied-'+batch.stem+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('SEMANTIC_REVIEW',start,end,'REVISED',report['revised'],'CORRECTIONS',len(allc['pairs']))
