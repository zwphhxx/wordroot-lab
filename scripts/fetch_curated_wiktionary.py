#!/usr/bin/env python3
"""Fetch source-licensed Wiktionary etymology data for the curated RootLab entries.

Downloads per-word English Wiktextract JSONL directly from Kaikki.org,
which exposes a per-word JSON download and terms as Wiktionary CC BY-SA 4.0.
Caches byte-for-byte source locally under .v12-work (not committed).
Uses a conservative max of four concurrent GETs and retries failures.
"""
from pathlib import Path
import re,json,urllib.request,urllib.error,concurrent.futures,time,collections,random,sys
root=Path(__file__).resolve().parent.parent
html=(root/'index.html').read_text('utf8')
curated=json.loads(re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',html,re.S).group(1))
words=sorted({e['word'].lower() for r in curated for g in r['groups'] for e in g['entries'] if re.fullmatch('[a-z]{2,30}',e['word'].lower())})
cache=root/'.v12-work/wiki-etymology-cache'
cache.mkdir(exist_ok=True)
print('CURATED WORDS',len(words),flush=True)
def fetch_one(word):
 target=cache/(word+'.jsonl')
 if target.exists():
  try:
   records=[json.loads(line) for line in target.read_text('utf8').splitlines() if line.strip()]
   if records:return word,'cached',len(records)
  except Exception:target.unlink(missing_ok=True)
 url='https://kaikki.org/dictionary/English/meaning/'+word[0]+'/'+word[:2]+'/'+word+'.jsonl'
 for trial in range(3):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'RootLabLearningEtymology/2.3 (Wiktionary CC-BY-SA 4.0, source attribution)'})
   with urllib.request.urlopen(req,timeout=19) as res:
    data=res.read(750_000)
    if len(data)>740_000:return word,'too_large',0
   records=[json.loads(line) for line in data.decode('utf8').splitlines() if line.strip()]
   records=[r for r in records if r.get('lang_code')=='en' and r.get('word','').lower()==word]
   if not records:return word,'empty',0
   target.write_bytes(data)
   return word,'fetched',len(records)
  except urllib.error.HTTPError as e:
   if e.code==404:return word,'404',0
   time.sleep(.6+trial*.8)
  except Exception as e:
   if trial==2:return word,type(e).__name__,0
   time.sleep(.7+trial*.8)
 return word,'retry_failed',0
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 futures={pool.submit(fetch_one,w):w for w in words}
 for idx,f in enumerate(concurrent.futures.as_completed(futures),1):
  try:out=f.result()
  except Exception as e:out=(futures[f],str(e)[:80],0)
  results.append(out)
  if idx%30==0 or idx==len(words):
   count=collections.Counter(x[1] for x in results)
   print('PROGRESS',idx,'/',len(words),'states',dict(count),flush=True)
print('RESULTS',dict(collections.Counter(x[1] for x in results)),flush=True)
bad=[x for x in results if x[1] not in ('cached','fetched')]
print('MISSING',bad[:30],flush=True)
(root/'.v12-work/wiki-etymology-retrieval.json').write_text(json.dumps({'words':len(words),'status':results},ensure_ascii=False,indent=2),encoding='utf8')
