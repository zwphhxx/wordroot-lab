#!/usr/bin/env python3
"""Build source-backed historical paths for curated words from the
2026-10-01 Wiktionary extraction provided by Kaikki.org (CC BY-SA 4.0).
No unknown dates, glosses, historical languages, or intermediate forms
are manufactured. The original seven editorial timelines are kept intact.
"""
from pathlib import Path
import json,re,collections,unicodedata
ROOT=Path(__file__).resolve().parent.parent
source=ROOT/'.v12-work/wiki-etymology-cache'
html=(ROOT/'index.html').read_text('utf8')
curated=json.loads(re.search(r'window.ROOTLAB_DATA=(\[.*?\]);</script>',html,re.S).group(1))
WORDS={w['word'].lower():{'root':r['id'],'meaning':w['meaning'],'pos':w['pos'],'segments':w['segments']} for r in curated for g in r['groups'] for w in g['entries']}
old=json.loads(re.search(r'window.ROOTLAB_WORD_HISTORY=(\{.*\});',(ROOT/'word-history-v22.js').read_text('utf8'),re.S).group(1))
LANGUAGE={
'Proto-Indo-European':'原始印欧语','Proto-Germanic':'原始日耳曼语','Old English':'古英语','Middle English':'中古英语','Early Modern English':'近代早期英语',
'Old Norse':'古诺尔斯语','Old High German':'古高地德语','Middle High German':'中古高地德语','German':'德语','Old Dutch':'古荷兰语','Dutch':'荷兰语',
'Latin':'拉丁语','Late Latin':'晚期拉丁语','Medieval Latin':'中世纪拉丁语','New Latin':'新拉丁语','Vulgar Latin':'通俗拉丁语','Proto-Italic':'原始意大利语族',
'Old French':'古法语','Middle French':'中古法语','French':'法语','Anglo-Norman':'盎格鲁—诺曼法语','Norman':'诺曼法语','Old Norman':'古诺曼法语',
'Ancient Greek':'古希腊语','Greek':'希腊语','Koine Greek':'通用希腊语','Proto-Hellenic':'原始希腊语','Byzantine Greek':'拜占庭希腊语',
'Arabic':'阿拉伯语','Persian':'波斯语','Sanskrit':'梵语','Hindi':'印地语','Turkish':'土耳其语','Italian':'意大利语','Spanish':'西班牙语',
'Portuguese':'葡萄牙语','Celtic':'凯尔特语','Old Irish':'古爱尔兰语','Irish':'爱尔兰语','Welsh':'威尔士语',
'Hebrew':'希伯来语','Yiddish':'意第绪语','English':'现代英语','Old Italian':'古意大利语','Middle Dutch':'中古荷兰语',
}
# Source expansions for derivations and borrowings, not generic examples or distant cognates.
DERIVATION={'der','uder','inh','bor','lbor','bor+','bor-','borr','adapt','lbor','slbor','borrowing','m'}
prefixes=sorted(LANGUAGE,key=len,reverse=True)
LATIN_RE=re.compile(r'^(?:'+ '|'.join(re.escape(x) for x in prefixes) +r')(?:\s+|$)')
def extract_form(expansion):
    expansion=' '.join(str(expansion or '').replace('\n',' ').split())
    if not expansion or len(expansion)>210 or any(x in expansion for x in ('Etymology tree','terms" :','data-lang=')):return None
    expansion=re.sub(r'^(?:(?:Borrowed|Inherited|Derived|Calqued|Learned borrowing)\s+from|From)\s+','',expansion,flags=re.I)
    m=LATIN_RE.search(expansion)
    if not m:return None
    english=m.group(0).strip()
    # Language tags must match complete leading words, sorted longer first.
    suffix=expansion[len(english):].strip().split(' (“')[0]
    suffix=re.split(r'(?:\s*\(|,\s*[“"])',suffix,maxsplit=1)[0].strip()
    if suffix in ('','-','?') or len(suffix)>60:return None
    # Avoid affix-only variants as full reconstructed word forms.
    form=suffix.strip(" .;")
    if not form:return None
    return {'era':LANGUAGE[english],'originalLanguage':english,'term':form,'note':'词源资料记录的相关词形'}
def wordcount_excerpt(raw):
    raw=str(raw or '')
    if not raw or len(raw)>13000:return ''
    if raw.startswith('Etymology tree'):
        tail=raw.splitlines()[-1].strip()
        raw=tail if re.match(r'^(?:From|Borrowed from|Inherited from|Derived from|Learned borrowing from)\s+',tail,re.I) else ''
    raw=' '.join(raw.replace('\r',' ').replace('\n',' ').split())
    # Only a short original segment; full material always linked to upstream.
    tokens=raw.split()
    return ' '.join(tokens[:23])[:240]
