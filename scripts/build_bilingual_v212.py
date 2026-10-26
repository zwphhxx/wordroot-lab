#!/usr/bin/env python3
"""Build paired lexical material with explicit sense IDs and translation provenance.
All original senses remain in sources, and every rendered learning item has a
Chinese and English field. No model, private data or local user state is published.
"""
from pathlib import Path
import os,json,re,collections,hashlib,argparse
R=Path(__file__).resolve().parent.parent;RAW=Path(os.environ.get('ROOTLAB_RAW_DIR',str(R.parent/'wordroot-lab-deploy/.v12-work')));W=R/'.work/bilingual-v212'
a=argparse.ArgumentParser();a.add_argument('--partial',action='store_true');opt=a.parse_args()
load=lambda p:json.loads(p.read_text());compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
x=load(W/'source-records.json');records=x['records'];wn=x['synsets'];srczh=x['sourceZh'];editorial=load(R/'data/bilingual-editorial-v212.json')
zh={};en={}
for direction,cache,key in [('en_zh',zh,'en'),('zh_en',en,'zh')]:
 path=W/(direction+'-translations.jsonl')
 if path.exists():
  for line in path.read_text().splitlines():
   try:item=json.loads(line);cache[item[key]]=item
   except Exception:pass
norm=lambda v:re.sub(r'\s+',' ',str(v or '')).strip()
clean=lambda v:norm(v).replace('▁','').strip()
strippos=lambda v:re.sub(r'^(?:n|v|vt|vi|a|adj|adv|prep|pron|conj|interj|un)\.\s*','',str(v),flags=re.I).strip()
haszh=lambda v:bool(re.search('[\u3400-\u9fff]',v or ''))
# Explicit corrections apply only to this exact source string, never by broad word substitution.
corrections={e['en']:e['zh'] for e in editorial['carrier']['examples']}
corrections.update({'a bag made of paper or plastic for holding customer\'s purchases':'用纸或塑料制成、用于盛放顾客所购物品的袋子。','a man who delivers the mail':'投递信件和邮件的人。','a trailer that can be loaded with new cars for delivery to sales agencies':'可装载新车并将其运送至销售网点的拖车。','any land or sea or air vehicle designed to carry troops':'用于运送军人的陆上、海上或空中运输工具。'})
for review in load(R/'data/translation-corrections-v212.json')['pairs']:
 corrections[review['en']]=review['zh']
# Normalize lookup whitespace without claiming it changes semantic quality.
zh={norm(k):v for k,v in zh.items()};en={norm(k):v for k,v in en.items()}
missing=collections.Counter();warnings=[];excluded=[]
reviewed_exclusions=load(R/'data/source-exclusions-reviewed-v212.json')['entries'] if (R/'data/source-exclusions-reviewed-v212.json').exists() else []
excluded_sources={(r['word'],norm(text)):r for r in reviewed_exclusions for text in r['excludedEnglish']}

def zhpair(text):
 text=norm(text)
 if not text:return '', 'none'
 if text in corrections:return corrections[text],'edited'
 if text=='-':
  excluded.append({'sourceText':text,'reason':'source-placeholder-not-a-lexical-sense'});return '', 'excluded-placeholder'
 inflection=re.fullmatch(r'p\.\s*pr\.\s*&\s*vb\.\s*n\.\s*of\s+([A-Za-z]+)',text,re.I)
 if inflection:return inflection.group(1).lower()+' 的现在分词或动名词形式。','source-grammar'
 past=re.fullmatch(r'imp\.\s*&\s*p\.\s*p\.\s*of\s+([A-Za-z]+)',text,re.I)
 if past:return past.group(1).lower()+' 的过去式或过去分词形式。','source-grammar'

 item=zh.get(text)
 if item:
  value=clean(item['zh'])
  if haszh(value):return value,'machine'
  warnings.append(text)
  return '专名或术语原文：'+text+'（中文译名待核对）','untranslated'
 missing['en_zh']+=1
 return '中文译文尚未就绪','pending'
def enpair(text):
 text=norm(strippos(text))
 if re.fullmatch(r'=[A-Za-z]+',text):return 'Alternative spelling of '+text[1:]+'.','source-grammar'
 item=en.get(text)
 if item and re.search('[A-Za-z]',item['en']):return clean(item['en']),'machine-en'
 missing['zh_en']+=1;return 'English explanation not yet available.','pending'
