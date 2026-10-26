#!/usr/bin/env python3
"""Build a frozen review inventory without granting approval or changing records."""
from pathlib import Path
import json,re,hashlib,random,collections
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';P=R/'reports'
load=lambda p:json.loads(p.read_text());norm=lambda s:re.sub(r'\s+',' ',str(s or '')).strip()
m=load(R/'data/bilingual-v212-manifest.json');words={}
for b in m['bundles'].values():words.update(load(R/b['url'].removeprefix('./'))['words'])
assert len(words)==49426
known={};add=lambda en,zh,ev:known.setdefault((norm(en),norm(zh)),[]).append(ev) if en and zh else None
for c in load(R/'data/translation-corrections-v212.json')['pairs']:add(c['en'],c['zh'],'data/translation-corrections-v212.json')
for c in load(R/'data/native-source-editorial-v212.json')['pairs']:add(c['en'],c['sourceText'],'native-reviewed:'+c['word'])
for c in load(R/'data/source-definition-release-v212.json'):add(c['en'],c['zh'],'source-definition-release')
spec=load(R/'data/source-definition-final-revisions-v212.json')
for c in spec['revisions'].values():add(c[0],c[1],'source-definition-final-revisions')
for f in (R/'data').glob('*review*-v212.json'):
 try:s=load(f)
 except Exception:continue
 if not isinstance(s,dict) or 'reviewedRange' not in s or 'snapshot' not in s:continue
 p=R/s['snapshot']
 if not p.exists():continue
 rows=load(p);a,b=s['reviewedRange'];ed=s.get('translations',{})
 if not isinstance(rows,list):continue
 for i in range(a,min(b,len(rows))):
  q=rows[i]
  if not isinstance(q,dict) or not q.get('en') or not q.get('zh'):continue
  z=ed.get(str(i),q['zh'])
  if isinstance(z,str):add(q['en'],z,str(f.relative_to(R)))
for word,obj in load(R/'data/bilingual-editorial-v212.json').items():
 for kind in ('senses','examples','phrases'):
  for q in obj.get(kind,[]):add(q.get('en'),q.get('zh'),'editorial:'+word)
benchmark=load(R/'tests/fixtures/bilingual-semantic-benchmark-v212.json');bench={x['word'] for x in benchmark['items']}
allrows=[];seen=set();pending=[];stats=collections.Counter();summary={}
for word,o in words.items():
 rows=[]
 for kind in ['senses','examples','phrases','relations']:
  for x in o[kind]:
   rows.append({'word':word,'kind':kind,'id':x['id'],'en':x['en'],'zh':x['zh'],'sourceRefs':x.get('sourceRefs',[]),'reviewStatus':x.get('reviewStatus')})
   if x.get('definitionPair'):rows.append({'word':word,'kind':'phrase-definition','id':x['id']+':definition','en':x['definitionPair']['en'],'zh':x['definitionPair']['zh']})
 for x in o['nativeSourceSummary'].get('pairs',[]):rows.append({'word':word,'kind':'native','id':x['id'],'en':x['en'],'zh':x['zh']})
 hits=0
 for x in rows:
  k=(norm(x['en']),norm(x['zh']));x['priorEvidence']=known.get(k,[])
  if word in bench:
   stats[x['kind']]+=1
   if x['priorEvidence']:hits+=1
   else:pending.append(x)
  if k not in seen:
   seen.add(k);allrows.append(x)
 if word in bench:summary[word]={'total':len(rows),'evidenceMatched':hits,'pending':len(rows)-hits,'senses':len(o['senses'])}
base={'buildId':m['buildId'],'counts':dict(stats),'words':summary,'uniqueCorpusPairs':len(allrows),'pendingCount':len(pending)}
(W/'benchmark-current-pending.json').write_text(json.dumps(pending,ensure_ascii=False,indent=2));(P/'benchmark-evidence-coverage.json').write_text(json.dumps(base,ensure_ascii=False,indent=2))
# New holdout excludes exact previously inspected pairs and all benchmark words.
rng=random.Random('rootlab-final-holdout-20261026-v1');groups=collections.defaultdict(list)
for x in allrows:
 if not x['priorEvidence'] and x['word'] not in bench:groups[x['kind']].append(x)
selected=[]
for kind,items in sorted(groups.items()):selected.extend(rng.sample(items,min(20,len(items))))
for i,x in enumerate(selected):x['reviewIndex']=i
raw=json.dumps(selected,ensure_ascii=False,indent=2);h=hashlib.sha256(raw.encode()).hexdigest();path=W/('independent-holdout-'+h[:12]+'.json')
if not path.exists():path.write_text(raw)
(P/'independent-holdout-inventory.json').write_text(json.dumps({'buildId':m['buildId'],'snapshot':str(path.relative_to(R)),'sha256':h,'count':len(selected),'strata':dict(collections.Counter(x['kind'] for x in selected)),'method':'Deterministic stratified sample of unique current pairs excluding prior reviewed pairs and 80-word benchmark; not representative error-rate estimation'},ensure_ascii=False,indent=2))
print('BENCHMARK',json.dumps(base,ensure_ascii=False));print('HOLDOUT',str(path),len(selected));print('PENDING_TYPES',dict(collections.Counter(x['kind'] for x in pending)))
