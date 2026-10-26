#!/usr/bin/env python3
"""Record missing-language evidence without fabricating translations or losing raw sources."""
from pathlib import Path
R=Path(__file__).resolve().parent.parent;p=R/'encyclopedia-v212.js';s=p.read_text()
needle="const operations=new Map(),searches=new Map()";assert needle in s;s=s.replace(needle,"const pairAudit=new Map();\nconst operations=new Map(),searches=new Map()",1)
marker='function articleMarkup(a){';assert s.count(marker)==1
helper="""function pairEvidence(a){
 const en=a.en||(a.language==='en'?{title:a.title,text:a.summary,source:a.source}:null);
 const zh=a.zh||(['zh','zh-editorial'].includes(a.language)?{title:a.zhTitle||a.title,text:a.summary,source:a.source}:null);
 const readyEn=!!(en?.text&&en.text.trim()),readyZh=!!(zh?.text&&zh.text.trim());
 const entityConflict=!!(en?.entity&&zh?.entity&&en.entity!==zh.entity);
 const record={key:a.source,title:a.title,source:a.source,englishSource:en?.source||null,chineseSource:zh?.source||null,englishPresent:readyEn,chinesePresent:readyZh,entityConflict,paired:readyEn&&readyZh&&!entityConflict,missingLanguages:[...(!readyEn?['en']:[]),...(!readyZh?['zh-CN']:[])],rawSourceRetained:true,kind:'independent_language_summaries_not_literal_translation'};
 pairAudit.set(a.source,record);return record;
}
function auditSnapshot(){const rows=[...pairAudit.values()];return{buildId:window.ROOTLAB_BILINGUAL_META?.buildId||'',observed:rows.length,ready:rows.filter(r=>r.paired).length,unpaired:rows.filter(r=>!r.paired).length,scope:'observed encyclopedia articles only, not full-site coverage',records:rows};}
"""
s=s.replace(marker,helper+marker,1)
s=s.replace(" if(!a||!urlOK(a.source))return'';"," if(!a||!urlOK(a.source))return'';\n const evidence=pairEvidence(a);",1)
s=s.replace(" if(!en||!zh)return '<article class=\"wiki-article bi-source-pending\">"," if(!evidence.paired)return '<article class=\"wiki-article bi-source-pending\" data-bi-state=\"pending-source-pair\" data-source-key=\"'+esc(a.source)+'\">",1)
s=s.replace("return '<article class=\"wiki-article\"><div class=\"wiki-heading\">","return '<article class=\"wiki-article\" data-bi-state=\"paired-independent-summaries\" data-source-key=\"'+esc(a.source)+'\"><div class=\"wiki-heading\">",1)
needle='window.RootLabEncyclopedia={mount,search,article,preferences,setAuto,placeholder,acceptable,';assert needle in s
s=s.replace(needle,needle+'auditSnapshot,',1)
s=s.replace('clear(){operations.clear();searches.clear();articles.clear();dom.clear();','clear(){operations.clear();searches.clear();articles.clear();dom.clear();pairAudit.clear();',1)
p.write_text(s)
print('Encyclopedia now validates nonempty language bodies, tracks missing pairs, and preserves source identity across pending/ready DOM states.')