domains={0:('普通形容','General adjective'),1:('与名词相关','Relational adjective'),2:('方式与程度','Manner / degree'),3:('一般动作','General action'),4:('行为与事件','Actions / events'),5:('动物','Animals'),6:('物品与工具','Objects / equipment'),7:('属性','Attributes'),8:('身体','Body'),9:('思维与知识','Cognition'),10:('交流','Communication'),11:('事件','Events'),12:('情绪','Emotion'),13:('食物','Food'),14:('群体与机构','Groups / institutions'),15:('地点','Location'),16:('目的与动机','Motives'),17:('自然物','Natural objects'),18:('人物与角色','People / roles'),19:('自然现象','Phenomena'),20:('植物','Plants'),21:('财产与归属','Possession'),22:('过程','Processes'),23:('数量','Quantity'),24:('关系','Relations'),25:('形状','Shape'),26:('状态','States'),27:('物质','Substances'),28:('时间','Time'),29:('身体动作','Body actions'),30:('变化','Change'),31:('思考','Thinking'),32:('表达与交流','Communication'),33:('接触','Contact'),34:('消耗与使用','Consumption'),35:('创造','Creation'),36:('感情','Emotions'),37:('移动','Motion'),38:('感知','Perception'),39:('拥有','Possession'),40:('竞争','Competition'),41:('社会行为','Social activity'),42:('状态与存在','States / existence'),43:('天气','Weather'),44:('分词形容词','Participial adjective')}
bySense={}
for sid,syn in wn.items():
 translated,kind=zhpair(syn['en']);dz,de=domains.get(syn['domain'],('其他用法','Other usage'))
 # Preserve the exact lexicographic sense; technical labels are explicit.
 if syn['en'].startswith('(genetics)'):dz,de='遗传学','Genetics'
 if syn['en'].startswith('(medicine)'):dz,de='医学','Medicine'
 labels=[v for v in syn.get('zhLabels',[]) if haszh(v)]
 bySense[sid]={'id':sid,'pos':syn['pos'],'en':syn['en'],'zh':translated,'labelZh':'；'.join(labels[:3]),'domainZh':dz,'domainEn':de,'translation':kind,'source':'WordNet 3.0','examples':[{'en':v,'zh':zhpair(v)[0],'translation':zhpair(v)[1],'senseId':sid,'kind':'开放词典例句'} for v in syn['examples']]}
recordsOut={};total=collections.Counter();generic={'entity','thing','being','object','whole','unit','physical entity','abstraction','physical object','organism'}
for word,row in records.items():
 senses=[dict(bySense[sid]) for sid in row['senseIds'] if sid in bySense];seen={norm(s['en']).casefold().rstrip('.') for s in senses}
 for i,text in enumerate(row['extraEn']):
  if (word,norm(text)) in excluded_sources:
   entry=excluded_sources[(word,norm(text))];excluded.append({'word':word,'sourceText':text,'reason':entry['reason'],'evidence':entry['evidence'],'status':'excluded_confirmed_source_error'});continue
  if text.strip()=='-':
   excluded.append({'word':word,'sourceText':text,'reason':'source-placeholder-not-a-lexical-sense'});continue
  if norm(text).casefold().rstrip('.') in seen:continue
  v,k=zhpair(text);senses.append({'id':'dict-'+str(i),'pos':next((p['pos'] for p in row.get('sourceEntries',[]) if p['en']==text),''),'en':text,'zh':v,'translation':k,'domainZh':'词典补充','domainEn':'Additional dictionary sense','source':'ECDICT'})
 if not senses:
  for i,text in enumerate(row['nativeZh']):
   v,k=enpair(text);senses.append({'id':'zh-'+str(i),'pos':re.match(r'^([a-z]+)\.',text).group(1) if re.match(r'^([a-z]+)\.',text) else '', 'en':v,'zh':(strippos(text)[1:]+' 的另一种拼写。' if re.fullmatch(r'=[A-Za-z]+',strippos(text)) else strippos(text)),'translation':k,'domainZh':'词典释义','domainEn':'Dictionary meaning','source':'ECDICT'})
 phrases=[]
 for p in row['phrases']:
  phrase=dict(p);z=strippos(p.get('zh',''));k='dictionary' if z else 'machine'
  if not z:z,k=zhpair(p['en'])
  dz,dk=zhpair(p.get('definition','')) if p.get('definition') else ('','none')
  phrase.update(zh=z,translation=k,definitionZh=dz,definitionTranslation=dk);phrases.append(phrase)
 examples=[];exampleSeen=set()
 for sense in senses:
  for e in sense.get('examples',[]):
   key=norm(e['en']).casefold()
   if key not in exampleSeen:examples.append(e);exampleSeen.add(key)
 for e in row['examples']:
  if norm(e).casefold() not in exampleSeen:
   v,k=zhpair(e);examples.append({'en':e,'zh':v,'translation':k,'senseId':'','kind':'开放词典例句'});exampleSeen.add(norm(e).casefold())
 relations=[];relationSeen=set()
 for sid in row['senseIds']:
  s=wn.get(sid)
  if not s:continue
  for rel,target in s['links']:
   dst=wn.get(target)
   if not dst:continue
   names=[v.lower() for v in dst['forms'] if v.lower() in records and v.lower()!=word and v.lower() not in generic]
   for name in names[:1]:
    if (name,sid,target) in relationSeen:continue
    relationSeen.add((name,sid,target));ts=bySense[target];ss=bySense[sid]
    relations.append({'word':name,'wordZh':ts['labelZh'] or ts['zh'],'label':'所属类别' if rel=='@' else '具体类型','labelEn':'Broader category' if rel=='@' else 'More specific type','senseId':sid,'targetSenseId':target,'contextEn':ss['en'],'contextZh':ss['zh'],'en':ts['en'],'zh':ts['zh'],'translation':ts['translation']})
   if len(relations)>=10:break
  if len(relations)>=10:break
 obj={'word':word,'nativeZh':row['nativeZh'],'senses':senses,'phrases':phrases,'examples':examples,'relations':relations}
 if word in editorial:
  fix=editorial[word];idmap={sid:s['id'] for s in fix['senses'] for sid in s.get('sourceIds',[])}
  replacement=[{**s,'translation':'edited','source':'Editorial','examples':[]} for s in fix['senses']]
  covered=set(idmap);replacement.extend(s for s in senses if s['id'] not in covered)
  for rel in relations:
   rel['senseId']=idmap.get(rel['senseId'],rel['senseId']);ss=next((s for s in replacement if s['id']==rel['senseId']),None)
   if ss:rel['contextZh']=ss['zh'];rel['contextEn']=ss['en']
  obj.update(senses=replacement,phrases=[{**p,'translation':'edited','definitionTranslation':'edited','kind':'学习搭配'} for p in fix['phrases']],examples=[{**e,'translation':'edited'} for e in fix['examples']],summaryZh=fix['summaryZh'],summaryEn=fix['summaryEn'],quiz=fix.get('quiz'),sources=fix['sources'])
 recordsOut[word]=obj;total['words']+=1;total['senses']+=len(obj['senses']);total['examples']+=len(obj['examples']);total['phrases']+=len(obj['phrases']);total['relations']+=len(relations)
 for section in ('senses','examples','phrases'):
  total['machine_'+section]+=sum(v.get('translation','').startswith('machine') for v in obj[section])
