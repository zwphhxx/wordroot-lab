#!/usr/bin/env python3
"""Aggregate inspected bilingual display surfaces with current-build/hash evidence.
A deferred live source is retained and linked, not counted as a translated article.
"""
from pathlib import Path
import json,hashlib,sys,time
R=Path(__file__).resolve().parent.parent;P=R/'reports'
load=lambda p:json.loads(p.read_text('utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=load(R/'data/bilingual-v212-manifest.json');checks=[];evidence={}
def check(name,ok,details=None):checks.append({'name':name,'passed':bool(ok),'details':details})
for filename,min_checks in [('external-encyclopedia-contract-v212.json',16),('browser-visual-pairs-v212.json',10),('authored-browser-audit-v212.json',4),('release-boundary-audit-v212.json',11)]:
 p=P/filename
 if not p.exists():check(filename,False,'missing report');continue
 d=load(p);evidence[filename]={'sha256':sha(p),'buildId':d.get('buildId'),'status':d.get('status'),'checks':len(d.get('checks',[]))}
 check(filename,d.get('status')=='PASS' and d.get('buildId')==m['buildId'] and len(d.get('checks',[]))>=min_checks and all(x.get('ok') for x in d['checks']))
 if filename=='external-encyclopedia-contract-v212.json':check('encyclopedia_code_unchanged',d.get('codeSha256')==sha(R/'encyclopedia-v212.js'))
 if filename=='authored-browser-audit-v212.json':check('authored_prose_coverage',d.get('wordsTested',0)>=80 and not d.get('unmatched'))
 if filename=='release-boundary-audit-v212.json':
  for code,digest in d.get('codeHashes',{}).items():check('boundary_hash:'+code,sha(R/code)==digest)
  check('all_boundary_hashes_present',len(d.get('codeHashes',{}))>=6)
caption=load(P/'visual-caption-pair-audit.json');check('122_source_captions_paired',caption['status']=='PASS' and caption['paired']==caption['total']==122)
hist=load(P/'history-excerpt-review-v212.json');check('all_retained_history_excerpt_reviews',hist['status']=='REVIEWED' and hist['count']==313 and len(hist['reviews'])==313)
checks_ok=all(x['passed'] for x in checks)
result={'status':'PASS' if checks_ok else 'BLOCKED','buildId':m['buildId'],'createdAt':time.time(),'checks':checks,'evidence':evidence,'coverage':{'reviewedImageCaptions':122,'reviewedHistoryExcerpts':313,'authoredTextPairs':load(P/'authored-pair-review-v212.json')['count'],'lexicalPairs':'Scanned separately by release_preflight_v212.py'},'externalMissingPolicy':'Live sources lacking an exact counterpart or a same-entity language edition are retained in source cache, linked, and marked deferred. They are never counted as translated or silently invented.','scope':'Current registered dictionary, authored prose, history, image-caption, encyclopedia article/candidate and selected-topic display paths; not a claim that the entire external web has translations.'}
(P/'external-content-pair-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for x in checks:print('PASS' if x['passed'] else 'BLOCKED',x['name'])
print('EXTERNAL_COVERAGE',result['status'],m['buildId']);sys.exit(0 if checks_ok else 2)
