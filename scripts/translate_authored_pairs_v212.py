#!/usr/bin/env python3
"""Translate only the site's public authored Chinese prose; retain exact source/context.
Candidate machine translations, never described as human-approved. Resumable.
"""
from pathlib import Path
import json,hashlib,re,time,fcntl
import ctranslate2,sentencepiece as spm
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';RAW=R.parent/'wordroot-lab-deploy/.v12-work'
lock=(W/'authored-translation.lock').open('a+');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
rows=json.loads((W/'authored-text-input.json').read_text());dest=W/'authored-text-candidates.jsonl';done={}
if dest.exists():
 for line in dest.open():
  d=json.loads(line);done[d['zh']]=d
model=RAW/'bilingual-v212/model/translate-zh_en-1_9';sp=spm.SentencePieceProcessor(model_file=str(model/'sentencepiece.model'));t=ctranslate2.Translator(str(model/'model'),device='cpu',compute_type='int8',inter_threads=1,intra_threads=2)
remaining=[x for x in rows if x['zh'] not in done];start=time.time();print('AUTHORED',len(rows),'REMAINING',len(remaining),flush=True)
with dest.open('a') as f:
 for at in range(0,len(remaining),64):
  batch=remaining[at:at+64];todo=[x for x in batch if not x['en']];tokens=[sp.encode(x['zh'],out_type=str) for x in todo]
  predicted=t.translate_batch(tokens,beam_size=4,max_batch_size=32,max_input_length=0,max_decoding_length=650,no_repeat_ngram_size=4) if todo else []
  tx={x['zh']:sp.decode(y.hypotheses[0]).replace('▁',' ').strip() for x,y in zip(todo,predicted)}
  for x in batch:
   out={**x,'en':x['en'] or tx[x['zh']],'method':'source_bilingual' if x['en'] else 'machine-en','sourceHash':hashlib.sha256(x['zh'].encode()).hexdigest()};f.write(json.dumps(out,ensure_ascii=False)+'\n')
  f.flush()
  if at%256==0:print('PROGRESS',min(at+64,len(remaining)),round(time.time()-start,1),flush=True)
print('COMPLETE',round(time.time()-start,1),flush=True)
