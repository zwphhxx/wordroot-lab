#!/usr/bin/env python3
"""Repair undotted POS line boundaries without rebuilding/restoring unrelated fields.
Retains source line hashes and every source fragment. Compound gloss restorations
and example provenance from the previous repair pass are left intact.
"""
from pathlib import Path
import os,csv,json,re,hashlib,collections
from lexical_source_parser_v212 import parse_english_definitions
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';RAW=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work')))
p=W/'source-records.json';data=json.loads(p.read_text());records=data['records'];synsets=data['synsets'];canonical=collections.defaultdict(list)
norm=lambda x:re.sub(r'\s+',' ',x).casefold().rstrip('.').strip()
for sid,v in synsets.items():canonical[norm(v['en'])].append(sid)
changes=[];inputs=set(json.loads((W/'en-input.json').read_text()));chosen={}
with (RAW/'ecdict.csv').open(encoding='utf8',newline='') as f:
 for row in csv.DictReader(f):
  word=row['word'].lower()
  if word not in records:continue
  if word in chosen and row['word']!=word:continue
  chosen[word]=row
for word,raw in chosen.items():
 old=records[word];parsed,excluded=parse_english_definitions(raw.get('definition',''));prior=old.get('sourceEntries') or []
 if parsed==prior:continue
 ids=list(old['senseIds']);own={norm(synsets[sid]['en']) for sid in ids if sid in synsets};extra=[]
 for entry in parsed:
  if norm(entry['en']) in own:continue
  match=next((sid for sid in canonical.get(norm(entry['en']),[]) if word in {w.lower() for w in synsets[sid]['forms']}),None)
  if match and match not in ids:ids.append(match);own.add(norm(entry['en']))
  elif not match and entry['en'] not in extra:extra.append(entry['en']);inputs.add(entry['en'])
 old['sourceEntries']=parsed;old['extraEn']=extra;old['senseIds']=ids
 changes.append({'word':word,'oldEntryCount':len(prior),'newEntryCount':len(parsed),'originalSourceHash':hashlib.sha256(raw.get('definition','').encode()).hexdigest(),'oldEnglish':[v['en'] for v in prior],'newEnglish':[v['en'] for v in parsed],'sourceLines':[v['sourceLines'] for v in parsed],'excluded':excluded})
backup=W/'source-records.before-undotted-pos-repair.json'
if not backup.exists():backup.write_bytes(p.read_bytes())
tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));os.replace(tmp,p)
inp=W/'en-input.json';original=json.loads(inp.read_text());inp.write_text(json.dumps(sorted(inputs,key=lambda x:(len(x),x)),ensure_ascii=False))
report={'status':'STRUCTURAL_REPAIR_NOT_SEMANTIC_APPROVAL','changedWords':len(changes),'splitDifference':sum(x['newEntryCount']-x['oldEntryCount'] for x in changes),'newTranslationInputs':len(inputs-set(original)),'sourceLinesPreserved':True,'changes':changes,'remainingSourceIssues':[{'word':'siting','issue':'Source record contains sit meanings as well as site; source-level lexical identity requires review before treating all entries as current meanings.'}]}
(R/'reports/source-pos-repair.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('POS_REPAIR',{k:v for k,v in report.items() if k not in ('changes','remainingSourceIssues')},flush=True)
for w in ['associated','modernizing','pageantry','siting']:
 v=records[w];print(w,len(v['sourceEntries']),[s['en'] for s in v['sourceEntries']][:4],flush=True)
