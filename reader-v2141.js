/* V2.6 complete learning cards. No external telemetry or account required.
 * Word visits and seconds describe browsing, not mastery. All storage is local.
 */
(function(){'use strict';
const KEY='rootlab_reader_v24',cards=window.ROOTLAB_READING_CARDS||{},routes=window.ROOTLAB_READING_ROUTES||[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={
 sound:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
 star:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>'};
function motion(){return matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';}
const $=id=>document.getElementById(id),validWord=w=>typeof w==='string'&&/^[a-z]{2,35}$/.test(w);
let landing=true,currentPlan=null,currentModel=null,requestEpoch=0,completionView=null;
let bridge=null,ctx=null,ready=false,visible=true,restore=null,loading=false,error='',lastInput=Date.now(),inViewport=true,stamp=Date.now(),offlineController=null;
const blank=()=>({schema:1,mode:'quick',last:null,trail:[],route:null,answers:{},events:[],counts:{views:0,expands:0,started:0,completed:0,answered:0,correct:0,seconds:0}});
function cleanAnchor(x){return x&&validWord(x.word)&&['sense','module','id'].includes(x.kind)&&typeof x.value==='string'&&x.value.length<240?{word:x.word,kind:x.kind,value:x.value,offset:Math.max(-10000,Math.min(10000,Number(x.offset)||0))}:null;}
function clean(raw){const out=blank();if(!raw||raw.schema!==1)return out;
 out.mode=raw.mode==='explore'?'explore':'quick';
 out.trail=(Array.isArray(raw.trail)?raw.trail:[]).filter(x=>validWord(x?.word)).slice(-12).map(x=>({word:x.word,y:Math.max(0,Math.min(100000,Number(x.y)||0)),open:Array.isArray(x.open)?x.open.filter(z=>typeof z==='string').slice(0,12):[],anchor:cleanAnchor(x.anchor)}));
 out.last=validWord(raw.last?.word)?{word:raw.last.word,y:Math.max(0,Math.min(100000,Number(raw.last.y)||0)),open:Array.isArray(raw.last.open)?raw.last.open.slice(0,12):[],anchor:cleanAnchor(raw.last.anchor)}:null;
 const r=routes.find(x=>x.id===raw.route?.id);if(r)out.route={id:r.id,index:Math.max(0,Math.min(r.words.length-1,Number(raw.route.index)||0)),seen:(Array.isArray(raw.route.seen)?raw.route.seen:[]).filter(x=>r.words.includes(x)),done:raw.route.done===true};
 for(const k of Object.keys(out.counts))out.counts[k]=Math.max(0,Math.min(1e8,Number(raw.counts?.[k])||0));
 out.events=(Array.isArray(raw.events)?raw.events:[]).filter(e=>typeof e?.type==='string'&&Number.isFinite(e.at)).slice(-300);
 for(const [w,v] of Object.entries(raw.answers||{}))if(validWord(w)&&Number.isInteger(v?.index)&&v.index>=0&&v.index<4)out.answers[w]={index:v.index,correct:v.correct===true,signature:typeof v.signature==='string'?v.signature:''};
 return out;
}
let store;try{store=clean(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(_){store=blank();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store));}catch(_){/* Read-only/private mode must not block dictionary use. */}}
function event(type,word){store.events.push({type,word:word||'',at:Date.now()});store.events=store.events.slice(-300);save();}
function remember(){if(!ctx||!visible||landing)return;const node=$('readerV24'),open=node?Array.from(node.querySelectorAll('details[open][data-reader-key]')).map(x=>x.dataset.readerKey):[];
 const row={word:ctx.word,y:window.scrollY||0,open,anchor:capturePosition()};store.last=row;
 const t=store.trail.at(-1);if(t?.word===ctx.word)Object.assign(t,row);save();}
function beforeOpen(){completionView=null;requestEpoch++;window.RootLabNavigation?.position();remember();landing=false;error='';loading=false;}
function sourceLinks(word,custom){const list=custom?.source?[{url:custom.source,label:'词源参考'}]:[];return list.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label)+' ↗</a>').join('');}
function storyFor(c){const custom=cards[c.word],record=window.RootLabHistoryUI?.record(c.word),local=c.notes||{};
 if(custom)return{hook:custom.hook,lead:custom.lead,paragraphs:custom.story,custom,source:sourceLinks(c.word,custom)};
 if(record)return{hook:record.status==='source_formation'||record.status==='teaching_formation'?'拆开 '+c.word+'，能发现什么构词线索？':'“'+c.word+'”的来历，藏在哪些旧词形里？',lead:record.summary||local.story||c.meaning,paragraphs:[local.story||record.summary,local.memory].filter(Boolean),custom:null,source:''};
 return{hook:'除了中文意思，'+c.word+' 还有哪些用法？',lead:'先理解常见义项，再结合例句和词源资料继续看。',paragraphs:[],custom:null,source:''};}
function quiz(c){const paired=RootLabBilingual.quiz(c);if(paired)return paired;const custom=cards[c.word];return custom?.quiz||null;}

function example(c,story){const ex=story.custom?.example||(c.example?[c.example,c.translation||'']:null);
 if(!ex)return '';
 return '<div class="rd-example"><p lang="en">'+esc(ex[0])+'</p>'+(ex[1]?'<p class="rd-example-zh">'+esc(ex[1])+'</p>':'')+'<button data-reader="speak-example" class="rd-text" aria-label="朗读例句">听例句</button></div>';
}
function crumb(){if(store.trail.length<2)return '';const previous=store.trail.at(-2);
 return '<nav class="rd-breadcrumb" aria-label="返回上一词"><button data-reader="return" data-word="'+esc(previous.word)+'">← '+esc(previous.word)+'</button></nav>';
}
function routeBar(c){const active=store.route,r=routes.find(x=>x.id===active?.id);if(!r||active.done||!r.words.includes(c.word))return '';
 const n=r.words.indexOf(c.word);return '<aside class="rd-route-bar" aria-label="当前路线"><div><b>'+esc(r.title)+'</b><span class="rd-route-position">'+(n+1)+' / '+r.words.length+'</span></div><button class="rd-text" data-reader="leave-route">退出路线</button></aside>';
}
function recommendations(c){const picks=[],seen=new Set([c.word]);const push=x=>{if(bridge.known(x.word)&&!seen.has(x.word)){seen.add(x.word);picks.push(x);}};
 for(const entry of cards[c.word]?.links||[])push({word:entry[0],label:entry[1],reason:entry[2],meaning:RootLabBilingual.coreMeaning(entry[0]),reasonEn:RootLabAuthored.lookup(entry[2])?.en||''});
 const list=[...RootLabBilingual.recommendations(c),...(c.related||[])];
 for(const item of list)push({...item,meaning:item.meaning||RootLabBilingual.coreMeaning(item.word),reasonEn:item.reasonEn||RootLabAuthored.lookup(item.reason)?.en||''});
 return picks.slice(0,3);}


function nextStep(c){const active=store.route,r=routes.find(x=>x.id===active?.id);if(!r||active.done||!r.words.includes(c.word))return '';
 const idx=r.words.indexOf(c.word),last=idx===r.words.length-1;
 return '<div class="rd-route-next"><button class="rd-primary" data-reader="advance">'+(last?'完成本轮':'下一词 · '+esc(r.words[idx+1]))+' →</button></div>';
}
/* V2.6. The reference's four learning functions, shown in full, not accordions. */
function unfoldPanels(root){if(!root)return;for(const old of [...root.querySelectorAll('details')].reverse()){const panel=document.createElement('section');panel.className=old.className+' open-panel';if(old.id)panel.id=old.id;for(const child of [...old.childNodes]){if(child.nodeName==='SUMMARY'){const h=document.createElement('h3');h.className='open-panel-title';while(child.firstChild)h.append(child.firstChild);panel.append(h);}else panel.append(child);}old.replaceWith(panel);}}
function cardHead(n,title,question){return '<header class="lr-card-head"><span class="lr-number" aria-hidden="true">'+n+'</span><div><h2>'+esc(title)+'</h2>'+(question?'<p>'+esc(question)+'</p>':'')+'</div></header>';}
function marked(text,forms){const parts=(forms||[]).filter(x=>typeof x==='string'&&x.length>=3).sort((a,b)=>b.length-a.length);if(!parts.length)return esc(text);const safe=parts.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');const rx=new RegExp('('+safe+')','ig');return String(text).split(rx).map((p,i)=>i%2?'<em>'+esc(p)+'</em>':esc(p)).join('');}
function sourceRow(c,story){const all=[...(c.learning?.history?.sources||[])];if(c.learning?.history?.sourceUrl)all.push({url:c.learning.history.sourceUrl,label:'Wiktionary'});if(story.custom?.source)all.push({url:story.custom.source,label:'词源参考'});const seen=new Set(),links=all.filter(x=>/^https:\/\//.test(x.url||'')&&!seen.has(x.url)&&seen.add(x.url));return links.length?'<div class="lr-sources">'+links.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label||'词源资料')+' ↗</a>').join('')+(c.learning?.history?.sourceUrl?'<span>Wiktionary 贡献者 · CC BY-SA 4.0</span>':'')+'</div>':'';}
function historyOpen(c){const rec=c.learning?.history;if(!rec)return '';const steps=rec.timeline||[];const chronological=!rec.status;let output='';
 if(steps.length)output='<div class="lr-history" data-stage="history"><h3>'+(chronological?'这个意思是怎样形成的？':rec.status==='source_path'?'沿着旧词形，找到今天的意思':'从组成关系，到今天的用法')+'</h3><div class="'+(chronological?'lr-timeline':'lr-history-forms')+'">'+steps.map(x=>'<div class="lr-history-step"><span>'+esc(x.era)+'</span><div><b>'+esc(x.term)+'</b><p>'+esc(x.note)+'</p></div></div>').join('')+'</div></div>';
 if(rec.excerpt)output+=RootLabBilingual.historyPair(c.word,rec.excerpt);return output;
}
function morphologyOpen(c){const d=c.learning||{},parts=(d.pieces||[]).map(p=>c.word==='photograph'&&p.part==='photo'?{...p,role:'构词成分',meaning:'光',roleEn:'Combining form',meaningEn:'light'}:p);if(!parts.length)return '';
 return '<div class="lr-parts '+(d.pieceType==='affix'?'lr-affix-only':'')+'">'+parts.map((p,i)=>'<div class="lr-part '+(/词根/.test(p.role)?'lr-core':'')+'"><span '+(p.roleEn?'data-authored-done="1"':'')+'>'+esc(p.role)+(p.roleEn?'<small lang="en">'+esc(p.roleEn)+'</small>':'')+'</span><b lang="en">'+esc(p.part)+'</b><small '+(p.meaningEn?'data-authored-done="1"':'')+'>'+esc(p.meaning)+(p.meaningEn?'<span lang="en">'+esc(p.meaningEn)+'</span>':'')+'</small></div>').join(d.pieceType==='affix'?'':'<span class="lr-plus" aria-hidden="true">+</span>')+'</div>'+
 (d.pieceType==='affix'?'<p class="lr-muted">词缀联想，用于辅助记忆。</p>':'<p class="lr-formula">'+parts.map(p=>'<b lang="en">'+esc(p.part)+'</b>').join('<span> + </span>')+'<span> → </span><strong lang="en">'+esc(c.word)+'</strong></p>');
}

function recallMarkup(c){const q=quiz(c);if(!q)return '';const stored=store.answers[c.word],a=q.signature?(stored?.signature===q.signature?stored:null):stored;return '<section class="lr-recall rd-check" aria-label="可选语境练习" data-stage="recall"><h3>结合语境判断 · Check the context</h3><p>'+esc(q.q)+'</p>'+(q.qEn?'<p class="bi-question" lang="en">'+esc(q.qEn)+'</p>':'')+'<div class="rd-answers">'+q.options.map((v,i)=>'<button data-reader="answer" data-index="'+i+'" '+(a?'disabled':'')+' class="'+(a&&i===q.answer?'is-correct':a&&i===a.index?'is-wrong':'')+'">'+esc(v)+'</button>').join('')+'</div><div class="rd-feedback" aria-live="polite">'+(a?'<p>'+(a.correct?'答对了。':'正确答案：'+esc(q.options[q.answer])+'。')+' '+esc(q.why)+'</p>'+(q.whyEn?'<p lang="en">'+esc(q.whyEn)+'</p>':''):'')+'</div></section>';}


function nextReading(c){const picks=recommendations(c),related=RootLabBilingual.get(c.word)?.relations||[];
 return '<footer class="lr-finale rd-next" data-stage="next"><div class="lr-next-title"><h2>接着认识一个词 <small lang="en">Continue reading</small></h2></div><div class="lr-next-list">'+picks.map(x=>{const seen=related.some(r=>r.word===x.word&&r.en===x.reasonEn&&r.zh===x.reason);return '<button data-reader="next" data-word="'+esc(x.word)+'"><span><b lang="en">'+esc(x.word)+'</b><small class="bi-recommendation-label">'+esc(x.label||'相关词')+' · '+esc(x.labelEn||({'构词关系':'Word formation','词根例词关联':'Root-family example','派生关系':'Derived word','词义对比':'Meaning contrast','同根词':'Root family','工作场景':'Work context'}[x.label]||'Related word'))+'</small><i aria-hidden="true">→</i></span>'+(seen?'':RootLabBilingual.pair(x.reasonEn,x.reason,x.translation))+'</button>';}).join('')+'</div>'+nextStep(c)+'<p class="lr-end-note">标有机译的文本为自动翻译参考，原文保留供对照。 <span lang="en">MT labels identify machine-translated reference text.</span> <a href="./credits.html" target="_blank" rel="noopener noreferrer">资料与许可 · Sources</a></p></footer>';
}

function capturePosition(){const root=$('readerV24');if(!root||root.hidden||landing)return null;
 const nodes=[...root.querySelectorAll('[data-sense-id],.rp-example-record[id],[data-plan-module],[data-module]')];
 const el=nodes.filter(n=>n.getBoundingClientRect().top<=90).sort((a,b)=>b.getBoundingClientRect().top-a.getBoundingClientRect().top)[0];
 if(!el)return null;return {word:ctx.word,kind:el.hasAttribute('data-sense-id')?'sense':el.hasAttribute('data-plan-module')?'module':'id',value:el.dataset.senseId||el.dataset.planModule||el.id,offset:el.getBoundingClientRect().top};}
function restorePosition(anchor,y=0){const root=$('readerV24');let el=null;if(anchor&&anchor.word===ctx?.word){
 const value=CSS.escape(anchor.value||'');el=root?.querySelector(anchor.kind==='sense'?'[data-sense-id="'+value+'"]':anchor.kind==='module'?'[data-plan-module="'+value+'"]':'#'+value);}
 if(el)window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-Number(anchor.offset||0)),behavior:'instant'});else window.scrollTo({top:Math.max(0,Number(y)||0),behavior:'instant'});}
function paint(){if(!ready||!ctx||landing)return;
 // A late same-word hydration or review enrollment must not replace route completion.
 if(completionView&&store.route?.done&&completionView.routeId===store.route.id&&completionView.word===ctx.word){paintComplete();return;}
 const node=$('readerV24'),c=ctx,story=storyFor(c),previous=capturePosition(),oldY=scrollY;
 const x=RootLabBilingual.get(c.word);currentModel=RootLabReadingAdapters.adapt(c,x,{buildId:ROOTLAB_BILINGUAL_META.buildId,custom:cards[c.word],plain:window.RootLabMeanings?.entry(c.word),knownImage:!!window.ROOTLAB_VISUAL_SEEDS?.[c.word]||!!window.ROOTLAB_ENCYCLOPEDIA_SEEDS?.[c.word],quiz:quiz(c)});
 currentPlan=RootLabReadingPlan.buildReadingPlan(currentModel);
 const body=RootLabReaderComponents.render(currentPlan,currentModel,{icons,marked,morphology:()=>morphologyOpen(c),history:()=>historyOpen(c),sources:()=>sourceRow(c,story),recall:()=>recallMarkup(c)});
 const media=node.querySelector('.wiki-enrichment');const keep=media?.dataset.wikiWord===c.word?media:null;
 const status=error?'<span lang="zh-CN">'+esc(error)+'</span><span lang="en">Additional material could not be loaded. Existing entries remain available.</span> <button data-reader="retry-detail" class="rd-text">重试 · Retry</button>':loading?'<span lang="zh-CN">正在补充中英义项与例句…</span><span lang="en">Loading bilingual meanings and examples…</span>':'';
 node.innerHTML=crumb()+routeBar(c)+body+'<div class="lr-data-status" role="status">'+status+'</div>'+nextReading(c);
 if(keep)node.querySelector('[data-v214-media="'+(keep.dataset.mediaPosition||'more')+'"]').append(keep);
 window.RootLabEncyclopedia?.mount(node,c);window.RootLabAuthored?.decorate(node);window.RootLabReadingUI?.enhance(node,c,currentPlan);
 updateHome();observe();if(previous)restorePosition(previous,oldY);
}
async function loadDetails(){if(!ready||!ctx||landing||loading||bridge.loaded(ctx.word))return;const word=ctx.word,epoch=requestEpoch;loading=true;error='';const slot=$('readerV24')?.querySelector('.lr-data-status');if(slot)slot.innerHTML='<span lang="zh-CN">正在补充中英义项与例句…</span><span lang="en">Loading bilingual meanings and examples…</span>';
 try{await bridge.hydrate(word);if(ctx?.word!==word||landing||epoch!==requestEpoch)return;loading=false;error='';const y=scrollY;const anchor=[...$('readerV24').querySelectorAll('[data-stage]')].reverse().find(x=>x.getBoundingClientRect().top<=90);const key=anchor?.dataset.stage,offset=anchor?.getBoundingClientRect().top;bridge.refresh();if(y>100&&key){const same=$('readerV24').querySelector('[data-stage="'+key+'"]');if(same)window.scrollTo({top:same.getBoundingClientRect().top+scrollY-offset,behavior:'instant'});}else window.scrollTo({top:y,behavior:'instant'});}
 catch(_){if(ctx?.word!==word||landing||epoch!==requestEpoch)return;loading=false;error='扩展资料暂未加载；已有词义和词根可继续阅读。';const slot=$('readerV24')?.querySelector('.lr-data-status');if(slot)slot.innerHTML='<span lang="zh-CN">'+esc(error)+'</span><span lang="en">Additional material could not be loaded; existing meanings and roots remain available.</span> <button data-reader="retry-detail" class="rd-text">重试 · Retry</button>';}}
function routePicker(){let el=$('readerRoutesV26');if(!el){el=document.createElement('section');el.id='readerRoutesV26';el.className='rd-route-picker open-panel';$('rootsView').querySelector('#rootLibraryToggle').after(el);}el.innerHTML='<h3>词族路线 <span>每组 4 词</span></h3><div class="rd-route-grid">'+routes.map(r=>'<button data-reader="start-route" data-route="'+esc(r.id)+'"><b>'+esc(r.title)+'</b><span>'+esc(r.description)+'</span><small>'+esc(r.kind)+'</small></button>').join('')+'</div>';}
function setView(view){window.RootLabReadingUI?.view(view);window.RootLabNavigation?.commit(landing?'':ctx?.word||'',view);visible=view==='learn';document.body.dataset.appView=view;stamp=Date.now();if(view==='roots')routePicker();if(view==='profile'){$('readingStatsV24')?.remove();$('profileBody')?.insertAdjacentHTML('beforeend',statsMarkup());const about=$('profileBody')?.querySelector('#readingStatsV24 .visual-preference');if(!about)$('readingStatsV24')?.insertAdjacentHTML('beforeend',window.RootLabEncyclopedia?.preferences()||'');}unfoldPanels($(view+'View'));}

function paintComplete(){const r=routes.find(x=>x.id===store.route?.id);if(!r||!store.route.done)return;
 if(!completionView){requestEpoch++;loading=false;}
 completionView={routeId:r.id,word:ctx?.word};
 const reviewed=store.route.seen,correct=reviewed.filter(w=>store.answers[w]?.correct).length;
 $('readerV24').innerHTML='<section class="rd-complete"><h2>本轮阅读完成</h2><p>'+esc(r.title)+'</p><div class="rd-complete-numbers"><div><b>'+reviewed.length+'</b><span>浏览过的词</span></div><div><b>'+correct+'</b><span>回忆题首答正确</span></div></div><div class="rd-complete-words">'+reviewed.map(w=>'<button data-reader="next" data-word="'+esc(w)+'">'+esc(w)+'</button>').join('')+'</div><p class="rd-muted">浏览过不等于已经掌握，可加入复习继续巩固。</p><button class="rd-primary" data-reader="save-route">把这组词加入复习</button><button class="rd-text" data-reader="finish-home">返回查词</button></section>';updateHome();}
let observer;
function observe(){if(!('IntersectionObserver' in window))return;observer?.disconnect();observer=new IntersectionObserver(entries=>{inViewport=entries.some(e=>e.isIntersecting);});observer.observe($('readerV24'));}
function show(c){if(!ready||!c)return;if(landing){$('readerV24').hidden=true;updateHome();return;}const changed=ctx?.word!==c.word;ctx=c;
 if(changed){error='';loading=false; if(restore?.word!==c.word){const last=store.trail.at(-1);if(last?.word!==c.word){store.trail.push({word:c.word,y:0,open:[]});store.trail=store.trail.slice(-12);}}if(!initializing){store.counts.views++;event('word_view',c.word);} }
 window.RootLabNavigation?.commit(c.word,'learn');
 const node=$('readerV24');node.hidden=false;if(changed)node.innerHTML='';paint();save();if(!bridge.loaded(c.word)){const opened=c.word;setTimeout(()=>{if(ctx?.word===opened&&!landing)loadDetails();},0);}}
function afterOpen(){if(!ready)return false;if(landing)return true;
 const pending=restore;restore=null;setTimeout(()=>{if(pending?.word===ctx?.word){for(const d of $('readerV24').querySelectorAll('details[data-reader-key]'))d.open=!!pending.open?.includes(d.dataset.readerKey);restorePosition(pending.anchor,pending.y||0);}else $('readerV24').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});},90);return true;}
