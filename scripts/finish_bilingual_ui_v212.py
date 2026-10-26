from pathlib import Path
R=Path(__file__).resolve().parent.parent
p=R/'encyclopedia-v211.js';s=p.read_text()
needle="const normalizeTitle=t=>"
assert needle in s
s=s.replace(needle,"pinned.carrier=[{title:'Common carrier',zhTitle:'公共承运人',sense:'运输服务 Transport services'},{title:'Mobile network operator',zhTitle:'移动通信运营商',sense:'移动网络 Mobile network'},{title:'Aircraft carrier',zhTitle:'航空母舰',sense:'舰船 Naval vessel'},{title:'Carrier bag',zhTitle:'购物袋',sense:'日常物品 Everyday object'}];\n"+needle,1)
# Keep paired Wikipedia articles; an unpaired external article remains a source link,
# not an English-only learning paragraph presented as a bilingual definition.
needle="const photo=imageMarkup(a.image)||placeholder(zh?.title||a.title,en?.title||'百科主题');"
assert needle in s
s=s.replace(needle,needle+"\n if(!en||!zh)return '<article class=\"wiki-article bi-source-pending\"><div class=\"wiki-heading\"><h3>'+esc(zh?.title||a.title)+'</h3></div>'+photo+'<p>这个百科主题暂未提供完整的中英文对照；当前单词的双语释义仍在本卡片中。</p><p lang=\"en\">A complete bilingual overview is not available for this topic. The paired dictionary meanings remain available below.</p><a href=\"'+esc(a.source)+'\" target=\"_blank\" rel=\"noopener noreferrer\">阅读原始来源 · Read original source ↗</a></article>';",1)
# Candidates need a short bilingual description rather than a long monolingual extract.
old="esc(r.disambiguation?'先确认具体主题':r.summary||'查看这个主题的介绍')"
new="esc(r.disambiguation?'多个含义 · Choose a specific sense':r.sense||'百科主题 · Wikipedia topic')"
if old in s:s=s.replace(old,new,1)
(R/'encyclopedia-v212.js').write_text(s)
# Refuse to call an untranslated external etymology passage a bilingual lesson.
p=R/'history-ui-v24.js';h=p.read_text()
# The core historical excerpts are paired by the new reader; the on-demand original
# remains available in a separately attributed source area, outside generated senses.
# Keep the existing source fetch unchanged to avoid falsifying a translation.
for name in ['index.html','sw.js']:
 p=R/name;t=p.read_text().replace('encyclopedia-v211.js','encyclopedia-v212.js');p.write_text(t)
p=R/'navigation-v211.js';n=p.read_text();n=n.replace("'2.11.0'","'2.12.0'");(R/'navigation-v212.js').write_text(n)
for name in ['index.html','sw.js']:
 p=R/name;t=p.read_text().replace('navigation-v211.js','navigation-v212.js');p.write_text(t)
print('Sense-bound carrier topics and bilingual-only encyclopedia paragraphs added')
