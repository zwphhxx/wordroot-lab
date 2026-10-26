#!/usr/bin/env python3
"""Verify published pairs against actual recorded linguistic reviews.
A finite reviewed benchmark plus a remediated blind sample is not a claim of
whole-corpus manual review or an independent post-fix accuracy measurement.
"""
from pathlib import Path
import json,re,hashlib,collections
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';P=R/'reports'
load=lambda p:json.loads(p.read_text());norm=lambda x:re.sub(r'\s+',' ',str(x or '')).strip()
def dump(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
m=load(R/'data/bilingual-v212-manifest.json');words={}
for b in m['bundles'].values():words.update(load(R/b['url'].removeprefix('./'))['words'])
evidence=collections.defaultdict(set)
def add(en,zh,where):
 if en and zh:evidence[(norm(en),norm(zh))].add(where)
for x in load(R/'data/translation-corrections-v212.json')['pairs']:add(x['en'],x['zh'],'exact-correction:'+str(x.get('reviewBatch') or x.get('reason')))
for x in load(R/'data/native-source-editorial-v212.json')['pairs']:add(x['en'],x['sourceText'],'native-reviewed:'+x['word'])
for x in load(R/'data/source-definition-release-v212.json'):add(x['en'],x['zh'],'source-editorial:'+str(x.get('reviewBatch') or x.get('reason')))
for x in load(R/'data/source-definition-final-revisions-v212.json')['revisions'].values():add(x[0],x[1],'final-source-definition-review')
for f in (R/'data').glob('*review*-v212.json'):
 try:s=load(f)
 except Exception:continue
 if not isinstance(s,dict) or 'reviewedRange' not in s or 'snapshot' not in s:continue
 p=R/s['snapshot']
 if not p.exists():continue
 rows=load(p);a,b=s['reviewedRange']
 if not isinstance(rows,list):continue
 for i in range(a,min(b,len(rows))):
  x=rows[i]
  if not isinstance(x,dict) or not x.get('en') or not x.get('zh'):continue
  z=s.get('translations',{}).get(str(i),x['zh'])
  if isinstance(z,str):add(x['en'],z,str(f.relative_to(R))+':'+str(i))
for name in ['benchmark-tail-review-receipt-v212.json','independent-sample-user-review-v212.json']:
 for x in load(P/name)['reviews']:add(x['approvedEn'],x['approvedZh'],name+':'+str(x['index']))
for w,o in load(R/'data/bilingual-editorial-v212.json').items():
 for k in ('senses','examples','phrases'):
  for x in o.get(k,[]):add(x.get('en'),x.get('zh'),'authored-dictionary:'+w)
benchpath=R/'tests/fixtures/bilingual-semantic-benchmark-v212.json';bench=load(benchpath);pending=[];checked=[]
for item in bench['items']:
 word=item['word'];o=words[word];rows=[]
 for kind in ('senses','examples','phrases','relations'):
  for v in o[kind]:
   pair=v['definitionPair'] if kind=='phrases' and v.get('meaningDisplay')=='sense_definition' else v
   rows.append({'kind':kind,'id':v['id'],'en':pair['en'],'zh':pair['zh']})
   if kind=='phrases' and v.get('definitionPair') and pair is not v['definitionPair']:rows.append({'kind':'phrase-definition','id':v['id']+':definition','en':v['definitionPair']['en'],'zh':v['definitionPair']['zh']})
 for v in o['nativeSourceSummary']['pairs']:rows.append({'kind':'native','id':v['id'],'en':v['en'],'zh':v['zh']})
 bad=[];proof=set()
 for v in rows:
  ev=evidence.get((norm(v['en']),norm(v['zh'])))
  if ev:proof.update(ev)
  else:bad.append({'word':word,**v})
 pending+=bad;digest=hashlib.sha256(json.dumps(rows,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 checked.append({'word':word,'pairs':len(rows),'unreviewed':len(bad),'contentHash':digest,'evidenceCount':len(proof)})
 if not bad:
  item.update(status='approved',reviewer='assistant_linguistic_review',buildId=m['buildId'],contentHash=digest,evidence=sorted(proof),scope='All current lexical meanings, examples, phrase meanings, relation-target definitions and original Chinese-source pairs for this benchmark word. Not all dictionary words.')
 else:item.update(status='pending_semantic_review',reviewer=None,evidence=[])
dump(benchpath,bench);dump(P/'benchmark-final-pending.json',pending)
# Verify every actual blind-sample repair, retaining the initial failed assessment.
ind=load(P/'independent-sample-user-review-v212.json');verification=[];indmissing=[]
for row in ind['reviews']:
 o=words[row['word']];kind=row['kind'];keyid=row['recordId'].removesuffix(':definition');seq=o['nativeSourceSummary']['pairs'] if kind=='native' else o['phrases'] if kind in ('phrases','phrase-definition') else o[kind]
 target=next((x for x in seq if x['id']==keyid),None)
 if not target:
  # Correcting a generated source definition can legitimately change its stable source ID.
  target=next((x for x in seq if norm(x.get('en'))==norm(row['approvedEn']) and norm(x.get('zh'))==norm(row['approvedZh'])),None)
 p=target
 if p and kind=='phrase-definition':p=target.get('definitionPair')
 elif p and kind=='phrases' and p.get('meaningDisplay')=='sense_definition':p=p.get('definitionPair')
 ok=bool(p and norm(p.get('en'))==norm(row['approvedEn']) and norm(p.get('zh'))==norm(row['approvedZh']))
 verification.append({'index':row['index'],'word':row['word'],'verified':ok,'originalDecision':row['decision']})
 if not ok:indmissing.append({'review':row,'current':p})
dump(P/'independent-sample-verification-v212.json',{'buildId':m['buildId'],'status':'PASS' if not indmissing else 'BLOCKED','initialBlindAssessment':ind['initialAssessment'],'independentSelection':True,'repairedThenVerified':True,'originalRevisedCount':ind['revised'],'reviewed':len(verification),'checks':verification,'unresolved':indmissing,'scope':'Independent blind sample was reviewed, failed, and its identified errors repaired. This is NOT a fresh blinded error-free evaluation or a whole-corpus accuracy certification.'})
result={'buildId':m['buildId'],'status':'PASS' if not pending and not indmissing and len(checked)>=80 else 'BLOCKED','benchmarkWords':len(checked),'benchmarkPairs':sum(x['pairs'] for x in checked),'unreviewedBenchmarkPairs':len(pending),'benchmark':checked,'independentSample':{'initialBlindAssessment':ind['initialAssessment'],'reviewed':120,'revised':ind['revised'],'unresolvedAfterRepair':len(indmissing)},'reviewerType':'assistant_linguistic_review','coverageLimit':'Meaning checks cover this 80-word benchmark and the recorded independent sample. Remaining machine-translated content is rule-screened and explicitly marked, not manually certified. No claim of zero unknown errors in the entire dictionary.'}
dump(P/'semantic-review-results.json',result)
print('SEMANTIC',result['status'],'BENCH_WORDS',len(checked),'PAIRS',result['benchmarkPairs'],'PENDING',len(pending),'SAMPLE_MISMATCH',len(indmissing))
for x in pending[:24]:print('PENDING',json.dumps(x,ensure_ascii=False))
for x in indmissing[:8]:print('SAMPLE_MISMATCH',json.dumps(x,ensure_ascii=False))
