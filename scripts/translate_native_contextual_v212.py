#!/usr/bin/env python3
"""Bounded, context-keyed, segment-complete candidates using existing local weights.
OPUS translates individual source segments, not a reasoning prompt. Context is
retained for separate semantic review; no generated candidate is auto-approved.
"""
from pathlib import Path
import argparse,fcntl,json,time,os,re,collections
import ctranslate2,sentencepiece as spm
from native_pairing_v212 import descriptor,english_metadata,output_issues,MODEL,POLICY,clean_english
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212'
p=argparse.ArgumentParser();p.add_argument('--limit',type=int,default=4096);p.add_argument('--max-seconds',type=int,default=900);p.add_argument('--threads',type=int,default=2);p.add_argument('--words',default='');a=p.parse_args()
assert 1<=a.limit<=100000 and 1<=a.threads<=4 and 30<=a.max_seconds<=3600
lock=(W/'native-translation.lock').open('a+');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
records=json.loads((W/'source-records.json').read_text())['records'];cache=W/'native-zh-en-contextual-v3.jsonl';done=set()
if cache.exists():
 with cache.open() as old:
  for line in old:
   value=json.loads(line)
   if value.get('policy')==POLICY and value.get('model')==MODEL:done.add(value['cacheKey'])
selected=set(a.words.split(',')) if a.words else None;todo=[];seen=set();total=0
for word,row in records.items():
 for text in row['nativeZh']:
  item=descriptor(word,text,row)
  if item['cacheKey'] in seen:continue
  seen.add(item['cacheKey']);total+=1
  if item['cacheKey'] not in done and (selected is None or word in selected):todo.append(item)
# Short records first improves checkpoint throughput without changing source data.
todo.sort(key=lambda x:(0 if x['word'] in {'carrier','bank','light','charge','issue','banana','apple','water','book'} else 1,len(x['sourceText']),x['word']))
todo=todo[:a.limit];print('CONTEXTUAL_NATIVE',total,'CACHED',len(done),'TODO',len(todo),flush=True)
if not todo:raise SystemExit(0)
raw=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work')))/'bilingual-v212/model/translate-zh_en-1_9'
sp=spm.SentencePieceProcessor(model_file=str(raw/'sentencepiece.model'));t=ctranslate2.Translator(str(raw/'model'),device='cpu',compute_type='int8',inter_threads=1,intra_threads=a.threads)
start=time.monotonic();completed=0;flags=collections.Counter()
with cache.open('a',encoding='utf8') as out:
 for at in range(0,len(todo),96):
  batch=todo[at:at+96];texts=[part['text'] for item in batch for part in item['parts']]
  tokens=[sp.encode(text,out_type=str) for text in texts]
  outputs=t.translate_batch(tokens,beam_size=3,max_batch_size=64,max_input_length=0,max_decoding_length=max(96,min(700,max(map(len,tokens),default=1)*4)),no_repeat_ngram_size=5,return_scores=True) if tokens else []
  cursor=0
  for item in batch:
   size=len(item['parts']);got=outputs[cursor:cursor+size];cursor+=size;translations=[clean_english(sp.decode(r.hypotheses[0])) for r in got]
   issues=output_issues(item['parts'],translations,item['domains']);flags.update(issues);label=english_metadata(item);sentence=(label+': ' if label else '')+'; '.join(translations)
   value={k:item[k] for k in ('word','sourceText','sourceHash','contextHash','cacheKey','context','policy','model','pos','domains')}
   value.update(zh=item['sourceText'],en=sentence,segments=[{**part,'en':en} for part,en in zip(item['parts'],translations)],translation='machine-en',reviewStatus='candidate',qualityIssues=issues,contextUsedFor='identity_and_independent_review_not_instruction_following',generatedAt=time.time())
   out.write(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n')
  out.flush();completed+=len(batch)
  progress={'policy':POLICY,'model':MODEL,'expectedContextKeys':total,'cachedBefore':len(done),'new':completed,'candidateOnly':True,'complete':len(done)+completed>=total,'elapsedSeconds':round(time.monotonic()-start,2),'issues':dict(flags)}
  target=W/'native-context-progress.json';tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(progress,ensure_ascii=False,indent=2));tmp.replace(target)
  if completed%768==0 or completed==len(todo):print('PROGRESS',completed,'/',len(todo),'SECONDS',round(time.monotonic()-start),'FLAGGED',sum(flags.values()),flush=True)
  if (W/'STOP_CONTEXT_AFTER_BATCH').exists() or time.monotonic()-start>=a.max_seconds:print('BOUNDED_CHECKPOINT_STOP',flush=True);break
print('SAVED',completed,'context-bound candidates; approved=0',flush=True)
