from pathlib import Path
R=Path(__file__).resolve().parent.parent
p=R/'index.html';s=p.read_text()
assert 'content="2.11.0"' in s
s=s.replace('content="2.11.0"','content="2.12.0"',1)
s=s.replace('<script src="./reader-v211.js"></script>','<script src="./bilingual-seeds-v212.js"></script>\n  <script src="./bilingual-v212.js"></script>\n  <script src="./reader-v212.js"></script>',1)
s=s.replace('./reader-v211.css','./reader-v212.css',1)
s=s.replace("function readerDetailsLoaded(word){return readerLexDetailsLoaded(word)&&(Boolean(window.ROOTLAB_BASIC_CARDS?.[word])||USAGE_BUNDLES.has(word[0]));}","function readerDetailsLoaded(word){return readerLexDetailsLoaded(word)&&(Boolean(window.ROOTLAB_BASIC_CARDS?.[word])||USAGE_BUNDLES.has(word[0]))&&Boolean(window.RootLabBilingual?.has(word));}",1)
s=s.replace('await Promise.all([ensureReaderLexDetails(word),loadUsage(word)])','await Promise.all([ensureReaderLexDetails(word),loadUsage(word),window.RootLabBilingual.ensure(word)])',1)
start=s.index('function readerContext(){');end=s.index('async function downloadReaderOffline',start)
part=s[start:end];part=part.replace('return {word,curated:','return window.RootLabBilingual.enrich({word,curated:',1)
assert 'distractor:wrong?short(wrong.meaning):null};' in part
part=part.replace('distractor:wrong?short(wrong.meaning):null};','distractor:null});',1)
s=s[:start]+part+s[end:]
start=s.index('function readerRelated(');end=s.index('function readerCardData(',start);part=s[start:end]
old="for(const rel of USAGE_MAP.get(word)?.related||[]){if(knownWord(rel.word)&&!seen.has(rel.word)){items.push({word:rel.word,label:rel.label,reason:'相关词义：'+rel.sense});seen.add(rel.word);}if(items.length>=6)break;}"
new="for(const rel of window.RootLabBilingual?.get(word)?.relations||[]){if(knownWord(rel.word)&&!seen.has(rel.word)){items.push({word:rel.word,label:rel.label,reason:rel.zh,reasonEn:rel.en,meaning:rel.wordZh});seen.add(rel.word);}if(items.length>=6)break;}"
assert old in part;part=part.replace(old,new,1);s=s[:start]+part+s[end:]
s=s.replace("['./data/reader-v24-manifest.json','./data/usage-v27-manifest.json']","['./data/reader-v24-manifest.json','./data/usage-v27-manifest.json','./data/bilingual-v212-manifest.json']",1)
s=s.replace('rootlab-offline-20261026-v2110-state-final','rootlab-offline-20261026-v2120-bilingual')
p.write_text(s)
r=(R/'reader-v211.js').read_text()
def function(name,body):
 global r
 a=r.index('function '+name+'(');b=r.find('\nfunction ',a+10)
 if b<0:raise ValueError(name)
 r=r[:a]+body+'\n'+r[b:]
