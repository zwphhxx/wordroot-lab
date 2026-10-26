#!/usr/bin/env python3
"""Translate retained native Chinese source blocks independently, never by WN order.
Outputs are candidates, not approved meanings; existing native text is unchanged.
Uses the already installed local model only; checkpointed and bounded batches.
"""
from pathlib import Path
from native_pairing_v212 import clean_english
import os,json,re,hashlib,time,fcntl,argparse
import ctranslate2,sentencepiece as spm
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212'
raw=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work')))
p=argparse.ArgumentParser();p.add_argument('--limit',type=int,default=0);args=p.parse_args()
lock=(W/'native-translation.lock').open('a+');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
records=json.loads((W/'source-records.json').read_text())['records']
normalize=lambda x:re.sub(r'\s+',' ',str(x or '')).strip()
texts=sorted({normalize(t) for r in records.values() for t in r['nativeZh']},key=lambda x:(len(x),x))
cache=W/'native-zh-en-candidates.jsonl';done={}
if cache.exists():
 for line in cache.open():
  x=json.loads(line);done[x['zh']]=x
remaining=[t for t in texts if t not in done];remaining=remaining[:args.limit] if args.limit else remaining
print('NATIVE_SOURCE_BLOCKS',len(texts),'CACHED',len(done),'TODO',len(remaining),flush=True)
if not remaining:raise SystemExit(0)
model=raw/'bilingual-v212/model/translate-zh_en-1_9'
sp=spm.SentencePieceProcessor(model_file=str(model/'sentencepiece.model'))
translator=ctranslate2.Translator(str(model/'model'),device='cpu',compute_type='int8',inter_threads=1,intra_threads=2)
start=time.time()
with cache.open('a',encoding='utf8') as f:
 for at in range(0,len(remaining),128):
  batch=remaining[at:at+128]
  # POS tags are metadata, not tokens to translate; retain the exact source block in zh.
  input_text=[re.sub(r'^(?:n|v|vt|vi|a|adj|adv|prep|pron|conj|interj|un)\.\s*','',s,flags=re.I) for s in batch]
  encoded=[sp.encode(s,out_type=str) for s in input_text]
  out=translator.translate_batch(encoded,beam_size=3,max_batch_size=32,max_input_length=0,max_decoding_length=max(128,min(700,max(map(len,encoded))*4)),no_repeat_ngram_size=5,return_scores=True)
  for zh,result in zip(batch,out):
   en=clean_english(sp.decode(result.hypotheses[0]))
   f.write(json.dumps({'zh':zh,'en':en,'sourceHash':hashlib.sha256(zh.encode()).hexdigest(),'translation':'machine-en','reviewStatus':'candidate','model':'Argos-OPUS-MT-zh-en-1.9','score':result.scores[0]},ensure_ascii=False)+'\n')
  f.flush()
  if (at+len(batch))%2048==0 or at+len(batch)==len(remaining):print('PROGRESS',at+len(batch),'/',len(remaining),'SECONDS',round(time.time()-start),flush=True)
  if (W/'STOP_NATIVE_AFTER_BATCH').exists():print('CHECKPOINTED_STOP',flush=True);break
