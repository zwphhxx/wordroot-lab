#!/usr/bin/env python3
"""Self-contained distribution integrity tests, without external dependencies."""
from pathlib import Path
import json,re,hashlib
ROOT=Path(__file__).resolve().parent.parent
html=(ROOT/'index.html').read_text()
core=json.loads(re.search(r'window\.ROOTLAB_DATA=(\[.*?\]);</script>',html,re.S).group(1))
lex=json.loads(re.search(r'window\.ROOTLAB_LEXICON=(\[.*\]);', (ROOT/'lexicon-v12.js').read_text(),re.S).group(1))
prov=json.loads(re.search(r'window\.ROOTLAB_ROOT_PROVENANCE=(\{.*\});', (ROOT/'roots-v12.js').read_text(),re.S).group(1))
lexmap={r[0]:r for r in lex}
words={w['word'].lower():w for r in core for g in r['groups'] for w in g['entries']}
checks=[
 ('curated roots',len(core)==37),
 ('curated words',len(words)==335),
 ('curated root associations',sum(len(g['entries']) for r in core for g in r['groups'])==343),
 ('offline dictionary size',len(lex)==13024),
 ('no duplicate dictionary keys',len(lexmap)==len(lex)),
 ('reference roots',len(prov['referenceRoots'])==41),
 ('reference coverage',len(prov['core'])==37 and sum(z['status']=='reference' for z in prov['core'].values())==36),
 ('pronunciation availability',sum(bool(r[1]) for r in lex)==12266),
 ('reference exam labels',sum(bool(r[3]) for r in lex)==6608),
 ('uncorroborated curated words',set(words)-set(lexmap)=={'microplastic','terraforming'}),
 ('license included',(ROOT/'THIRD_PARTY_NOTICES.md').exists() and 'MIT License' in (ROOT/'THIRD_PARTY_NOTICES.md').read_text()),
 ('script references','lexicon-v12.js' in html and 'roots-v12.js' in html),
 ('offline cache contents','lexicon-v12.js' in (ROOT/'sw.js').read_text() and 'roots-v12.js' in (ROOT/'sw.js').read_text()),
 ('cache bumped','rootlab-offline-20261025-v12' in (ROOT/'sw.js').read_text()),
 ('curated labels source-marked',all('levels' in w and w.get('labelSource') in ('ECDICT','未核实') for r in core for g in r['groups'] for w in g['entries'])),
 ('unrestricted',not any(t in html for t in ['开通会员','会员精讲','data-action="open-member"'])),
 ('old storage compatibility','rootlab_standalone_demo_v3' in html),
 ('data format',all(len(row)==6 and re.fullmatch(r'[a-z]{2,25}',row[0]) and re.search(r'[\u3400-\u9fff]',row[2]) for row in lex)),
 ('unique reference roots',len(set(r['id'] for r in prov['referenceRoots']))==41),
 ('source labels','ECDICT' in html and '参考' in html),
 ('all site assets',all((ROOT/asset).is_file() for asset in ['index.html','lexicon-v12.js','roots-v12.js','manifest.webmanifest','sw.js','icon.svg','icon-192.png','icon-512.png','apple-touch-icon.png']))
]
for name,success in checks:
 print(('PASS' if success else 'FAIL')+' '+name)
assert all(valid for _,valid in checks)
print('PASS',len(checks),'distribution checks')
print('roots curated',len(core),'reference',len(prov['referenceRoots']),'offline',len(lex))
print('HTML sha256',hashlib.sha256((ROOT/'index.html').read_bytes()).hexdigest())
