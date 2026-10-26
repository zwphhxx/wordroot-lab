#!/usr/bin/env python3
"""Offline, resumable translation of public dictionary material, not user records.
Uses Argos OPUS-MT CC-BY 4.0 weights with CTranslate2; outputs are explicitly
machine translations and may require human editorial review. Models stay local.
"""
from pathlib import Path
import os,json,time,re,argparse,concurrent.futures
import ctranslate2,sentencepiece as spm
R=Path(__file__).resolve().parent.parent;RAW=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work')));W=R/'.work/bilingual-v212'
p=argparse.ArgumentParser();p.add_argument('--direction',default='en_zh');p.add_argument('--beam',type=int,default=2);a=p.parse_args()
lang=a.direction.split('_')[0];dest=a.direction.split('_')[1];inputs=json.loads((W/(lang+'-input.json')).read_text());cache=W/(a.direction+'-translations.jsonl');done={}
if cache.exists():
 for line in cache.read_text().splitlines():
  try:x=json.loads(line);done[x['en' if lang=='en' else 'zh']]=x
  except Exception:pass
remaining=[s for s in inputs if s not in done];print('TRANSLATE',a.direction,len(remaining),'remaining',len(done),'cached',flush=True)
model=RAW/'bilingual-v212/model'/('translate-'+a.direction+'-1_9');sp=spm.SentencePieceProcessor(model_file=str(model/'sentencepiece.model'))
t=ctranslate2.Translator(str(model/'model'),device='cpu',compute_type='int8',inter_threads=1,intra_threads=2)
start=time.time();total=0;bad=0;stopped=False
with cache.open('a',encoding='utf8') as out:
 for at in range(0,len(remaining),256):
  texts=remaining[at:at+256]
  tokens=[sp.encode(s,out_type=str) for s in texts]
  # No source text is truncated; decoder length scales with the input.
  results=t.translate_batch(tokens,beam_size=a.beam,max_batch_size=64,max_input_length=0,max_decoding_length=max(96,min(650,max(map(len,tokens))*3)),no_repeat_ngram_size=5,return_scores=True)
  for text,res in zip(texts,results):
   translated=sp.decode(res.hypotheses[0]).strip();ok=bool(re.search('[\u3400-\u9fff]',translated)) if dest=='zh' else bool(re.search('[A-Za-z]',translated))
   if not ok:bad+=1
   row={lang:text,dest:translated,'kind':'machine','model':'Argos-OPUS-MT-1.9','score':round(res.scores[0],3),'scriptOK':ok}
   out.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
  total+=len(texts);out.flush()
  if (W/'STOP_AFTER_BATCH').exists():
   stopped=True;print('CHECKPOINT_STOP',a.direction,total,flush=True);break
  if total%2048==0 or total==len(remaining):print('PROGRESS',a.direction,total,'/',len(remaining),'seconds',round(time.time()-start,1),'script_warnings',bad,flush=True)
print('CHECKPOINT_SAVED' if stopped else 'COMPLETE',a.direction,'new',total,'seconds',round(time.time()-start,1),'script_warnings',bad,flush=True)