def original_formation(raw):
    raw=str(raw or '')
    if not raw:return ''
    if raw.startswith('Etymology tree'):
        raw=raw.splitlines()[-1]
    raw=' '.join(raw.split())
    match=re.search(r'^From\s+(.+?)(?:\.|$)',raw,flags=re.I)
    if not match:return ''
    value=match.group(1).strip()
    if '+' not in value and ' or ' not in value:return ''
    if len(value)>115 or '<' in value or '&' in value:return ''
    return value

def formation_from_templates(obj):
    for template in obj.get('etymology_templates') or []:
        kind=template.get('name','')
        args=template.get('args') or {}
        if kind in ('af','affix','confix'):
            parts=[args.get(str(i)) for i in (2,3,4) if args.get(str(i))]
            if len(parts)<2:continue
            if kind=='confix':parts=[parts[0]+'-','-'+parts[1]]
        elif kind=='ety' and args.get('2') in (':af', '+af'):
            parts=[args.get(str(i)) for i in (3,4,5) if args.get(str(i))]
        elif kind=='surf' and args.get('1') in ('+af',':af'):
            parts=[args.get(str(i)) for i in (3,4,5) if args.get(str(i))]
        else:continue
        if len(parts)<2:continue
        if all(re.fullmatch(r'[A-Za-z-]{2,30}',v) for v in parts):
            return ' + '.join(parts)
    return ''

def selected_record(items,word):
    candidates=[]
    for obj in items:
        if obj.get('lang_code')!='en' or str(obj.get('word','')).lower()!=word:continue
        raw=obj.get('etymology_text') or ''
        if not raw:continue
        templates=obj.get('etymology_templates') or []
        lineage=[extract_form(x.get('expansion')) for x in templates if x.get('name') in DERIVATION]
        lineage=[x for x in lineage if x]
        formation=original_formation(raw) or formation_from_templates(obj)
        quality=3*len(lineage)+min(len(raw),350)/300 + (6 if formation else 0) - (100 if raw.startswith('Etymology tree') and not lineage and not formation and not wordcount_excerpt(raw) else 0)
        candidates.append((quality,obj,lineage))
    if not candidates:return None
    # Prefer a plain-text chain if it is almost as detailed as the etymon tree.
    candidates.sort(key=lambda a:a[0],reverse=True)
    return candidates[0][1],candidates[0][2]
compiled={}
audit=[]
for word,row in sorted(WORDS.items()):
    if word in old:continue
    target=source/(word+'.jsonl')
    if not target.exists():
        audit.append([word,'no_file',0]);continue
    try:
        items=[json.loads(line) for line in target.read_text('utf8').splitlines() if line.strip()]
    except Exception:
        audit.append([word,'json_error',0]);continue
    found=selected_record(items,word)
    if not found:
        audit.append([word,'no_etymology',0]);continue
    obj,forms=found
    text=wordcount_excerpt(obj.get('etymology_text'))
    formation=original_formation(obj.get('etymology_text')) or formation_from_templates(obj)
    # Word formation is not a chronological series of unrelated source roots.
    if formation:
        forms=[]
    lexical_derivation=''
    if not formation and not forms:
        raw=str(obj.get('etymology_text') or '')
        if raw.startswith('Etymology tree'):raw=raw.splitlines()[-1]
        match=re.match(r'^(Clipping of|Back-formation from|Shortening of)\s+([^.;]{2,75})',raw)
        if match:
            lexical_derivation=match.group(1)+' '+match.group(2).strip()
    # Deduplicate successive identical stages; Wiktionary templates may repeat intermediate forms.
    unique=[];seen=set()
    for item in forms:
        key=(item['originalLanguage'],item['term'])
        if key not in seen:
            seen.add(key);unique.append(item)
    # Witkionary lists from newer languages to older sources. Reverse to chart early->late forms.
    unique=list(reversed(unique))
    # Exclude identical present day forms, retain at most five documented historical stages.
    unique=[x for x in unique if x['originalLanguage']!='English'][-5:]
    if not unique and not text and not formation and not lexical_derivation:
        audit.append([word,'no_lineage_or_text',0]);continue
    origin=unique[0]['era'] if unique else ''
    notes=[]
    if unique:
        langs='、'.join(dict.fromkeys(x['era'] for x in unique))
        notes.append('词源记录中包含 '+langs+' 等语言的相关词形，可循这些形式理解词义的发展。')
    elif formation:
        notes.append('公开资料将这个词解释为构词组成：'+formation+'。')
    elif lexical_derivation:
        notes.append('词源资料指出其词形来自：'+lexical_derivation+'。')
    else:
        notes.append('这条词的词源资料可参阅英文原始记录。')
    notes.append('现代英语中，'+word+' 常表示“'+row['meaning'].split('；')[0]+'”。')
    summary=''.join(notes)
    timeline=[]
    if formation:
        timeline.append({'era':'构词关系', 'term':formation, 'note':'公开词源资料记录的组成形式'})
    elif lexical_derivation:
        timeline.append({'era':'词形派生', 'term':lexical_derivation, 'note':'记录的截短或逆构词关系'})
    else:
        for stage in unique:
            timeline.append({'era':stage['era'],'term':stage['term'],'note':'词源资料记载的相关词形'})
    if timeline:
        timeline.append({'era':'现代英语','term':word,'note':'目前常见含义：'+row['meaning'].split('；')[0]})
    compiled[word]={
        'summary':summary,
        'timeline':timeline,
        'excerpt':text,
        'sourceLanguage':origin,
        'sourceUrl':'https://en.wiktionary.org/wiki/'+word+'#English',
        'originalFormat':'Kaikki Wiktextract, enwiktionary 2026-10-01',
        'status':'source_formation' if formation or lexical_derivation else ('source_path' if len(unique)>=1 else 'source_excerpt'),
    }
    audit.append([word,compiled[word]['status'],len(unique)])
