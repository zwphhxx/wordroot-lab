#!/usr/bin/env python3
"""Bind the existing word-specific teaching template to reviewed bilingual components.
The template is a mnemonic analysis, not an invented chronological etymology.
"""
from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parent.parent;norm=lambda x:re.sub(r'\s+',' ',str(x or '')).strip()
p=R/'authored-pairs-v212.js';raw=p.read_text();pairs=json.loads(raw.split('window.ROOTLAB_AUTHORED_PAIRS=',1)[1].split(';\nwindow.ROOTLAB_AUTHORED_META=')[0]);meta=json.loads(raw.split('window.ROOTLAB_AUTHORED_META=',1)[1].rstrip(';\n'))
snapshot=R/'.work/bilingual-v212/runtime-curated-prose.json';rows=json.loads(snapshot.read_text())
fixed={'进入或否定':'inward, or negation, depending on the word','动作、状态或结果':'an action, state, or result','人；事物':'a person or thing','构词时的拼写／词干变体':'a spelling or stem variant in word formation','向后；再次':'back; again','充满……的':'full of; having the quality of','……的；倾向于':'having the quality or tendency of','贯穿':'through','越过':'across','动作或结果':'an action or result','向外':'outward','能够……的':'capable of; able to be','人；工具':'a person or tool','向下；离开':'down; away','分离；否定':'apart; negation','共同':'together','trans- 的拼写简化':'a reduced spelling of trans-','……的':'relating to; having a quality','向着；反对':'toward; against','使……':'to make or cause to be','在上；超过':'above; beyond','性质；状态':'a quality or state','学科；记录方式':'a field of study or a method of recording','自己':'self','地球':'earth','远':'far; at a distance','……学':'the study of','……的；名词词尾':'an adjective or noun ending','一起':'together','使……化':'to make or become','向着':'toward','主义；现象':'a doctrine, system, or phenomenon','向内':'inward','人或形容词后缀':'a noun or adjective ending','在下；不足':'under; below normal','从事……的人':'a person engaged in','二；双':'two; double','进行或名词形式':'an -ing verb or noun form','超出':'beyond','构词时的拼写／词干变体':'a spelling or stem variant in word formation'}
for zh,en in fixed.items():pairs.setdefault(zh,{'en':en,'status':'editorial_component_template'})
roles={'前缀':'prefix','词根':'root','核心词根':'root','后缀':'suffix','构词部分':'component'}
added=[]
for row in rows:
 story=norm(row['story'])
 if not story or story in pairs:continue
 assert '可以按' in story and '从组成部分理解' in story, (row['word'],story)
 meaning=pairs.get(norm(row['meaning']),{}).get('en');assert meaning,(row['word'],row['meaning'])
 parts=[]
 for item in row['pieces']:
  en=pairs.get(norm(item['meaning']),{}).get('en');assert en,(row['word'],item)
  role=roles.get(item['role'],'component');parts.append(role+' '+item['part']+' ('+en.rstrip('.')+')')
 en='A memory breakdown of '+row['word']+' ('+meaning.rstrip('.')+') is '+' + '.join(x['part'] for x in row['pieces'])+': '+', '.join(parts)+'. Use the components to understand the meaning and use of this word.'
 pairs[story]={'en':en,'status':'editorial_component_template'};added.append({'word':row['word'],'zhHash':hashlib.sha256(story.encode()).hexdigest(),'en':en})
 for x in row['relations']:
  reason=norm(x.get('reason'))
  if not reason or reason in pairs:continue
  m=re.fullmatch(r'同见于 (.+) 词根资料，比较意思怎样分开。',reason)
  if m:pairs[reason]={'en':'Both appear in the '+m[1]+' root references; compare how their meanings differ.','status':'editorial_relation_template'}
  m=re.fullmatch(r'公开词源记录中的组成词，比较它与 (.+) 的词性和用法。',reason)
  if m:pairs[reason]={'en':'A component recorded in the etymological source; compare its part of speech and use with '+m[1]+'.','status':'editorial_relation_template'}
meta['count']=len(pairs);meta['runtimeTemplateSnapshotHash']=hashlib.sha256(snapshot.read_bytes()).hexdigest();meta['runtimeTemplates']=len(added)
p.write_text('window.ROOTLAB_AUTHORED_PAIRS='+json.dumps(pairs,ensure_ascii=False,separators=(',',':'))+';\nwindow.ROOTLAB_AUTHORED_META='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n')
(R/'reports/authored-runtime-template-review-v212.json').write_text(json.dumps({'count':len(added),'sourceHash':meta['runtimeTemplateSnapshotHash'],'method':'Exact existing Chinese template and reviewed English component meanings; this records no new historical dates or claims.','reviewer':'assistant_linguistic_review','templates':added},ensure_ascii=False,indent=2)+'\n')
print('PAIRED_RUNTIME_WORD_TEMPLATES',len(added),'TOTAL_AUTHORED_PAIRS',len(pairs))
