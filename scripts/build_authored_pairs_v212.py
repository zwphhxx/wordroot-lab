#!/usr/bin/env python3
"""Build reviewed bilingual counterparts for existing authored learning prose.
Source-paired examples stay unchanged. Fixed templates retain word-specific data.
This file does not approve the separate machine-translated dictionary corpus.
"""
from pathlib import Path
import json,re,hashlib,collections
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212'
load=lambda p:json.loads(p.read_text('utf8'))
norm=lambda s:re.sub(r'\s+',' ',str(s or '')).strip()
snap=W/'authored-final-review-snapshot.json';rows=load(snap);objects=load(W/'authored-source-objects.json')
cache={norm(x['zh']):x['en'] for x in map(json.loads,(W/'authored-text-candidates.jsonl').read_text().splitlines())}
overrides={};reviewed=set();batches=[]
for path in sorted((R/'data').glob('authored-reviewed-*-v212.json')):
 spec=load(path);assert spec['snapshot']==str(snap.relative_to(R))
 a,b=spec['reviewedRange'];reviewed.update(range(a,b));batches.append({'file':str(path.relative_to(R)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'range':[a,b]})
 for i,en in spec['translations'].items():
  i=int(i);assert a<=i<b and re.search('[A-Za-z]',en);overrides[norm(rows[i]['zh'])]=en
pairs={};receipts=[]
for i,row in enumerate(rows):
 zh=norm(row['zh']);en=overrides.get(zh) or row.get('en')
 if en:status='editorial' if zh in overrides else 'source_bilingual'
 elif i in reviewed:en=cache.get(zh);status='assistant_reviewed_candidate'
 else:continue
 if en:pairs[zh]={'en':en,'status':status};receipts.append({'index':i,'zhHash':hashlib.sha256(zh.encode()).hexdigest(),'status':status,'en':en})
langs={'拉丁语':'Latin','晚期拉丁语':'Late Latin','古法语':'Old French','中古法语':'Middle French','中世纪拉丁语':'Medieval Latin','古希腊语':'Ancient Greek','新拉丁语':'New Latin','法语':'French','盎格鲁—诺曼法语':'Anglo-Norman French','德语':'German','原始印欧语':'Proto-Indo-European','原始希腊语':'Proto-Hellenic','中古英语':'Middle English','古英语':'Old English','现代英语':'Modern English'}
fixed={**langs,'构词关系':'Word formation','词形派生':'Derivation','记录的截短或逆构词关系':'A recorded clipping or back-formation','词源资料记载的相关词形':'A related form recorded in etymological sources','公开词源资料记录的组成形式':'Components recorded in the etymological source','构词提示':'Word-formation cue',
'公制计量单位，centi- 表示百分之一':'A metric unit; centi- means one hundredth.',
'与光、亮度有关的名词形式':'A noun form related to light or brightness.',
'来自 recycle 的动名词及名词用法':'The -ing form and noun usage of recycle.',
'来自 synchronize 的过去分词形容词用法':'An adjective use of the past participle of synchronize.',
'远距离通信相关的复合构词':'A compound relating to communication over a distance.',
'改造环境使其具有类似地球条件的构词表达':'A formation for changing an environment to make it more Earth-like.'}
for zh,en in fixed.items():pairs.setdefault(zh,{'en':en,'status':'editorial_template'})
meaning={}
for root in objects['ROOTLAB_DATA']:
 for group in root['groups']:
  for entry in group['entries']:
   z=norm(entry['meaning']);m=pairs.get(z,{}).get('en') or cache.get(z)
   assert m,(entry['word'],z)
   meaning[entry['word'].lower()]=m.split(';')[0].strip().rstrip('.')
for word,obj in objects['ROOTLAB_CURATED_ETYM'].items():
 gloss=meaning.get(word,word);summary=obj.get('summary','');kind=obj.get('status')
 en=None
 if kind=='source_path':
  all_languages=list(dict.fromkeys(langs.get(x['era'],x['era']) for x in obj['timeline'] if x['era']!='现代英语'))
  en='Etymological sources record related forms in '+', '.join(all_languages)+'. These forms help trace the development of the word. A current meaning of '+word+' is '+gloss+'.'
 elif kind=='source_formation':
  term=obj['timeline'][0]['term']
  if summary.startswith('词源资料指出'):en='The recorded derivation is '+term+'. A current meaning of '+word+' is '+gloss+'.'
  else:en='The source describes this word as formed from '+term+'. A current meaning of '+word+' is '+gloss+'.'
 elif kind=='source_excerpt':en='The English source contains the etymological record for this word. A current meaning of '+word+' is '+gloss+'.'
 elif kind=='teaching_formation':
  step=obj['timeline'][0];note=fixed[step['note']]
  en='Word-formation cue: '+step['term']+'. '+note+' A current meaning of '+word+' is '+gloss+'.'
 if en:pairs[norm(summary)]={'en':en,'status':'editorial_template'}
 for step in obj.get('timeline',[]):
  z=norm(step['note'])
  if z.startswith('目前常见含义：'):pairs[z]={'en':'A current meaning: '+gloss+'.','status':'editorial_template'}
# Repeated group note is a documented learning template, not automatically invented history.
for root in objects['ROOTLAB_DATA']:
 for group in root['groups']:
  z=norm(group.get('note',''));m=re.fullmatch(r'从「(.+)」这一词源线索理解本组单词，具体构词关系以专业词源辞典为准。',z)
  if m:
   en=pairs.get(m.group(1),{}).get('en') or cache.get(m.group(1));assert en
   pairs[z]={'en':'Use the historical clue '+en+' to understand this group; consult etymological references for each specific formation.','status':'editorial_template'}
missing=[{'index':i,**x} for i,x in enumerate(rows) if norm(x['zh']) not in pairs]
(R/'reports/authored-pair-missing-v212.json').write_text(json.dumps(missing,ensure_ascii=False,indent=2)+'\n')
assert not missing,[(x['index'],x['zh']) for x in missing[:12]]
for zh,item in pairs.items():
 assert item['en'] and not re.search('[\ue000-\uf8ff\ufffd\u2047]',item['en'])
meta={'schema':1,'count':len(pairs),'sourceSnapshotHash':hashlib.sha256(snap.read_bytes()).hexdigest(),'statuses':dict(collections.Counter(v['status'] for v in pairs.values())),'reviewBatches':batches}
(R/'authored-pairs-v212.js').write_text('window.ROOTLAB_AUTHORED_PAIRS='+json.dumps(pairs,ensure_ascii=False,separators=(',',':'))+';\nwindow.ROOTLAB_AUTHORED_META='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n')
(R/'reports/authored-pair-review-v212.json').write_text(json.dumps({**meta,'reviews':receipts,'scope':'Authored prose counterparts; not the entire lexical translation corpus.'},ensure_ascii=False,indent=2)+'\n')
print('AUTHORED_PAIRED',meta['count'],meta['statuses'])
