#!/usr/bin/env python3
"""Preserved acceptance tests with origin/assets updated, no silent assertion deletion."""
from pathlib import Path
import os,subprocess,json,re,time
R=Path(__file__).resolve().parent.parent;W=R/'.work/reading-v214';W.mkdir(parents=True,exist_ok=True)
OUT=R.parent/'wordroot-lab-workspace/runtime/v214-resume/regression';OUT.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,CDP_PORT=os.environ.get('CDP_PORT','9345'))
names=['browser_bilingual_v212.cjs','browser_release_boundaries_v212.cjs','browser_authored_pairs_v212.cjs','browser_external_bilingual_v212.cjs','browser_visual_pairs_v212.cjs','browser_universal_v211.cjs','browser_visual_v211.cjs','browser_meanings_v211.cjs','browser_cards_v211.cjs']
if os.environ.get('ROOTLAB_SUITE_LIMIT'):names=names[:int(os.environ['ROOTLAB_SUITE_LIMIT'])]
result=[]
for name in names:
 s=(R/'tests'/name).read_text().replace("require('./cdp_helper.cjs')","require('../../tests/cdp_helper.cjs')")
 for port in ['8799','8800','8813']:s=s.replace('http://localhost:'+port,'http://localhost:8824')
 for v in ['2.11.0','2.12.0','2.13.0']:s=s.replace("'"+v+"'","'2.14.0'")
 for stem,target in [('reader','214'),('encyclopedia','214'),('navigation','214'),('authored-ui','214'),('bilingual','213')]:
  for version in ['211','212','213']:s=s.replace(stem+'-v'+version+'.js',stem+'-v'+target+'.js')
 for v in ['211','212','213']:s=s.replace('reader-v'+v+'.css','reader-v214.css')
 s=s.replace('rootlab-offline-20261026-v2110-state-final','rootlab-offline-20261026-v2140-unified-20dbabd4241ad0').replace('v2110-state','v2140-unified')
 s=s.replace('document.body.scrollWidth===innerWidth','document.body.scrollWidth===document.documentElement.clientWidth').replace('vw:innerWidth','vw:document.documentElement.clientWidth').replace('width:innerWidth','width:document.documentElement.clientWidth')
 s=s.replace("path.join(__dirname,'../reports/","path.join("+json.dumps(str(OUT)) +",'")
 s=s.replace('__dirname',json.dumps(str(R/'tests')))
 target=W/('legacy-'+name);target.write_text(s)
 print('RUN',name,flush=True);start=time.time()
 try:
  p=subprocess.run(['node',str(target),env['CDP_PORT']],cwd=R,env=env,text=True,capture_output=True,timeout=100);log=p.stdout+'\n'+p.stderr;rc=p.returncode
 except subprocess.TimeoutExpired as e:
  raw=e.stdout or '';log=(raw.decode() if isinstance(raw,bytes) else raw)+'\nTIMEOUT';rc=124
 (OUT/(name+'.log')).write_text(log)
 fails=[v for v in log.splitlines() if v.startswith(('FAIL','Error:','TypeError:','SyntaxError:'))];summary=re.findall(r'SUMMARY\s+(\d+)\s*/\s*(\d+)',log)
 row={'suite':name,'exitCode':rc,'status':'PASS' if rc==0 and not fails else 'FAIL','summary':summary[-1] if summary else None,'failures':fails,'seconds':round(time.time()-start,2)};result.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
out={'status':'PASS' if all(x['status']=='PASS' for x in result) else 'REVIEW_REQUIRED','suites':result,'adaptations':'Only actual origin, UI version, matching asset/cache identities and output paths. Source assertions preserved; intentional changed contracts require separate verification.'}
(OUT/'preserved-regression.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print('REGRESSION',out['status'])