function go(word,reason){if(!bridge.known(word))return;beforeOpen();if(reason==='next')event('related_next',word);bridge.open(word);}
function updateHome(){const el=$('readerHomeV24');if(!el||!ready)return;el.hidden=!landing;
 if(!landing)return;
 const last=store.last,recent=[...new Set(store.trail.map(x=>x.word).reverse())].slice(0,4);
 el.innerHTML=(last?'<button class="rd-resume" data-reader="resume">继续上次 · '+esc(last.word)+' →</button>':'')+
 '<div class="rd-home-words"><p>'+ (recent.length?'最近查询':'试着查一个词')+'</p><div>'+(recent.length?recent:['resilient','concession','procedure']).map(w=>'<button class="rd-text" data-reader="home-word" data-word="'+esc(w)+'">'+esc(w)+'</button>').join('')+'</div></div><button class="rd-text" data-reader="browse-routes">去词库，挑一条词族路线 →</button>';
}
function showHome(){completionView=null;requestEpoch++;window.RootLabReadingUI?.view('home');window.RootLabNavigation?.position();remember();landing=true;window.RootLabNavigation?.commit('','learn');(bridge.home||(()=>bridge.navigate('learn')))();$('readerV24').hidden=true;$('searchInput').value='';$('searchSuggestions').classList.add('hidden');updateHome();window.scrollTo({top:0,behavior:motion()});}
function statsMarkup(){const c=store.counts;return '<section id="readingStatsV24" class="rd-local-stats"><section class="page-fold open-panel"><h3 class="open-panel-title">阅读足迹</h3><div class="page-fold-body"><p>只记录本机操作，没有上传数据；浏览记录不是学习效果评分。</p>'+(c.views?'<div class="rd-stats-grid"><div><b>'+c.views+'</b><span>查词浏览</span></div><div><b>'+Math.floor(c.seconds/60)+'</b><span>前台活跃分钟（估计）</span></div></div>':'<p>从一个单词开始，这里会保留你的阅读足迹。</p>')+'<p>回忆题首答：'+c.correct+' / '+c.answered+'。后台及长时间未操作不计入活跃时间。</p><button data-reader="export" class="outline-btn">导出阅读记录</button><button data-reader="clear" class="rd-text">清空阅读足迹</button></div></section><section class="page-fold open-panel"><h3 class="open-panel-title">离线资料</h3><div class="page-fold-body"><p>基本释义与精选词源可离线使用；完整中英释义、例句和已整理的图片按需缓存，也可下载全部本地扩展资料。在线新找的图片仍可能需要联网。</p><button data-reader="offline" class="outline-btn">下载完整资料</button><button data-reader="cancel-offline" class="rd-text">停止下载</button><p id="rdOfflineProgress" role="status">尚未下载全部扩展资料。</p></div></section><section class="page-fold open-panel"><h3 class="open-panel-title">关于与隐私</h3><div class="page-fold-body"><p>免费使用，无需会员。收藏、复习计划和阅读足迹仅保存在当前浏览器；清除浏览器数据前请导出备份。</p><p>在线查询会把当前单词发送至第三方词典；开启自动找图时，进入阅读视野的具体事物会向维基百科查询主题，可在下方关闭。例句及词源资料的来源、许可均保留在完整资料中。</p><a href="./credits.html" target="_blank" rel="noopener noreferrer">资料版权与许可 →</a><p class="about-version">词根实验室 · V2.14.1</p></div></section></section>';}

