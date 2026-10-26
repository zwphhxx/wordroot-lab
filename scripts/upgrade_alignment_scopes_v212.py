#!/usr/bin/env python3
"""Install phrase-local source identity and independent native-source block pairs.
This repairs the incorrect assumption that a compound's sense is the headword's
sense. Does not change publication thresholds or approve machine translations.
"""
from pathlib import Path
R=Path(__file__).resolve().parent.parent;p=R/'scripts/normalize_bilingual_v212.py';s=p.read_text()
s=s.replace("source=load(W/'source-records.json');editorial=load(R/'data/bilingual-editorial-v212.json')", """source=load(W/'source-records.json');editorial=load(R/'data/bilingual-editorial-v212.json')
curated_phrases=load(R/'data/usage-curated-v27.json')
native_candidates={}
if (W/'native-zh-en-candidates.jsonl').exists():
 for line in (W/'native-zh-en-candidates.jsonl').open():
  value=json.loads(line);native_candidates[norm(value['zh'])]=value
""",1)
start=s.index(" for p in obj['phrases']:");end=s.index(" for r in obj['relations']:",start)
replacement=""" for p in obj['phrases']:
  exact=[sid for sid in phrase_index[norm(p['en']).lower()] if (not p.get('pos') or full_syn[sid]['pos']==p['pos']) and (not p.get('definition') or norm(full_syn[sid]['en'])==norm(p['definition']))]
  if p.get('sourcePhraseSynsetId') in exact:exact=[p['sourcePhraseSynsetId']]
  p['sourcePhraseSenseIds']=['wn30:'+sid for sid in exact]
  explicit=mapid.get((word,p.get('senseId',''))) or aliases.get((word,p.get('senseId','')))
  phrase_source=None
  if explicit and word in editorial:
   p['senseScope']='headword';p['senseId']=explicit;p['senseIds']=[explicit];p['alignmentStatus']='aligned'
  elif len(exact)==1:
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
"""
s=s[:start]+replacement+s[end:]
old=" obj['nativeSourceSummary']={'zh':obj['nativeZh'],'source':'ECDICT','alignmentStatus':'source_summary_not_positionally_aligned'}"
new=""" pairs=[]
 for text in obj['nativeZh']:
  original=norm(text);candidate=native_candidates.get(original)
  pair={'sourceText':text,'sourceTextHash':sha(original.encode()),'id':'native:'+word+':'+sha(original.encode())[:18],'zh':original,'en':norm(candidate.get('en')) if candidate else '', 'translation':'machine-en','sourceRefs':[{'source':'ECDICT','version':'local-frozen-20261026','sourceTextHash':sha(original.encode())}]}
  mark(pair)
  if re.search('[\\ue000-\\uf8ff\\ufffd\\u2047]',pair['en']):pair['qualityIssues'].append('corrupt_english_translation');pair['reviewStatus']='needs_review'
  pairs.append(pair)
 obj['nativeSourceSummary']={'zh':obj['nativeZh'],'pairs':pairs,'source':'ECDICT','alignmentStatus':'independent_bilingual_source_blocks' if len(pairs)==len(obj['nativeZh']) and all(v['en'] for v in pairs) else 'native_summary_pending','note':'Each retained source block is independently paired; no positional mapping onto WordNet senses is asserted.'}
"""
assert old in s;s=s.replace(old,new,1)
old="  source_lineage.append({'word':word,'source':'ECDICT-zh','sourceTextHash':sha(text.encode()),'status':'retained_source_summary','alignmentStatus':'unmapped_to_individual_sense'})"
new="""  target=next((p for p in records[word]['nativeSourceSummary']['pairs'] if p['sourceTextHash']==sha(norm(text).encode())),None)
  source_lineage.append({'word':word,'source':'ECDICT-zh','sourceTextHash':sha(norm(text).encode()),'targetId':target['id'] if target else None,'status':'retained_native_pair' if target and target['en'] else 'quarantined_native_pair','alignmentStatus':'independent_source_block'})"""
assert old in s;s=s.replace(old,new,1)
needle="identity['sources'].pop('created',None)"
s=s.replace(needle,needle+"\nidentity['sourceRecords']=sha((W/'source-records.json').read_bytes())\nidentity['nativeTranslationCandidates']=sha((W/'native-zh-en-candidates.jsonl').read_bytes()) if (W/'native-zh-en-candidates.jsonl').exists() else None\nidentity['candidateBundles']={key:meta['sha256'] for key,meta in sorted(oldmanifest['bundles'].items())}",1)
p.write_text(s)
# Extend the gate with exact native-source and phrase-scope verification; thresholds unchanged.
p=R/'scripts/release_preflight_v212.py';s=p.read_text()
needle="    if kind=='phrases' and v.get('alignmentStatus')!='aligned':counts['unresolvedPhrases']+=1"
replacement=needle+"""
    if kind=='phrases' and v.get('alignmentStatus')=='aligned':
     if v.get('senseScope')=='phrase':
      bound=v.get('phraseSense') or {}
      if bound.get('id')!=v.get('senseId') or bound.get('lemma')!=v['en'] or not bound.get('source'):counts['orphanPhraseScopes']+=1
      if bound.get('definitionEn') and bound['definitionEn']!=v.get('definition'):counts['wrongPhraseDefinition']+=1
     elif v.get('senseId') not in ids:counts['orphanPhraseScopes']+=1
"""
assert needle in s;s=s.replace(needle,replacement,1)
old="  if obj.get('nativeSourceSummary',{}).get('alignmentStatus')=='source_summary_not_positionally_aligned':native_unmapped+=1"
new="""  native=obj.get('nativeSourceSummary',{});npairs=native.get('pairs') or []
  if native.get('alignmentStatus')!='independent_bilingual_source_blocks' or len(npairs)!=len(native.get('zh',[])):native_unmapped+=1
  for i,p in enumerate(npairs):
   counts['nativeSourceBlocks']+=1
   original=str(native['zh'][i]);normed=re.sub(r'\\s+',' ',original).strip()
   if p.get('sourceText')!=original or p.get('sourceTextHash')!=hashlib.sha256(normed.encode()).hexdigest():counts['nativeSourceMismatch']+=1
   if not p.get('en') or not p.get('zh'):counts['missingPairs']+=1
   if p.get('reviewStatus') in ('needs_review','rejected'):counts['unreviewedHighRiskPairs']+=1
   if re.search('[\\ue000-\\uf8ff\\ufffd\\u2047]',str(p.get('en',''))+str(p.get('zh',''))):counts['corruptTranslations']+=1
"""
assert old in s;s=s.replace(old,new,1)
s=s.replace("quarantined=ledger['statuses'].get('quarantined',0)","quarantined=ledger['statuses'].get('quarantined',0)+ledger['statuses'].get('quarantined_native_pair',0)",1)
needle="add('native_chinese_sources_reconciled',native_unmapped==0,native_unmapped,0)"
new="""add('native_chinese_sources_reconciled',native_unmapped==0 and counts['nativeSourceMismatch']==0,{'unpairedWords':native_unmapped,'mismatchedBlocks':counts['nativeSourceMismatch']},0)
add('phrase_scope_identity_valid',counts['orphanPhraseScopes']==0 and counts['wrongPhraseDefinition']==0,{'orphans':counts['orphanPhraseScopes'],'definitionMismatch':counts['wrongPhraseDefinition']},0)"""
assert needle in s;s=s.replace(needle,new,1);p.write_text(s)
print('Phrase-local identity and native-source reconciliation installed; release limits unchanged.')
