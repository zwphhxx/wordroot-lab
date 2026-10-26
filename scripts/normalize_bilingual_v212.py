#!/usr/bin/env python3
"""Convert staged candidates to stable, source-versioned senses and immutable bundles.
This is normalization, NOT approval: unresolved mappings and risky translations
are preserved and counted. A separate release gate decides publication.
"""
from pathlib import Path
import os,json,re,hashlib,collections,zipfile,time
R=Path(__file__).resolve().parent.parent;RAW=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work')));W=R/'.work/bilingual-v212';REPORTS=R/'reports'
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
load=lambda p:json.loads(p.read_text('utf8'))
norm=lambda v:re.sub(r'\s+',' ',str(v or '')).strip()
sha=lambda b:hashlib.sha256(b).hexdigest()
def atomic(p,obj):
 p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_suffix(p.suffix+'.tmp');tmp.write_text(compact(obj)+'\n',encoding='utf8');os.replace(tmp,p)
oldmanifest=load(R/'data/bilingual-v212-manifest.json')
assert oldmanifest.get('schema')==2,'Run candidate builder before normalization'
records={}
for meta in oldmanifest['bundles'].values():records.update(load(R/meta['url'].removeprefix('./'))['words'])
assert len(records)==49426
source=load(W/'source-records.json');editorial=load(R/'data/bilingual-editorial-v212.json')
curated_phrases=load(R/'data/usage-curated-v27.json')
native_candidates={}
if (W/'native-zh-en-candidates.jsonl').exists():
 for line in (W/'native-zh-en-candidates.jsonl').open():
  value=json.loads(line);native_candidates[norm(value['zh'])]=value

corrections={r['en']:r['zh'] for r in load(R/'data/translation-corrections-v212.json')['pairs']}
risk={}
for ln in (REPORTS/'translation_review_queue.jsonl').open():
 item=json.loads(ln);risk[norm(item['en'])]=item
# Attach canonical source sense keys (sense numbers and offsets alone are not persistent IDs).
keys={};full_syn={};phrase_index=collections.defaultdict(list)
with zipfile.ZipFile(RAW/'wordnet30.zip') as z:
 for line in z.read('wordnet/index.sense').decode().splitlines():
  key,offset,number,count=line.split();lemma,tail=key.split('%',1);pos={'1':'n','2':'v','3':'a','4':'r','5':'a'}[tail[0]]
  keys[(lemma.replace('_',' ').lower(),offset+'-'+pos)]=key
 for kind in ('noun','verb','adj','adv'):
  for ln in z.read('wordnet/data.'+kind).decode().splitlines():
   if not re.match(r'^\d{8} ',ln) or ' | ' not in ln:continue
   left,gloss=ln.split(' | ',1);a=left.split();n=int(a[3],16);pos='a' if a[2]=='s' else a[2];sid=a[0]+'-'+pos
   forms=[re.sub(r'\([aps]\)$','',a[4+i*2]).replace('_',' ') for i in range(n)]
   definition=re.split(r';\s*"',gloss,maxsplit=1)[0].strip().rstrip(';')
   full_syn[sid]={'en':definition,'forms':forms,'pos':pos}
   for f in forms:
    if ' ' in f:phrase_index[f.lower()].append(sid)
reviewed_exclusions=load(R/'data/source-exclusions-reviewed-v212.json').get('entries',[]) if (R/'data/source-exclusions-reviewed-v212.json').exists() else []
excluded_sources={(r['word'],norm(e)):r for r in reviewed_exclusions for e in r['excludedEnglish']}
mapid={};aliases={};source_lineage=[];quality_counts=collections.Counter();counts=collections.Counter();unresolved=[]
def stable(word,old,sense=None):
 if re.fullmatch(r'\d{8}-[navr]',old):
  key=keys.get((word,old));return 'wn30:'+(key if key else word+':'+old)
 if sense and sense.get('source')=='Editorial':return 'editorial:'+word+':'+old
 if old.startswith('zh-'):
  # Hash the immutable original source record, never its generated translation.
  idx=int(old.split('-',1)[1]);text=source['records'][word]['nativeZh'][idx]
 else:text=norm((sense or {}).get('en') or old)
 source_identity={'source':'ECDICT','word':word,'pos':(sense or {}).get('pos',''),'originalText':text}
 return 'ecdict:'+word+':'+sha(compact(source_identity).encode())[:18]
