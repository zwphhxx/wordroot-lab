#!/usr/bin/env python3
"""Fail-closed predeployment gate. Success is explicit, current-build evidence only.
No network writes, no git push. Exit 2 means BLOCKED; fix evidence, not thresholds.
"""
from pathlib import Path
import json,re,hashlib,collections,time,sys
from jsonschema import Draft202012Validator
R=Path(__file__).resolve().parent.parent;REPORT=R/'reports';REPORT.mkdir(exist_ok=True)
load=lambda p:json.loads(p.read_text('utf8'))
policy=load(R/'schemas/publish-gates-v212.json');m=load(R/'data/bilingual-v212-manifest.json');schema=load(R/'schemas/dictionary-entry-v212.schema.json');Draft202012Validator.check_schema(schema);validate=Draft202012Validator(schema)
checks=[];counts=collections.Counter();schema_errors=[];broken_hash=[];senses_by_word={};relations=[];native_unmapped=0
for prefix,pack in m['bundles'].items():
 raw=(R/pack['url'].removeprefix('./')).read_bytes()
 if len(raw)!=pack['bytes'] or hashlib.sha256(raw).hexdigest()!=pack['sha256']:broken_hash.append(prefix);continue
 d=json.loads(raw)
 if d.get('buildId')!=m['buildId'] or d.get('schemaVersion')!=3:counts['mixedBuild']+=1
 for word,obj in d['words'].items():
  counts['words']+=1
  for e in validate.iter_errors(obj):
   counts['schemaErrors']+=1
   if len(schema_errors)<25:schema_errors.append({'word':word,'path':list(e.path),'message':e.message})
  ids=[s['id'] for s in obj['senses']];senses_by_word[word]={s['id']:{'en':s['en'],'zh':s['zh']} for s in obj['senses']}
  if len(ids)!=len(set(ids)):counts['duplicateSenseIds']+=1
  for kind in ('senses','examples','phrases','relations'):
   for v in obj[kind]:
    counts[kind]+=1
    if not v.get('en') or not v.get('zh') or re.search('尚未就绪|not yet available|译名待核对',str(v.get('zh'))+str(v.get('en'))):counts['missingPairs']+=1
    if v.get('reviewStatus') in ('needs_review','rejected'):counts['unreviewedHighRiskPairs']+=1
    if re.search('[\ue000-\uf8ff\ufffd\u2047]',v.get('zh','')):counts['corruptTranslations']+=1
    if kind=='phrases' and v.get('alignmentStatus')!='aligned':counts['unresolvedPhrases']+=1
    if kind=='phrases' and v.get('alignmentStatus')=='aligned':
     if v.get('senseScope')=='phrase':
      bound=v.get('phraseSense') or {}
      if bound.get('id')!=v.get('senseId') or bound.get('lemma')!=v['en'] or not bound.get('source'):counts['orphanPhraseScopes']+=1
      if bound.get('definitionEn') and bound['definitionEn']!=v.get('definition'):counts['wrongPhraseDefinition']+=1
     elif v.get('senseId') not in ids:counts['orphanPhraseScopes']+=1

    if kind=='examples' and v.get('alignmentStatus')!='aligned':counts['unresolvedExamples']+=1
    if kind=='examples' and any(sid not in ids for sid in v.get('senseIds',[])):counts['orphanExamples']+=1
    if v.get('definitionPair'):
     p=v['definitionPair'];counts['phraseDefinitions']+=1
     if not p.get('en') or not p.get('zh'):counts['missingPairs']+=1
     if p.get('reviewStatus') in ('needs_review','rejected'):counts['unreviewedHighRiskPairs']+=1
  native=obj.get('nativeSourceSummary',{});npairs=native.get('pairs') or []
  if native.get('alignmentStatus')!='independent_bilingual_source_blocks' or len(npairs)!=len(native.get('zh',[])):native_unmapped+=1
  for i,p in enumerate(npairs):
   counts['nativeSourceBlocks']+=1
   original=str(native['zh'][i]);normed=re.sub(r'\s+',' ',original).strip()
   if p.get('sourceText')!=original or p.get('sourceTextHash')!=hashlib.sha256(normed.encode()).hexdigest():counts['nativeSourceMismatch']+=1
   if not p.get('en') or not p.get('zh'):counts['missingPairs']+=1
   if p.get('reviewStatus') in ('needs_review','rejected'):counts['unreviewedHighRiskPairs']+=1
   if re.search('[\ue000-\uf8ff\ufffd\u2047]',str(p.get('en',''))+str(p.get('zh',''))):counts['corruptTranslations']+=1

  for rel in obj['relations']:relations.append((word,rel))
