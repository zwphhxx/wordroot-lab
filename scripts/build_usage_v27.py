#!/usr/bin/env python3
"""Build source-attested phrase and semantic associations. Never invent phrases.
ECDICT supplies Chinese translations (MIT); WordNet 3.0 independently supplies
phrase headwords, English definitions and sense-linked related concepts.
Data are divided into 26 on-demand bundles. No source corpus is committed.
"""
from pathlib import Path
import json,csv,re,zipfile,collections,hashlib
R=Path(__file__).resolve().parent.parent
core=json.loads((R/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0])
known={r[0]:r for r in core}
stop=set('a an the of in on at to for with by from is be it as and or if not that this your his her our my its their some very all any more most'.split())
wnphrases={};synsets={};members=collections.defaultdict(list)
with zipfile.ZipFile(R/'.v12-work/wordnet30.zip') as z:
 for part in ('noun','verb','adj','adv'):
  for line in z.read('wordnet/data.'+part).decode('utf8').splitlines():
   if not re.match(r'^\d{8} ',line) or ' | ' not in line:continue
   lhs,gloss=line.split(' | ',1);t=lhs.split();n=int(t[3],16);pos=t[2];pos='a' if pos=='s' else pos
   forms=[re.sub(r'\([aps]\)$','',t[4+2*i].lower()).replace('_',' ') for i in range(n)]
   pointerStart=5+2*n;np=int(t[4+2*n]);pointers=[]
   for i in range(np):
    at=pointerStart+i*4;rel,offset,target=t[at:at+3];pointers.append((rel,('a' if target=='s' else target)+offset))
   definition=gloss.split('; "',1)[0].strip().rstrip(';');key=pos+t[0]
   synsets[key]={'words':forms,'definition':definition,'pointers':pointers}
   for word in forms:
    if word in known:members[word].append(key)
    if 2<=len(word.split())<=5 and re.fullmatch(r"[a-z][a-z' -]{2,70}",word):
     wnphrases.setdefault(word,{'definition':definition,'pos':pos})
# Educational ranking prioritizes ordinary companions, not resemblance of letters.
candidates=collections.defaultdict(dict)
def clean_zh(txt):
 parts=re.split(r'\\n|[\r\n]',txt or '')
 for p in parts:
  p=p.strip()
  if not re.search('[\u3400-\u9fff]',p):continue
  if any(q in p for q in ('[','【','歌曲','商标','电影名','不详','未知','(人名','人名')):continue
  p=re.sub(r'^(?:n\.|a\.|adj\.|adv\.|v\.|vt\.|vi\.|un\.)\s*','',p)
  return p[:120]
 return ''
# Known conflicting translations are omitted instead of presented as learning facts.
exclude={'coffee cake','bottom dog','carriage dog','breathing time','arrival time','happy ending','bird dog','chin music','golden rain','flower power','a golden apple'}
with (R/'.v12-work/ecdict.csv').open(encoding='utf8',newline='') as f:
 for row in csv.DictReader(f):
  phrase=row['word'].lower()
  if phrase not in wnphrases or phrase in exclude:continue
  # Avoid normalizing proper-name expressions to an apparently common phrase.
  if row['word']!=phrase:continue
  terms=phrase.split();zh=clean_zh(row.get('translation'))
  if not zh or any(t not in known and t not in stop for t in terms):continue
  for word in set(terms)&known.keys()-stop:
   others=[t for t in terms if t!=word and t not in stop]
   ranks=[known[t][4] or 50000 for t in others if t in known]
   score=(sum(min(r,50000) for r in ranks)/max(1,len(ranks)))+len(terms)*500
   if not others:score+=10000
   if any(t in {'sex','sexual','porn','fuck','fucking','nigger'} for t in terms):score+=100000
   if score>=60000:continue
   val={'en':phrase,'zh':zh,'definition':wnphrases[phrase]['definition'][:220],'pos':wnphrases[phrase]['pos'],'score':round(score)}
   candidates[word][phrase]=val
# Useful source-linked concepts, each carrying the sense in which the relation holds.
related={}
for word,ids in members.items():
 output=[];seen=set([word])
 for key in ids[:4]:
  syn=synsets[key]
  for rel,target in syn['pointers']:
   if rel not in ('@','~'):continue
   dst=synsets.get(target)
   if not dst:continue
   options=sorted((w for w in dst['words'] if w in known and w not in seen),key=lambda w:known[w][4] or 999999)
   for other in options[:1]:
    if (known[other][4] or 999999)>30000:continue
    seen.add(other);output.append({'word':other,'label':'上位概念' if rel=='@' else '下位例子','sense':syn['definition'][:160]})
   if len(output)>=2:break
  if len(output)>=2:break
 if output:related[word]=output
outdir=R/'data/usage-v27';outdir.mkdir(exist_ok=True)
coverage={'total':len(known),'phrases':0,'relations':0,'phrasePairs':0,'union':0,'editorialWords':len(json.loads((R/'data/usage-curated-v27.json').read_text()))}
buckets={c:{} for c in 'abcdefghijklmnopqrstuvwxyz'}
curated=json.loads((R/'data/usage-curated-v27.json').read_text())
for word in sorted(known):
 entries=sorted(candidates.get(word,{}).values(),key=lambda p:(p['score'],len(p['en']),p['en']))[:4]
 for p in entries:
  p.pop('score',None);p['zh']='';p['kind']='词典收录表达'
 if word in curated:
  entries=[{'en':en,'zh':zh,'kind':'学习搭配','definition':'','pos':''} for en,zh in curated[word]]
 links=related.get(word,[])
 if not entries and not links:continue
 coverage['union']+=1;coverage['phrases']+=bool(entries);coverage['relations']+=bool(links);coverage['phrasePairs']+=len(entries)
 buckets[word[0]][word]={'phrases':entries,'related':links}
manifest={'schema':1,'provenance':'ECDICT (MIT) + Princeton WordNet 3.0','coverage':coverage,'bundles':{}}
for letter,words in buckets.items():
 data={'schema':1,'letter':letter,'words':words}
 raw=(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n').encode()
 path=outdir/(letter+'.json');path.write_bytes(raw)
 manifest['bundles'][letter]={'url':'./data/usage-v27/'+letter+'.json','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
(R/'data/usage-v27-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('COVERAGE',coverage,'BYTES',sum(v['bytes'] for v in manifest['bundles'].values()))
for word in ('dog','table','time','light','friend','coffee','read','happy','flower','rain','computer'):
 print(word,[(p['en'],p['zh']) for p in buckets[word[0]].get(word,{}).get('phrases',[])])
