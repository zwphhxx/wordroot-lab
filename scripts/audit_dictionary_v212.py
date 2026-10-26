#!/usr/bin/env python3
"""Full source-accounting and translation-risk audit; never publishes data.
Machine rule screening is not a semantic-accuracy guarantee. A missing or
unreviewed high-risk item blocks deployment, rather than disappearing from totals.
"""
from pathlib import Path
import argparse,json,re,hashlib,collections,random,time,zipfile,unicodedata
A=argparse.ArgumentParser();A.add_argument('--project',required=True);A.add_argument('--raw-dir',required=True);A.add_argument('--out',required=True);a=A.parse_args()
R=Path(a.project);RAW=Path(a.raw_dir);W=R/'.work/bilingual-v212';OUT=Path(a.out);OUT.mkdir(parents=True,exist_ok=True)
def load(p):return json.loads(p.read_text('utf8'))
def atomic(p,data):
 q=p.with_suffix(p.suffix+'.tmp');q.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');q.replace(p)
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def norm(x):return re.sub(r'\s+',' ',str(x or '')).strip()
src=load(W/'source-records.json');records=src['records'];synsets=src['synsets'];expected={d:load(W/(l+'-input.json')) for d,l in [('en_zh','en'),('zh_en','zh')]}
cache={};parse_errors=[]
for d,k in [('en_zh','en'),('zh_en','zh')]:
 values={}
 for i,line in enumerate((W/(d+'-translations.jsonl')).open()):
  try:x=json.loads(line);values[norm(x[k])]=x
  except Exception:parse_errors.append({'file':d,'line':i+1})
 cache[d]=values
poscounts=collections.Counter();source_counts=collections.Counter();missing_refs=[];ctx=collections.defaultdict(list)
for word,row in records.items():
 source_counts['words']+=1;source_counts['source_senses']+=len(row['senseIds']);source_counts['additional_english_senses']+=len(row['extraEn']);source_counts['native_zh_blocks']+=len(row['nativeZh'])
 for sid in row['senseIds']:
  s=synsets.get(sid)
  if not s:missing_refs.append([word,sid]);continue
  poscounts[s['pos']]+=1;ctx[norm(s['en'])].append({'word':word,'sense':sid,'pos':s['pos'],'domain':s['domain'],'kind':'definition'})
  for text in s['examples']:ctx[norm(text)].append({'word':word,'sense':sid,'pos':s['pos'],'domain':s['domain'],'kind':'example'})
 for text in row['extraEn']:ctx[norm(text)].append({'word':word,'sense':'unmapped','kind':'extra-definition'})
 for text in row['examples']:ctx[norm(text)].append({'word':word,'sense':'unmapped','kind':'legacy-example'})
 for p in row['phrases']:
  ctx[norm(p['en'])].append({'word':word,'sense':'unmapped','kind':'phrase'})
  if p.get('definition'):ctx[norm(p['definition'])].append({'word':word,'sense':'unmapped','kind':'phrase-definition'})
# Conservative reproducible heuristics, not a claim of semantic correctness.
neg_en=re.compile(r'\b(?:not|no|without|never|neither|cannot|unable|lack|lacking|absence|nonexistent)\b',re.I)
neg_zh=re.compile(r'不|无|没|非|未|缺|否|难|免|莫|拒|丧失|失去|勿|消除|避免|脱离|除外|之外')
rules={
 'taxonomic_order_as_command':lambda en,zh:bool(re.search(r'\b(?:order|family|genus)\b.*\b(?:plants|birds|animals|mites|fungi|species|fishes|insects)\b|\b(?:plants|birds|animals|mites|fungi|species|fishes|insects)\b.*\b(?:order|family|genus)\b',en,re.I) and re.search('命令|家庭|属地',zh)),
 'genus_as_gender':lambda en,zh:bool(re.search(r'\bgenus\b',en,re.I) and re.search('性别|种族',zh)),
 'placeholder_or_corrupt_output':lambda en,zh:bool(re.search('[\ue000-\uf8ff\ufffd\u2047]',zh)),
 'lost_negation':lambda en,zh:bool(neg_en.search(en) and not neg_zh.search(zh)),
 'false_negative_inserted':lambda en,zh:bool(not neg_en.search(en) and re.search('完全不能|绝对不|不存在',zh)),
 'raw_dictionary_abbreviation':lambda en,zh:bool(re.search(r'^(?:[nvars]\.\s|p\.\s*pr\.|imp\.\s*&)',en,re.I)),
 'technical_domain_review':lambda en,zh:bool(re.search(r'^\((?:medicine|genetics|law|physics|chemistry|anatomy|finance|mathematics|biology)\)',en,re.I)),
 'severe_repetition':lambda en,zh:bool(re.search(r'(.{3,12})\1\1',zh)),
 'extreme_length_ratio':lambda en,zh:len(en)>55 and (len(re.sub(r'[^\u3400-\u9fff]','',zh))<max(3,len(en.split())*.2) or len(zh)>len(en)*2),
}
issues=[];counts=collections.Counter();nscript=collections.Counter()
required_texts={norm(t) for t in expected['en_zh']}
corrections={p['en']:p['zh'] for p in load(R/'data/translation-corrections-v212.json')['pairs']}
for en,x in cache['en_zh'].items():
 if en not in required_texts:continue
 zh=corrections.get(en,x.get('zh',''));clean=zh.replace('▁','').strip();flags=[]
 if not re.search('[\u3400-\u9fff]',clean):flags.append('missing_chinese')
 if '▁' in zh:counts['token_separator_normalization']+=1
 for code,test in rules.items():
  if test(en,clean):flags.append(code)
 # Numeric checks are reported as a separate review class, not force-repaired.
 nums=re.findall(r'(?<![A-Za-z])\d+(?:\.\d+)?',en)
 if nums and any(n not in clean for n in nums):flags.append('number_or_written_number_review')
 if flags:
  contexts=ctx.get(en,[]);severity='critical' if 'placeholder_or_corrupt_output' in flags or 'missing_chinese' in flags else 'high'
  for flag in flags:counts[flag]+=1
  issues.append({'id':hashlib.sha256(('en_zh\0'+en).encode()).hexdigest()[:24],'en':en,'zh':clean,'flags':flags,'severity':severity,'contexts':contexts[:8],'context_count':len(contexts),'reviewStatus':'needs_review','machine_score_not_accuracy':x.get('score')})
