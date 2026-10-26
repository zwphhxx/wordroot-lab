#!/usr/bin/env python3
"""Reconstruct untruncated lexical senses and sense-linked examples/relations.
Raw data stay in .v12-work. Existing dictionary assets are never overwritten.
"""
from pathlib import Path
import os,json,re,csv,zipfile,collections,hashlib
from lexical_source_parser_v212 import parse_english_definitions, strip_pos
R=Path(__file__).resolve().parent.parent; RAW=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work'))); W=R/'.work/bilingual-v212';W.mkdir(parents=True,exist_ok=True)
core=json.loads((R/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0]);known={x[0]:x for x in core}
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
# POS-aware parser also handles WordNet satellite adjectives and adverbs.
lines=lambda x:[v.strip() for v in re.split(r'\\n|[\r\n]',x or '') if v.strip()]
chinese=lambda x:bool(re.search('[\u3400-\u9fff]',str(x)))
texts=set();zhtasks=set();srczh={};raw={};wn={};order={};cow=collections.defaultdict(list);parse_records=[]
for line in (W/'cow.tab').read_text().splitlines():
 if line.startswith('#'):continue
 parts=line.split('\t')
 if len(parts)==3 and parts[1]=='cmn:lemma':cow[parts[0]].append(parts[2])
with zipfile.ZipFile(RAW/'wordnet30.zip') as z:
 for part in ('noun','verb','adj','adv'):
  for line in z.read('wordnet/data.'+part).decode('utf8').splitlines():
   if not re.match(r'^\d{8} ',line) or ' | ' not in line:continue
   lhs,g=line.split(' | ',1);t=lhs.split();n=int(t[3],16);pos='a' if t[2]=='s' else t[2];sid=t[0]+'-'+pos
   forms=[re.sub(r'\([aps]\)$','',t[4+2*i]).replace('_',' ') for i in range(n)]
   examples=re.findall(r'"([^"]+)"',g);definition=re.split(r';\s*"',g,maxsplit=1)[0].strip().rstrip(';')
   off=5+2*n;rels=[]
   for k in range(int(t[4+2*n])):
    at=off+k*4;rel,target,tp=t[at:at+3]
    if rel in ('@','~'):rels.append([rel,target+'-'+('a' if tp=='s' else tp)])
   wn[sid]={'id':sid,'pos':pos,'domain':int(t[1]),'en':definition,'forms':forms,'examples':examples,'links':rels,'zhLabels':list(dict.fromkeys(cow.get(sid,[])))[:5]}
  for line in z.read('wordnet/index.'+part).decode('utf8').splitlines():
   if not line or line.startswith(' '):continue
   t=line.split();word=t[0].lower().replace('_',' ')
   if word not in known:continue
   n=int(t[2]);ptr=int(t[3]);offsets=t[6+ptr:6+ptr+n];pos='a' if t[1]=='s' else t[1]
   order.setdefault(word,[]).extend(x+'-'+pos for x in offsets)
adj_glosses={v['en'].strip().casefold().rstrip('.') for v in wn.values() if v['pos']=='a'}
with (RAW/'ecdict.csv').open(encoding='utf8',newline='') as f:
 for row in csv.DictReader(f):
  w=row['word'].lower();zh=lines(row.get('translation'));parsed,excluded=parse_english_definitions(row.get('definition'),unpunctuated_adjective_glosses=adj_glosses);en=[x['en'] for x in parsed]
  if w in known and (any(x['continuationLinesJoined'] for x in parsed) or excluded):parse_records.append({'word':w,'entries':parsed,'excluded':excluded})
  if zh:srczh.setdefault(w,[strip_pos(x) for x in zh if chinese(x)])
  if w in known and (w not in raw or row['word']==w):raw[w]={'zh':zh,'en':en,'parsed':parsed,'excluded':excluded}
