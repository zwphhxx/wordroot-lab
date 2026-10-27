#!/usr/bin/env python3
"""Run preserved assertions in isolated copies. Only origin/version/asset paths adapt.
Any expectation requiring a changed UI is recorded as a failure, not suppressed.
"""
from pathlib import Path
import os,json,re,subprocess,time,hashlib
R=Path(__file__).resolve().parent.parent
T=R.parent/'wordroot-lab-workspace/runtime/v216/regression';tests=T/'tests';reports=T/'reports';tests.mkdir(parents=True,exist_ok=True);reports.mkdir(exist_ok=True)
port=os.environ.get('CDP_PORT','9406');origin=os.environ.get('ROOTLAB_TEST_ORIGIN','http://localhost:8866/')
asset={'encyclopedia-v212.js':'encyclopedia-v215.js','authored-ui-v212.js':'authored-ui-v215.js','bilingual-v212.js':'bilingual-v215.js'}
suites=['browser_shortcards_v215.cjs','browser_media_v215.cjs','browser_image_recovery_v215.cjs','browser_completion_v2141.cjs','browser_reading_v214.cjs','browser_composition_v214.cjs','browser_bilingual_v212.cjs','browser_release_boundaries_v212.cjs','browser_authored_pairs_v212.cjs','browser_external_bilingual_v212.cjs','browser_visual_pairs_v212.cjs']
env=dict(os.environ,CDP_PORT=port,ROOTLAB_TEST_ORIGIN=origin,READING_REPORT=str(reports/'reading.json'),COMPOSITION_REPORT=str(reports/'composition.json'),COMPLETION_REPORT=str(reports/'completion.json'),CARDS_REPORT=str(reports/'cards.json'),MEDIA_REPORT=str(reports/'media.json'),RECOVERY_REPORT=str(reports/'recovery.json'))
records=[]
for name in suites:
 original=(R/'tests'/name).read_text();s=original.replace("require('./cdp_helper.cjs')",'require('+json.dumps(str(R/'tests/cdp_helper.cjs'))+')')
 s=s.replace('rootlab_wikipedia_cache_v211','rootlab_wikipedia_cache_v215')
 s=s.replace('http://localhost:8800',origin.rstrip('/')).replace('2.14.1','2.16.0').replace('2.14.0','2.16.0').replace('2.12.0','2.16.0').replace('2.15.0','2.16.0')
 s=s.replace("path.join(__dirname,'fixtures/bilingual-semantic-benchmark-v212.json')",json.dumps(str(R/'tests/fixtures/bilingual-semantic-benchmark-v212.json')))
 s=s.replace('data.total===122&&data.translated===122','data.total===124&&data.translated===124').replace('All 122 exact caption sources','All 124 exact caption sources')
 for a,b in asset.items():s=s.replace(a,b)
 for name2 in ['encyclopedia-v215.js','visual-caption-v212.js']:
  s=s.replace("path.join(__dirname,'../"+name2+"')",json.dumps(str(R/name2)))
 s=s.replace("path.join(__dirname,'..',f)",'path.join('+json.dumps(str(R))+',f)')
 # Old local-only suites used fixed startup sleeps. Wait for the same app to finish loading instead.
 if name in ['browser_release_boundaries_v212.cjs','browser_authored_pairs_v212.cjs']:
  old_wait='await c.wait(900);' if name=='browser_release_boundaries_v212.cjs' else 'await c.wait(700);'
  target_word='inspect' if name=='browser_release_boundaries_v212.cjs' else 'carrier'
  ready="document.readyState==='complete'&&window.RootLabEncyclopedia&&window.RootLabAuthored&&window.RootLabReader?.plan?.loaded&&RootLabReader.context.word==="+json.dumps(target_word)
  new_wait='await (async()=>{for(let i=0;i<450;i++){try{if(await c.val('+json.dumps(ready)+'))return;}catch(_){}await c.wait(100);}throw Error("Application did not become ready before the test");})();'
  assert s.count(old_wait)==1
  s=s.replace(old_wait,new_wait)
 target=tests/name;target.write_text(s);start=time.time();print('RUN',name,flush=True)
 try:p=subprocess.run(['node',str(target)],cwd=R,env=env,text=True,capture_output=True,timeout=100);rc=p.returncode;log=p.stdout+'\n'+p.stderr
 except subprocess.TimeoutExpired as e:rc=124;log=(e.stdout.decode() if isinstance(e.stdout,bytes) else e.stdout or '')+'\nTIMEOUT'
 (T/(name+'.log')).write_text(log)
 failed=[line for line in log.splitlines() if line.startswith('FAIL') or line.startswith('Error:')];summary=re.findall(r'(?:SUMMARY|RESULT PASS)\s+(\d+)(?:\s*/\s*(\d+))?',log)
 row={'suite':name,'status':'PASS' if rc==0 and not failed else 'FAIL','exitCode':rc,'summary':summary[-1] if summary else None,'failures':failed,'seconds':round(time.time()-start,2),'originalSha256':hashlib.sha256(original.encode()).hexdigest(),'adaptedSha256':hashlib.sha256(s.encode()).hexdigest()};records.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
result={'status':'PASS' if all(x['status']=='PASS' for x in records) else 'REVIEW_REQUIRED','suites':records,'adaptation':'Environment, UI/cache version and active asset paths; two fixed local startup sleeps replaced by app-readiness checks without changing assertions; caption inventory rises from 122 to 124 with two audited additions. Source content assertions preserved.'}
(T/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print('RESULT',result['status'],flush=True)