def mark(item,enkey='en',zhkey='zh',kindkey='translation'):
 en=norm(item.get(enkey));zh=norm(item.get(zhkey));kind=item.get(kindkey,'source');review='source_bilingual' if kind in ('dictionary','source-grammar') else 'editorial' if kind=='edited' else 'machine_screened'
 issues=[]
 if kind in ('pending','untranslated','none') or not en or not zh:issues.append('missing_or_untranslated_pair')
 if en in risk and en not in corrections:issues+=risk[en]['flags']
 if not re.search('[\u3400-\u9fff]',zh):issues.append('no_chinese_in_learning_text')
 if re.search('[\ue000-\uf8ff\ufffd\u2047]',zh):issues.append('corrupt_translation')
 if en in corrections and zh!=corrections[en]:issues.append('approved_correction_not_applied')
 if issues:review='needs_review'
 item['pairId']=sha(('pair-v1\0'+en+'\0'+zh).encode())[:24]
 item['reviewStatus']=review;item['qualityIssues']=sorted(set(issues));quality_counts[review]+=1
 return review
for word,obj in records.items():
 obj['wordId']='en:'+word
 for s in obj['senses']:
  old=s['id'];new=stable(word,old,s);mapid[(word,old)]=new;s['id']=new
  source_ref={'source':'WordNet','version':'3.0','synsetId':old,'senseKey':keys.get((word,old))} if re.fullmatch(r'\d{8}-[navr]',old) else {'source':s.get('source','ECDICT'),'version':'local-frozen-20261026','sourceTextHash':sha(norm(s['en']).encode())}
  s['sourceRefs']=[source_ref]
  if s.get('sourceIds'):
   for alias in s['sourceIds']:
    aliases[(word,alias)]=new;s['sourceRefs'].append({'source':'WordNet','version':'3.0','synsetId':alias,'senseKey':keys.get((word,alias))})
  mark(s)
 unique_senses={}
 for s in obj['senses']:
  previous=unique_senses.get(s['id'])
  if previous:
   if any(previous.get(k)!=s.get(k) for k in ('en','zh','pos')):raise ValueError('Conflicting stable identity '+word+' '+s['id'])
   previous.setdefault('identicalSourceCopies',1);previous['identicalSourceCopies']+=1
  else:unique_senses[s['id']]=s
 obj['senses']=list(unique_senses.values())
