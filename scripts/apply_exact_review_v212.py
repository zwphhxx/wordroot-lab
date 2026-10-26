#!/usr/bin/env python3
"""Apply explicit, independently written source-text edits; no model auto-approval."""
from pathlib import Path
import json,hashlib,argparse
R=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('batch');a=p.parse_args();batch=R/a.batch
assert batch.resolve().is_relative_to((R/'data').resolve())
review=json.loads(batch.read_text());snapshot=R/review['snapshot'];rows=json.loads(snapshot.read_text());sh=hashlib.sha256(snapshot.read_bytes()).hexdigest()
target=R/'data/translation-corrections-v212.json';obj=json.loads(target.read_text());existing={x['en']:x for x in obj['pairs']};added=[]
for key,value in review['corrections'].items():
 source=rows[int(key)];en=source['en'];zh,reason=value[:2]
 if en in existing:
  assert existing[en]['zh']==zh,('Conflicting reviewed edit',en)
  continue
 item={'en':en,'zh':zh,'reason':reason,'reviewerType':'assistant_linguistic_review','sourceSnapshotHash':sh,'sourceSnapshotIndex':int(key),'reviewBatch':batch.name,'affectedWords':source.get('words') or list(dict.fromkeys(x['word'] for x in source.get('contexts',[]))),'sourceEvidence':value[2] if len(value)>2 else ['local:adopted-wordnet-or-ecdict-source-gloss']}
 obj['pairs'].append(item);existing[en]=item;added.append(item)
temp=target.with_suffix('.tmp');temp.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n');temp.replace(target)
report={'batch':batch.name,'sourceSnapshotHash':sh,'reviewed':len(review['corrections']),'added':len(added),'totalCorrections':len(obj['pairs']),'items':added,'notCorpusApproval':True}
(R/'reports'/('exact-'+batch.stem+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
if review.get('sourceReviewPending'):
 f=R/'data/source-semantic-review-v212.json';q=json.loads(f.read_text()) if f.exists() else {'schema':1,'items':[]};seen={x['en'] for x in q['items']}
 for key,reason in review['sourceReviewPending'].items():
  s=rows[int(key)]
  if s['en'] not in seen:q['items'].append({'en':s['en'],'words':s.get('words') or list(dict.fromkeys(x['word'] for x in s.get('contexts',[]))),'reason':reason,'status':'needs_source_review','sourceSnapshotHash':sh});seen.add(s['en'])
 f.write_text(json.dumps(q,ensure_ascii=False,indent=2)+'\n')
print('EXACT_REVIEW_ADDED',len(added),'TOTAL',len(obj['pairs']))
