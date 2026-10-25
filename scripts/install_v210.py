#!/usr/bin/env python3
from pathlib import Path
import json,re
R=Path(__file__).resolve().parent.parent
# Remove unwanted pedagogical narration at the source rather than hiding it with CSS.
b=(R/'basic-learning-v261.js').read_text()
phrase=",'它适合把整个词记下来，再通过搭配与表达扩展，而不是硬拆成前缀、词根和后缀。'"
assert phrase in b;b=b.replace(phrase,'',1);(R/'basic-learning-v210.js').write_text(b)
b=(R/'plain-objects-v28.js').read_text();phrase=",'它适合结合实物理解，不必硬拆成 and + iron 来记忆。'";assert phrase in b;b=b.replace(phrase,'',1);(R/'plain-objects-v210.js').write_text(b)
b=(R/'reading-cards-v24.js').read_text();b=b.replace('它说明通信的画面，但不需要把每个相似字母都硬拆成词根。','它把远距离传送声音的用途表达了出来。');(R/'reading-cards-v210.js').write_text(b)
# Unified first-card meaning section for both root and whole-word routes.
s=(R/'reader-v29.js').read_text()
a="let content='<div class=\"lr-whole-senses\">'+rows.map(definitionRow).join('')+'</div>';";assert s.count(a)==1
s=s.replace(a,"let content=(window.RootLabMeanings?.render(c)||'')+'<div class=\"lr-whole-senses\">'+rows.map(definitionRow).join('')+'</div>';",1)
a="+morphology+'<div class=\"lr-origin-text\">'+text";assert s.count(a)==1
s=s.replace(a,"+(window.RootLabMeanings?.render(c)||'')+morphology+'<div class=\"lr-origin-text\">'+text",1)
s=s.replace('词根实验室 · V2.9.0','词根实验室 · V2.10.0').replace('词根实验室 · V2.6.1','词根实验室 · V2.10.0')
(R/'reader-v210.js').write_text(s)
s=(R/'encyclopedia-v29.js').read_text()
s=s.replace('images\\/visual-v29\\/','images\\/visual-v(?:29|210)\\/',1)
a="const automatic=auto&&Boolean(own(hints,word))&&navigator.onLine;"
b="const rootEligible=c.learning?.route==='root'&&c.learning?.pieces?.length>1&&!/(?:sex|porn|nude|breast|penis|vagina|genital|blood|corpse|cancer|suicide|weapon|gun|rifle|bomb|kill|assault|anatom|surgery|disease|injury|dissect)/i.test(word);const automatic=auto&&(Boolean(own(hints,word))||rootEligible)&&navigator.onLine;"
assert a in s;s=s.replace(a,b,1)
a="const head=target.querySelector('.lr-card-head');if(head)head.after(holder);else target.append(holder);"
b="const definition=target.querySelector('.lr-plain-explanation'),head=target.querySelector('.lr-card-head');if(definition)definition.after(holder);else if(head)head.after(holder);else target.append(holder);"
assert a in s;s=s.replace(a,b,1)
# Give a sense-bound selected Chinese encyclopedia article a proper title. Never conflate it with all dictionary meanings.
a="<p class=\"wiki-summary\" lang=\"";b="<p class=\"wiki-selected-meaning\">这个主题具体指什么？</p><p class=\"wiki-summary\" lang=\"";assert a in s;s=s.replace(a,b,1)
(R/'encyclopedia-v210.js').write_text(s)
s=(R/'index.html').read_text();assert 'content="2.9.0"' in s
s=s.replace('content="2.9.0"','content="2.10.0"',1)
for old,new in [('reader-v29.js','reader-v210.js'),('reader-v29.css','reader-v210.css'),('encyclopedia-v29.js','encyclopedia-v210.js'),('basic-learning-v261.js','basic-learning-v210.js'),('reading-cards-v24.js','reading-cards-v210.js'),('plain-objects-v28.js','plain-objects-v210.js')]:
 assert old in s,old;s=s.replace(old,new)