# Keep historical excerpts globally available but small; other text pairs stay in word bundles.
extras={}
for var,file in [('ROOTLAB_CURATED_ETYM','word-etymology-curated-v23.js')]:
 d=json.loads((R/file).read_text().split('window.'+var+'=',1)[1].rstrip(';\n'))
 for word,v in d.items():
  if v.get('excerpt'):z,k=zhpair(v['excerpt']);extras[word]={'en':v['excerpt'],'zh':z,'translation':k}
folder=R/'data/bilingual-v212';folder.mkdir(exist_ok=True);buckets=collections.defaultdict(dict)
for word,obj in recordsOut.items():buckets[word[:2]][word]=obj
manifest={'schema':2,'version':'2.12.0','coverage':dict(total),'translation':'Source Chinese first; explicit offline OPUS-MT reference translation for missing pairs','bundles':{}}
for prefix,items in sorted(buckets.items()):
 raw=(compact({'schema':2,'words':items})+'\n').encode();path=folder/(prefix+'.json');path.write_bytes(raw)
 manifest['bundles'][prefix]={'url':'./data/bilingual-v212/'+prefix+'.json','bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'words':len(items)}
(R/'data/bilingual-v212-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(R/'bilingual-seeds-v212.js').write_text('window.ROOTLAB_BILINGUAL_SEEDS='+compact({w:recordsOut[w] for w in ['carrier','apple','banana','successful','photograph','revolution']})+';\nwindow.ROOTLAB_BILINGUAL_HISTORY='+compact(extras)+';\n')
report={'counts':dict(total),'bundleCount':len(buckets),'missingTranslations':dict(missing),'scriptWarnings':len(set(warnings)),'warningTexts':list(dict.fromkeys(warnings))[:30],'model':'Argos OPUS-MT en_zh 1.9 and zh_en 1.9','editorialWords':list(editorial),'sources':['Princeton WordNet 3.0','Chinese Open Wordnet','ECDICT'],'partial':opt.partial,'bytes':sum(m['bytes'] for m in manifest['bundles'].values())}
(R/'data/bilingual-coverage-v212.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('BUILT',json.dumps({k:v for k,v in report.items() if k!='warningTexts'},ensure_ascii=False),flush=True)
print('CARRIER',len(recordsOut['carrier']['senses']),'senses',len(recordsOut['carrier']['examples']),'examples',flush=True)
(R/'reports/source-exclusions.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2)+'\n')
if not opt.partial:assert not sum(missing.values()),'Translation jobs are not finished; do not publish partial output.'