function startRoute(id){const r=routes.find(x=>x.id===id);if(!r)return;store.route={id,index:0,seen:[],done:false};store.mode='explore';store.counts.started++;event('route_start',r.words[0]);go(r.words[0]);}
function act(btn){const cmd=btn.dataset.reader;
 if(cmd==='home'){showHome();return;}
 else if(cmd==='browse-routes'){bridge.navigate('roots');routePicker();$('readerRoutesV26').scrollIntoView({block:'start',behavior:motion()});}
 else if(cmd==='home-word'){store.mode='quick';go(btn.dataset.word);}
 else if(cmd==='mode'){remember();store.mode=btn.dataset.mode==='explore'?'explore':'quick';if(store.mode==='explore'){store.counts.expands++;event('explore_open',ctx.word);}paint();save();const target=store.mode==='explore'?$('rdStoryHeading'):$('readerV24');requestAnimationFrame(()=>{target?.scrollIntoView({block:'start',behavior:motion()});if(store.mode==='explore')target?.focus({preventScroll:true});});}
 else if(cmd==='speak')bridge.speak(ctx.word);
 else if(cmd==='speak-line')bridge.speak(btn.dataset.text||ctx.word);
 else if(cmd==='speak-example'){const ex=cards[ctx.word]?.example?.[0]||ctx.example; if(ex)bridge.speak(ex);}
 else if(cmd==='favorite')bridge.favorite(ctx.word);
 else if(cmd==='plan')bridge.plan(ctx.word);
 else if(cmd==='full'){$('readerV24').querySelector('[data-module=usage]')?.scrollIntoView({block:'start',behavior:motion()});loadDetails();}
 else if(cmd==='retry-detail')loadDetails();
 else if(cmd==='next'){if(store.route?.done)store.route=null;go(btn.dataset.word,'next');}
 else if(cmd==='return'){remember();const at=store.trail.map(x=>x.word).lastIndexOf(btn.dataset.word);if(at<0)return;restore={...store.trail[at]};store.trail=store.trail.slice(0,at+1);go(btn.dataset.word,'back');}
 else if(cmd==='resume'){if(store.last){const last={...store.last};restore=last;store.mode='explore';go(last.word,'resume');}}
 else if(cmd==='start-route')startRoute(btn.dataset.route);
 else if(cmd==='route-word'){const r=routes.find(x=>x.id===store.route?.id);if(r?.words.includes(btn.dataset.word)){store.route.index=r.words.indexOf(btn.dataset.word);go(btn.dataset.word);}}
 else if(cmd==='leave-route'){store.route=null;save();paint();}
 else if(cmd==='advance'){const active=store.route,r=routes.find(x=>x.id===active?.id);if(!r)return;if(!active.seen.includes(ctx.word))active.seen.push(ctx.word);const n=r.words.indexOf(ctx.word);
  if(n<r.words.length-1){active.index=n+1;go(r.words[n+1]);}else{if(!active.done){active.done=true;store.counts.completed++;event('route_finish',ctx.word);}paintComplete();}save();}
 else if(cmd==='save-route'){const r=routes.find(x=>x.id===store.route?.id);for(const w of r?.words||[])bridge.plan(w);paintComplete();bridge.toast('这组词已加入复习，不会标记为已掌握。');}
 else if(cmd==='finish-home'){store.route=null;store.mode='quick';save();showHome();}
 else if(cmd==='answer'){const q=quiz(ctx);if(!q)return;const prev=store.answers[ctx.word];if(prev&&(!q.signature||prev.signature===q.signature))return;const i=Number(btn.dataset.index);if(!q||!Number.isInteger(i)||i<0||i>=q.options.length)return;store.answers[ctx.word]={index:i,correct:i===q.answer,signature:q.signature||''};store.counts.answered++;if(i===q.answer)store.counts.correct++;event('quiz_answer',ctx.word);const y=window.scrollY;paint();window.scrollTo({top:y,behavior:'instant'});}
 else if(cmd==='skip-quiz'){event('quiz_skip',ctx.word);const el=$('readerV24').querySelector('.rd-optional-check');if(el){el.open=false;el.querySelector('summary')?.focus({preventScroll:true});}}
 else if(cmd==='offline'){if(offlineController)return;offlineController=new AbortController();const slot=()=>document.getElementById('rdOfflineProgress');if(slot())slot().textContent='正在准备完整资料…';bridge.downloadAll(offlineController.signal,(done,total)=>{if(slot())slot().textContent='已缓存 '+done+' / '+total+' 个资料包。';}).then(()=>{if(slot())slot().textContent='完整离线资料已就绪。';}).catch(err=>{if(slot())slot().textContent=err.name==='AbortError'?'下载已停止；已缓存资料保留。':'网络暂不可用，已有资料仍可阅读。再次点击可继续。';}).finally(()=>{offlineController=null;});}
 else if(cmd==='cancel-offline'){offlineController?.abort();}
 else if(cmd==='export'){remember();const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='词根实验室_阅读足迹.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 else if(cmd==='clear'){if(confirm('只清空阅读足迹；原来的收藏和复习计划不会删除。')){store=blank();save();setView('profile');updateHome();}}
}
let initializing=false;
function init(api){if(ready)return;bridge=api;ready=true;document.body.classList.add('reader-v24','minimal-v25','cards-v26','ui-v213','ui-v214');document.body.dataset.appView='learn';
 const parent=$('learnLayout');const article=document.createElement('article');article.id='readerV24';article.className='rd-reader';parent.parentNode.insertBefore(article,parent);
 const home=document.createElement('div');home.id='readerHomeV24';$('learnView').querySelector('.hero').after(home);
 initializing=true;const url=new URL(location.href),word=(url.searchParams.get('word')||'').toLowerCase();if(validWord(word)&&bridge.known(word)){if(['quick','explore'].includes(url.searchParams.get('mode')))store.mode=url.searchParams.get('mode');bridge.open(word);}else{landing=true;article.hidden=true;}initializing=false;updateHome();routePicker();window.RootLabNavigation?.start({bridge,home:showHome,isHome:()=>landing});
 const panelsObserver=new MutationObserver(()=>{for(const name of ['roots','review','profile'])unfoldPanels($(name+'View'));});for(const name of ['roots','review','profile'])panelsObserver.observe($(name+'View'),{childList:true,subtree:true});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-reader]');if(b){e.preventDefault();e.stopImmediatePropagation();lastInput=Date.now();act(b);return;}
 const hist=e.target.closest('#readerV24 [data-action="wiktionary-etymology"]');if(hist){e.preventDefault();e.stopImmediatePropagation();const node=hist.closest('.historical-source-action').querySelector('[data-word] .wiktionary-source-result')||hist.parentNode.querySelector('.wiktionary-source-result');window.RootLabHistoryUI.fetchRemote(hist.dataset.word,node);}},true);
 for(const ev of ['pointerdown','keydown','touchstart','wheel'])document.addEventListener(ev,()=>{lastInput=Date.now();},{passive:true});
 let scrollTimer=0;addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(remember,200);},{passive:true});
 document.addEventListener('visibilitychange',()=>{stamp=Date.now();if(document.hidden)remember();});
 addEventListener('pagehide',remember);
 setInterval(()=>{const now=Date.now(),dt=Math.min(5,Math.max(0,(now-stamp)/1000));stamp=now;if(visible&&inViewport&&!document.hidden&&document.hasFocus()&&now-lastInput<30000){store.counts.seconds+=dt;save();}},5000);
}
window.RootLabReader={capturePosition,restorePosition,get plan(){return currentPlan;},get model(){return currentModel;},init,show,beforeOpen,afterOpen,view:setView,get ready(){return ready;},get state(){return store;},get context(){return ctx;},get isHome(){return landing;},home:showHome,recommendations,
 exportState(){remember();return JSON.parse(JSON.stringify(store));},importState(raw){if(raw){store=clean(raw);save();updateHome();}},clearData(){store=blank();save();updateHome();},startRoute};
})();
