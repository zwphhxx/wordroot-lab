"""Lossless native-gloss segmentation and word-context-bound translation identities.
This module supplies deterministic metadata; it never certifies a translation.
"""
import re,hashlib,json
POLICY='native-segmented-v3-space-safe';MODEL='Argos-OPUS-MT-zh-en-1.9'
POS={'n':'noun','v':'verb','vt':'transitive verb','vi':'intransitive verb','a':'adjective','adj':'adjective','adv':'adverb','r':'adverb','s':'adjective','prep':'preposition','pron':'pronoun','conj':'conjunction','interj':'interjection','un':'unclassified'}
DOMAIN={'计':'computing','医':'medicine','化':'chemistry','法':'law','律':'law','经':'economics','商':'commerce','数':'mathematics','物':'physics','机':'mechanics','生化':'biochemistry','植':'botany','动':'zoology','地质':'geology','电':'electricity','军':'military','航':'aviation','网络':'Internet usage'}
def norm(value):return re.sub(r'\s+',' ',str(value or '')).strip()
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def split_source(text):
 original=norm(text);body=original;pos='';domains=[]
 hit=re.match(r'^(n|v|vt|vi|a|adj|adv|r|s|prep|pron|conj|interj|un)\.\s*',body,re.I)
 if hit:pos=hit.group(1).lower();body=body[hit.end():]
 while body.startswith('['):
  tag=re.match(r'^\[([^\]]{1,12})\]\s*',body)
  if not tag:break
  domains.append(tag.group(1));body=body[tag.end():]
 parts=[];start=0;stack=[];openers={'(':')','（':'）','[':']','【':'】','{':'}'}
 for i,ch in enumerate(body):
  if ch in openers:stack.append(openers[ch])
  elif stack and ch==stack[-1]:stack.pop()
  elif not stack and ch in ',，;；、':
   if body[start:i].strip():parts.append({'text':body[start:i].strip(),'start':start,'end':i})
   start=i+1
 if body[start:].strip():parts.append({'text':body[start:].strip(),'start':start,'end':len(body)})
 if not parts and body:parts=[{'text':body,'start':0,'end':len(body)}]
 return {'sourceText':original,'body':body,'pos':pos,'domains':domains,'parts':parts}
def descriptor(word,text,row):
 parsed=split_source(text)
 context={'word':word,'pos':parsed['pos'],'domains':parsed['domains'],'sourceSenseIds':row.get('senseIds',[]),'sourceEnglish':row.get('extraEn',[]),'sourceEntries':[(x.get('pos',''),x.get('sourceTextHash','')) for x in row.get('sourceEntries',[])]}
 source_hash=hashlib.sha256(norm(text).encode()).hexdigest();context_hash=digest(context)
 identity={'sourceHash':source_hash,'contextHash':context_hash,'direction':'zh_en','policy':POLICY,'model':MODEL}
 return {**parsed,'word':word,'sourceHash':source_hash,'contextHash':context_hash,'cacheKey':digest(identity),'context':context,'policy':POLICY,'model':MODEL}
def english_metadata(parsed):
 labels=[]
 if parsed['pos']:labels.append(POS[parsed['pos']])
 labels.extend(DOMAIN.get(d,'') for d in parsed['domains'])
 return '; '.join(x for x in labels if x)
def output_issues(parts,translations,domains):
 issues=[]
 if not parts:issues.append('empty_source_body')
 if len(parts)!=len(translations):issues.append('segment_count_mismatch')
 for src,en in zip(parts,translations):
  if not re.search('[A-Za-z]',en or ''):issues.append('no_english_segment')
  if re.search('[\ue000-\uf8ff\ufffd\u2047]',en or ''):issues.append('corrupt_english_output')
  if re.search('[\u3400-\u9fff]',en or ''):issues.append('chinese_echo_in_english')
  if re.search(r'(.{3,18})\1\1',en or '',re.I):issues.append('repeated_english_output')
  nums=re.findall(r'\d+(?:\.\d+)?',src['text'])
  if any(n not in en for n in nums):issues.append('number_review')
  if len(src['text'])>=12 and len(en.split())<3:issues.append('possible_omission')
 if any(d not in DOMAIN for d in domains):issues.append('domain_label_needs_review')
 return sorted(set(issues))


def clean_english(value):
    """Escaped SentencePiece whitespace is a boundary, not a deletable artifact."""
    return re.sub(r"\s+", " ", str(value or "").replace("▁", " ")).strip()
