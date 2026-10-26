#!/usr/bin/env python3
"""Recover source identities from the actual legacy builder, not sense guessing.
The original build_usage_v27.py used wnphrases.setdefault in WordNet file order.
Replaying that exact provenance decision identifies which record supplied a
legacy phrase; all competing candidates are retained in the audit, not merged.
"""
from pathlib import Path
import json,re,zipfile,hashlib,os
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';RAW=R.parent/'wordroot-lab-deploy/.v12-work'
legacy_script=R/'scripts/build_usage_v27.py';code=legacy_script.read_text()
assert "for part in ('noun','verb','adj','adv')" in code
assert "wnphrases.setdefault(word,{'definition':definition,'pos':pos})" in code
legacy={}
for p in (R/'data/usage-v27').glob('*.json'):legacy.update(json.loads(p.read_text())['words'])
first={};all_candidates={};targets={'push up','shake off','throw off'}
with zipfile.ZipFile(RAW/'wordnet30.zip') as z:
 for part in ('noun','verb','adj','adv'):
  member='wordnet/data.'+part
  for line_no,line in enumerate(z.read(member).decode().splitlines(),1):
   if not re.match(r'^\d{8} ',line) or ' | ' not in line:continue
   left,gloss=line.split(' | ',1);t=left.split();n=int(t[3],16);pos='a' if t[2]=='s' else t[2]
   forms=[re.sub(r'\([aps]\)$','',t[4+2*i].lower()).replace('_',' ') for i in range(n)]
   definition=gloss.split('; "',1)[0].strip().rstrip(';')
   for name in targets.intersection(forms):
    row={'synsetId':t[0]+'-'+pos,'pos':pos,'definition':definition,'member':member,'sourceLine':line_no,'lineSha256':hashlib.sha256(line.encode()).hexdigest()}
    first.setdefault(name,row);all_candidates.setdefault(name,[]).append(row)
p=W/'source-records.json';data=json.loads(p.read_text());report=[]
for word,phrase in [('push','push up'),('shake','shake off'),('throw','throw off')]:
 old=next(x for x in legacy[word]['phrases'] if x['en']==phrase)
 origin=first[phrase];assert old['definition']==origin['definition'][:220] and old['pos']==origin['pos'],phrase
 row=next(x for x in data['records'][word]['phrases'] if x['en']==phrase)
 assert row['definition']==origin['definition'],phrase
 row['sourcePhraseSynsetId']=origin['synsetId'];row['sourcePhraseVersion']='WordNet-3.0'
 row['provenanceRecovery']={'method':'replay-original-builder-source-selection','legacyBuilderHash':hashlib.sha256(legacy_script.read_bytes()).hexdigest(),'member':origin['member'],'sourceLine':origin['sourceLine'],'sourceLineHash':origin['lineSha256']}
 report.append({'word':word,'phrase':phrase,'selectedSource':origin,'allCandidateRecords':all_candidates[phrase],'basis':row['provenanceRecovery'],'noSemanticMerge':True,'note':'The chosen source is the exact original record used by the legacy builder; this does not certify the phrase translation or claim other meanings do not exist.'})
backup=W/'source-records.before-phrase-provenance-recovery.json'
if not backup.exists():backup.write_bytes(p.read_bytes())
tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));os.replace(tmp,p)
(R/'reports/phrase-provenance-recovery.json').write_text(json.dumps({'status':'EXACT_SOURCE_RECOVERED','records':report},ensure_ascii=False,indent=2)+'\n')
print('RECOVERED',[(r['word'],r['phrase'],r['selectedSource']['synsetId'],len(r['allCandidateRecords'])) for r in report])