for word,obj in records.items():
 local={s['id']:s for s in obj['senses']}
 for e in obj['examples']:
  old=e.get('senseId','');sid=mapid.get((word,old)) or aliases.get((word,old))
  candidates=[]
  if sid:candidates=[sid]
  else:
   for original_sid in source['records'][word]['senseIds']:
    if norm(e['en']) in {norm(v) for v in source['synsets'].get(original_sid,{}).get('examples',[])}:
     target=mapid.get((word,original_sid)) or aliases.get((word,original_sid))
     if target and target not in candidates:candidates.append(target)
  e['senseIds']=candidates;e['senseId']=candidates[0] if len(candidates)==1 else ''
  e['alignmentStatus']='aligned' if len(candidates)==1 else 'ambiguous' if candidates else 'unresolved'
  e['id']='example:'+word+':'+sha(norm(e['en']).encode())[:18];mark(e)
  if e['alignmentStatus']!='aligned':counts['examples_unresolved']+=1
 for p in obj['phrases']:
  exact=[sid for sid in phrase_index[norm(p['en']).lower()] if (not p.get('pos') or full_syn[sid]['pos']==p['pos']) and (not p.get('definition') or norm(full_syn[sid]['en'])==norm(p['definition']))]
  if p.get('sourcePhraseSynsetId') in exact:exact=[p['sourcePhraseSynsetId']]
  p['sourcePhraseSenseIds']=['wn30:'+sid for sid in exact]
  explicit=mapid.get((word,p.get('senseId',''))) or aliases.get((word,p.get('senseId','')))
  phrase_source=None
  original=next((pair for pair in curated_phrases.get(word,[]) if norm(pair[0])==norm(p['en']) and norm(pair[1])==norm(p['zh'])),None)
  if explicit and word in editorial:
   p['senseScope']='headword';p['senseId']=explicit;p['senseIds']=[explicit];p['alignmentStatus']='aligned'
  elif original and not p.get('definition'):
   identity='editorial-phrase:'+sha(compact({'en':original[0],'zh':original[1]}).encode())[:24]
   p['senseScope']='phrase';p['senseId']=identity;p['senseIds']=[identity];p['alignmentStatus']='aligned'
   p['phraseSense']={'id':identity,'lemma':p['en'],'source':'Editorial-usage','version':'v27','sourceFile':'data/usage-curated-v27.json','sourcePairHash':sha(compact(original).encode())}
  elif len(exact)==1 and p.get('definition'):
   sid=exact[0];sense_key=keys.get((norm(p['en']).lower(),sid))
   identity='wn30:'+(sense_key or norm(p['en']).lower()+':'+sid)
   phrase_source={'id':identity,'lemma':p['en'],'pos':full_syn[sid]['pos'],'definitionEn':full_syn[sid]['en'],'source':'WordNet','version':'3.0','synsetId':sid,'senseKey':sense_key}
   p['senseScope']='phrase';p['senseId']=identity;p['senseIds']=[identity];p['alignmentStatus']='aligned';p['phraseSense']=phrase_source
  else:
   original=next((pair for pair in curated_phrases.get(word,[]) if norm(pair[0])==norm(p['en']) and norm(pair[1])==norm(p['zh'])),None)
   if original and not p.get('definition'):
    identity='editorial-phrase:'+sha(compact({'en':original[0],'zh':original[1]}).encode())[:24]
    p['senseScope']='phrase';p['senseId']=identity;p['senseIds']=[identity];p['alignmentStatus']='aligned'
    p['phraseSense']={'id':identity,'lemma':p['en'],'source':'Editorial-usage','version':'v27','sourceFile':'data/usage-curated-v27.json','sourcePairHash':sha(compact(original).encode())}
   else:
    p['senseScope']='phrase';p['senseId']='';p['senseIds']=[];p['alignmentStatus']='ambiguous' if len(exact)>1 else 'phrase_scope_unresolved'
  p['id']='phrase:'+word+':'+sha(norm(p['en']).encode())[:18];mark(p)
  if p.get('definition'):
   v={'en':p['definition'],'zh':p.get('definitionZh',''),'translation':p.get('definitionTranslation')};mark(v);p['definitionPair']=v
  if p['alignmentStatus']!='aligned':counts['phrases_unresolved']+=1
 for r in obj['relations']:
  src=mapid.get((word,r['senseId'])) or aliases.get((word,r['senseId']))
  target=mapid.get((r['word'],r['targetSenseId'])) or aliases.get((r['word'],r['targetSenseId']))
  r['fromSenseId']=src or '';r['toSenseId']=target or '';r['senseId']=src or '';r['targetSenseId']=target or '';mark(r)
  if not src or not target:counts['orphan_relations']+=1;unresolved.append({'word':word,'type':'orphan_relation','target':r['word']})
  r['id']='relation:'+sha((word+'\0'+str(src)+'\0'+str(target)+'\0'+r['label']).encode())[:20]
  if target:
   target_sense=next((s for s in records[r['word']]['senses'] if s['id']==target),None)
   if target_sense and norm(target_sense['en'])!=norm(r['en']):
    # Editorial replacement defines the same source sense, use that target definition.
    r['en']=target_sense['en'];r['zh']=target_sense['zh'];r['translation']=target_sense['translation'];mark(r)
  if src and src in local:r['contextEn']=local[src]['en'];r['contextZh']=local[src]['zh']
 # Preserve source summaries separately; they are not assumed to align with WN lists.
 pairs=[]
 for text in obj['nativeZh']:
  original=norm(text);candidate=native_candidates.get(original)
  pair={'sourceText':text,'sourceTextHash':sha(original.encode()),'id':'native:'+word+':'+sha(original.encode())[:18],'zh':original,'en':norm(candidate.get('en')) if candidate else '', 'translation':'machine-en','sourceRefs':[{'source':'ECDICT','version':'local-frozen-20261026','sourceTextHash':sha(original.encode())}]}
  mark(pair)
  if re.search('[\ue000-\uf8ff\ufffd\u2047]',pair['en']):pair['qualityIssues'].append('corrupt_english_translation');pair['reviewStatus']='needs_review'
  pairs.append(pair)
 obj['nativeSourceSummary']={'zh':obj['nativeZh'],'pairs':pairs,'source':'ECDICT','alignmentStatus':'independent_bilingual_source_blocks' if len(pairs)==len(obj['nativeZh']) and all(v['en'] for v in pairs) else 'native_summary_pending','note':'Each retained source block is independently paired; no positional mapping onto WordNet senses is asserted.'}

