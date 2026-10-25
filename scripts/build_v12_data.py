#!/usr/bin/env python3
"""Build offline bilingual lexicon and root attribution data from a pinned MIT ECDICT snapshot.

Inputs remain outside Git. This writes only the extracted app dataset, not the original 66MB CSV.
"""
from pathlib import Path
import csv, json, re, hashlib
from collections import defaultdict
ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'.v12-work'
SRC_CSV=SOURCE/'ecdict.csv'
SRC_ROOTS=SOURCE/'wordroot.txt'
PIN='ab22ad36302caf'  # GitHub skywind3000/ECDICT master on 2026-10-25
assert SRC_CSV.exists() and SRC_ROOTS.exists()
assert SRC_CSV.stat().st_size > 65_000_000
assert hashlib.sha256(SRC_CSV.read_bytes()).hexdigest()=='d1ecbdf9ee2b920afb6f430ca6b6bb9f559588cf0dff86e04bd255f9390843cc','CSV source hash changed'
page=(ROOT/'index.html').read_text(encoding='utf8')
roots=json.loads(re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',page,re.S).group(1))
root_source=json.loads(SRC_ROOTS.read_text(encoding='utf8'))
TAGBITS={'zk':1,'gk':2,'cet4':4,'cet6':8,'ky':16}
EXPECTED_CORE={r['id'] for r in roots}
RE_WORD=re.compile(r"[a-z]{2,25}",re.I)
RE_HAN=re.compile(r'[\u3400-\u9fff]')
core_words={w['word'].lower() for root in roots for group in root['groups'] for w in group['entries']}
# New source-backed root index. Root meanings are carefully mapped to specific
# unambiguous ECDICT entries; homographs like cap1/cap2 are intentionally distinct.
ROOT_PICK=[
('act','act, ag','做；驱动'),('ann','ann, enn','年'),('anthrop','anthr, anthro, anthrop, anthropo','人；人类'),
('astr','astr, aster, astro','星'),('cap_get','cap1, cip, capt, cept, -ceive, -ceit','拿；接受'),
('cap_head','cap2, capit, cipit','头；首位'),('cent','cent, centi','百'),
('civ','civ','公民；城市'),('corp','corp, corpo, corpor, corpus','身体；团体'),
('cosm','cosm, cosmo','宇宙；秩序'),('dem','dem, demo','人民'),
('derm','derm, derma, dermat, dermato','皮肤'),('equ','equ, equi','相等'),
('fer','fer, lat2, -late','携带；带来'),('fin','fin','结束；界限'),
('fract','fract, frag','打破；碎裂'),('gen','gen, gener','出生；起源'),
('grad','grad, -grade','步；等级'),('hydr','hydr, hydro','水；液体'),
('jur','jud, jur, just','法律；公正'),('labor','labor, laborat, lab','工作'),
('liber','liber1','自由'),('log','log, logo, -logue','词语；言论'),
('luc','luc, lum','光；明亮'),('magn','magn, magna, magni, maj','伟大；大'),
('mar','mar, mari','海'),('mort','mort','死亡'),
('mot','mob, mot, mov','移动'),('nov','nov','新'),
('ped','ped1, pedi, -pede','脚；足'),('phil','phil, philo, -philia, -phile','爱；喜爱'),
('poly','poly','多'),('prim','prim, princ','第一；最初'),
('sect','sect','切；割'),('spir','spir, spiro','呼吸'),
('uni','uni','一；单一'),('viv','viv, vivi, vit','生命；活着'),
('volv','volv, volu, volut','滚动；转动'),('ten','ten, tin, tain','握住；保持'),
('ven','veni, vent, ven, -vene','来；到来'),('sol','sol1','太阳')
]
# Match a curated group to the most relevant etymological root dataset key.
def aliases(k):
    return [a.strip().lower().strip('-').rstrip('0123456789') for a in k.split(',')]
def best_core(root):
    forms={a.lower() for a in root.get('forms',[])}
    hits=[]
    for k,v in root_source.items():
        if v.get('class') not in ('root','prefix'):continue
        al=set(aliases(k));score=sum(1 for f in forms if f in al or f.rstrip('o') in al)
        if score:
            hits.append((score,len(v.get('example',[]))+(1000 if v.get('class')=='root' else 0),k,v))
    if not hits:return None
    return max(hits,key=lambda x:(x[0],x[1]))
core_evidence={}
source_candidates=set(core_words)
for root in roots:
    best=best_core(root)
    if best:
        score,_,key,obj=best
        if root['id']=='mit':key='mit, mis1, mitt, miss, -mise';obj=root_source[key]
        if root['id']=='ced':key='ced, ces, -ceed, -cede, -cess';obj=root_source[key]
        examples=list(obj.get('example',[]))
        core_evidence[root['id']]={'key':key,'origin':obj.get('origin',''),'english':obj.get('meaning',''),'examples':examples,'status':'reference'}
        source_candidates.update(w.lower() for w in examples if RE_WORD.fullmatch(w))
    else:
        core_evidence[root['id']]={'key':'','origin':'','english':'','examples':[],'status':'unmatched'}
new_index=[]
for id,key,meaning_cn in ROOT_PICK:
    assert key in root_source,(id,key)
    obj=root_source[key]
    assert obj.get('class')=='root'
    examples=[w.lower() for w in obj.get('example',[]) if RE_WORD.fullmatch(w) and w.lower() not in {'pedophile','pedophilia'}]
    assert len(examples)>=3,(key,examples)
    new_index.append({'id':'ref_'+id,'key':key,'cn':meaning_cn,'en':obj.get('meaning',''),'origin':obj.get('origin',''),'examples':examples})
    source_candidates.update(examples)
# Select a practical offline vocabulary. Priority is source BNC/FRQ word frequency and
# test-list presence. Reference root-examples are included to support explicit root links.
lex={}
count=0
with SRC_CSV.open(encoding='utf-8',newline='') as f:
    for row in csv.DictReader(f):
        count+=1
        word=(row['word'] or '').lower()
        if not RE_WORD.fullmatch(word):continue
        raw=(row['translation'] or '').strip()
        if not raw:continue
        # The source stores some secondary senses with literal backslash-n.
        gloss=raw.replace('\\r','').split('\\n',1)[0].split('\n',1)[0].strip()
        gloss=re.sub(r'\[(?:计|医|化|律|商|网络|经|法|数|机|军|天文|生化)[^\]]*\]','',gloss).strip()
        if not RE_HAN.search(gloss):continue
        if len(gloss)>115:gloss=gloss[:114]+'…'
        try: bnc=int(row['bnc'] or 0)
        except: bnc=0
        try: frq=int(row['frq'] or 0)
        except: frq=0
        rank=min([x for x in (bnc,frq) if x>0],default=999999)
        mask=sum(bit for tag,bit in TAGBITS.items() if tag in (row['tag'] or '').split())
        if word not in source_candidates and rank>16000 and not mask:continue
        phon=(row['phonetic'] or '').strip()
        if len(phon)>72 or any(ch in phon for ch in '<>{}|\\') or phon.startswith('['):phon=''
        lemma=''
        match=re.search(r'(?:^|/)0:([a-z]+)',(row.get('exchange') or '').lower())
        if match:lemma=match.group(1)
        # row: word, reference pronunciation, Chinese gloss, test labels bitmask,
        # BNC frequency rank, lemma (if source supplied)
        candidate=[word,phon,gloss,mask,bnc or (frq or 0),lemma]
        old=lex.get(word)
        if old is None or (old[2] and len(gloss)<len(old[2]) and rank<999999):
            lex[word]=candidate
print('Read rows:',count,'candidate entries:',len(lex))
eligible=sorted(lex.values(),key=lambda r:(r[4] or 999999,len(r[0]),r[0]))
frequent={r[0] for r in eligible[:12000]}
chosen=frequent|source_candidates
selected=[row for key,row in lex.items() if key in chosen]
selected.sort(key=lambda e:e[0])
print('Selected:',len(selected),'source candidates:',len(source_candidates),'frequent:',len(frequent))
print('Core covered:',len(core_words & set(lex)),'/',len(core_words))
counts={'with_phonetic':sum(bool(w[1]) for w in selected),'with_tags':sum(w[3]>0 for w in selected),'with_lemma':sum(bool(w[5]) for w in selected)}
print('Coverage:',counts)
source_words=set(lex)
for cid,v in core_evidence.items():
    existing={e['word'].lower() for root in roots if root['id']==cid for group in root['groups'] for e in group['entries']}
    extras=[lex[w] for w in (t.lower() for t in v.get('examples',[])) if w in source_words and w not in existing]
    extras.sort(key=lambda e:(e[4] or 999999,e[0]))
    v['extra']=[r[0] for r in extras[:16]]
    del v['examples']
for item in new_index:
    known=[lex[w] for w in item['examples'] if w in source_words]
    known.sort(key=lambda r:(r[4] or 999999,r[0]))
    item['examples']=[r[0] for r in known[:12]]
new_index=[i for i in new_index if len(i['examples'])>=4]
print('extra reference roots:',len(new_index))
# For curated content, override previously hand-authored exam labels using source tag mask.
# The UI explicitly says "参考词表" rather than official/authoritatively confirmed exam inclusion.
CHINESE_TAGS=[(1,'中考'),(2,'高考'),(4,'四级'),(8,'六级'),(16,'考研')]
for root in roots:
    for group in root['groups']:
        for e in group['entries']:
            x=lex.get(e['word'].lower())
            e['levels']=[label for bit,label in CHINESE_TAGS if x and x[3]&bit]
            e['labelSource']='ECDICT' if x else '未核实'
# retain original display & group definitions; hide empty levels instead of faking them.
content=json.dumps(roots,ensure_ascii=False,separators=(',',':'))
page=page[:re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',page,re.S).start(1)]+content+page[re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',page,re.S).end(1):]
(ROOT/'index.html').write_text(page,encoding='utf8')
(ROOT/'lexicon-v12.js').write_text('window.ROOTLAB_LEXICON='+json.dumps(selected,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
meta={'core':core_evidence,'referenceRoots':new_index,'source':'ECDICT','sourceCommit':PIN,'words':len(selected),'coreRootCount':len(roots),'referenceRootCount':len(new_index)}
(ROOT/'roots-v12.js').write_text('window.ROOTLAB_ROOT_PROVENANCE='+json.dumps(meta,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('ASSETS:',(ROOT/'lexicon-v12.js').stat().st_size,(ROOT/'roots-v12.js').stat().st_size)
print('TAG examples:',[(w,lex[w][3] if w in lex else '') for w in ('success','analysis','water','microscope','psychology','impact','report','run','children')])
assert len(selected)>=12000
assert len(new_index)>=35
assert len(core_evidence)==len(roots)
assert len(roots)==37