function('wholeMeaningCard',"""function wholeMeaningCard(c,story){const d=c.learning,b=d.basic;
 let content=(window.RootLabMeanings?.render(c)||RootLabBilingual.intro(c))+RootLabBilingual.senses(c);
 if(story.custom)content+='<div class="lr-origin-text"><p class="lr-insight">'+esc(story.lead)+'</p>'+story.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>';
 else if(d.history?.summary)content+='<p class="lr-insight">'+esc(d.history.summary)+'</p>';
 content+=historyOpen(c)+sourceRow(c,story);
 return '<section class="lr-card lr-whole-word" data-module="origin" data-stage="origin">'+cardHead('01','词义与用法 · Meanings', '按义项阅读中英解释，再结合语境理解。')+content+'</section>';
}""")
function('wholeRelations',"function wholeRelations(c){return RootLabBilingual.relations(c);}")
function('wholePhrasesCard',"""function wholePhrasesCard(c){const body=RootLabBilingual.phrases(c);if(!body){const links=wholeRelations(c);return links?'<section class="lr-card" data-module="family" data-stage="family">'+cardHead('02','词义关联 · Related meanings','每个联系都对应一个具体义项。')+links+'</section>':'';}
 return '<section class="lr-card lr-everyday" data-module="family" data-stage="family">'+cardHead('02','搭配与表达 · Expressions','英文表达、中文含义与使用解释逐项对照。')+body+'</section>';
}""")
# Root entries retain all four learning functions; the meanings module uses complete pairs.
old="let body='<div class=\"lr-own-senses\"><h3>'+esc(c.word)+' · 词义</h3>'+displayDefinitions(d.definitions?.length?d.definitions:[c.meaning]).map(definitionRow).join('')+'</div>';\n if(d.english?.length)body+='<div class=\"lr-english-senses\" lang=\"en\">'+d.english.map(x=>'<p>'+esc(x)+'</p>').join('')+'</div>';"
new="let body='<div class=\"lr-own-senses\">'+RootLabBilingual.senses(c)+'</div>';"
assert old in r;r=r.replace(old,new,1)
# All examples, including source ones, use the exact bilingual pair and sense context.
function('exampleMarkup',"function exampleMarkup(c,x,i){return RootLabBilingual.example(c,x,i);}")
# Avoid a random first-word distractor such as success for carrier.
function('quiz',"function quiz(c){const paired=RootLabBilingual.quiz(c);if(paired)return paired;const custom=cards[c.word];return custom?.quiz||null;}")
function('recallMarkup',"""function recallMarkup(c){const q=quiz(c);if(!q)return '';const stored=store.answers[c.word],a=q.signature?(stored?.signature===q.signature?stored:null):stored;return '<section class="lr-recall rd-check" aria-label="可选语境练习" data-stage="recall"><h3>结合语境判断 · Check the context</h3><p>'+esc(q.q)+'</p>'+(q.qEn?'<p class="bi-question" lang="en">'+esc(q.qEn)+'</p>':'')+'<div class="rd-answers">'+q.options.map((v,i)=>'<button data-reader="answer" data-index="'+i+'" '+(a?'disabled':'')+' class="'+(a&&i===q.answer?'is-correct':a&&i===a.index?'is-wrong':'')+'">'+esc(v)+'</button>').join('')+'</div><div class="rd-feedback" aria-live="polite">'+(a?'<p>'+(a.correct?'答对了。':'正确答案：'+esc(q.options[q.answer])+'。')+' '+esc(q.why)+'</p>'+(q.whyEn?'<p lang="en">'+esc(q.whyEn)+'</p>':''):'')+'</div></section>';}
""")
r=r.replace("if(store.answers[ctx.word])return;const q=quiz(ctx),i=Number(btn.dataset.index);","const q=quiz(ctx);if(!q)return;const prev=store.answers[ctx.word];if(prev&&(!q.signature||prev.signature===q.signature))return;const i=Number(btn.dataset.index);",1)
r=r.replace("store.answers[ctx.word]={index:i,correct:i===q.answer}","store.answers[ctx.word]={index:i,correct:i===q.answer,signature:q.signature||''}",1)
# Keep current-source word as primary; remove the single-Chinese-meaning truncation.
r=r.replace("esc(story.custom?.meaning||(c.learning?.basic?.generated?RootLabWholeWords.headline(c.meaning):c.meaning))","esc(story.custom?.meaning||RootLabBilingual.headline(c))",1)
# Historical excerpts also get the paired Chinese passage, not an English-only paragraph.
old="if(rec.excerpt)output+='<p class=\"lr-source-excerpt\" lang=\"en\">'+esc(rec.excerpt)+'</p>';return output;"
new="if(rec.excerpt)output+=RootLabBilingual.historyPair(c.word,rec.excerpt);return output;"
assert old in r;r=r.replace(old,new,1)
# Recommendations no longer paste the source word's definition under another headword.
function('recommendations',"""function recommendations(c){const picks=[],seen=new Set([c.word]);const push=x=>{if(bridge.known(x.word)&&!seen.has(x.word)){seen.add(x.word);picks.push(x);}};
 for(const entry of cards[c.word]?.links||[])push({word:entry[0],label:entry[1],reason:entry[2],meaning:RootLabBilingual.coreMeaning(entry[0]),reasonEn:'Explore this related word in its own context.'});
 const list=c.learning?.route==='whole'?RootLabBilingual.recommendations(c):c.related||[];
 for(const item of list)push({...item,meaning:item.meaning||RootLabBilingual.coreMeaning(item.word),reasonEn:item.reasonEn||'Compare this related word and its uses.'});
 return picks.slice(0,3);}
""")
function('nextReading',"""function nextReading(c){const picks=recommendations(c);return '<footer class="lr-finale rd-next" data-stage="next"><div class="lr-next-title"><h2>继续读一个相关词 · Continue reading</h2><button data-reader="plan" class="rd-text">'+(c.planned?'✓ 已加入复习':'＋ 加入复习')+'</button></div><div class="lr-next-list">'+picks.map(x=>'<button data-reader="next" data-word="'+esc(x.word)+'"><span><b lang="en">'+esc(x.word)+'</b><small>'+esc(x.meaning||x.label)+'</small><i aria-hidden="true">→</i></span>'+RootLabBilingual.pair(x.reasonEn,x.reason,x.translation)+'</button>').join('')+'</div>'+nextStep(c)+'<p class="lr-end-note">标有机译的文本为自动翻译参考，原文保留供对照。 <span lang="en">MT labels identify machine-translated reference text.</span> <a href="./credits.html" target="_blank" rel="noopener noreferrer">资料与许可 · Sources</a></p></footer>';}
""")
r=r.replace('正在补充英文释义与例句…','正在补充中英义项与例句…')
r=r.replace('词根实验室 · V2.11','词根实验室 · V2.12')
# Internal labels such as inflection types are paired too.
for a,b in [('原形','原形 base form'),('复数','复数 plural'),('第三人称单数','第三人称单数 third-person singular'),('现在分词','现在分词 -ing form'),('过去式','过去式 past tense'),('过去分词','过去分词 past participle'),('比较级','比较级 comparative'),('最高级','最高级 superlative')]:
 r=r.replace("'"+a+"'","'"+b+"'")
(R/'reader-v212.js').write_text(r)
css=(R/'reader-v211.css').read_text();(R/'reader-v212.css').write_text(css)
p=R/'sw.js';s=p.read_text();s=s.replace('rootlab-offline-20261026-v2110-state-final','rootlab-offline-20261026-v2120-bilingual')
s=s.replace("'./reader-v211.js'","'./bilingual-seeds-v212.js','./bilingual-v212.js','./reader-v212.js'").replace("'./reader-v211.css'","'./reader-v212.css'")
s=s.replace("'./data/usage-v27-manifest.json'","'./data/usage-v27-manifest.json','./data/bilingual-v212-manifest.json'")
s=s.replace("url.pathname.includes('/data/usage-v27/')","(url.pathname.includes('/data/usage-v27/')||url.pathname.includes('/data/bilingual-v212/'))")
p.write_text(s)
print('V2.12 paired learning renderer installed; legacy study keys unchanged')
