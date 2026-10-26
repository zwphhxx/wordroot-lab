#!/usr/bin/env python3
"""Guard secondary display paths, including selected-topic summaries and captions.
Raw upstream material stays in its source cache; unavailable translations remain
explicitly deferred rather than counted as completed bilingual content.
"""
from pathlib import Path
R=Path(__file__).resolve().parent.parent
p=R/'encyclopedia-v212.js';s=p.read_text()
anchor='async function search(node){';assert s.count(anchor)==1
helper="""function candidateDescription(row){
 const z=row.sense&&/[\\u3400-\\u9fff]/.test(row.sense)?row.sense:'';
 const translated=z&&window.RootLabAuthored?.lookup(z)?.en;
 if(translated)return '<small lang="zh-CN">'+esc(z)+'</small><small lang="en">'+esc(translated)+'</small>';
 return '<small lang="zh-CN">'+(row.disambiguation?'请先选择具体主题。':'查看与这个主题对应的中英文介绍。')+'</small><small lang="en">'+(row.disambiguation?'Choose a specific topic first.':'Open the Chinese and English overviews for this topic.')+'</small>';
}
"""
s=s.replace(anchor,helper+anchor,1)
a="'<small>'+esc(r.disambiguation?'先确认具体主题':r.sense||r.summary||'查看这个主题的介绍')+'</small>";b="candidateDescription(r)+'"
# The preceding concatenation already ends with +; preserve the trailing span string.
assert a in s;s=s.replace(a,"candidateDescription(r)+'",1)
s=s.replace("+'<span>查看图文 →</span>","+'<span>查看图文 · Open →</span>")
s=s.replace("'<div class=\"visual-loading\" role=\"status\">正在寻找相关图文…</div>'","'<div class=\"visual-loading\" role=\"status\"><span lang=\"zh-CN\">正在寻找相关图文…</span><span lang=\"en\">Finding related picture topics…</span></div>'")
s=s.replace("<p class=\"wiki-note\" role=\"status\">正在读取中英图文…</p>","<p class=\"wiki-note\" role=\"status\"><span lang=\"zh-CN\">正在读取中英图文…</span><span lang=\"en\">Loading bilingual topic material…</span></p>")
s=s.replace("':img.caption?'<p>'+esc(img.caption)+'</p>':'')", "':img.caption?'<div class=\"visual-caption-deferred\"><p lang=\"zh-CN\">这张图片的原始说明请见来源链接。</p><p lang=\"en\">See the source link for the original image caption.</p></div>':'')") if False else s
old=":img.caption?'<p>'+esc(img.caption)+'</p>':'')";new=":img.caption?'<div class=\"visual-caption-deferred\"><p lang=\"zh-CN\">这张图片的原始说明请见来源链接。</p><p lang=\"en\">See the source link for the original image caption.</p></div>':'')";assert old in s;s=s.replace(old,new,1)
p.write_text(s)
p=R/'meaning-explainer-v211.js';s=p.read_text();s=s.replace("const topic=d.kind==='selected-topic';","const topic=d.kind==='selected-topic';\n if(topic&&!d.textEn)return ''; // Old unpaired topic remains cached; dictionary content stays available.",1)
s=s.replace("+esc(d.text)+'</p>'", "+esc(d.text)+'</p>'+(topic?'<p class=\"lr-meaning-text\" lang=\"en\">'+esc(d.textEn)+'</p><small>中英为同主题独立摘要 · Independent summaries of the same topic</small>':'')",1)
s=s.replace("class=\"lr-meaning-text\">", "class=\"lr-meaning-text\" lang=\"zh-CN\">",1)
a="if(!validWord(w)||!a||a.language!=='zh'||typeof a.summary!=='string'||!sourceOK(a.source)||!/[\\u3400-\\u9fff]/.test(a.summary))return false;"
b="if(!validWord(w)||!a||a.language!=='zh'||typeof a.summary!=='string'||!sourceOK(a.source)||!/[\\u3400-\\u9fff]/.test(a.summary)||!a.en?.text||!a.zh?.text||!sourceOK(a.en.source)||(a.en.entity&&a.zh.entity&&a.en.entity!==a.zh.entity))return false;"
assert a in s;s=s.replace(a,b,1)
a="text:a.summary.slice(0,850),source:a.source,time:Date.now()";b="text:a.zh.text.slice(0,850),textEn:a.en.text.slice(0,850),source:a.source,englishSource:a.en.source,bilingualTopic:true,time:Date.now()";assert a in s;s=s.replace(a,b,1)
(R/'meaning-explainer-v212.js').write_text(s)
for fn in ['index.html','sw.js']:
 p=R/fn;s=p.read_text();assert 'meaning-explainer-v211.js' in s;s=s.replace('meaning-explainer-v211.js','meaning-explainer-v212.js');p.write_text(s)
print('External candidate prose, live caption fallback, and selected-topic summary now use paired-only learning paths.')
