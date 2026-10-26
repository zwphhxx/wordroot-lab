#!/usr/bin/env python3
"""Translate narrowly recognized NAME METADATA without retransliterating a name.
The full source must match one of the documented patterns; otherwise no output.
This is deterministic metadata translation, not approval of arbitrary definitions.
"""
from pathlib import Path
import json,re,hashlib,argparse,collections
R=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');a=p.parse_args()
LANG={'英':'English','英国':'British','美':'American','美国':'American','法':'French','法国':'French','德':'German','德国':'German','意':'Italian','意大利':'Italian','西':'Spanish','西班牙':'Spanish','葡':'Portuguese','俄':'Russian','罗':'Romanian','捷':'Czech','波':'Polish','芬':'Finnish','瑞典':'Swedish','荷':'Dutch','丹':'Danish','挪':'Norwegian','冰':'Icelandic','匈':'Hungarian','希':'Greek','日':'Japanese','韩':'Korean','朝':'Korean','阿拉伯':'Arabic','坦桑':'Tanzanian','塞':'Serbian','塞尔':'Serbian','保':'Bulgarian','克罗':'Croatian','土':'Turkish','土耳其':'Turkish','印':'Indian','印度':'Indian','斯里':'Sri Lankan','越':'Vietnamese','泰':'Thai','南非':'South African','以':'Israeli','爱尔兰':'Irish','苏格兰':'Scottish','威尔士':'Welsh','乌克兰':'Ukrainian','乌':'Ukrainian','巴基':'Pakistani','阿尔巴':'Albanian','澳':'Australian','加':'Canadian','马来':'Malay','印尼':'Indonesian','瑞士':'Swiss','朝鲜':'Korean','英格兰':'English','爱':'Irish','缅':'Burmese','阿塞':'Azerbaijani','拉脱':'Latvian','立陶':'Lithuanian','尼':'Nepalese','埃塞':'Ethiopian','格鲁':'Georgian','马其':'Macedonian','尼日利亚':'Nigerian','肯尼':'Kenyan','斯洛':'Slovak','斯洛文':'Slovenian'}
rows=json.loads((R/'.work/bilingual-v212/native-risk-review-final.json').read_text())
res=[];unknown=collections.Counter()
for i,x in enumerate(rows):
 word=x['word'];text=x['zh'];z=re.sub(r'^n\.\s*','',text).strip().replace('（','(').replace('）',')');answer=None;pattern=None
 m=re.fullmatch(r'\(([A-Za-z -]+)\)人名[；;](.+)',z)
 if m and m.group(1).lower().replace(' ','')==word:
  segments=re.split('[；;]',m.group(2));labels=[];valid=True
  for seg in segments:
   hit=re.fullmatch(r'\(([^()]+)\)([\u3400-\u9fff·\s]+)',seg.strip())
   if not hit:valid=False;break
   for v in re.split('[、,，]',hit.group(1)):
    if v not in LANG:unknown[v]+=1;valid=False
    elif LANG[v] not in labels:labels.append(LANG[v])
  if valid and labels:
   answer='Personal name: '+m.group(1)+'. The source gives '+', '.join(labels)+' transliteration variants.';pattern='exact_name_language_transliteration'
 if not answer:
  m=re.fullmatch(r'\[人名\]\s*([\u3400-\u9fff·]+)',z)
  if m:answer=word[0].upper()+word[1:]+', a personal name.';pattern='name_only'
 if not answer:
  m=re.fullmatch(r'([\u3400-\u9fff·]+)\((男子名|女子名|男性名|女性名)(?:[，,]\s*(?:等于|同|=)\s*([A-Za-z,， .-]+))?\)',z)
  if m:
   answer=word[0].upper()+word[1:]+', a '+('male' if m.group(2) in ('男子名','男性名') else 'female')+' given name.'
   if m.group(3):answer+=' The source also links it with '+m.group(3).strip().rstrip('.')+'.'
   pattern='given_name_with_optional_exact_alias'
 if answer:
  res.append({'index':i,'word':word,'sourceText':text,'en':answer,'rule':pattern,'reason':'完整原文匹配已核对的人名/语种元数据结构；保留拉丁字母词形和全部语种、别名，不让模型回译中文音译。','reviewerType':'validated_metadata_rule','sourceHash':hashlib.sha256(text.encode()).hexdigest()})
(R/'reports/native-name-rule-review-v212.json').write_text(json.dumps({'rules':'full-string match only; no arbitrary source qualifier discarded','counts':dict(collections.Counter(x['rule'] for x in res)),'unknownLanguageAbbreviations':dict(unknown),'rows':res},ensure_ascii=False,indent=2)+'\n')
print('RULE_RESULTS',len(res),collections.Counter(x['rule'] for x in res),'UNKNOWN',dict(unknown))
for x in res[:35]:print(json.dumps(x,ensure_ascii=False))
if a.apply:
 path=R/'data/native-source-editorial-v212.json';d=json.loads(path.read_text());existing={(x['word'],x['sourceText']) for x in d['pairs']};added=0
 for x in res:
  if (x['word'],x['sourceText']) in existing:continue
  d['pairs'].append({k:v for k,v in x.items() if k!='index'});existing.add((x['word'],x['sourceText']));added+=1
 path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('APPLIED',added)