usage={};oldex={}
for p in (R/'data/usage-v27').glob('*.json'):usage.update(json.loads(p.read_text())['words'])
for p in (R/'data/reader-v24').glob('*.json'):
 for row in json.loads(p.read_text())['examples']:oldex[row[0]]=row[1]
records={};used=set();glossindex={re.sub(r'\s+',' ',v['en']).casefold().rstrip('.'):k for k,v in wn.items()}
for w,row in known.items():
 native=raw.get(w,{}).get('zh') or row[2];ids=list(dict.fromkeys(order.get(w,[])));extra=[]
 norms={wn[k]['en'].casefold().rstrip('.') for k in ids if k in wn}
 for en in raw.get(w,{}).get('en') or []:
  if en.casefold().rstrip('.') in norms:continue
  found=glossindex.get(en.casefold().rstrip('.'))
  if found and w in [x.lower() for x in wn[found]['forms']]:ids.append(found)
  else:extra.append(en);texts.add(en)
 ids=[k for k in ids if k in wn];used.update(ids)
 # Words outside WordNet retain every original Chinese sense, with a separate English MT pair.
 if not ids and not extra:zhtasks.update(strip_pos(x) for x in native if chinese(x))
 phrases=[]
 for x in usage.get(w,{}).get('phrases',[]):
  p=dict(x);p['zh']='；'.join(srczh.get(x['en'],[])[:3]) if not x.get('zh') else x['zh'];phrases.append(p)
  if not p['zh']:texts.add(p['en'])
  if p.get('definition'):texts.add(p['definition'])
 records[w]={'word':w,'nativeZh':native,'senseIds':ids,'extraEn':list(dict.fromkeys(extra)),'phrases':phrases,'examples':oldex.get(w,[]),'headZh':strip_pos(native[0]) if native else '', 'sourceEntries':raw.get(w,{}).get('parsed',[])}
 texts.update(oldex.get(w,[]))
for sid in list(used):
 syn=wn[sid];texts.add(syn['en']);texts.update(syn['examples'])
 for rel,target in syn['links']:
  if target in wn:texts.add(wn[target]['en']);used.add(target)
# Every historical English excerpt and old dictionary gloss displayed by existing pages.
for file,var in [('word-etymology-curated-v23.js','ROOTLAB_CURATED_ETYM'),('word-history-v22.js','ROOTLAB_WORD_HISTORY')]:
 s=(R/file).read_text();d=json.loads(s.split('window.'+var+'=',1)[1].rstrip(';\n'))
 for obj in d.values():
  if obj.get('excerpt'):texts.add(obj['excerpt'])
for p in (R/'data/reader-v24').glob('*.json'):
 for row in json.loads(p.read_text())['entries']:texts.update(strip_pos(v) for v in row[6])
texts={re.sub(r'\s+',' ',x).strip() for x in texts if x and re.search('[A-Za-z]',x)}
# Store only relevant synsets, preserving exact source ids for all relation contexts.
for sid in used:
 if sid in wn:texts.add(wn[sid]['en']);texts.update(wn[sid]['examples'])
(W/'source-records.json').write_text(compact({'records':records,'synsets':{k:wn[k] for k in used if k in wn},'sourceZh':srczh}))
(W/'en-input.json').write_text(compact(sorted(texts,key=lambda x:(len(x),x))))
(W/'zh-input.json').write_text(compact(sorted(zhtasks,key=lambda x:(len(x),x))))
(R/'reports/source-line-accounting.json').write_text(json.dumps({'wordsWithWrappedOrPlaceholderLines':len(parse_records),'joinedLines':sum(e['continuationLinesJoined'] for r in parse_records for e in r['entries']),'records':parse_records},ensure_ascii=False,indent=2))
print('PREPARED',len(records),'words',len(used),'synsets',len(texts),'English texts',len(zhtasks),'Chinese-only senses',flush=True)
print('CARRIER SENSES',[(sid,wn[sid]['en'],wn[sid]['zhLabels']) for sid in records['carrier']['senseIds']],flush=True)
