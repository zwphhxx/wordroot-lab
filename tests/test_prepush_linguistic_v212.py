#!/usr/bin/env python3
"""Regression tests for exact errors independently observed before publication.
Checks reviewed text, word-bound native blocks and cross-reference consistency;
this is not an assertion that unreviewed machine output is error-free.
"""
from pathlib import Path
import json,hashlib,unittest
R=Path(__file__).resolve().parent.parent
load=lambda p:json.loads(p.read_text(encoding='utf8'))
M=load(R/'data/bilingual-v212-manifest.json')
REVIEW=load(R/'reports/final-prepush-linguistic-review-v212.json')
FIXES={r['en']:r['afterZh'] for r in REVIEW['pairs']}
class PrepushLinguisticTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.words={}
  for pack in M['bundles'].values():
   raw=(R/pack['url'].removeprefix('./')).read_bytes()
   assert hashlib.sha256(raw).hexdigest()==pack['sha256']
   cls.words.update(json.loads(raw)['words'])
 def test_all_words_retained(self):self.assertEqual(len(self.words),49426)
 def test_mellow_keeps_all_source_senses(self):
  o=self.words['mellow'];self.assertEqual(len(o['senses']),9)
  self.assertEqual(len({s['id'] for s in o['senses']}),9)
 def test_every_matching_definition_example_and_context_is_corrected(self):
  found=set();count=0
  def visit(node):
   nonlocal count
   if isinstance(node,dict):
    for enkey,zhkey in [('en','zh'),('contextEn','contextZh'),('definition','definitionZh')]:
     en=node.get(enkey)
     if en in FIXES and zhkey in node:
      self.assertEqual(node[zhkey],FIXES[en],(en,node.get('id')));found.add(en);count+=1
    for value in node.values():visit(value)
   elif isinstance(node,list):
    for value in node:visit(value)
  for word in self.words.values():visit(word)
  self.assertEqual(found,set(FIXES));self.assertGreater(count,len(FIXES))
 def test_native_blocks_are_word_bound_and_complete(self):
  for edit in REVIEW['nativePairs']:
   pair=next(p for p in self.words[edit['word']]['nativeSourceSummary']['pairs'] if p['sourceText']==edit['sourceText'])
   self.assertEqual(pair['en'],edit['en']);self.assertEqual(pair['zh'],edit['sourceText'])
   self.assertEqual(pair['reviewStatus'],'editorial')
 def test_mellow_out_still_owns_its_phrase_sense(self):
  p=next(p for p in self.words['mellow']['phrases'] if p['en']=='mellow out')
  self.assertEqual(p['senseScope'],'phrase');self.assertTrue(p['senseId'].startswith('wn30:mellow_out%'))
  self.assertEqual(p['definitionPair']['zh'],'变得更加放松、随和或亲切。')
 def test_review_does_not_claim_whole_dictionary_approval(self):
  self.assertIn('Not a whole-corpus',REVIEW['scope'])
  self.assertEqual(REVIEW['reviewerType'],'assistant_linguistic_review')
if __name__=='__main__':unittest.main(verbosity=2)
