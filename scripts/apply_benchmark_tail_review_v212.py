#!/usr/bin/env python3
"""Apply the actually inspected remaining benchmark records with immutable evidence.
Phrase definitions are keyed by their own source gloss, not by a bare phrase string.
"""
from pathlib import Path
import json,hashlib,re,collections
R=Path(__file__).resolve().parent.parent;load=lambda p:json.loads(p.read_text());norm=lambda x:re.sub(r'\s+',' ',str(x or '')).strip()
def save(p,x):p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
path=R/'.work/bilingual-v212/benchmark-pending-unique-final.json';rows=load(path);snapshot_hash=hashlib.sha256(path.read_bytes()).hexdigest();pending=load(R/'.work/bilingual-v212/benchmark-current-pending.json')
m=load(R/'data/bilingual-v212-manifest.json');words={}
for b in m['bundles'].values():words.update(load(R/b['url'].removeprefix('./'))['words'])
p=R/'data/translation-corrections-v212.json';cor=load(p);by={x['en']:x for x in cor['pairs']}
n=R/'data/native-source-editorial-v212.json';nat=load(n);nb={(x['word'],x['sourceText']):x for x in nat['pairs']}
s=R/'data/source-definition-release-v212.json';src=load(s);sb={x['originalEn']:x for x in src}
receipts=[];visited=set()
for file in sorted((R/'data').glob('benchmark-tail-reviewed-*-v212.json')):
 spec=load(file);a,b=spec['reviewedRange'];assert spec['snapshot']==str(path.relative_to(R));assert not (visited&set(range(a,b)));visited.update(range(a,b))
 for i in range(a,b):
  x=rows[i];itemref=pending[x['pendingIndexes'][0]];word=itemref['word'];kind=x['kind'];o=words[word]
  seq=o['nativeSourceSummary']['pairs'] if kind=='native' else o[kind]
  item=next(q for q in seq if q['id']==itemref['id'])
  is_def=kind=='phrases' and item.get('meaningDisplay')=='sense_definition';en=item['definition'] if is_def else x['en'];zh=x['zh'];decision='reviewed_no_material_error';proof=str(file.relative_to(R))
  if str(i) in spec.get('translations',{}):
   zh=spec['translations'][str(i)];r={'en':en,'zh':zh,'reason':spec['reason'],'reviewerType':'assistant_linguistic_review','reviewBatch':proof,'sourceSnapshotIndex':i,'sourceSnapshotHash':snapshot_hash}
   if en in by:by[en].update(r)
   else:cor['pairs'].append(r);by[en]=r
   decision='revised'
  if str(i) in spec.get('nativeRevisions',{}):
   assert kind=='native';en=spec['nativeRevisions'][str(i)];key=(word,item['sourceText']);r={'word':word,'sourceText':key[1],'en':en,'reason':spec['reason'],'reviewerType':'assistant_linguistic_review','reviewBatch':proof}
   if key in nb:nb[key].update(r)
   else:nat['pairs'].append(r);nb[key]=r
   decision='native_revised'
  if str(i) in spec.get('sourceRevisions',{}):
   v=spec['sourceRevisions'][str(i)];r={'originalEn':en,**v,'reviewerType':'assistant_source_and_linguistic_review','reviewBatch':proof}
   if en in sb:sb[en].update(r)
   else:src.append(r);sb[en]=r
   en=v['en'];zh=v['zh'];decision='source_revised'
  receipts.append({'index':i,'words':x['words'],'kind':kind,'originalEn':item.get('definition') if is_def else x['en'],'originalZh':x['zh'],'approvedEn':en,'approvedZh':zh,'decision':decision,'sourceIdentity':item.get('phraseSense',item.get('sourceRefs',[])),'evidence':proof,'reviewer':'assistant_linguistic_review'})
assert visited==set(range(len(rows)))
# A source-level correction is also used for its original Chinese-only record.
for word in ['barclaycard','seng']:
 o=words[word]
 for item in o['nativeSourceSummary']['pairs']:
  english='commerce: Barclaycard, a Barclays credit card brand.' if word=='barclaycard' else 'Seng, a personal name; the original dictionary records 生 in Korean contexts and 森 in Cambodian, Burmese and Lao contexts.'
  key=(word,item['sourceText']);r={'word':word,'sourceText':item['sourceText'],'en':english,'reason':'Preserve the original name and domain labels; avoid literal mistranslation of name transcriptions.','reviewerType':'assistant_linguistic_review','reviewBatch':'independent-holdout-reviewed-v212.json'}
  if key in nb:nb[key].update(r)
  else:nat['pairs'].append(r);nb[key]=r
save(p,cor);save(n,nat);save(s,src)
report={'status':'REVIEWED_RECHECK_REQUIRED','snapshotHash':snapshot_hash,'reviewedUniquePairs':len(rows),'corrections':sum(x['decision']!='reviewed_no_material_error' for x in receipts),'reviewerType':'assistant_linguistic_review','reviews':receipts};save(R/'reports/benchmark-tail-review-receipt-v212.json',report)
print('REVIEWED',len(rows),'REVISIONS',report['corrections'],'TOTAL_EXACT_CORRECTIONS',len(cor['pairs']))
