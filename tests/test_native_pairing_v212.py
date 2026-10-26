#!/usr/bin/env python3
"""Check source retention, cache isolation and English word boundaries."""
import unittest,sys,json
from pathlib import Path
R=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(R/'scripts'))
from native_pairing_v212 import split_source,descriptor,clean_english,output_issues,english_metadata,POLICY
class NativePairs(unittest.TestCase):
 def test_english_boundaries(self):self.assertEqual(clean_english('▁A▁virus▁carrier.'),'A virus carrier.')
 def test_actual_spaces_preserved(self):self.assertEqual(clean_english('You▁guys.  A  bank.'),'You guys. A bank.')
 def test_empty(self):self.assertEqual(clean_english(None),'')
 def test_pos_and_domain_not_sent_as_prose(self):
  p=split_source('n. [计] 单元, 细胞');self.assertEqual(p['pos'],'n');self.assertEqual(p['domains'],['计']);self.assertEqual(english_metadata(p),'noun; computing')
 def test_list_retains_all_meanings(self):
  p=split_source('a. 轻的, 少量的, 轻微的, 轻快的, 轻浮的, 明亮的, 淡色的, 容易的');self.assertEqual(len(p['parts']),8)
 def test_parenthetical_commas_not_split(self):
  p=split_source('n. 测量（包括甲, 乙）, 比例; 大小');self.assertEqual([x['text'] for x in p['parts']],['测量（包括甲, 乙）','比例','大小'])
 def test_source_offsets(self):
  p=split_source('n. [医] 物质, 元素；药物');self.assertTrue(all(p['body'][x['start']:x['end']].strip()==x['text'] for x in p['parts']))
 def test_same_chinese_different_words_not_same_cache(self):
  a=descriptor('bank','n. 库',{});b=descriptor('library','n. 库',{});self.assertNotEqual(a['cacheKey'],b['cacheKey'])
 def test_changed_context_invalidates_cache(self):
  a=descriptor('bank','n. 库',{'senseIds':['one']});b=descriptor('bank','n. 库',{'senseIds':['two']});self.assertNotEqual(a['cacheKey'],b['cacheKey'])
 def test_exact_context_repeat_stable(self):
  a=descriptor('bank','n. 库',{'senseIds':['one']});self.assertEqual(a,descriptor('bank','n. 库',{'senseIds':['one']}))
 def test_policy_bound(self):self.assertEqual(descriptor('bank','n. 库',{})['policy'],POLICY)
 def test_missing_segment_not_hidden(self):self.assertIn('segment_count_mismatch',output_issues([{'text':'银行'},{'text':'河岸'}],['bank'],[]))
 def test_corruption_not_approved(self):self.assertIn('corrupt_english_output',output_issues([{'text':'银行'}],['bank ⁇'],[]))
 def test_curated_block_identity(self):
  data=json.loads((R/'data/native-source-editorial-v212.json').read_text());seen=set()
  for item in data['pairs']:
   key=(item['word'],item['sourceText']);self.assertNotIn(key,seen);seen.add(key);self.assertTrue(item['reason']);self.assertTrue(item['en'])
 def test_curated_specific_mistakes(self):
  rows=json.loads((R/'data/native-source-editorial-v212.json').read_text())['pairs'];d={(x['word'],x['sourceText']):x['en'] for x in rows}
  self.assertIn('carrier wave',d['carrier','[计] 载波']);self.assertNotIn('Library',d['bank','[医] 库']);self.assertEqual(d['light','adv. 轻地'],'adverb: lightly.')
if __name__=='__main__':unittest.main(verbosity=2)
