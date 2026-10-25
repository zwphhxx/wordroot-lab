#!/usr/bin/env python3
"""Rebuild consumer dictionary from licensed local data. No web scraping."""
from pathlib import Path
import csv,json,re,hashlib,zipfile,collections
ROOT=Path(__file__).resolve().parent.parent
RAW=ROOT/'.v12-work'
SRC=RAW/'ecdict.csv'
WROOT=RAW/'wordroot.txt'
WNET=RAW/'wordnet30.zip'
assert SRC.exists() and WROOT.exists() and WNET.exists()
assert hashlib.sha256(SRC.read_bytes()).hexdigest()=='d1ecbdf9ee2b920afb6f430ca6b6bb9f559588cf0dff86e04bd255f9390843cc'
pattern=re.compile(r'^[a-z]{2,25}$')
chinese=re.compile('[\u3400-\u9fff]')
def splitlines(txt):
    return re.split(r'(?:\\n|\n|\r\n)',str(txt or ''))
def normtext(txt,limit):
    txt=re.sub(r'\s+',' ',str(txt).strip())
    return txt[:limit].rstrip()
def gloss_cn(txt):
    parts=[]
    for raw in splitlines(txt):
        raw=raw.strip()
        if not chinese.search(raw): continue
        raw=re.sub(r'^\[(?:计|医|化|律|商|经|网络|法|数|机|军|生化|植|动)\]\s*','',raw)
        raw=normtext(raw,150)
        if raw and raw not in parts:parts.append(raw)
        if len(parts)>=4:break
    return parts
def gloss_en(txt):
    parts=[]
    for raw in splitlines(txt):
        raw=normtext(raw,180)
        if raw and re.search('[a-zA-Z]',raw) and raw not in parts:parts.append(raw)
        if len(parts)>=3:break
    return parts
