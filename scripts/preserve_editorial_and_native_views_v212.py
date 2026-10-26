#!/usr/bin/env python3
"""Keep reviewed basic-word lessons and expose added source pairs without deletion.
Primary curated collocations retain their order; extra source expressions remain
fully visible as a separate group. Native source blocks are never positionally
presented as translations of unrelated WordNet meanings.
"""
from pathlib import Path
R=Path(__file__).resolve().parent.parent;p=R/'bilingual-v212.js';s=p.read_text()
old="b.phrases=(x.word==='carrier'?x.phrases:[...manual,...x.phrases]).filter((p,i,arr)=>arr.findIndex(q=>key(q.en)===key(p.en))===i).map(p=>({...pmap.get(key(p.en)),...p}));"
new="""if(!b.generated&&x.word!=='carrier'){
 b.phrases=manual.map(p=>({...pmap.get(key(p.en)),...p}));
 b.supplementalPhrases=x.phrases.filter(p=>!manual.some(q=>key(q.en)===key(p.en)));
}else{
 b.phrases=(x.word==='carrier'?x.phrases:[...manual,...x.phrases]).filter((p,i,arr)=>arr.findIndex(q=>key(q.en)===key(p.en))===i).map(p=>({...pmap.get(key(p.en)),...p}));b.supplementalPhrases=[];
}"""
assert old in s;s=s.replace(old,new,1)
s=s.replace('<div class="bi-sense-list">','<div class="bi-sense-list lr-english-senses">',1)
needle="function intro(c){"
assert needle in s
extra="""function nativeSummary(c){
 const source=get(c.word)?.nativeSourceSummary,rows=source?.pairs||[];
 if(!rows.length)return '';
 return '<section class="bi-native-source"><h3>原词库释义对照 <span lang="en">Additional source meanings</span></h3>'+rows.map(p=>'<section class="bi-native-block" data-native-source-id="'+esc(p.id)+'">'+pair(p.en||'English counterpart pending review.',p.zh,p.translation)+'</section>').join('')+'</section>';
}
function supplementalPhrases(c){
 const rows=c.learning?.basic?.supplementalPhrases||[];if(!rows.length)return '';
 return '<section class="bi-supplement-phrases"><h3>更多资料中的表达 <span lang="en">Further source expressions</span></h3>'+rows.map(p=>'<section class="bi-supplement-phrase-row" data-phrase-id="'+esc(p.id||'')+'">'+pair(p.en,p.zh,p.translation)+(p.definition&&p.definitionZh?pair(p.definition,p.definitionZh,p.definitionTranslation):'')+'</section>').join('')+'</section>';
}
"""
s=s.replace(needle,extra+needle,1)
s=s.replace('coreMeaning,senses,intro,phrases,relations','coreMeaning,senses,nativeSummary,supplementalPhrases,intro,phrases,relations',1)
p.write_text(s)
p=R/'reader-v212.js';s=p.read_text()
old="RootLabBilingual.senses(c);"
# The whole-word card used this statement once; make native source blocks explicit.
assert s.count(old)==1;s=s.replace(old,"RootLabBilingual.senses(c)+RootLabBilingual.nativeSummary(c);",1)
needle="let body='<div class=\"lr-own-senses\">'+RootLabBilingual.senses(c)+'</div>';"
assert needle in s;s=s.replace(needle,"let body='<div class=\"lr-own-senses\">'+RootLabBilingual.senses(c)+RootLabBilingual.nativeSummary(c)+'</div>';",1)
needle="+rows+'<div class=\"lr-sources\">'+refs+'</div></section>';"
assert s.count(needle)==1;s=s.replace(needle,"+rows+RootLabBilingual.supplementalPhrases(c)+'<div class=\"lr-sources\">'+refs+'</div></section>';",1)
p.write_text(s)
p=R/'reader-v212.css';s=p.read_text();s+='''
/* Source blocks are independent records, not positional translations. */
.bi-native-source,.bi-supplement-phrases{margin:20px 0;padding-top:16px;border-top:1px solid #e9dacd}
.bi-native-source h3,.bi-supplement-phrases h3{font-size:16px;line-height:1.7}
.bi-native-source h3 span,.bi-supplement-phrases h3 span{display:block;font-size:12px;color:#927968}
.bi-native-block,.bi-supplement-phrase-row{padding:10px 0;border-bottom:1px solid #f1e6dc}
.bi-sense-list.lr-english-senses{margin:0;padding:0;background:none;border:0}
''';p.write_text(s)
print('Reviewed collocations kept; supplemental expressions and original-source pairs exposed.')
