#!/usr/bin/env python3
"""Small, explicit word->sense->licensed visual seed library plus concrete-word routing.
No arbitrary first search hit is treated as a lexical sense. Copies Commons free images
locally; source, author and license are stored per file. Existing lexical data untouched.
"""
from pathlib import Path
import json,re,urllib.parse,subprocess,hashlib,time,concurrent.futures,zipfile,html
ROOT=Path(__file__).resolve().parent.parent
WORK=ROOT/'.v12-work/visual-v29';WORK.mkdir(exist_ok=True,parents=True)
OUT=ROOT/'images/visual-v29';OUT.mkdir(exist_ok=True,parents=True)
def request(url,kind='json'):
    key=hashlib.sha256(url.encode()).hexdigest();dest=WORK/(key+('.json' if kind=='json' else '.img'))
    if dest.exists() and dest.stat().st_size>20:
        try:return json.loads(dest.read_text()) if kind=='json' else dest.read_bytes()
        except Exception:pass
    for attempt in range(3):
        res=subprocess.run(['curl','-fLsS','--connect-timeout','8','--max-time','22','-A','RootLab/2.9 (open dictionary learning; attributed Wikimedia content)',url],capture_output=True)
        if res.returncode==0 and res.stdout:
            try:
                value=json.loads(res.stdout) if kind=='json' else res.stdout
                if kind=='json' and 'error' in value:raise ValueError(str(value['error']))
                dest.write_bytes(res.stdout);return value
            except Exception:pass
        time.sleep(.8+attempt)
    raise RuntimeError('Failed '+url[:150])
