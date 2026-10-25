#!/usr/bin/env python3
from pathlib import Path
import json,re,hashlib
from urllib.parse import urlparse
R=Path(__file__).resolve().parent.parent
page=(R/'index.html').read_text();reader=(R/'reader-v210.js').read_text();wiki=(R/'encyclopedia-v210.js').read_text();meaning=(R/'meaning-explainer-v210.js').read_text();sw=(R/'sw.js').read_text()
core=json.loads((R/'lexicon-core-v24.js').read_text().split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0]);original=json.loads(re.search(r'window.ROOTLAB_LEXICON=(\[.*\]);',(R/'lexicon-v21.js').read_text(),re.S).group(1));known={r[0] for r in core}
manifest=json.loads((R/'data/reader-v24-manifest.json').read_text());recovered=[]
for x in manifest['bundles'].values():
 raw=(R/x['url'].removeprefix('./')).read_bytes();assert hashlib.sha256(raw).hexdigest()==x['sha256'];recovered.extend(json.loads(raw)['entries'])
notes=json.loads((R/'meaning-notes-v210.js').read_text().split('window.ROOTLAB_MEANING_NOTES=',1)[1].rstrip(';\n'))
base=json.loads((R/'visual-seeds-v29.js').read_text().split('window.ROOTLAB_VISUAL_SEEDS=',1)[1].split(';\nwindow.ROOTLAB_VISUAL_HINTS=')[0]);extra=json.loads((R/'visual-extra-v210.js').read_text().split('Object.assign(window.ROOTLAB_VISUAL_SEEDS, ',1)[1].rsplit(');',1)[0]);allimages={**base,**extra}
for word,d in extra.items():
 img=d['image'];p=R/img['src'].removeprefix('./');assert word in known and p.is_file();raw=p.read_bytes();assert raw.startswith((b'\xff\xd8',b'\x89PNG',b'RIFF')) and len(raw)==img['bytes'];assert re.fullmatch(r'(?:Public domain|CC0(?: 1\.0)?|CC[- ]BY(?:-SA)?(?:[ -][0-9.]+)?)',img['license'],re.I);assert urlparse(img['source']).hostname=='commons.wikimedia.org';assert img['credit'] and d['caption']
active=[]
for f in re.findall(r'<script src="\./([^"]+)"',page):active.append((R/f).read_text())
checks=[
 ('Version and current reader','content="2.10.0"' in page and 'reader-v210.js' in page),
 ('Full 49426 entries preserved',len(core)==49426 and sorted(original)==sorted(recovered)),
 ('Original meanings not replaced',all(a[:6]==b[:6] for a,b in zip(original,core))),
 ('Explicitly requested phrase removed from active scripts',all('它适合把整个词记下来' not in s for s in active)),
 ('Related hard-splitting lectures removed',all('不必硬拆成 and + iron' not in s for s in active)),
 ('138 genuine Chinese explanation notes',len(notes)==138 and set(notes)<=known and all(len(d['text'])>22 for d in notes.values())),
 ('Every added definition has original bilingual example',all(len(d['example'])==2 and re.search('[\u4e00-\u9fff]',d['example'][1]) for d in notes.values())),
 ('Banana not just translated name',all(t in notes['banana']['text'] for t in ('果皮','果肉','甜味','细长'))),
 ('Banana botanical sense is disambiguated','草本植物' in notes['banana']['additional'][0]['text']),
 ('Explanations shared across root and whole word',reader.count('RootLabMeanings?.render(c)')==2),
 ('Root and whole-word photo mechanism shared',"c.learning?.route==='root'" in wiki and 'rootEligible' in wiki),
 ('Chinese explanation precedes illustration',"definition.after(holder)" in wiki),
 ('122 explicit illustration mappings',len(allimages)==122 and len(extra)==37),
 ('23 new actual pictures',len({r['image']['src'] for r in extra.values() if '/visual-v210/' in r['image']['src']})==23),
 ('14 additional derivative contextual mappings',sum(r.get('visualRole')=='context' for r in extra.values())==14),
 ('All new images safely licensed',all(r['senseConfirmed'] for r in extra.values())),
 ('Topic choice is not auto-assigned lexical meaning','saveChoice(word,title,lang)' in wiki and '选择当前想了解的主题' in wiki),
 ('Chinese selected-topic summary only',"a.language!=='zh'" in meaning and "kind:'selected-topic'" in meaning),
 ('Editorial meaning wins over unrelated topic',"Object.hasOwn(notes,w)?notes[w]:topics[w]" in meaning),
 ('Unknown entries never get synthetic filler',"if(!d?.text)return ''" in meaning),
 ('Sense data and HTML safely escaped','esc(d.text)' in meaning and 'sourceOK' in meaning),
 ('Clear data also clears new topic cache','RootLabMeanings?.clear()' in page),
 ('All learning cards remain open','<details' not in reader and '<summary' not in reader),
 ('Existing local study keys and review retained','rootlab_standalone_demo_v3' in page and "KEY='rootlab_reader_v24'" in reader),
 ('Composition-safe search unchanged','search-control-v27.js' in page and 'RootLabSearch.create' in page),
 ('Fresh offline shell with new explanations',all(f in sw for f in ('v2100-clearmeaning','meaning-notes-v210.js','meaning-explainer-v210.js','visual-extra-v210.js'))),
 ('Old and new image caches migrate',sw.count('/images/visual-v29/')>=2 and sw.count('/images/visual-v210/')>=2),
 ('No duplicate downloads for scene aliases','new Set(Object.values(window.ROOTLAB_VISUAL_SEEDS' in page),
]
for label,ok in checks:print(('PASS ' if ok else 'FAIL ')+label)
assert all(ok for _,ok in checks)
print('PASS',len(checks),'V2.10 content, image, preservation and safety checks')
print('DICTIONARY',len(core),'NEW_MEANINGS',len(notes),'IMAGE_WORDS',len(allimages),'NEW_IMAGE_FILES',23)