for word,rel in relations:
 src=senses_by_word.get(word,{}).get(rel.get('fromSenseId'));dst=senses_by_word.get(rel['word'],{}).get(rel.get('toSenseId'))
 if not src or not dst:counts['orphanRelations']+=1
 if dst and (dst['en']!=rel['en'] or dst['zh']!=rel['zh']):counts['crossSenseRelationDefinition']+=1
 if src and (src['en']!=rel['contextEn'] or src['zh']!=rel['contextZh']):counts['crossSenseContext']+=1
ledger=load(REPORT/'sense_reconciliation.json');quarantined=ledger['statuses'].get('quarantined',0)+ledger['statuses'].get('quarantined_native_pair',0)
bench=load(R/'tests/fixtures/bilingual-semantic-benchmark-v212.json');reviewed=[x for x in bench['items'] if x.get('status')=='approved' and x.get('evidence') and x.get('reviewer')]
browser=load(REPORT/'browser-results.json') if (REPORT/'browser-results.json').exists() else {}
external=load(REPORT/'external-content-pair-audit.json') if (REPORT/'external-content-pair-audit.json').exists() else {}
versionmap=load(REPORT/'source-version-mapping-audit.json') if (REPORT/'source-version-mapping-audit.json').exists() else {}
semantic=load(REPORT/'semantic-review-results.json') if (REPORT/'semantic-review-results.json').exists() else {}
def add(name,passed,actual,expected):checks.append({'name':name,'passed':bool(passed),'actual':actual,'required':expected})
add('preserved_word_count',counts['words']==policy['requiredWords'],counts['words'],policy['requiredWords'])
add('schema_valid',counts['schemaErrors']==0,counts['schemaErrors'],0)
add('source_senses_accounted',quarantined==0,quarantined,0)
add('unique_stable_ids',counts['duplicateSenseIds']==0,counts['duplicateSenseIds'],0)
add('packages_match_current_build',not broken_hash and counts['mixedBuild']==0,{'hashErrors':broken_hash,'mixedBuild':counts['mixedBuild']},0)
for label,key in [('no_missing_bilingual_pairs','missingPairs'),('no_corrupt_translations','corruptTranslations'),('no_orphan_relations','orphanRelations'),('no_orphan_examples','orphanExamples'),('correct_target_definitions','crossSenseRelationDefinition'),('correct_relation_context','crossSenseContext'),('examples_aligned','unresolvedExamples'),('phrases_aligned','unresolvedPhrases'),('high_risk_pairs_reviewed','unreviewedHighRiskPairs')]:add(label,counts[key]==0,counts[key],0)
add('native_chinese_sources_reconciled',native_unmapped==0 and counts['nativeSourceMismatch']==0,{'unpairedWords':native_unmapped,'mismatchedBlocks':counts['nativeSourceMismatch']},0)
add('phrase_scope_identity_valid',counts['orphanPhraseScopes']==0 and counts['wrongPhraseDefinition']==0,{'orphans':counts['orphanPhraseScopes'],'definitionMismatch':counts['wrongPhraseDefinition']},0)
add('source_versions_mapping_verified',versionmap.get('status')=='PASS',versionmap.get('status','NOT_RUN'),'PASS')
add('semantic_benchmark_reviewed',len(reviewed)>=policy['requiredBenchmarkWords'],len(reviewed),policy['requiredBenchmarkWords'])
add('independent_semantic_audit',semantic.get('status')=='PASS' and semantic.get('buildId')==m['buildId'],semantic.get('status','NOT_RUN'),'PASS for current build')
add('targeted_browser_checks',browser.get('status')=='PASS' and browser.get('buildId')==m['buildId'],browser.get('status','NOT_RUN'),'PASS for current build')
legacy=load(REPORT/'legacy-browser-regression.json') if (REPORT/'legacy-browser-regression.json').exists() else {}
add('legacy_browser_regression',legacy.get('status')=='PASS' and legacy.get('buildId')==m['buildId'],legacy.get('status','NOT_RUN'),'PASS for current build')
add('external_content_bilingual',external.get('status')=='PASS' and external.get('buildId')==m['buildId'],external.get('status','NOT_RUN'),'PASS for current build')
status='PASS' if all(x['passed'] for x in checks) else 'BLOCKED'
result={'status':status,'buildId':m['buildId'],'createdAt':time.time(),'productionChanges':False,'counts':dict(counts),'checks':checks,'blockedBy':[x['name'] for x in checks if not x['passed']],'schemaErrorExamples':schema_errors,'meaningOfPass':'Only a current PASS permits deployment. Field population and hashes do not prove semantic accuracy.'}
(REPORT/'release-gate.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for c in checks:print(('PASS' if c['passed'] else 'BLOCKED'),c['name'],c['actual'])
print('RELEASE_GATE',status,'BUILD',m['buildId'])
sys.exit(0 if status=='PASS' else 2)
