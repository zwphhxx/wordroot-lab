#!/usr/bin/env python3
import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'scripts'))
from lexical_source_parser_v212 import parse_english_definitions,strip_pos
class ParserTests(unittest.TestCase):
 def test_wrapped_reference_is_not_sense(self):
  raw='n. A proposition; a maxim.\\nn. The introductory or subordinate member of a sentence,\\n   generally of a conditional sentence; -- opposed to apodosis. See\\n   Apodosis.\\nn. The first part of a drama, of a poem, or the like; the\\n   introduction; opposed to epitasis.'
  rows,excluded=parse_english_definitions(raw)
  self.assertEqual(len(rows),3);self.assertFalse(excluded)
  self.assertIn('See Apodosis.',rows[1]['en']);self.assertNotIn('Apodosis.',[r['en'] for r in rows])
  self.assertEqual(rows[1]['sourceLines'],[1,2,3]);self.assertEqual(rows[2]['sourceLines'],[4,5])
 def test_multiple_real_senses_preserved(self):
  rows,_=parse_english_definitions('n. a financial institution\\nn. the land beside a river\\nv. to tilt an aircraft')
  self.assertEqual(len(rows),3);self.assertEqual([r['pos'] for r in rows],['n','n','v'])
 def test_satellite_and_adverb_pos(self):
  self.assertEqual(strip_pos('s. bright and clear'),'bright and clear');self.assertEqual(strip_pos('r. in a gentle manner'),'in a gentle manner')
  rows,_=parse_english_definitions('s. very small\\nr. in a gentle way');self.assertEqual([x['pos'] for x in rows],['adj','adv'])
 def test_dash_has_accounted_reason(self):
  rows,excluded=parse_english_definitions('a. tending to break a rule\\n-');self.assertEqual(len(rows),1);self.assertEqual(excluded[0]['sourceLine'],1);self.assertEqual(excluded[0]['reason'],'source-placeholder-not-definition')
 def test_unmarked_complete_entries_retained(self):
  rows,_=parse_english_definitions('A device.\nA different use.');self.assertEqual(len(rows),2)
 def test_continuation_without_indent(self):
  rows,_=parse_english_definitions('n. a material that is used\nfor support.');self.assertEqual(len(rows),1);self.assertIn('used for support.',rows[0]['en'])
 def test_hash_and_lineage_stable(self):
  a,_=parse_english_definitions('n. a thing\\n    with another line.');b,_=parse_english_definitions('n. a thing\\n    with another line.');self.assertEqual(a,b);self.assertEqual(len(a[0]['sourceTextHash']),64)
 def test_unpunctuated_wordnet_pos_is_not_wrapped_prose(self):
  rows,excluded=parse_english_definitions('v make a logical connection\\nv keep company with\\nv bring into association')
  self.assertFalse(excluded);self.assertEqual(len(rows),3);self.assertEqual([x['pos'] for x in rows],['v','v','v'])
  self.assertEqual(rows[1]['en'],'keep company with')
 def test_unpunctuated_noun_and_literal_article(self):
  rows,_=parse_english_definitions('n a rich and spectacular ceremony\\nn an elaborate representation of history')
  self.assertEqual(len(rows),2);self.assertEqual([x['pos'] for x in rows],['n','n'])
  rows,_=parse_english_definitions('a small room used for storage.')
  self.assertEqual(rows[0]['en'],'a small room used for storage.');self.assertEqual(rows[0]['pos'],'')
 def test_literal_indefinite_article_in_continuation(self):
  rows,_=parse_english_definitions('n. a place used as\na room for storage.')
  self.assertEqual(len(rows),1);self.assertIn('as a room',rows[0]['en'])
 def test_empty_input(self):self.assertEqual(parse_english_definitions(''),([],[]))
 def test_exact_adjective_source_unpunctuated_a(self):
  raw='s. tough meat\\na consisting of tendons or resembling a tendon'
  rows,_=parse_english_definitions(raw,{'consisting of tendons or resembling a tendon'})
  self.assertEqual(len(rows),2);self.assertEqual(rows[1]['pos'],'adj');self.assertEqual(rows[1]['sourceLines'],[1])
 def test_unknown_a_stays_as_article(self):
  rows,_=parse_english_definitions('n. a room with\na red door.',{'red in colour'})
  self.assertEqual(len(rows),1);self.assertIn('a red door.',rows[0]['en'])
if __name__=='__main__':unittest.main(verbosity=2)
