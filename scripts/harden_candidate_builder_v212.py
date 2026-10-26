from pathlib import Path
R=Path(__file__).resolve().parent.parent
p=R/'scripts/build_bilingual_v212.py';s=p.read_text()
needle="missing=collections.Counter();warnings=[]"
assert needle in s
s=s.replace(needle,"""for review in load(R/'data/translation-corrections-v212.json')['pairs']:
 corrections[review['en']]=review['zh']
# Normalize lookup whitespace without claiming it changes semantic quality.
zh={norm(k):v for k,v in zh.items()};en={norm(k):v for k,v in en.items()}
missing=collections.Counter();warnings=[];excluded=[]""",1)
needle=" if text in corrections:return corrections[text],'edited'"
assert needle in s
s=s.replace(needle,needle+"""
 if text=='-':
  excluded.append({'sourceText':text,'reason':'source-placeholder-not-a-lexical-sense'});return '', 'excluded-placeholder'
 inflection=re.fullmatch(r'p\\.\\s*pr\\.\\s*&\\s*vb\\.\\s*n\\.\\s*of\\s+([A-Za-z]+)',text,re.I)
 if inflection:return inflection.group(1).lower()+' 的现在分词或动名词形式。','source-grammar'
 past=re.fullmatch(r'imp\\.\\s*&\\s*p\\.\\s*p\\.\\s*of\\s+([A-Za-z]+)',text,re.I)
 if past:return past.group(1).lower()+' 的过去式或过去分词形式。','source-grammar'
""",1)
needle=" text=strippos(text)\n item=en.get(text)"
assert needle in s
s=s.replace(needle,""" text=strippos(text)
 if re.fullmatch(r'=[A-Za-z]+',text):return 'Alternative spelling of '+text[1:]+'.','source-grammar'
 item=en.get(text)""",1)
needle=" for i,text in enumerate(row['extraEn']):\n  if norm(text).casefold().rstrip('.') in seen:continue"
assert needle in s
s=s.replace(needle,""" for i,text in enumerate(row['extraEn']):
  if text.strip()=='-':
   excluded.append({'word':word,'sourceText':text,'reason':'source-placeholder-not-a-lexical-sense'});continue
  if norm(text).casefold().rstrip('.') in seen:continue""",1)
needle="'zh':strippos(text),'translation':k"
assert needle in s
s=s.replace(needle,"'zh':(strippos(text)[1:]+' 的另一种拼写。' if re.fullmatch(r'=[A-Za-z]+',strippos(text)) else strippos(text)),'translation':k",1)
needle="print('CARRIER',len(recordsOut['carrier']['senses']),'senses',len(recordsOut['carrier']['examples']),'examples',flush=True)"
assert needle in s
s=s.replace(needle,needle+"\n(R/'reports/source-exclusions.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2)+'\\n')",1)
p.write_text(s)
print('Builder preserves explicit placeholder accounting, contextual spelling notes, and exact reviewed corrections')