# For entries without a dedicated Wiktionary Etymology record, preserve a
# useful word-formation *study cue*, not an invented historical chronology.
MORPH_HINTS={
 'centimeter':('centi- + meter','公制计量单位，centi- 表示百分之一'),
 'luminance':('lumin- + -ance','与光、亮度有关的名词形式'),
 'recycling':('recycle + -ing','来自 recycle 的动名词及名词用法'),
 'synchronized':('synchronize + -ed','来自 synchronize 的过去分词形容词用法'),
 'telecommunications':('tele- + communications','远距离通信相关的复合构词'),
 'terraforming':('terra- + forming','改造环境使其具有类似地球条件的构词表达'),
}
for word,(parts,note) in MORPH_HINTS.items():
    if word in old or word in compiled:continue
    if word not in WORDS:continue
    compiled[word]={
       'summary':'构词联想：'+parts+'。'+note+'。现代英语中，'+word+' 常表示“'+WORDS[word]['meaning'].split('；')[0]+'”。',
       'timeline':[{'era':'构词提示','term':parts,'note':note},
                   {'era':'现代英语','term':word,'note':'目前常见含义：'+WORDS[word]['meaning'].split('；')[0]}],
       'excerpt':'',
       'sourceUrl':'https://en.wiktionary.org/wiki/'+word+'#English',
       'status':'teaching_formation',
    }
    audit.append([word,'teaching_formation',0])
# Keep the earliest audit record but base missing coverage on the compiled actual word set.
statuses=collections.Counter(row.get('status') for row in compiled.values())
missing=sorted(set(WORDS)-set(old)-set(compiled))

output=ROOT/'word-etymology-curated-v23.js'
output.write_text('window.ROOTLAB_CURATED_ETYM='+json.dumps(compiled,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
meta=ROOT/'data/curated-etymology-coverage.json'
meta.parent.mkdir(exist_ok=True)
count=statuses
meta.write_text(json.dumps({'totalCurated':len(WORDS),'previouslyManual':len(set(old)&set(WORDS)),'otherManual':len(set(old)-set(WORDS)),'newEtymologyEntries':len(compiled),'statuses':dict(count),'missing':missing,'source':'en.wiktionary contributors / Wiktextract as-of 2026-10-01','license':'CC BY-SA 4.0'},ensure_ascii=False,indent=2),encoding='utf8')
print('CURATED',len(WORDS),'MANUAL',len(old),'NEW',len(compiled),'STATUSES',dict(count))
print('OUTPUT_BYTES',output.stat().st_size)
for w in ['successful','reform','photograph','geography','biology','procedure','telephone','microchip','concession']:
    x=compiled.get(w) or old.get(w)
    print(w,'type:',('manual' if w in old else x.get('status') if x else 'missing'), 'timeline:',[(t.get('era'),t.get('term')) for t in x.get('timeline',[])][:8] if x else [])
assert len(compiled)>=326, 'Expected near-complete curated source coverage'