def api(host,**params):return request('https://'+host+'/w/api.php?'+urllib.parse.urlencode({'action':'query','format':'json','formatversion':2,'origin':'*',**params}))
def plain(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',str(s or '')))).strip()
rows=[line.strip().split('|') for line in (ROOT/'scripts/visual-topics-v29.tsv').read_text().splitlines() if line.strip()]
source=(ROOT/'lexicon-core-v24.js').read_text();core=json.loads(source.split('window.ROOTLAB_LEXICON=',1)[1].split(';\nwindow.ROOTLAB_WORDNET=')[0]);known={x[0] for x in core}
rows=[r for r in rows if r[0] in known]
page_map={}
for at in range(0,len(rows),15):
    batch=rows[at:at+15];data=api('en.wikipedia.org',titles='|'.join(r[1] for r in batch),prop='pageimages|pageprops|info',piprop='name',pilicense='free',inprop='url',redirects=1)
    aliases={x['from']:x['to'] for key in ['normalized','redirects'] for x in data.get('query',{}).get(key,[])}
    pages={p['title']:p for p in data.get('query',{}).get('pages',[])}
    for word,title,zh,caption in batch:
        t=title
        for _ in range(5):
            if t not in aliases:break
            t=aliases[t]
        p=pages.get(t)
        if p and not p.get('missing') and 'disambiguation' not in p.get('pageprops',{}):page_map[word]=p
    print('PAGES',min(at+15,len(rows)),'/',len(rows),flush=True)
# Batch metadata requests reduce request count and avoid a separate API hit per image.
if 'apple' in page_map:page_map['apple']['pageimage']='Apples_in_basket_2018_G2.jpg'
commons_meta={}
files=list(dict.fromkeys(p.get('pageimage') for p in page_map.values() if p.get('pageimage')))
for at in range(0,len(files),10):
    batch=files[at:at+10]
    try:
        data=api('commons.wikimedia.org',titles='|'.join('File:'+name for name in batch),prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=500,redirects=1)
        for p in data.get('query',{}).get('pages',[]):commons_meta[p.get('title','').replace('_',' ')]=p
        print('IMAGE LICENSES',min(at+10,len(files)),'/',len(files),flush=True)
    except Exception as e:print('BATCH WARNING',str(e)[:90],flush=True)
    time.sleep(.3)
def build(row):
    word,title,zh,caption=row;p=page_map.get(word)
    if not p or not p.get('pageimage'):return word,None,'no-free-pageimage'
    try:
        page=commons_meta.get(('File:'+p['pageimage']).replace('_',' '))
        if not page:
            meta=api('commons.wikimedia.org',titles='File:'+p['pageimage'],prop='imageinfo',iiprop='url|extmetadata',iiurlwidth=500);page=meta.get('query',{}).get('pages',[{}])[0]
        i=page.get('imageinfo',[{}])[0];m=i.get('extmetadata',{})
        license=plain(m.get('LicenseShortName',{}).get('value') or m.get('UsageTerms',{}).get('value'))
        if not re.fullmatch(r'(?:Public domain|CC0(?: 1\.0)?|CC[- ]BY(?:-SA)?(?:[ -][0-9.]+)?)',license,re.I):return word,None,'unsupported-license:'+license
        url=i.get('thumburl') or i.get('url');host=urllib.parse.urlparse(url or '').hostname
        if host not in ('thumb.wikimedia.org','upload.wikimedia.org'):return word,None,'invalid-image-host'
        raw=request(url,'image')
        ext='.png' if raw.startswith(b'\x89PNG') else '.jpg' if raw.startswith(b'\xff\xd8') else '.webp' if raw.startswith(b'RIFF') else None
        if not ext:return word,None,'unsupported-image-format'
        target=OUT/(word+ext);target.write_bytes(raw)
        credit=plain(m.get('Artist',{}).get('value') or m.get('Credit',{}).get('value') or 'Wikimedia Commons')[:300]
        record={'word':word,'title':p['title'],'zhTitle':zh,'caption':caption,'source':p.get('fullurl') or 'https://en.wikipedia.org/wiki/'+urllib.parse.quote(p['title']),
        'senseConfirmed':True,'image':{'src':'./images/visual-v29/'+target.name,'alt':zh+'：'+caption,'source':i.get('descriptionurl'),'credit':credit,'license':license,'licenseUrl':m.get('LicenseUrl',{}).get('value',''),'remote':url,'bytes':len(raw),'width':i.get('thumbwidth'), 'height':i.get('thumbheight')},'status':'editorial-sense-licensed-image'}
        return word,record,'ok'
    except Exception as e:return word,None,str(e)[:200]
seeds={};failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for n,(w,value,status) in enumerate(pool.map(build,rows),1):
        if value:seeds[w]=value
        else:failures.append([w,status])
        if n%10==0 or n==len(rows):print('IMAGES',n,'/',len(rows),'OK',len(seeds),'FAIL',len(failures),flush=True)
# Automatic candidate previews are allowed only for physical senses in the available
# WordNet data. This is an illustration eligibility hint, NEVER sense proof.
physical={5,6,13,15,17,19,20};hints={}
with zipfile.ZipFile(ROOT/'.v12-work/wordnet30.zip') as z:
    for line in z.read('wordnet/data.noun').decode('utf8',errors='replace').splitlines():
        if not re.match(r'^\d{8} ',line) or ' | ' not in line:continue
        a,g=line.split(' | ',1);t=a.split()
        try:category=int(t[1]);count=int(t[3],16)
        except Exception:continue
        if category not in physical:continue
        for j in range(count):
            w=t[4+j*2].lower()
            if w in known:hints[w]=category
# Sensitive/polysemous anatomical, political, medical and weapon topics never auto-request imagery.
blocked=re.compile(r'(?:sex|porn|nude|breast|penis|vagina|genital|blood|corpse|cancer|suicide|weapon|gun|rifle|bomb|kill|assault)',re.I)
hints={w:c for w,c in hints.items() if not blocked.search(w)}
(ROOT/'visual-seeds-v29.js').write_text('window.ROOTLAB_VISUAL_SEEDS='+json.dumps(seeds,ensure_ascii=False,separators=(',',':'))+';\nwindow.ROOTLAB_VISUAL_HINTS='+json.dumps(hints,separators=(',',':'))+';\n')
report={'requested':len(rows),'localPictures':len(seeds),'concreteCandidateWords':len(hints),'imageBytes':sum(x['image']['bytes'] for x in seeds.values()),'dictionaryEntries':len(core),'missing':failures,'license':'Per-image Commons license preserved','policy':'Only reviewed word-sense mapping automatically commits a picture; other matches remain topic choices.'}
(ROOT/'data/visual-coverage-v29.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('FINAL',json.dumps(report,ensure_ascii=False),flush=True)
assert len(seeds)>=50
