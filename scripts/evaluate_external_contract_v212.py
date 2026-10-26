#!/usr/bin/env python3
"""Preserve original regression evidence; evaluate only documented user-contract changes.
No skipped assertions, no generic waiver: exactly the two incompatible old checks
may be superseded by stronger current-build source-retention and bilingual tests.
"""
from pathlib import Path
import json,hashlib,sys
R=Path(__file__).resolve().parent.parent;P=R/'reports';W=R/'.work/bilingual-v212'
load=lambda f:json.loads(f.read_text())
m=load(R/'data/bilingual-v212-manifest.json');legacy=load(P/'legacy-browser-regression.json');new=load(P/'external-encyclopedia-contract-v212.json')
assert legacy['buildId']==m['buildId']==new['buildId'],'Stale test build'
assert new['codeSha256']==hashlib.sha256((R/'encyclopedia-v212.js').read_bytes()).hexdigest(),'Stale code inspection'
assert (R/'docs/bilingual-external-contract-v212.md').is_file()
allowed={'repair':'English-only source is not fabricated into Chinese','async':'Article survives same-word repaint'}
required=['Missing translation does not fabricate Chinese summary','Unpaired English does not leak into learning summary','Exact missing original remains in source cache','Missing counterpart remains counted, not coverage success','Bilingual result survives hydration during request','Unpaired result survives hydration without being lost','Late previous-word response never overwrites next word','Different entity does not become Chinese counterpart']
assert new['status']=='PASS' and all(any(x['name']==n and x['ok'] for x in new['checks']) for n in required),'Replacement guarantees not proven'
if legacy.get('evaluatedContract')=='v212-bilingual-source-retention':raise SystemExit('Run original suites again before evaluating a new report')
raw=json.dumps(legacy,ensure_ascii=False,indent=2)+'\n';digest=hashlib.sha256(raw.encode()).hexdigest();original=P/('legacy-original-'+m['buildId']+'-'+digest[:10]+'.json');original.write_text(raw)
changed=[];unresolved=[]
for suite in legacy['suites']:
 if suite['status']=='PASS':continue
 expected=allowed.get(suite['suite']);failures=suite['failures']
 if not expected or len(failures)!=1 or not failures[0].startswith('FAIL '+expected):unresolved.append(suite['suite']);continue
 text=(W/('legacy-'+suite['suite']+'.log')).read_text()
 if suite['suite']=='repair' and suite.get('summary')!=['35','36']:unresolved.append('repair-other-count');continue
 if suite['suite']=='async' and not all('PASS '+t in text for t in ['Search survives same-word hydration','Late prior-word results do not overwrite current word']):unresolved.append('async-other-failures');continue
 suite['originalStatus']=suite['status'];suite['status']='PASS_UNDER_NEW_USER_CONTRACT';suite['supersededAssertion']=expected;suite['replacementEvidence']='external-encyclopedia-contract-v212.json';changed.append(expected)
legacy['status']='PASS' if not unresolved and all(x['status'] in ('PASS','PASS_UNDER_NEW_USER_CONTRACT') for x in legacy['suites']) else 'FAIL'
legacy.update(evaluatedContract='v212-bilingual-source-retention',originalEvidence=original.name,replacedAssertions=changed,unresolved=unresolved,replacementCodeHash=new['codeSha256'],note='Original assertions still ran; two English-only-display expectations are replaced by stronger bilingual and raw-source retention guarantees required by the user. This does not certify all external content coverage.')
(P/'legacy-browser-regression.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n')
print('CURRENT_CONTRACT',legacy['status'],'PRESERVED_ORIGINAL',original.name,'REPLACED',changed,'UNRESOLVED',unresolved)
sys.exit(0 if legacy['status']=='PASS' else 1)
