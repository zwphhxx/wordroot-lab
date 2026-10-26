#!/usr/bin/env python3
"""Apply the inspected independent sample and preserve its original failed assessment.
The sample selection was blind; post-repair verification is not a fresh holdout score.
"""
from pathlib import Path
import json,hashlib,re
R=Path(__file__).resolve().parent.parent
load=lambda p:json.loads(p.read_text());dump=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
spec=load(R/'data/independent-holdout-reviewed-v212.json');snap=R/spec['snapshot'];rows=load(snap);sh=hashlib.sha256(snap.read_bytes()).hexdigest()
m=load(R/'data/bilingual-v212-manifest.json');words={}
for b in m['bundles'].values():words.update(load(R/b['url'].removeprefix('./'))['words'])
p=R/'data/translation-corrections-v212.json';cor=load(p);known={x['en']:x for x in cor['pairs']}
n=R/'data/native-source-editorial-v212.json';native=load(n);nk={(x['word'],x['sourceText']):x for x in native['pairs']}
s=R/'data/source-definition-release-v212.json';sources=load(s);sk={x['originalEn']:x for x in sources}
receipts=[]
for i,x in enumerate(rows):
 kind=x['kind'];obj=words[x['word']];collection=obj['nativeSourceSummary']['pairs'] if kind=='native' else obj['phrases'] if kind in ('phrases','phrase-definition') else obj[kind]
 item=next(v for v in collection if v['id']==x['id'].removesuffix(':definition'))
 actual_en=item['definition'] if kind=='phrase-definition' or (kind=='phrases' and item.get('meaningDisplay')=='sense_definition') else x['en']
 after_en=actual_en;after_zh=x['zh'];decision='reviewed_no_material_error'
 if str(i) in spec['zhRevisions']:
  after_zh=spec['zhRevisions'][str(i)];row={'en':actual_en,'zh':after_zh,'reason':'独立分层样本逐项核对后修正；保持当前词义、对象、领域和否定，不把原盲测结果改写为无错。','reviewerType':'assistant_linguistic_review','reviewBatch':'independent-holdout-reviewed-v212.json','sourceSnapshotHash':sh,'sourceSnapshotIndex':i}
  if actual_en in known:known[actual_en].update(row)
  else:cor['pairs'].append(row);known[actual_en]=row
  decision='revised'
 if str(i) in spec['nativeRevisions']:
  after_en=spec['nativeRevisions'][str(i)];key=(x['word'],item['sourceText']);row={'word':key[0],'sourceText':key[1],'en':after_en,'reason':'按原中文逐项翻译，领域、词性和并列义项不省略。','reviewerType':'assistant_linguistic_review','reviewBatch':'independent-holdout-reviewed-v212.json','sourceSnapshotHash':sh,'sourceSnapshotIndex':i}
  if key in nk:nk[key].update(row)
  else:native['pairs'].append(row);nk[key]=row
  decision='revised_native'
 if str(i) in spec['sourceRevisions']:
  v=spec['sourceRevisions'][str(i)];after_en=v['en'];after_zh=v['zh'];row={'originalEn':actual_en,**v,'reviewerType':'assistant_source_and_linguistic_review','reviewBatch':'independent-holdout-reviewed-v212.json'}
  if actual_en in sk:sk[actual_en].update(row)
  else:sources.append(row);sk[actual_en]=row
  decision='source_or_generated_english_revised'
 receipts.append({'index':i,'word':x['word'],'kind':kind,'recordId':x['id'],'originalEn':actual_en,'originalZh':x['zh'],'approvedEn':after_en,'approvedZh':after_zh,'decision':decision,'reviewer':'assistant_linguistic_review','snapshotHash':sh})
dump(p,cor);dump(n,native);dump(s,sources)
report={'initialAssessment':'FAILED_WITH_MATERIAL_ERRORS','status':'REMEDIATIONS_RECORDED_RECHECK_REQUIRED','snapshot':spec['snapshot'],'snapshotHash':sh,'independentSelection':True,'reviewed':len(rows),'revised':sum(x['decision']!='reviewed_no_material_error' for x in receipts),'scope':'Only this independently selected 120-pair sample; neither a fresh post-repair blind score nor all-corpus semantic certification.','reviews':receipts}
dump(R/'reports/independent-sample-user-review-v212.json',report);print('HOLDOUT',report['reviewed'],'REVISED',report['revised'],'EXACT_CORRECTIONS',len(cor['pairs']))
