#!/usr/bin/env python3
from pathlib import Path
import json,re
root=Path(__file__).resolve().parent.parent
s=(root/'index.html').read_text(encoding='utf8')
lex=json.loads(re.search(r'window.ROOTLAB_LEXICON=(\[.*\]);',(root/'lexicon-v21.js').read_text(encoding='utf8'),re.S).group(1))
meta=json.loads(re.search(r'window.ROOTLAB_ROOT_PROVENANCE=(\{.*\});',(root/'roots-v21.js').read_text(encoding='utf8'),re.S).group(1))
wn=json.loads(re.search(r'window.ROOTLAB_WORDNET=(\[.*\]);',(root/'wordnet-v21.js').read_text(encoding='utf8'),re.S).group(1))
words={r[0]:r for r in lex}
checks=[
 ('index and scripts',all(k in s for k in ('lexicon-v21.js','roots-v21.js','wordnet-v21.js','memory-engine-v2.js'))),
 ('49k dictionary',len(lex)==49426 and len(words)==len(lex)),
 ('dictionary field structure',all(len(row)==8 and isinstance(row[2],list) and isinstance(row[6],list) for row in lex)),
 ('available English examples or synonyms',len(wn)==19323),
 ('root reference expansion',len(meta['referenceRoots'])==606),
 ('root category count',meta['rootKinds']=={'root':419,'suffix':78,'prefix':109}),
 ('attested destructive and antecedent',all(any(w in z['examples'] for z in meta['referenceRoots']) for w in ['destructive','antecedent'])),
 ('word definitions and morph data',bool(words['destructive'][6]) and bool(words['antecedent'][7])),
 ('no member prompt',not any(k in s for k in ('开通会员','会员解锁','data-action="open-member"'))),
 ('morphology analysis','function morphologyMarkup' in s and 'function familyMarkup' in s),
 ('root catalog pagination','catalog-more' in s and 'catalogPage*48' in s),
 ('learning record compatibility','rootlab_standalone_demo_v3' in s and 'rootlab_learning_backup_v1' in s),
 ('copyright attribution','Princeton WordNet' in (root/'credits.html').read_text() and 'WordNet 3.0 Copyright 2006' in (root/'credits.html').read_text()),
 ('MIT notice','MIT License' in (root/'THIRD_PARTY_NOTICES.md').read_text()),
 ('no source repository link in consumer pages','href="https://github.com' not in s),
 ('PWA refreshed','rootlab-offline-20261025-v230-etymology' in (root/'sw.js').read_text()),
 ('offline assets',all(x in (root/'sw.js').read_text() for x in ['lexicon-v21.js','roots-v21.js','wordnet-v21.js'])),
 ('files present',all((root/n).is_file() for n in ['index.html','lexicon-v21.js','roots-v21.js','wordnet-v21.js','memory-engine-v2.js','sw.js','manifest.webmanifest','credits.html']))
]
for label,p in checks:print(('PASS ' if p else 'FAIL ')+label)
assert all(p for _,p in checks)
print('PASS',len(checks),'distribution checks')
print('word entries',len(lex),'root topics',len(meta['referenceRoots'])+37,'example/synonym enriched',len(wn))