tagbits={'zk':1,'gk':2,'cet4':4,'cet6':8,'ky':16,'toefl':32,'ielts':64,'gre':128}
rootsrc=json.loads(WROOT.read_text(encoding='utf8'))
html=(ROOT/'index.html').read_text(encoding='utf8')
curated=json.loads(re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',html,re.S).group(1))
old=json.loads(re.search(r'window.ROOTLAB_ROOT_PROVENANCE=(\{.*\});',(ROOT/'roots-v12.js').read_text(encoding='utf8'),re.S).group(1))
base={w['word'].lower() for r in curated for g in r['groups'] for w in g['entries']}
source_candidates=set(base)
root_lex={}
for key,item in rootsrc.items():
    words={w.lower() for w in item.get('example',[]) if pattern.fullmatch(str(w).lower())}
    if words:
        root_lex[key]=words
        source_candidates.update(words)
print('Root source entries',len(rootsrc),'candidate words',len(source_candidates))
# Add basic translation where original root information used English-only; all records preserve English gloss.
direct_map={}
for r in curated:
    ev=old.get('core',{}).get(r['id'],{})
    if ev.get('key'):direct_map[ev['key']]=r.get('meaning','')
for r in old.get('referenceRoots',[]):
    direct_map[r['key']]=r.get('cn','')
EN_TO_CN={
'good':'好','bad':'坏','small':'小','large':'大','great':'大','big':'大','many':'多','few':'少',
'one':'一','two':'二','three':'三','four':'四','five':'五','half':'半','all':'全部','not':'否定',
'no':'没有','without':'没有','against':'反对','before':'在前','after':'在后','again':'再次',
'back':'向后','forward':'向前','down':'向下','up':'向上','over':'在上','under':'在下',
'between':'在……之间','inside':'在内','outside':'在外','with':'和','together':'一起',
'away':'离开','across':'横跨','through':'穿过','above':'在上','below':'在下',
'life':'生命','live':'活','death':'死亡','die':'死','birth':'出生','human':'人','man':'人',
'woman':'女人','child':'孩子','family':'家庭','mother':'母亲','father':'父亲','people':'人民',
'mind':'心智','soul':'精神','body':'身体','head':'头','hand':'手','foot':'脚','eye':'眼睛',
'ear':'耳','mouth':'口','tooth':'牙','blood':'血液','heart':'心','skin':'皮肤',
'brain':'脑','bone':'骨','muscle':'肌肉','hair':'头发','face':'面部',
'water':'水','fire':'火','light':'光','dark':'暗','heat':'热','cold':'寒冷','earth':'地球',
'land':'土地','sea':'海洋','ocean':'海洋','air':'空气','sun':'太阳','moon':'月亮',
'star':'星','sky':'天空','stone':'石','tree':'树','flower':'花','plant':'植物',
'river':'河流','mountain':'山','wind':'风','rain':'雨','snow':'雪',
'time':'时间','year':'年','day':'日','night':'夜','new':'新','old':'旧',
'place':'地点','city':'城市','home':'家','house':'房子','country':'国家',
'law':'法律','just':'公正','right':'正确','true':'真','false':'假',
'circle':'圆','wheel':'轮','square':'方形','line':'线','point':'点',
'number':'数字','count':'计数','measure':'测量','weight':'重量',
'speed':'速度','movement':'移动','move':'移动','walk':'行走','run':'跑',
'carry':'携带','take':'拿取','give':'给予','send':'发送','bring':'带来',
'lead':'引导','draw':'拉','pull':'拉','push':'推','throw':'投','hold':'握住',
'keep':'保持','get':'获得','join':'结合','connect':'连接','cut':'切开',
'break':'打破','build':'建造','make':'制作','do':'做','work':'工作','act':'行动',
'say':'说','speak':'说','call':'呼唤','hear':'听','see':'看','look':'看',
'watch':'观察','read':'阅读','write':'写','record':'记录','think':'思考',
'know':'知道','learn':'学习','teach':'教授','remember':'记住','forget':'遗忘',
'believe':'相信','trust':'信任','love':'爱','hate':'恨',
'sound':'声音','voice':'嗓音','speech':'言语','word':'词语','language':'语言',
'music':'音乐','song':'歌曲','color':'颜色','blue':'蓝色','red':'红色',
'green':'绿色','white':'白色','black':'黑色',
'full':'充满','empty':'空','begin':'开始','end':'结束','finish':'结束',
'change':'改变','turn':'转动','repeat':'重复','cycle':'循环','spin':'旋转',
'far':'远','near':'近','deep':'深','high':'高','low':'低','long':'长','short':'短',
'strong':'强','weak':'弱','fast':'快','slow':'慢','easy':'容易','hard':'困难',
'first':'第一','last':'最后','middle':'中间','equal':'相等','same':'相同',
'other':'其他','opposite':'相反','side':'侧','front':'前','behind':'后',
'free':'自由','power':'力量','fear':'恐惧','peace':'和平','war':'战争',
'order':'秩序','shape':'形状','form':'形式','energy':'能量',
'grow':'生长','eat':'吃','food':'食物','drink':'喝','sleep':'睡觉',
'health':'健康','medicine':'药物','disease':'疾病','pain':'疼痛',
'book':'书','school':'学校','science':'科学','art':'艺术','knowledge':'知识',
'wing':'翼','fin':'鳍','bind':'束缚','tighten':'收紧','spiral':'螺旋','circular':'圆形',
'light green':'浅绿色','chlorine':'氯','practictioner':'从业者','practitioner':'从业者','expert':'专家',
'liver':'肝','full of':'充满','characterized by':'具有……性质','gold':'金','yellow':'黄',
'view':'观看','observe':'观察','government':'政府','rule':'统治','fasten':'固定',
'attach':'连接','recent':'近期','process':'过程','result':'结果','memory':'记忆',
'secret':'秘密','hidden':'隐蔽','feeling':'感受','sensation':'感觉','sense perception':'感知',
'rough':'粗糙','center':'中心','stretch':'伸展','burn':'燃烧','choose':'选择',
'electric':'电','like':'类似','similar':'相似','age':'年代','era':'时代',
'owe':'欠','conquer':'征服','wander':'徘徊','resembling':'相似',
'wise':'明智','wisdom':'智慧','animal':'动物','a large number':'大量',
'beside':'旁边','alongside':'在……旁','lie':'躺','vessel':'容器','blood vessel':'血管',
'tooth':'牙齿','teeth':'牙齿','water':'水','made of':'由……制成',
'act or result of':'行为或结果','the act':'行为','to cover or surround with':'覆盖；包围',
'complex':'复杂','simple':'简单','heat':'热','cold':'冷','speed':'速度',
'power':'力量','system':'系统','study':'研究','science':'科学','eye':'眼','brain':'脑',
'price':'价格','trade':'交易','money':'金钱','pay':'支付','buy':'买',
'write, draw':'书写；绘制','small, little':'小','other, different':'其他；不同',
}
phrase_cn={
'to see, look, watch':'看；观察',
'to go; to go back or yield':'行走；退让','write, draw, record':'写；记录',
'to write':'书写','from; away from; down from; reverse, negate.':'离开；向下；取消',
'before':'在前','tending to, connected with, or performing':'有……倾向；相关的',
'light; shine':'光；照亮','without':'没有；不具备','to carry':'携带',
'with, together with':'共同；一起',
}
def rootcn(item,key):
    if key in direct_map and direct_map[key]:return direct_map[key]
    en=str(item.get('meaning','')).strip().rstrip('.')
    if en in phrase_cn:return phrase_cn[en]
    pieces=[p.strip().lower() for p in re.split(r'[;,/]',en)]
    out=[]
    for bit in pieces[:3]:
        bit=re.sub(r'^to\s+','',bit)
        if bit in EN_TO_CN and EN_TO_CN[bit] not in out:out.append(EN_TO_CN[bit])
    return '；'.join(out)
# Dictionary selection. Include frequencies through 40k + exam cohorts + attested root examples.
entries={}
total=0
with SRC.open(encoding='utf8',newline='') as f:
    for x in csv.DictReader(f):
        total+=1
        name=str(x.get('word','')).lower()
        if not pattern.fullmatch(name):continue
        zh=gloss_cn(x.get('translation',''))
        if not zh:continue
        en=gloss_en(x.get('definition',''))
        try: bnc=int(x['bnc'] or 0)
        except:bnc=0
        try: frq=int(x['frq'] or 0)
        except:frq=0
        rank=min([v for v in (bnc,frq) if v>0] or [999999])
        mask=sum(v for k,v in tagbits.items() if k in x.get('tag','').split())
        if rank>40000 and not mask and name not in source_candidates:continue
        phon=str(x.get('phonetic','')).strip()
        if len(phon)>68 or any(c in phon for c in '<>{}|\\'):phon=''
        exc=str(x.get('exchange',''))[:180]
        lemma=re.search(r'(?:^|/)0:([a-z]+)',exc.lower())
        baseform=lemma.group(1) if lemma else ''
        # Keep up to 4 Chinese and 3 English lines, inspectable in end-user page.
        record=[name,phon,zh,mask,rank if rank<999999 else 0,baseform,en,exc]
        existing=entries.get(name)
        if existing is None or (len(zh)>len(existing[2]) and rank<999999):entries[name]=record
print('Source rows',total,'extended dictionary',len(entries))
# root/prefix/suffix reference index, preserving source-provided explicit exemplars.
references=[]
relCounts=collections.Counter()
cnt=0
for key,item in rootsrc.items():
    cls=str(item.get('class',''))
    kind='prefix' if cls=='prefix' else ('suffix' if 'suffix' in cls else ('root' if cls=='root' else None))
    if not kind:continue
    listed=[w.lower() for w in item.get('example',[]) if pattern.fullmatch(str(w).lower()) and w.lower() in entries]
    words=list(dict.fromkeys(listed))
    if len(words)<2:continue
    words.sort(key=lambda w:(0 if w in base else 1,entries[w][4] or 999999,w))
    # Keep a maximum of 70 attested examples per topic.
    examples=words[:70]
    if len(examples)<2:continue
    origin=str(item.get('origin',''))[:40]
    label=key.strip()
    idx='idx_'+str(cnt).zfill(3)
    cnt+=1
    references.append({'id':idx,'key':label,'cn':rootcn(item,key),'en':str(item.get('meaning',''))[:125],'kind':kind,'origin':origin,'examples':examples})
    relCounts[kind]+=1
# Assign core source evidence to curated root ID, preserve exact examples for hyperlink, not generic guesses.
core={}
for r in curated:
    o=old.get('core',{}).get(r['id'],{})
    key=o.get('key','')
    examples=[w for w in root_lex.get(key,[]) if w in entries]
    extras=sorted([w for w in examples if w not in base],key=lambda w:(entries[w][4] or 999999,w))[:35]
    core[r['id']]={'key':key,'origin':o.get('origin',''),'english':o.get('english',''),'status':o.get('status','unmatched'),'extra':extras}
meta={'core':core,'referenceRoots':references,'dictionaryCount':len(entries),'rootCount':len(references),'rootKinds':dict(relCounts),'source':'open dictionary with attributed license','sourceCommit':'ab22ad36302caf'}
# WordNet independent corpus for original usage examples and synonyms. WordNet 3.0 license retained verbatim in credits.
wordnet={}
with zipfile.ZipFile(WNET) as z:
    for fname in ['data.noun','data.verb','data.adj','data.adv']:
        content=z.read('wordnet/'+fname).decode('utf8',errors='replace')
        for line in content.splitlines():
            if not re.match(r'^\d{8} ',line) or ' | ' not in line:continue
            left,gloss=line.split(' | ',1)
            tokens=left.split()
            try: n=int(tokens[3],16)
            except:continue
            names=[tokens[4+2*i].lower().replace('_',' ') for i in range(n) if 4+2*i<len(tokens)]
            glosses=re.findall(r'"([^"]+)"',gloss)
            if not glosses:continue
            syn=[w for w in names if pattern.fullmatch(w) and w in entries]
            if not syn:continue
            for w in syn:
                db=wordnet.setdefault(w,{'examples':[],'synonyms':[]})
                for phrase in glosses:
                    phrase=normtext(phrase,190)
                    if len(phrase)>12 and phrase not in db['examples'] and len(db['examples'])<3:
                        db['examples'].append(phrase)
                for other in syn:
                    if other!=w and other not in db['synonyms'] and len(db['synonyms'])<7:
                        db['synonyms'].append(other)
# independent original curated examples are already embedded in ROOTLAB_DATA.
wo=[[k,v['examples'][:2],v['synonyms'][:6]] for k,v in sorted(wordnet.items()) if v['examples'] or v['synonyms']]
arr=sorted(entries.values(),key=lambda v:v[0])
(ROOT/'lexicon-v21.js').write_text('window.ROOTLAB_LEXICON='+json.dumps(arr,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
(ROOT/'roots-v21.js').write_text('window.ROOTLAB_ROOT_PROVENANCE='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
(ROOT/'wordnet-v21.js').write_text('window.ROOTLAB_WORDNET='+json.dumps(wo,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('ROOT KINDS',dict(relCounts),'root IDs',len(references),'wordnet enriched',len(wo))
print('ASSETS BYTES',[(f,(ROOT/f).stat().st_size) for f in ['lexicon-v21.js','roots-v21.js','wordnet-v21.js']])
for word in ['destructive','antecedent','understand','structure','reconstruct','philosophy']:
    rows=[(r['key'],r['kind']) for r in references if word in r['examples']]
    print(word,'in dict',word in entries,'roots',rows[:12],'English definitions',entries[word][6][:2] if word in entries else '','WordNet',wordnet.get(word))
assert len(entries)>=40000
assert len(references)>=400
assert len(wordnet)>=10000
