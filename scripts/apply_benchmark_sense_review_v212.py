#!/usr/bin/env python3
"""Apply explicitly read, sense-specific translations from an immutable review snapshot.
This records partial semantic review, never approves all modules of benchmark words.
"""
from pathlib import Path
import argparse,json,hashlib
R=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('batch');a=p.parse_args();batch=R/a.batch;review=json.loads(batch.read_text());sp=R/review['snapshot'];snap={x['word']:x for x in json.loads(sp.read_text())};sh=hashlib.sha256(sp.read_bytes()).hexdigest()
p=R/'data/translation-corrections-v212.json';allc=json.loads(p.read_text());previous={x['en']:x for x in allc['pairs']};prepared=[];conflicts=[];reviewed=[]
for word,translations in review['words'].items():
 senses=snap[word]['senses'];assert len(senses)==len(translations),(word,len(senses),len(translations))
 for source,zh in zip(senses,translations):
  en=source['en'];evidence={'word':word,'senseId':source['id'],'sourceEnSha256':hashlib.sha256(en.encode()).hexdigest(),'snapshotSha256':sh,'oldZh':source['zh'],'reviewedZh':zh}
  reviewed.append(evidence)
  if en in previous:
   if previous[en]['zh']!=zh:conflicts.append({'en':en,'prior':previous[en]['zh'],'next':zh,'word':word,'senseId':source['id']})
   continue
  item={'en':en,'zh':zh,'reason':'逐义项核对词性、对象、语境及完整解释；非该词全部模块验收。','reviewerType':'assistant_linguistic_review','reviewBatch':batch.name,'sourceSnapshotHash':sh,'senseIdAtReview':source['id'],'affectedWords':[word],'sourceEvidence':['local:source-gloss:'+source['id']]}
  prepared.append(item);previous[en]=item
if conflicts:
 report=R/'reports/benchmark-sense-review-conflicts.json';report.write_text(json.dumps(conflicts,ensure_ascii=False,indent=2));raise SystemExit('Review existing edits first: '+str(report))
allc['pairs'].extend(prepared);tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(allc,ensure_ascii=False,indent=2)+'\n');tmp.replace(p)
report={'batch':batch.name,'sourceSnapshotHash':sh,'status':'SENSE_TRANSLATIONS_REVIEWED_OTHER_MODULES_PENDING','wordsReviewed':len(review['words']),'sensePairsReviewed':len(reviewed),'addedCorrections':len(prepared),'totalCorrections':len(allc['pairs']),'reviews':reviewed,'scope':review['scope'],'notIndependentHoldout':True}
(R/'reports'/('applied-'+batch.stem+'.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('SENSE_REVIEW',len(review['words']),'WORDS',len(reviewed),'SENSES','ADDED',len(prepared),'TOTAL',len(allc['pairs']))
