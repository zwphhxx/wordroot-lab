"""Loss-aware parsing of source dictionary definitions.
A wrapped source line is not a new sense. Raw line indexes are retained so
joined definitions can be reconciled without pretending source content vanished.
"""
import re,hashlib
POS=re.compile(r'^\s*(?:(n|v|vt|vi|a|adj|adv|s|r|prep|pron|conj|interj|un)\.\s*|(n|v|vt|vi|adj|adv|s|r|prep|pron|conj|interj|un)\s+)',re.I)
def normalized_pos(pos):
 return {'a':'adj','s':'adj','r':'adv'}.get(str(pos).lower(),str(pos).lower())
def strip_pos(text):return POS.sub('',str(text),count=1).strip()
def parse_english_definitions(raw):
 lines=re.split(r'\\n|\r\n?|\n',str(raw or ''))
 out=[];excluded=[]
 for index,line in enumerate(lines):
  text=line.strip()
  if not text:continue
  if text=='-':
   excluded.append({'sourceLine':index,'text':line,'reason':'source-placeholder-not-definition'});continue
  hit=POS.match(line)
  if hit or not out:
   out.append({'en':strip_pos(text),'pos':normalized_pos(hit.group(1) or hit.group(2)) if hit else '', 'sourceLines':[index],'sourceFragments':[line]})
  elif line[:1].isspace() or not re.search(r'[.!?]$',out[-1]['en']) or re.search(r'\b(?:See|Cf)\.?$',out[-1]['en']):
   out[-1]['en']+=' '+text;out[-1]['sourceLines'].append(index);out[-1]['sourceFragments'].append(line)
  else:
   # A separate unmarked complete entry is retained, not arbitrarily concatenated.
   out.append({'en':text,'pos':'','sourceLines':[index],'sourceFragments':[line],'unmarked':True})
 for item in out:
  item['en']=re.sub(r'\s+',' ',item['en']).strip()
  item['sourceTextHash']=hashlib.sha256('\n'.join(item['sourceFragments']).encode()).hexdigest()
  item['continuationLinesJoined']=max(0,len(item['sourceLines'])-1)
 accounted=[i for item in out for i in item['sourceLines']]+[x['sourceLine'] for x in excluded]
 required=[i for i,l in enumerate(lines) if l.strip()]
 assert sorted(accounted)==required,'Source line accounting failed'
 return out,excluded
