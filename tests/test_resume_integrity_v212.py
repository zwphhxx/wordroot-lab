#!/usr/bin/env python3
"""Regression for real source repairs, not semantic approval of the candidate corpus."""
from pathlib import Path
import json,hashlib,re,unittest,collections
R=Path(__file__).resolve().parent.parent
class Repairs(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.manifest=json.loads((R/'data/bilingual-v212-manifest.json').read_text());cls.words={}
  for b in cls.manifest['bundles'].values():
   raw=(R/b['url'][2:]).read_bytes();assert hashlib.sha256(raw).hexdigest()==b['sha256'];cls.words.update(json.loads(raw)['words'])
  cls.source=json.loads((R/'.work/bilingual-v212/source-records.json').read_text())['records']
 def test_all_original_words_preserved(self):self.assertEqual(len(self.words),49426);self.assertEqual(set(self.words),set(self.source))
 def test_phrase_owns_its_meaning_not_headword_index(self):
  checked=0
  for word,obj in self.words.items():
   for p in obj['phrases']:
    if p.get('alignmentStatus')!='aligned':continue
    if p.get('senseScope')=='phrase':
     scope=p['phraseSense'];self.assertEqual(scope['id'],p['senseId']);self.assertEqual(scope['lemma'],p['en']);self.assertTrue(scope['source'])
     if scope.get('definitionEn'):self.assertEqual(scope['definitionEn'],p['definition'])
     checked+=1
    else:self.assertIn(p['senseId'],{s['id'] for s in obj['senses']})
  self.assertGreater(checked,15000)
 def test_duplicate_glosses_resolved_only_by_exact_source_provenance(self):
  import zipfile
  audit=json.loads((R/'reports/phrase-provenance-recovery.json').read_text())
  self.assertEqual(len(audit['records']),3)
  with zipfile.ZipFile(R.parent/'wordroot-lab-deploy/.v12-work/wordnet30.zip') as source:
   for row in audit['records']:
    p=next(p for p in self.words[row['word']]['phrases'] if p['en']==row['phrase'])
    origin=row['selectedSource'];line=source.read(origin['member']).decode().splitlines()[origin['sourceLine']-1]
    self.assertEqual(hashlib.sha256(line.encode()).hexdigest(),origin['lineSha256'])
    self.assertTrue(line.startswith(origin['synsetId'].split('-')[0]+' '))
    self.assertEqual(p['alignmentStatus'],'aligned');self.assertEqual(p['phraseSense']['synsetId'],origin['synsetId'])
    self.assertEqual(p['phraseSense']['definitionEn'],origin['definition'])
    self.assertGreaterEqual(len(row['allCandidateRecords']),2);self.assertTrue(row['noSemanticMerge'])
    self.assertEqual(p['provenanceRecovery']['method'],'replay-original-builder-source-selection')

 def test_native_source_text_not_overwritten(self):
  for word,obj in self.words.items():
   native=obj['nativeSourceSummary'];self.assertEqual(native['zh'],self.source[word]['nativeZh']);self.assertEqual(len(native['pairs']),len(native['zh']))
   for original,pair in zip(native['zh'],native['pairs']):
    self.assertEqual(pair['sourceText'],original);self.assertEqual(pair['sourceTextHash'],hashlib.sha256(re.sub(r'\s+',' ',original).strip().encode()).hexdigest())
    if not pair['en']:self.assertEqual(pair['reviewStatus'],'needs_review')
 def test_previous_truncated_gloss_and_examples_restored(self):
  report=json.loads((R/'reports/source-fragment-restoration.json').read_text());self.assertEqual(report['restoredCounts']['phrase_gloss_restored'],104);self.assertEqual(report['restoredCounts']['example_restored'],3)
  for repair in report['changes']:
   row=self.source[repair['word']]
   if repair['type']=='phrase_gloss_restored':
    self.assertTrue(any(p['en']==repair['phrase'] and p['definition']==repair['restored'] for p in row['phrases']))
   else:self.assertIn(repair['restored'],row['examples']);self.assertNotIn(repair['old'],row['examples'])
 def test_repaired_pos_boundaries(self):
  for word,count in [('associated',3),('modernizing',2),('pageantry',2)]:
   entries=self.source[word]['sourceEntries'];self.assertEqual(len(entries),count);self.assertEqual(len({i for e in entries for i in e['sourceLines']}),count)
 def test_siting_wrong_lemma_exclusion_is_evidenced(self):
  current={s['en'] for s in self.words['siting']['senses']};self.assertIn('assign a location to',current);self.assertNotIn('be seated',current);self.assertNotIn('take a seat',current)
  self.assertIn('be seated',self.source['siting']['extraEn'])
  with (R/'reports/sense_reconciliation.jsonl').open() as ledger:rows=[json.loads(l) for l in ledger if 'siting' in l]
  excluded=[r for r in rows if r['status']=='excluded_confirmed_source_error'];self.assertEqual(len(excluded),10);self.assertTrue(all(r['reason'] and r['evidence'] for r in excluded))
 def test_known_semantic_repairs_remain_applied(self):
  wanted={'These apples need to mellow a bit more':'这些苹果还需要再熟软一点。','She took a chill':'她受了凉。','She broke the match':'她折断了那根火柴。'}
  found=collections.Counter()
  for obj in self.words.values():
   for field in ['senses','examples','relations']:
    for row in obj[field]:
     if row['en'] in wanted:self.assertEqual(row['zh'],wanted[row['en']]);found[row['en']]+=1
  self.assertEqual(set(found),set(wanted))
 def test_sample_review_not_called_corpus_approval(self):
  report=json.loads((R/'reports/semantic-sample-review-resume.json').read_text());self.assertEqual(report['sampleSize'],120);self.assertEqual(report['revised'],78);self.assertEqual(report['sourceReviewPending'],6);self.assertNotEqual(report['status'],'PASS')
if __name__=='__main__':unittest.main(verbosity=2)
