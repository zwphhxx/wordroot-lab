#!/usr/bin/env python3
"""Build bilingual captions only against exact inspected image-caption sources."""
from pathlib import Path
import json,hashlib,subprocess
R=Path(__file__).resolve().parent.parent
review=json.loads((R/'data/visual-caption-editorial-v212.json').read_text());snapshot=R/review['sourceSnapshot'];old=json.loads(snapshot.read_text());names={x['word'] for x in old};assert names==set(review['captions'])
current=json.loads(subprocess.check_output(['node','-e',"const vm=require('vm'),fs=require('fs'),c={window:{}};vm.createContext(c);for(const f of ['visual-seeds-v29.js','visual-extra-v210.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);console.log(JSON.stringify(c.window.ROOTLAB_VISUAL_SEEDS));"],cwd=R,text=True))
data={}
for row in old:
 word=row['word'];en=review['captions'][word]
 assert current[word]['caption']==row['caption'] and current[word]['zhTitle']==row['zhTitle'],word
 assert en.strip() and not any('\ue000'<=c<='\uf8ff' for c in en)
 data[word]={'zh':row['caption'],'en':en,'titleZh':row['zhTitle'],'titleEn':word,'reviewStatus':'assistant_linguistic_review','sourceCaptionHash':hashlib.sha256(row['caption'].encode()).hexdigest()}
script='window.ROOTLAB_VISUAL_BILINGUAL='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'
(R/'visual-caption-v212.js').write_text(script)
report={'status':'PASS','scope':'122 previously inspected local image captions only; not arbitrary fetched encyclopedia text','total':len(old),'paired':len(data),'sourceSnapshotSha256':hashlib.sha256(snapshot.read_bytes()).hexdigest(),'reviewFileSha256':hashlib.sha256((R/'data/visual-caption-editorial-v212.json').read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(script.encode()).hexdigest(),'reviewer':'assistant_linguistic_review'}
(R/'reports/visual-caption-pair-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
p=R/'encyclopedia-v212.js';s=p.read_text();oldcode="function seedMarkup(s){return'<div class=\"visual-heading\"><h3>看图理解</h3><span>'+esc(s.zhTitle)+'</span></div>'+imageMarkup({...s.image,caption:s.caption})"
newcode="function seedMarkup(s){const p=window.ROOTLAB_VISUAL_BILINGUAL?.[s.word];const verified=p?.zh===s.caption?p:null;return'<div class=\"visual-heading\"><h3>看图理解 · Picture meaning</h3><span>'+esc(s.zhTitle)+'</span></div>'+imageMarkup({...s.image,caption:s.caption,captionEn:verified?.en,alt:(s.image.alt||s.zhTitle)+(verified?' / '+verified.en:'')})"
if oldcode in s:s=s.replace(oldcode,newcode,1)
else:assert 'const verified=p?.zh===s.caption' in s
needle="(img.caption?'<p>'+esc(img.caption)+'</p>':'')"
replacement="(img.caption&&img.captionEn?'<div class=\"bi-pair visual-caption-pair\" data-bi-pair=\"true\"><p class=\"bi-zh\" lang=\"zh-CN\">'+esc(img.caption)+'</p><p class=\"bi-en\" lang=\"en\">'+esc(img.captionEn)+'</p></div>':img.caption?'<p>'+esc(img.caption)+'</p>':'')"
if needle in s:s=s.replace(needle,replacement,1)
else:assert 'visual-caption-pair' in s
s=s.replace('文字占位 · 非实物图</span>','文字占位 · 非实物图 <small lang="en">Title placeholder · Not a photograph</small></span>',1)
p.write_text(s)
p=R/'index.html';s=p.read_text();tag='<script src="./visual-caption-v212.js"></script>'
if tag not in s:
 needle='<script src="./encyclopedia-v212.js"></script>';assert needle in s;s=s.replace(needle,tag+'\n  '+needle,1);p.write_text(s)
p=R/'sw.js';s=p.read_text()
if "'./visual-caption-v212.js'" not in s:
 needle="'./encyclopedia-v212.js'";assert needle in s;s=s.replace(needle,"'./visual-caption-v212.js',"+needle,1);p.write_text(s)
print('VERIFIED_LOCAL_CAPTION_PAIRS',len(data))
