#!/usr/bin/env python3
"""Apply inspected translations of immutable word-specific native source blocks.
No one-word or cross-context substitutions; original source text is untouched.
"""
from pathlib import Path
import json,hashlib,sys,re
R=Path(__file__).resolve().parent.parent
batch=R/sys.argv[1];edits=json.loads(batch.read_text());snapshot=R/edits.get('snapshot','.work/bilingual-v212/native-risk-review-final.json');rows=json.loads(snapshot.read_text())
path=R/'data/native-source-editorial-v212.json';data=json.loads(path.read_text());pairs=data['pairs'];existing={(p['word'],p['sourceText']):p for p in pairs};receipts=[]
for index,value in edits['translations'].items():
 source=rows[int(index)];answer=value if isinstance(value,str) else value['en'];reason=(value.get('reason') if isinstance(value,dict) else None) or '逐条按原中文核对全部义项、括号限定、词性和领域，保留人物/地名与原词形，不将中文音译误作新英文词。'
 assert answer.strip() and re.search('[A-Za-z]',answer) and not re.search('[\ue000-\uf8ff\ufffd\u2047]',answer)
 key=(source['word'],source['zh']);old=existing.get(key)
 if old:
  if old['en']!=answer:raise ValueError('Conflicting reviewed translation '+str(key))
  continue
 row={'word':source['word'],'sourceText':source['zh'],'en':answer,'reason':reason,'reviewerType':'assistant_linguistic_review','reviewBatch':batch.name,'sourceHash':hashlib.sha256(source['zh'].encode()).hexdigest()}
 pairs.append(row);existing[key]=row;receipts.append({'index':int(index),**row})
tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)
report={'snapshotHash':hashlib.sha256(snapshot.read_bytes()).hexdigest(),'batch':str(batch.relative_to(R)),'reviewer':'assistant_linguistic_review','applied':len(receipts),'items':receipts}
(R/'reports'/('applied-'+batch.stem+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('NATIVE_REVIEW_APPLIED',len(receipts),'TOTAL',len(pairs))