# Ledger records every adopted source sense, including aliases to editorial replacements.
for word,row in source['records'].items():
 for sid in row['senseIds']:
  dst=mapid.get((word,sid)) or aliases.get((word,sid));status='retained' if (word,sid) in mapid else 'merged_editorial' if dst else 'quarantined'
  source_lineage.append({'word':word,'source':'WordNet','version':'3.0','sourceId':sid,'senseKey':keys.get((word,sid)),'targetId':dst,'status':status})
 for text in row['extraEn']:
  if norm(text)=='-':source_lineage.append({'word':word,'source':'ECDICT','sourceText':text,'status':'excluded_with_reason','reason':'source-placeholder-not-a-definition'});continue
  matches=[s['id'] for s in records[word]['senses'] if norm(s['en']).casefold().rstrip('.')==norm(text).casefold().rstrip('.')]
  exclusion=excluded_sources.get((word,norm(text)))
  source_lineage.append({'word':word,'source':'ECDICT','sourceTextHash':sha(text.encode()),'targetIds':matches,'status':'excluded_confirmed_source_error' if exclusion else ('retained' if matches else 'quarantined'),'reason':exclusion['reason'] if exclusion else None,'evidence':exclusion['evidence'] if exclusion else []})
 # Native Chinese blocks remain preserved, but unknown alignment is not claimed as completed.
 for text in row['nativeZh']:
  target=next((p for p in records[word]['nativeSourceSummary']['pairs'] if p['sourceTextHash']==sha(norm(text).encode())),None)
  source_lineage.append({'word':word,'source':'ECDICT-zh','sourceTextHash':sha(norm(text).encode()),'targetId':target['id'] if target else None,'status':'retained_native_pair' if target and target['en'] else 'quarantined_native_pair','alignmentStatus':'independent_source_block'})
