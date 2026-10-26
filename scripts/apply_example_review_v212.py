#!/usr/bin/env python3
"""Apply an explicitly inspected interval of the immutable benchmark example snapshot.
Unchanged rows are recorded separately from revisions; not a corpus-wide approval.
"""
from pathlib import Path
import json,hashlib,sys
R=Path(__file__).resolve().parent.parent;batch=R/sys.argv[1];spec=json.loads(batch.read_text());snap=R/spec['snapshot'];rows=json.loads(snap.read_text());a,b=spec['reviewedRange'];assert 0<=a<b<=len(rows)
path=R/'data/translation-corrections-v212.json';d=json.loads(path.read_text());known={x['en']:x for x in d['pairs']};changed=[];kept=[]
for i in range(a,b):
 x=rows[i];zh=spec['translations'].get(str(i))
 if zh:
  assert zh.strip();previous=known.get(x['en'])
  entry={'en':x['en'],'zh':zh,'reason':'逐句根据所绑定义项校对：动作、对象、时态、比喻及专业术语必须与英语一致，不依据错误机译猜测。','reviewerType':'assistant_linguistic_review','benchmarkWords':x['words'],'reviewBatch':batch.name}
  if previous:previous.update(entry)
  else:d['pairs'].append(entry);known[x['en']]=entry
  changed.append(i)
 else:kept.append(i)
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
report={'batch':str(batch.relative_to(R)),'sourceSnapshotHash':hashlib.sha256(snap.read_bytes()).hexdigest(),'reviewedRange':[a,b],'changed':changed,'reviewedWithoutChange':kept,'reviewerType':'assistant_linguistic_review','scope':'Only the displayed source example interval, not unsampled corpus text.'}
(R/'reports'/('applied-'+batch.stem+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('REVIEWED',b-a,'REVISED',len(changed),'KEPT',len(kept))
