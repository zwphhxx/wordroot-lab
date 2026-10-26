#!/usr/bin/env python3
"""Bind local preview shell and service worker to the actual immutable data build.
Does not approve the release, publish, or modify any learner storage.
"""
from pathlib import Path
import json,re
R=Path(__file__).resolve().parent.parent
manifest=json.loads((R/'data/bilingual-v212-manifest.json').read_text())
assert manifest['schemaVersion']==3
build=manifest['buildId'];assert re.fullmatch(r'v212-[0-9a-f]{14}',build)
cache='rootlab-offline-20261026-v2120-'+build.removeprefix('v212-')
p=R/'sw.js';s=p.read_text();s=re.sub(r"const CACHE_NAME='[^']+';","const CACHE_NAME='"+cache+"';",s,count=1)
s=re.sub(r"'\./data/bilingual-v212/v212-[a-f0-9]{14}/manifest\.json'","'./data/bilingual-v212/"+build+"/manifest.json'",s)
if "'./dictionary-repository-v212.js'" not in s:s=s.replace("'./bilingual-v212.js'","'./dictionary-repository-v212.js','./bilingual-v212.js'",1)
p.write_text(s)
p=R/'index.html';s=p.read_text();s=re.sub(r"caches\.open\('rootlab-offline-20261026-v2120-[^']+'\)","caches.open('"+cache+"')",s);p.write_text(s)
# A release receipt must always identify which build was actually inspected.
assert (R/'data/bilingual-v212'/build/'manifest.json').exists()
print('SHELL_BUILD',build,'CACHE',cache)
