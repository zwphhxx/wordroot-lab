#!/usr/bin/env python3
"""Re-run preserved functionality tests against the UI-only release.
Only origin, shell version, asset paths and output paths are adapted. Lexical
build stays v212 and original assertions remain untouched.
"""
from pathlib import Path
import os,subprocess,json,re,time
R=Path(__file__).resolve().parent.parent
W=R/'.work/ui-v213';W.mkdir(parents=True,exist_ok=True)
OUT=R.parent/'wordroot-lab-workspace/runtime/ui-v213';OUT.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,CDP_PORT=os.environ.get('CDP_PORT','9313'))
suites=['browser_bilingual_v212.cjs','browser_release_boundaries_v212.cjs','browser_authored_pairs_v212.cjs','browser_external_bilingual_v212.cjs','browser_visual_pairs_v212.cjs','browser_universal_v211.cjs','browser_visual_v211.cjs','browser_meanings_v211.cjs','browser_cards_v211.cjs']
results=[]
for name in suites:
 s=(R/'tests'/name).read_text()
 s=s.replace("require('./cdp_helper.cjs')","require('../../tests/cdp_helper.cjs')")
 s=s.replace('http://localhost:8800','http://localhost:8813').replace('http://localhost:8799','http://localhost:8813')
 s=s.replace("'2.12.0'","'2.13.0'").replace("'2.11.0'","'2.13.0'")
 for stem in ['reader','bilingual','encyclopedia','navigation','authored-ui']:
  for version in ['211','212']:
   s=s.replace(stem+'-v'+version+'.js',stem+'-v213.js')
 s=s.replace('reader-v211.css','reader-v213.css').replace('reader-v212.css','reader-v213.css')
 s=s.replace('rootlab-offline-20261026-v2110-state-final','rootlab-offline-20261026-v2130-reading-20dbabd4241ad0').replace('v2110-state','v2130-reading')
 s=s.replace('document.body.scrollWidth===innerWidth','document.body.scrollWidth===document.documentElement.clientWidth')
 s=s.replace('vw:innerWidth','vw:document.documentElement.clientWidth').replace('width:innerWidth','width:document.documentElement.clientWidth')
 # Preserve baseline reports and write this release's evidence outside the production tree.
 s=s.replace("path.join(__dirname,'../reports/","path.join("+json.dumps(str(OUT)) +",'")
 s=s.replace("'../reports/","'../../reports/")
 # Other /tmp test screenshots are permitted but not committed.
 s=s.replace('__dirname',json.dumps(str(R/'tests')))
 target=W/name;target.write_text(s)
 print('RUN',name,flush=True);started=time.time()
 try:
  p=subprocess.run(['node',str(target),env['CDP_PORT']],cwd=R,env=env,text=True,capture_output=True,timeout=110)
  log=p.stdout+'\n'+p.stderr;rc=p.returncode
 except subprocess.TimeoutExpired as e:
  raw=e.stdout or '';log=(raw.decode() if isinstance(raw,bytes) else raw)+'\nTIMEOUT';rc=124
 (OUT/(name+'.log')).write_text(log)
 failures=[x for x in log.splitlines() if x.startswith(('FAIL','Error:','TypeError:','SyntaxError:'))]
 summary=re.findall(r'SUMMARY\s+(\d+)\s*/\s*(\d+)',log)
 passed=rc==0 and not failures
 result={'suite':name,'status':'PASS' if passed else 'FAIL','exitCode':rc,'summary':summary[-1] if summary else None,'failures':failures,'seconds':round(time.time()-started,2)};results.append(result);print(json.dumps(result,ensure_ascii=False),flush=True)
result={'status':'PASS' if all(x['status']=='PASS' for x in results) else 'REVIEW_REQUIRED','uiVersion':'2.13.0','lexicalBuild':'v212-20dbabd4241ad0','suites':results,'scope':'Preserved assertions with environment and UI-shell version adapted only. Changed UX contracts are reported separately, not silently removed.'}
(OUT/'preserved-regression.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('REGRESSION',result['status'])
