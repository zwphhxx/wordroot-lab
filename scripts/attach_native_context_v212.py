#!/usr/bin/env python3
"""One-time guarded integration of word-bound native counterparts and provenance."""
from pathlib import Path
R=Path(__file__).resolve().parent.parent;p=R/'scripts/normalize_bilingual_v212.py';s=p.read_text()
assert 'from native_pairing_v212 import' not in s
s=s.replace('from pathlib import Path','from pathlib import Path\nfrom native_pairing_v212 import descriptor,clean_english,english_metadata,POLICY',1)
a=s.index('native_candidates={}');b=s.index('\ncorrections=',a)
s=s[:a]+'''native_candidates={}
native_cache=W/'native-zh-en-contextual-v3.jsonl'
if native_cache.exists():
 for line in native_cache.open():
  value=json.loads(line)
  if value.get('policy')!=POLICY:continue
  key=value['cacheKey']
  if key in native_candidates and native_candidates[key]!=value:raise ValueError('Conflicting contextual native cache '+key)
  native_candidates[key]=value
native_editorial={}
for item in load(R/'data/native-source-editorial-v212.json').get('pairs',[]):
 word=item['word'];text=norm(item['sourceText'])
 assert text in [norm(v) for v in source['records'][word]['nativeZh']],('Editorial native source mismatch',word,text)
 native_editorial[(word,text)]=item
''' +s[b:]
a=s.index(' # Preserve source summaries separately;');b=s.index('\n# Ledger records',a)
s=s[:a]+''' # Preserve the original Chinese source text; counterpart identity includes this word/context.
 pairs=[]
 for text in obj['nativeZh']:
  original=norm(text);identity=descriptor(word,text,source['records'][word]);candidate=native_candidates.get(identity['cacheKey']);edited=native_editorial.get((word,original))
  if candidate:
   assert candidate['sourceHash']==identity['sourceHash'] and candidate['contextHash']==identity['contextHash'] and candidate['word']==word
  english=clean_english(candidate.get('en')) if candidate else '';kind='machine-en';refs=[];segments=[];extra_issues=[]
  # Exact COW lexical labels may supply a source-aligned counterpart, never by list order.
  for part in identity['parts']:
   hits=[]
   for sid in source['records'][word]['senseIds']:
    syn=source['synsets'].get(sid,{})
    pos=identity['pos'];allowed={'a':'a','adj':'a','s':'a','adv':'r','r':'r','vt':'v','vi':'v','n':'n','v':'v'}.get(pos)
    if allowed and syn.get('pos')!=allowed:continue
    if part['text'] in syn.get('zhLabels',[]):hits.append((sid,syn))
   definitions={norm(v['en']) for _,v in hits}
   if len(definitions)==1:
    sid,syn=hits[0];segments.append({'zh':part['text'],'en':syn['en'],'sourceSynsetIds':[x[0] for x in hits]})
   else:segments.append({'zh':part['text'],'en':'','sourceSynsetIds':[x[0] for x in hits]})
  mapped=bool(segments) and all(x['en'] for x in segments)
  if mapped and not edited:
   label=english_metadata(identity);english=(label+': ' if label else '')+'; '.join(x['en'] for x in segments);kind='dictionary'
   refs=[{'source':'Chinese Open Wordnet + Princeton WordNet','version':'PWN3.0-compatible','synsetId':sid,'chineseLabel':seg['zh']} for seg in segments for sid in seg['sourceSynsetIds']]
   for seg in segments:
    if seg['en'] in source_review:extra_issues.append('source_definition_needs_review')
  if edited:english=edited['en'];kind='edited';extra_issues=[]
  elif not mapped and candidate:extra_issues+=candidate.get('qualityIssues',[])
  pair={'sourceText':text,'sourceTextHash':sha(original.encode()),'id':'native:'+word+':'+sha(original.encode())[:18],'zh':original,'en':english,'translation':kind,'cacheKey':identity['cacheKey'],'contextHash':identity['contextHash'],'counterpartMethod':'assistant_reviewed' if edited else 'exact_cow_label_mapping' if mapped else 'segmented_local_mt' if candidate else 'missing','sourceRefs':[{'source':'ECDICT','version':'local-frozen-20261026','sourceTextHash':sha(original.encode())}]+refs}
  if edited:pair['reviewReason']=edited['reason']
  if mapped:pair['segmentAlignment']=segments
  elif candidate:pair['sourceSegments']=candidate['segments']
  mark(pair)
  if re.search('[\\ue000-\\uf8ff\\ufffd\\u2047]',pair['en']):extra_issues.append('corrupt_english_translation')
  if extra_issues:pair['qualityIssues']=sorted(set(pair['qualityIssues']+extra_issues));pair['reviewStatus']='needs_review'
  pairs.append(pair)
 obj['nativeSourceSummary']={'zh':obj['nativeZh'],'pairs':pairs,'source':'ECDICT','alignmentStatus':'independent_bilingual_source_blocks' if len(pairs)==len(obj['nativeZh']) and all(v['en'] for v in pairs) else 'native_summary_pending','note':'Exact source blocks are paired independently with word-bound provenance; no positional WordNet mapping is asserted.'}
''' +s[b:]
needle="identity['nativeTranslationCandidates']=sha((W/'native-zh-en-candidates.jsonl').read_bytes()) if (W/'native-zh-en-candidates.jsonl').exists() else None"
assert needle in s
s=s.replace(needle,"identity['nativeTranslationCandidates']=sha(native_cache.read_bytes()) if native_cache.exists() else None\nidentity['nativeEditorial']=sha((R/'data/native-source-editorial-v212.json').read_bytes())\nidentity['nativePairingPolicy']=sha((R/'scripts/native_pairing_v212.py').read_bytes())\nidentity['sourceSemanticReview']=sha((R/'data/source-semantic-review-v212.json').read_bytes()) if (R/'data/source-semantic-review-v212.json').exists() else None",1)
p.write_text(s)
print('Integrated exact source-label mappings, manual native pairs and context-bound candidate cache; no release thresholds changed.')
