#!/usr/bin/env python3
"""Enable a release only after a real current gate PASS, retaining its exact receipt.
This changes publication metadata, never immutable lexical payload bytes.
"""
from pathlib import Path
import json,hashlib,os,time,re
R=Path(__file__).resolve().parent.parent;P=R/'reports'
load=lambda p:json.loads(p.read_text('utf8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def atomic(p,d):
 t=p.with_suffix(p.suffix+'.tmp');t.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8');os.replace(t,p)
gatepath=P/'release-gate.json';gate=load(gatepath);m=load(R/'data/bilingual-v212-manifest.json')
assert gate['status']=='PASS' and gate['buildId']==m['buildId'] and all(x['passed'] for x in gate['checks'])
receipt={'status':'approved','datasetVersion':'2.12.0','buildId':m['buildId'],'gateSha256':sha(gatepath),'approvedAt':time.time(),'gateChecks':len(gate['checks']),'entryCount':m['entryCount'],'semanticReviewScope':'80 benchmark words and a separately selected 120-text sample whose identified errors were repaired and rechecked. Remaining machine translations are rule-screened, explicitly labeled, and not claimed manually verified.','publication':'Authorized by the user after this acceptance gate; push and live verification are separate steps.'}
saved=P/('accepted-gate-'+m['buildId']+'.json')
if not saved.exists():saved.write_bytes(gatepath.read_bytes())
assert sha(saved)==receipt['gateSha256'],'Existing acceptance evidence differs'
atomic(R/'data/release-approval-v212.json',receipt)
for p in [R/'data/bilingual-v212-manifest.json',R/'data/bilingual-v212'/m['buildId']/'manifest.json']:
 d=load(p);assert d['buildId']==m['buildId'];d['releaseStatus']='approved';d['approvalReceipt']='./data/release-approval-v212.json';d['approvalGateSha256']=receipt['gateSha256'];atomic(p,d)
p=R/'bilingual-seeds-v212.js';s=p.read_text();match=re.search(r'window.ROOTLAB_BILINGUAL_META=(\{[^\n]+?\});',s);assert match
meta=json.loads(match[1]);assert meta['buildId']==m['buildId'];meta['releaseStatus']='approved';meta['approvalReceipt']='./data/release-approval-v212.json';s=s[:match.start(1)]+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+s[match.end(1):];p.write_text(s)
p=R/'reader-v212.js';s=p.read_text();old="node.innerHTML='<p class=\"bi-preview-notice\">本机候选版：译文与义项关联仍在复核，未发布到正式网站。 <span lang=\"en\">Local candidate — not approved for production.</span></p>'+crumb()"
new="node.innerHTML=(window.ROOTLAB_BILINGUAL_META?.releaseStatus==='approved'?'':'<p class=\"bi-preview-notice\">本机候选版：译文与义项关联仍在复核，未发布到正式网站。 <span lang=\"en\">Local candidate — not approved for production.</span></p>')+crumb()"
assert old in s or new in s
if old in s:s=s.replace(old,new,1);p.write_text(s)
p=R/'sw.js';s=p.read_text();anchor="'./credits.html'";assert anchor in s
if "'./data/release-approval-v212.json'" not in s:s=s.replace(anchor,anchor+",'./data/release-approval-v212.json'",1);p.write_text(s)
print('APPROVED',receipt['buildId'],'GATE',receipt['gateChecks'],'NO_PAYLOAD_BYTES_CHANGED')
