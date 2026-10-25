#!/usr/bin/env python3
"""Original Chinese learning explanations. Existing dictionary is never overwritten."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parent.parent
core=json.loads((ROOT/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0]);known={r[0] for r in core}
seeds=json.loads((ROOT/'visual-seeds-v29.js').read_text().split('window.ROOTLAB_VISUAL_SEEDS=',1)[1].split(';\nwindow.ROOTLAB_VISUAL_HINTS=')[0])
extra=json.loads((ROOT/'visual-extra-v210.js').read_text().split('Object.assign(window.ROOTLAB_VISUAL_SEEDS, ',1)[1].rsplit(');',1)[0])
notes={};skipped=[]
for n,line in enumerate((ROOT/'data/meaning-editorial-v210.tsv').read_text().splitlines(),1):
 if not line.strip():continue
 fields=line.split('|');assert len(fields)==6,(n,len(fields))
 w,label,meaning,note,en,zh=fields;assert w not in notes,w
 if w not in known:skipped.append(w);continue
 assert len(meaning)>22 and re.search('[\u4e00-\u9fff]',meaning)
 seed=extra.get(w) or seeds.get(w)
 source=(seed or {}).get('source') or 'https://en.wiktionary.org/wiki/'+w+'#English'
 if (seed or {}).get('visualRole')=='context':source='https://en.wiktionary.org/wiki/'+w+'#English'
 notes[w]={'label':label,'text':meaning,'note':note,'example':[en,zh] if en and zh else [],'source':source,'sourceLabel':'词义参考','kind':'editorial','authorship':'独立撰写的中文学习释义；例句为自编'}
notes['banana']['source']='https://dictionary.cambridge.org/dictionary/english/banana'
notes['banana']['additional']=[{'label':'植物义','text':'banana 在植物学语境中也可以指香蕉植株：一类热带或亚热带的大型草本植物。下方英文释义里的 herbs 指草本植物，不是香草调料。'}]
(ROOT/'meaning-notes-v210.js').write_text('window.ROOTLAB_MEANING_NOTES='+json.dumps(notes,ensure_ascii=False,separators=(',',':'))+';\n')
# Data provenance is explicit; no assertion that every word already has a Chinese essay.
report={'dictionaryEntries':len(core),'editorialChineseExplanations':len(notes),'withOriginalBilingualExample':sum(bool(x['example']) for x in notes.values()),'skipped':skipped,'policy':'All entry types share the renderer; missing explanations are not fabricated. Existing Chinese multi-sense definitions stay intact. User-selected Chinese encyclopedia topics can supplement the matching word only.'}
(ROOT/'data/meaning-coverage-v210.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False));assert len(notes)>=130 and 'banana' in notes and 'microscopic' in notes