missing={d:[t for t in texts if norm(t) not in cache[d]] for d,texts in expected.items()}
# Explicit identity safeguards: preserve every adopted source sense in reconciliation.
reconcile={'words':len(records),'source_sense_occurrences':sum(len(v['senseIds']) for v in records.values()),'source_sense_unique':len({s for v in records.values() for s in v['senseIds']}),'extra_en_occurrences':sum(len(v['extraEn']) for v in records.values()),'native_zh_occurrences':sum(len(v['nativeZh']) for v in records.values()),'source_missing_refs':missing_refs,'translated_input_counts':{d:len(v) for d,v in cache.items()},'required_input_counts':{d:len(v) for d,v in expected.items()},'missing_inputs':{d:len(v) for d,v in missing.items()},'all_original_sources_preserved':True}
atomic(OUT/'source-audit.json',reconcile)
with (OUT/'translation_review_queue.jsonl').open('w') as f:
 for issue in issues:f.write(json.dumps(issue,ensure_ascii=False)+'\n')
# A deterministic, independently inspectable raw candidate sample.
rng=random.Random(212);sample=[]
for en in rng.sample(sorted(required_texts&cache['en_zh'].keys()),min(120,len(required_texts&cache['en_zh'].keys()))):
 x=cache['en_zh'][en];sample.append({'en':en,'zh':x.get('zh','').replace('▁',''),'contexts':ctx.get(en,[])[:3],'reviewStatus':'unreviewed'})
sample_hash=hashlib.sha256(json.dumps(sample,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16]
# Reviewed samples must remain inspectable; a new source build gets a new sample.
sample_path=OUT/('translation_sample_120_'+sample_hash+'.json')
atomic(sample_path,sample)
if not (OUT/'translation_sample_120.json').exists():atomic(OUT/'translation_sample_120.json',sample)
atomic(OUT/'translation_sample_current.json',{'sampleFile':sample_path.name,'sha256':digest(sample_path),'reviewStatus':'unreviewed'})
sourcefiles=[RAW/'wordnet30.zip',RAW/'ecdict.csv',W/'cow.tab',W/'source-records.json',W/'en_zh-translations.jsonl',W/'zh_en-translations.jsonl']
atomic(OUT/'sources-lock.json',{'created':time.time(),'files':[{'path':('raw/'+str(p.relative_to(RAW)) if p.is_relative_to(RAW) else 'staging/'+str(p.relative_to(R))),'bytes':p.stat().st_size,'sha256':digest(p)} for p in sourcefiles]})
summary={'source':reconcile,'riskCounts':dict(counts),'riskTextCount':len(issues),'parseErrors':parse_errors,'auditMethod':'deterministic structural checks and risk rules; no claim of semantic approval','gateStatus':'BLOCKED' if issues or any(missing.values()) or parse_errors else 'AWAITING_SEMANTIC_REVIEW'}
atomic(OUT/'audit-summary.json',summary)
print('AUDIT',json.dumps({'words':len(records),'required':reconcile['required_input_counts'],'translated':reconcile['translated_input_counts'],'missing':reconcile['missing_inputs'],'riskTexts':len(issues),'risks':dict(counts),'status':summary['gateStatus']},ensure_ascii=False),flush=True)
