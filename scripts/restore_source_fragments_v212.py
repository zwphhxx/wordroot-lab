#!/usr/bin/env python3
"""Restore legacy truncated phrase glosses/examples using exact WordNet provenance.
No fuzzy alignment: same source headword plus exact prefix and matching POS only.
Changes are recorded before candidate translation/build is restarted.
"""
from pathlib import Path
import os,json,re,zipfile,collections,hashlib,time
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';P=R/'reports'
RAW=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work')))
file=W/'source-records.json';data=json.loads(file.read_text());phrase_index=collections.defaultdict(list);synsets={}
norm=lambda s:re.sub(r'\s+',' ',str(s or '')).strip()
with zipfile.ZipFile(RAW/'wordnet30.zip') as z:
 for kind in ('noun','verb','adj','adv'):
  for line in z.read('wordnet/data.'+kind).decode().splitlines():
   if not re.match(r'^\d{8} ',line) or ' | ' not in line:continue
   left,gloss=line.split(' | ',1);t=left.split();n=int(t[3],16);pos='a' if t[2]=='s' else t[2];sid=t[0]+'-'+pos
   names=[re.sub(r'\([aps]\)$','',t[4+2*i]).replace('_',' ').lower() for i in range(n)]
   definition=re.split(r';\s*"',gloss,maxsplit=1)[0].strip().rstrip(';')
   row={'id':sid,'pos':pos,'en':definition,'examples':re.findall(r'"([^"]+)"',gloss)};synsets[sid]=row
   for name in names:
    if ' ' in name:phrase_index[name].append(row)
changes=[];unmatched=[];added_inputs=set()
for word,entry in data['records'].items():
 for p in entry['phrases']:
  old=norm(p.get('definition'));matches=[x for x in phrase_index[norm(p['en']).lower()] if (not p.get('pos') or p['pos']==x['pos']) and (not old or norm(x['en'])==old or (len(old)>=100 and norm(x['en']).startswith(old)))]
  if len(matches)==1:
   row=matches[0];p['sourcePhraseSynsetId']=row['id'];p['sourcePhraseVersion']='WordNet-3.0'
   if old and norm(row['en'])!=old:
    p['sourceTruncatedDefinition']=p['definition'];p['definition']=row['en'];added_inputs.add(row['en'])
    changes.append({'word':word,'type':'phrase_gloss_restored','phrase':p['en'],'old':old,'restored':row['en'],'sourceSynset':row['id']})
  elif old:unmatched.append({'word':word,'phrase':p['en'],'pos':p.get('pos'),'definition':old,'matches':len(matches)})
 for index,old in enumerate(entry['examples']):
  matched=[(sid,ex) for sid in entry['senseIds'] for ex in synsets.get(sid,{}).get('examples',[]) if len(norm(old))>=120 and len(norm(ex))>len(norm(old)) and norm(ex).startswith(norm(old))]
  unique=list(dict.fromkeys(matched))
  if len(unique)==1:
   sid,full=unique[0];entry['examples'][index]=full;added_inputs.add(full)
   changes.append({'word':word,'type':'example_restored','old':old,'restored':full,'sourceSynset':sid})
backup=W/'source-records.before-fragment-restoration.json'
if not backup.exists():backup.write_bytes(file.read_bytes())
tmp=file.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));os.replace(tmp,file)
inputfile=W/'en-input.json';inputs=json.loads(inputfile.read_text());all_text=sorted(set(inputs)|added_inputs,key=lambda x:(len(x),x));inputfile.write_text(json.dumps(all_text,ensure_ascii=False))
report={'source':'Princeton WordNet 3.0','restoredCounts':dict(collections.Counter(x['type'] for x in changes)),'newTranslationInputs':len(added_inputs-set(inputs)),'changes':changes,'unresolved':unmatched,'note':'Restores documented source fragments, not generated completions.'}
(P/'source-fragment-restoration.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('RESTORED',report['restoredCounts'],'NEW_INPUTS',report['newTranslationInputs'],'UNMATCHED_PHRASES',len(unmatched),flush=True)
for row in unmatched[:12]:print(json.dumps(row,ensure_ascii=False),flush=True)
