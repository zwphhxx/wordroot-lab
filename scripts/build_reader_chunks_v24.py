#!/usr/bin/env python3
"""Split existing licensed data into a fast lookup core and on-demand detail bundles.
Canonical source files are retained unchanged. No definition or example is lost.
"""
from pathlib import Path
import json,re,collections,hashlib
ROOT=Path(__file__).resolve().parent.parent
load=lambda filename,variable:json.loads(re.search(r'window\.'+variable+r'=(\[.*\]);',(ROOT/filename).read_text('utf8'),re.S).group(1))
lex=load('lexicon-v21.js','ROOTLAB_LEXICON');examples=load('wordnet-v21.js','ROOTLAB_WORDNET')
html=(ROOT/'index.html').read_text('utf8')
roots=json.loads(re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',html,re.S).group(1))
seed={w['word'].lower() for r in roots for g in r['groups'] for w in g['entries']}
seed.update(['resilient','resilience','asset','equity','underwrite','mortgage','company','capital','antecedent','destructive','ephemeral'])
core=[row if row[0] in seed else row[:6]+[[], ''] for row in lex]
seed_examples=[row for row in examples if row[0] in seed]
compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'))
(ROOT/'lexicon-core-v24.js').write_text('window.ROOTLAB_LEXICON='+compact(core)+';\nwindow.ROOTLAB_WORDNET='+compact(seed_examples)+';\nwindow.ROOTLAB_DETAIL_SEEDS='+compact(sorted(seed))+';\n',encoding='utf8')
by=collections.defaultdict(lambda:{'entries':[],'examples':[]})
for row in lex:by[row[0][0]]['entries'].append(row)
for row in examples:by[row[0][0]]['examples'].append(row)
folder=ROOT/'data/reader-v24';folder.mkdir(parents=True,exist_ok=True)
manifest={}
for letter,payload in sorted(by.items()):
 p=folder/(letter+'.json');payload['schema']=1;payload['letter']=letter;p.write_text(compact(payload),encoding='utf8')
 manifest[letter]={'url':'./data/reader-v24/'+letter+'.json','bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'words':len(payload['entries'])}
meta={'schema':1,'words':len(lex),'seedWords':len(seed),'bundles':manifest,'coreBytes':(ROOT/'lexicon-core-v24.js').stat().st_size,'oldInitialDataBytes':(ROOT/'lexicon-v21.js').stat().st_size+(ROOT/'wordnet-v21.js').stat().st_size}
(ROOT/'data/reader-v24-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
assert len(core)==49426
assert all(a[:6]==b[:6] for a,b in zip(lex,core))
assert sum(x['words'] for x in manifest.values())==len(lex)
print('WORDS',len(lex),'CORE_BYTES',meta['coreBytes'],'PREVIOUS_TWO_ASSETS_BYTES',meta['oldInitialDataBytes'],'BUNDLES',len(manifest),'ALL_DETAIL_BYTES',sum(x['bytes'] for x in manifest.values()))
print('REDUCTION_UNCOMPRESSED',round((1-meta['coreBytes']/meta['oldInitialDataBytes'])*100,1),'%')
