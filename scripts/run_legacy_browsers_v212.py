#!/usr/bin/env python3
"""Run preserved browser regressions in the isolated staging origin.
Changes only environment/version expectations and corrects the viewport unit
for non-overlay native scrollbars. Content assertions remain unchanged.
"""
from pathlib import Path
import json,subprocess,os,re,time
R=Path(__file__).resolve().parent.parent;W=R/'.work/bilingual-v212';m=json.loads((R/'data/bilingual-v212-manifest.json').read_text());build=m['buildId'];cache='rootlab-offline-20261026-v2120-'+build[5:]
port=os.environ.get('CDP_PORT','9280');results=[];env=dict(os.environ,CDP_PORT=port)
for name in ('cards','universal','visual','meanings','repair','async'):
 original=R/'tests'/('browser_'+name+'_v211.cjs')
 if not original.exists():continue
 script=original.read_text()
 script=script.replace("require('./cdp_helper.cjs')","require('../../tests/cdp_helper.cjs')")
 script=script.replace('http://localhost:8799','http://localhost:8800')
 script=script.replace('rootlab-offline-20261026-v2110-state-final',cache).replace('v2110-state',cache.removeprefix('rootlab-offline-20261026-'))
 script=script.replace("'2.11.0'","'2.12.0'")
 for a,b in [('reader-v211.js','reader-v212.js'),('reader-v211.css','reader-v212.css'),('encyclopedia-v211.js','encyclopedia-v212.js'),('navigation-v211.js','navigation-v212.js')]:script=script.replace(a,b)
 script=script.replace('document.body.scrollWidth===innerWidth','document.body.scrollWidth===document.documentElement.clientWidth')
 script=script.replace('vw:innerWidth','vw:document.documentElement.clientWidth').replace('width:innerWidth','width:document.documentElement.clientWidth')
 script=script.replace('Math.abs(r.center-width/2)','Math.abs(r.center-r.vw/2)')
 script=script.replace('/tmp/rootlab-',str(R.parent/'wordroot-lab-workspace/runtime/rootlab-'))
 target=W/('legacy-'+name+'.cjs');target.write_text(script)
 print('RUN_LEGACY',name,flush=True);start=time.time()
 try:
  p=subprocess.run(['node',str(target),port],cwd=R,env=env,text=True,capture_output=True,timeout=90)
  log=p.stdout+'\n'+p.stderr;rc=p.returncode
 except subprocess.TimeoutExpired as e:
  log=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else e.stdout or '';log+='\nTIMEOUT';rc=124
 (W/('legacy-'+name+'.log')).write_text(log)
 summary=re.findall(r'SUMMARY\s+(\d+)\s*/\s*(\d+)',log)
 failures=[line for line in log.splitlines() if line.startswith('FAIL') or line.startswith('Error:')]
 # The async suite throws on failure and prints three explicit PASS messages;
 # it never used a SUMMARY line. Count its actual original assertions, not silence.
 async_names=['Search survives same-word hydration','Article survives same-word repaint','Late prior-word results do not overwrite current word']
 async_evidence=name=='async' and all(('PASS '+label) in log for label in async_names)
 passed=rc==0 and not failures and (bool(summary) or async_evidence)
 record={'suite':name,'exitCode':rc,'status':'PASS' if passed else 'FAIL','summary':summary[-1] if summary else ['3','3'] if async_evidence else None,'failures':failures,'seconds':round(time.time()-start,2)};results.append(record)
 print(json.dumps(record,ensure_ascii=False),flush=True)
result={'buildId':build,'status':'PASS' if results and all(r['status']=='PASS' for r in results) else 'FAIL','suites':results,'adaptations':'Only isolated origin, release asset/cache identity and native-scrollbar viewport units. Original content assertions retained.'}
(R/'reports/legacy-browser-regression.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('LEGACY_RESULT',result['status'],flush=True)