anchor='<script src="./visual-seeds-v29.js"></script>';assert anchor in s
s=s.replace(anchor,anchor+'\n  <script src="./visual-extra-v210.js"></script>\n  <script src="./meaning-notes-v210.js"></script>\n  <script src="./meaning-explainer-v210.js"></script>',1)
a="for(const pair of basic?.examples||[])addExample(pair[0],pair[1],'自编学习例句');";assert a in s
s=s.replace(a,"const plainExample=window.RootLabMeanings?.example(word);if(plainExample)addExample(plainExample.en,plainExample.zh,plainExample.kind);"+a,1)
s=s.replace('rootlab-offline-20261025-v290-visual','rootlab-offline-20261025-v2100-clearmeaning')
# Image aliases need only one physical offline download per unique URL.
a="const pictures=Object.values(window.ROOTLAB_VISUAL_SEEDS||{}).map(r=>({url:r.image.src}));";assert a in s
s=s.replace(a,"const pictures=[...new Set(Object.values(window.ROOTLAB_VISUAL_SEEDS||{}).map(r=>r.image.src))].map(url=>({url}));",1)
(R/'index.html').write_text(s)
s=(R/'sw.js').read_text().replace('rootlab-offline-20261025-v290-visual','rootlab-offline-20261025-v2100-clearmeaning')
for old,new in [('reader-v29.js','reader-v210.js'),('reader-v29.css','reader-v210.css'),('encyclopedia-v29.js','encyclopedia-v210.js'),('basic-learning-v261.js','basic-learning-v210.js'),('reading-cards-v24.js','reading-cards-v210.js'),('plain-objects-v28.js','plain-objects-v210.js')]:s=s.replace(old,new)
s=s.replace("'./visual-seeds-v29.js'","'./visual-seeds-v29.js','./visual-extra-v210.js','./meaning-notes-v210.js','./meaning-explainer-v210.js'",1)
s=s.replace("url.pathname.includes('/images/visual-v29/')","(url.pathname.includes('/images/visual-v29/')||url.pathname.includes('/images/visual-v210/'))")
(R/'sw.js').write_text(s)
css=(R/'reader-v29.css').read_text()+'''\n/* Expanded Chinese definitions precede both pictures and morphology. */
.lr-plain-explanation{padding:17px 19px;margin:14px 0 23px;border-left:3px solid #d39d77;border-radius:0 12px 12px 0;background:#fff8ee}
.lr-meaning-label{font-size:12px;color:#a26a48;font-weight:750;margin-bottom:8px}
.lr-meaning-text{font-size:17px;line-height:1.85;color:#49382d;margin:0!important}
.lr-meaning-note{font-size:13px;line-height:1.7;color:#8d6a54;margin:9px 0 0!important}
.lr-meaning-source{display:inline-block;margin-top:8px;font-size:11px;color:#a26a48;text-underline-offset:3px}
.wiki-selected-meaning{font-size:14px;font-weight:750;color:#705139;margin:15px 0 6px}
@media(max-width:600px){.lr-plain-explanation{padding:14px 13px}.lr-meaning-text{font-size:16px}}
'''
(R/'reader-v210.css').write_text(css)
p=R/'manifest.webmanifest';m=json.loads(p.read_text());m['description']='图解英语词义、中文具体释义、词根前后缀与整词学习；无需会员';p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
# Persist only user-confirmed Chinese topic summaries, without overriding editorial definitions.
p=R/'encyclopedia-v210.js';s=p.read_text();s=s.replace('if(cached){saveChoice(word,title,lang);','if(cached){saveChoice(word,title,lang);window.RootLabMeanings?.fromTopic(word,cached);',1);s=s.replace('remember(key,a);saveChoice(word,title,lang);','remember(key,a);saveChoice(word,title,lang);window.RootLabMeanings?.fromTopic(word,a);',1);s=s.replace('具体事物图片自动查找：','相关图片自动查找：').replace('已整理的配图直接显示；其他具体事物进入视野后会向维基百科查询主题。关闭后仍可手动找图。','已整理的配图直接显示；具体事物和词根词进入视野后会查询相关主题。关闭后仍可手动找图。');p.write_text(s)
p=R/'index.html';s=p.read_text().replace('window.RootLabEncyclopedia?.clear();','window.RootLabEncyclopedia?.clear();window.RootLabMeanings?.clear();',1);p.write_text(s)
p=R/'reader-v210.css';s=p.read_text();s+='\n.lr-meaning-additional{border-top:1px solid #ead5bf;margin-top:12px;padding-top:10px}.lr-meaning-additional strong{font-size:12px;color:#9b6d4d}.lr-meaning-additional p{font-size:14px;line-height:1.75;color:#785944;margin:5px 0 0}\n';p.write_text(s)
print('V2.10 installed: remove narration, shared meaning renderer, root visuals, and unchanged legacy state')