# Stable release identity binds source inputs, corrections and normalizer implementation.
identity={'sources':load(REPORTS/'sources-lock.json'),'corrections':sha((R/'data/translation-corrections-v212.json').read_bytes()),'normalizer':sha(Path(__file__).read_bytes())}
identity['sources'].pop('created',None)
identity['sourceRecords']=sha((W/'source-records.json').read_bytes())
identity['qualityReviewQueue']=sha((REPORTS/'translation_review_queue.jsonl').read_bytes())
identity['schemaContract']=sha((R/'schemas/dictionary-entry-v212.schema.json').read_bytes())
identity['reviewedSourceExclusions']=sha((R/'data/source-exclusions-reviewed-v212.json').read_bytes()) if (R/'data/source-exclusions-reviewed-v212.json').exists() else None
identity['nativeTranslationCandidates']=sha((W/'native-zh-en-candidates.jsonl').read_bytes()) if (W/'native-zh-en-candidates.jsonl').exists() else None
identity['candidateBundles']={key:meta['sha256'] for key,meta in sorted(oldmanifest['bundles'].items())}
build='v212-'+sha(compact(identity).encode())[:14]
folder=R/'data/bilingual-v212'/build;folder.mkdir(exist_ok=True)
# Variable prefix splitting keeps each on-demand bundle below 512 KiB whenever possible.
buckets=collections.defaultdict(dict)
for w,o in records.items():buckets[w[:2]][w]=o
queue=list(buckets.items());final=[]
while queue:
 prefix,items=queue.pop();raw=compact({'schema':3,'schemaVersion':3,'buildId':build,'words':items}).encode()
 if len(raw)>524288 and len(items)>1 and len(prefix)<8:
  split=collections.defaultdict(dict)
  for w,o in items.items():split[w[:len(prefix)+1]][w]=o
  if len(split)>1:queue.extend(split.items());continue
 final.append((prefix,items,raw))
manifest={'schema':3,'schemaVersion':3,'datasetVersion':'2.12.0','buildId':build,'releaseStatus':'candidate-not-approved','bundles':{},'entryCount':len(records),'qualityCounts':dict(quality_counts),'alignmentCounts':dict(counts),'sourceLockHash':sha(compact(identity['sources']).encode())}
for prefix,items,raw in sorted(final):
 p=folder/(prefix+'.json')
 if p.exists() and p.read_bytes()!=raw:raise RuntimeError('Immutable build collision: '+str(p))
 if not p.exists():
  tmp=p.with_suffix('.tmp');tmp.write_bytes(raw);tmp.replace(p)
 manifest['bundles'][prefix]={'url':'./data/bilingual-v212/'+build+'/'+prefix+'.json','bytes':len(raw),'sha256':sha(raw),'words':len(items)}
# Write manifest last, after all immutable data files exist.
atomic(folder/'manifest.json',manifest)
atomic(R/'data/bilingual-v212-manifest.json',manifest)
oldseed=(R/'bilingual-seeds-v212.js').read_text();history=oldseed.split('window.ROOTLAB_BILINGUAL_HISTORY=',1)[1] if 'window.ROOTLAB_BILINGUAL_HISTORY=' in oldseed else '{};\n'
seeds={w:records[w] for w in ['carrier','apple','banana','successful','photograph','revolution']}
(R/'bilingual-seeds-v212.js').write_text('window.ROOTLAB_BILINGUAL_META='+compact({'buildId':build,'schemaVersion':3,'releaseStatus':'candidate-not-approved'})+';\nwindow.ROOTLAB_BILINGUAL_SEEDS='+compact(seeds)+';\nwindow.ROOTLAB_BILINGUAL_HISTORY='+history)
with (REPORTS/'sense_reconciliation.jsonl').open('w') as f:
 for entry in source_lineage:f.write(compact(entry)+'\n')
atomic(REPORTS/'sense_reconciliation.json',{'sourceCounts':dict(collections.Counter(x['source'] for x in source_lineage)),'statuses':dict(collections.Counter(x['status'] for x in source_lineage)),'originalLedgerRows':len(source_lineage),'mappingIsNotTranslationApproval':True})
summary={'buildId':build,'words':len(records),'senses':sum(len(o['senses']) for o in records.values()),'examples':sum(len(o['examples']) for o in records.values()),'phrases':sum(len(o['phrases']) for o in records.values()),'relations':sum(len(o['relations']) for o in records.values()),'bundles':len(final),'bytes':sum(len(raw) for _,_,raw in final),'maxBundleBytes':max(len(raw) for _,_,raw in final),'qualityCounts':dict(quality_counts),'alignmentCounts':dict(counts),'status':'CANDIDATE_NOT_APPROVED'}
atomic(REPORTS/'normalized-build.json',summary)
print('NORMALIZED',compact(summary),flush=True)
