/* V2.4 reading experience. No external telemetry or account required.
 * Word visits and seconds describe browsing, not mastery. All storage is local.
 */
(function(){'use strict';
const KEY='rootlab_reader_v24',cards=window.ROOTLAB_READING_CARDS||{},routes=window.ROOTLAB_READING_ROUTES||[];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id),validWord=w=>typeof w==='string'&&/^[a-z]{2,35}$/.test(w);
let bridge=null,ctx=null,ready=false,visible=true,restore=null,loading=false,error='',lastInput=Date.now(),inViewport=true,stamp=Date.now(),offlineController=null;
const blank=()=>({schema:1,mode:'quick',last:null,trail:[],route:null,answers:{},events:[],counts:{views:0,expands:0,started:0,completed:0,answered:0,correct:0,seconds:0}});
function clean(raw){const out=blank();if(!raw||raw.schema!==1)return out;
 out.mode=raw.mode==='explore'?'explore':'quick';
 out.trail=(Array.isArray(raw.trail)?raw.trail:[]).filter(x=>validWord(x?.word)).slice(-12).map(x=>({word:x.word,y:Math.max(0,Math.min(100000,Number(x.y)||0)),open:Array.isArray(x.open)?x.open.filter(z=>typeof z==='string').slice(0,12):[]}));
 out.last=validWord(raw.last?.word)?{word:raw.last.word,y:Math.max(0,Math.min(100000,Number(raw.last.y)||0)),open:Array.isArray(raw.last.open)?raw.last.open.slice(0,12):[]}:null;
 const r=routes.find(x=>x.id===raw.route?.id);if(r)out.route={id:r.id,index:Math.max(0,Math.min(r.words.length-1,Number(raw.route.index)||0)),seen:(Array.isArray(raw.route.seen)?raw.route.seen:[]).filter(x=>r.words.includes(x)),done:raw.route.done===true};
 for(const k of Object.keys(out.counts))out.counts[k]=Math.max(0,Math.min(1e8,Number(raw.counts?.[k])||0));
 out.events=(Array.isArray(raw.events)?raw.events:[]).filter(e=>typeof e?.type==='string'&&Number.isFinite(e.at)).slice(-300);
 for(const [w,v] of Object.entries(raw.answers||{}))if(validWord(w)&&Number.isInteger(v?.index)&&v.index>=0&&v.index<4)out.answers[w]={index:v.index,correct:v.correct===true};
 return out;
}
let store;try{store=clean(JSON.parse(localStorage.getItem(KEY)||'null'));}catch(_){store=blank();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(store));}catch(_){/* Read-only/private mode must not block dictionary use. */}}
function event(type,word){store.events.push({type,word:word||'',at:Date.now()});store.events=store.events.slice(-300);save();}
function remember(){if(!ctx||!visible)return;const node=$('readerV24'),open=node?Array.from(node.querySelectorAll('details[open][data-reader-key]')).map(x=>x.dataset.readerKey):[];
 const row={word:ctx.word,y:window.scrollY||0,open};store.last=row;
 const t=store.trail.at(-1);if(t?.word===ctx.word)Object.assign(t,row);save();}
function beforeOpen(){remember();error='';loading=false;}
function sourceLinks(word,custom){const list=custom?.source?[{url:custom.source,label:'词源参考'}]:[];return list.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label)+' ↗</a>').join('');}
function storyFor(c){const custom=cards[c.word],record=window.RootLabHistoryUI?.record(c.word),local=c.notes||{};
 if(custom)return{hook:custom.hook,lead:custom.lead,paragraphs:custom.story,custom,source:sourceLinks(c.word,custom)};
 if(record)return{hook:record.status==='source_formation'||record.status==='teaching_formation'?'拆开 '+c.word+'，能发现什么构词线索？':'“'+c.word+'”的来历，藏在哪些旧词形里？',lead:record.summary||local.story||c.meaning,paragraphs:[local.story||record.summary,local.memory].filter(Boolean),custom:null,source:''};
 return{hook:'除了中文意思，'+c.word+' 还有哪些用法？',lead:'先理解常见义项，再结合例句和词源资料继续看。',paragraphs:[],custom:null,source:''};}
function quiz(c){const custom=cards[c.word];if(custom?.quiz)return custom.quiz;
 // A definition recall question uses only existing meanings, never invented etymology.
 if(!c.meaning||!c.distractor)return null;const flip=c.word.length%2;
 return{q:'回想一下，'+c.word+' 在这里对应哪个意思？',options:flip?[c.distractor,c.meaning]:[c.meaning,c.distractor],answer:flip?1:0,why:'本词的释义是：'+c.meaning+'。这道题只练习词义回忆，不评定掌握度。'};
}
function example(c,story){const ex=story.custom?.example||(c.example?[c.example,c.translation||'']:null);
 if(ex)return '<div class="rd-example"><p lang="en">'+esc(ex[0])+'</p>'+(ex[1]?'<p class="rd-example-zh">'+esc(ex[1])+'</p>':'')+'<button data-reader="speak-example" class="rd-text">听例句</button><span class="rd-provenance">'+(story.custom||c.curated?'自编学习例句':'开放词典例句')+'</span></div>';
 return '<button class="rd-text rd-load-example" data-reader="full">查看完整释义与例句 →</button>';}
function crumb(){if(store.trail.length<2)return '';
 return '<nav class="rd-breadcrumb" aria-label="查词路径">'+store.trail.slice(-4).map((t,i,a)=>i===a.length-1?'<span aria-current="page">'+esc(t.word)+'</span>':'<button data-reader="return" data-word="'+esc(t.word)+'">'+esc(t.word)+'</button><span aria-hidden="true">›</span>').join('')+'</nav>';}
function routeBar(c){const active=store.route,r=routes.find(x=>x.id===active?.id);if(!r||active.done||!r.words.includes(c.word))return '';
 const n=r.words.indexOf(c.word);return '<aside class="rd-route-bar"><div><span>正在探索 · '+esc(r.kind)+'</span><b>'+esc(r.title)+'</b></div><span class="rd-route-position">'+(n+1)+' / '+r.words.length+'</span><div class="rd-route-progress">'+r.words.map((word,i)=>'<button class="'+(i===n?'current':'')+'" data-reader="route-word" data-word="'+esc(word)+'" aria-label="查看 '+esc(word)+'" '+(i===n?'aria-current="step"':'')+'>'+esc(word)+'</button>').join('')+'</div><button class="rd-text" data-reader="leave-route">退出路线</button></aside>';}
function recommendations(c){const picks=[],seen=new Set([c.word]);for(const entry of cards[c.word]?.links||[]){if(bridge.known(entry[0])&&!seen.has(entry[0])){picks.push({word:entry[0],label:entry[1],reason:entry[2]});seen.add(entry[0]);}}
 for(const e of c.related||[]){if(!seen.has(e.word)){picks.push(e);seen.add(e.word);}if(picks.length>=3)break;}
 return picks.slice(0,3);}
function recommendationMarkup(c){const picks=recommendations(c);if(!picks.length)return '<p class="rd-muted">暂未建立足够明确的词族关系。可以通过原词条继续了解。</p>';
 return '<div class="rd-next-grid">'+picks.map(x=>'<button data-reader="next" data-word="'+esc(x.word)+'"><small>'+esc(x.label)+'</small><b>'+esc(x.word)+' <span>↗</span></b><p>'+esc(x.reason)+'</p></button>').join('')+'</div>';}
function quizMarkup(c){const q=quiz(c);if(!q)return '';
 const a=store.answers[c.word];return '<section class="rd-check" aria-label="随手回忆"><div class="rd-check-heading"><h3>停一下，试着回想</h3><button data-reader="skip-quiz" class="rd-text">跳过</button></div><p>'+esc(q.q)+'</p><div class="rd-answers">'+q.options.map((v,i)=>'<button data-reader="answer" data-index="'+i+'" '+(a?'disabled':'')+' class="'+(a&&i===q.answer?'is-correct':a&&i===a.index?'is-wrong':'')+'">'+esc(v)+'</button>').join('')+'</div><div class="rd-feedback" aria-live="polite">'+(a?(a.correct?'这次答对了。':'答案是：'+esc(q.options[q.answer])+'。')+' '+esc(q.why):'可跳过；不影响继续阅读。')+'</div></section>';}
function nextStep(c){const active=store.route,r=routes.find(x=>x.id===active?.id);if(r&&!active.done&&r.words.includes(c.word)){const idx=r.words.indexOf(c.word),last=idx===r.words.length-1;return '<div class="rd-route-next"><p>'+ (last?'这一轮到这里就结束了。':'下一词：'+esc(r.words[idx+1]))+'</p><button class="rd-primary" data-reader="advance">'+(last?'结束本轮，看看足迹':'继续下一词 →')+'</button></div>';}
 return '<div class="rd-soft-end"><b>这一词读到这里就好。</b><p>可以沿下面的关系再看一个，也可以收藏后离开。</p></div>';}
function paint(){if(!ready||!ctx)return;
 const node=$('readerV24'),c=ctx,story=storyFor(c),mode=store.mode;
 const prevOpen=new Set(Array.from(node.querySelectorAll('details[open][data-reader-key]')).map(x=>x.dataset.readerKey));
 const meaning=story.custom?.meaning||c.meaning;
 node.innerHTML=crumb()+routeBar(c)+'<div class="rd-word-top"><div class="rd-word-label">查词 · '+(c.curated?'精选精讲':'英汉词典')+'</div><div class="rd-word-row"><h2 lang="en">'+esc(c.word)+'</h2><div><button class="rd-icon" data-reader="speak" aria-label="朗读 '+esc(c.word)+'">♫</button><button class="rd-icon" data-reader="favorite" aria-label="'+(c.favorite?'取消收藏':'收藏')+'">'+(c.favorite?'★':'☆')+'</button></div></div><p class="rd-ipa">'+esc(c.phonetic||'')+'</p><p class="rd-meaning">'+esc(meaning)+'</p><div class="rd-quick-actions"><button class="rd-text" data-reader="plan">'+(c.planned?'✓ 已加入复习':'＋ 加入复习')+'</button><button class="rd-text" data-reader="full">多词性释义与词形 →</button></div></div>'+example(c,story)+'<div class="rd-mode" role="group" aria-label="阅读模式"><button data-reader="mode" data-mode="quick" aria-pressed="'+(mode==='quick')+'">快速查词</button><button data-reader="mode" data-mode="explore" aria-pressed="'+(mode==='explore')+'">顺着词源读</button></div>'+
 (mode==='quick'?'<section class="rd-teaser"><div class="rd-kicker">多读一段，弄懂一个联系</div><h3>'+esc(story.hook)+'</h3><p>'+esc(story.lead)+'</p><button class="rd-primary" data-reader="mode" data-mode="explore">看看它的来历 →</button></section>':
 '<section class="rd-story"><div class="rd-kicker">一个词里的线索</div><h3 tabindex="-1" id="rdStoryHeading">'+esc(story.hook)+'</h3><p class="rd-lead">'+esc(story.lead)+'</p>'+story.paragraphs.map(x=>'<p>'+esc(x)+'</p>').join('')+'<div class="rd-story-source">'+story.source+'</div><details class="rd-details" data-reader-key="history"><summary>展开词源记录与构词细节</summary><div class="rd-history">'+(window.RootLabHistoryUI?.render(c.word,'curated')||'')+'</div></details></section>'+quizMarkup(c)+nextStep(c)+'<section class="rd-next"><div class="rd-kicker">继续探索 · 最多三个方向</div><h3>下一词，为什么值得看？</h3>'+recommendationMarkup(c)+'</section>')+
 '<details class="rd-details rd-full" data-reader-key="full"><summary>完整词典资料</summary><div class="rd-detail-loading" role="status">'+(loading?'正在补充该词的英文释义与例句…':error?esc(error):'按需读取，不影响上方查词和阅读。')+'</div><div class="rd-full-body">'+c.fullHtml+'</div></details>'+
 '<p class="rd-local-note">无需会员 · 基础释义可离线 · 足迹仅保存在本机 <a href="./credits.html" target="_blank" rel="noopener noreferrer">资料与许可</a></p>';
 for(const el of node.querySelectorAll('details[data-reader-key]')){
  el.open=prevOpen.has(el.dataset.readerKey)||(restore?.word===c.word&&restore.open?.includes(el.dataset.readerKey));
  let wasOpen=el.open;el.addEventListener('toggle',()=>{if(!el.isConnected)return;if(el.open&&!wasOpen){if(el.dataset.readerKey==='full')loadDetails();else{store.counts.expands++;event('source_expand',c.word);}}wasOpen=el.open;remember();});
 }
 // Do not duplicate attribution widgets inside hidden legacy renderers.
 node.querySelectorAll('.rd-full-body [id]').forEach(x=>x.removeAttribute('id'));
 updateHome();observe();}
function paintComplete(){const r=routes.find(x=>x.id===store.route?.id);if(!r||!store.route.done)return;
 const reviewed=store.route.seen,correct=reviewed.filter(w=>store.answers[w]?.correct).length;
 $('readerV24').innerHTML='<section class="rd-complete"><span class="rd-kicker">本轮结束</span><h2>把几个词，连成一条线。</h2><p>'+esc(r.title)+'</p><div class="rd-complete-numbers"><div><b>'+reviewed.length+'</b><span>浏览过的词</span></div><div><b>'+correct+'</b><span>回忆题首答正确</span></div></div><div class="rd-complete-words">'+reviewed.map(w=>'<button data-reader="next" data-word="'+esc(w)+'">'+esc(w)+'</button>').join('')+'</div><p class="rd-muted">浏览与答题不等于已经掌握。收藏或复习，可以帮助你继续巩固。</p><button class="rd-primary" data-reader="save-route">把这组词加入复习</button><button class="rd-text" data-reader="finish-home">到这里就好，回到查词</button></section>';updateHome();}
let observer;
function observe(){if(!('IntersectionObserver' in window))return;observer?.disconnect();observer=new IntersectionObserver(entries=>{inViewport=entries.some(e=>e.isIntersecting);});observer.observe($('readerV24'));}
function show(c){if(!ready||!c)return;const changed=ctx?.word!==c.word;ctx=c;
 if(changed){error='';loading=false; if(restore?.word!==c.word){const last=store.trail.at(-1);if(last?.word!==c.word){store.trail.push({word:c.word,y:0,open:[]});store.trail=store.trail.slice(-12);}}if(!initializing){store.counts.views++;event('word_view',c.word);} }
 const node=$('readerV24');node.hidden=false;if(changed)node.innerHTML='';paint();save();}
function afterOpen(){if(!ready)return false;
 const pending=restore;restore=null;setTimeout(()=>{if(pending?.word===ctx?.word){for(const d of $('readerV24').querySelectorAll('details[data-reader-key]'))d.open=!!pending.open?.includes(d.dataset.readerKey);window.scrollTo({top:pending.y||0,behavior:'instant'});}else $('readerV24').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});},90);return true;}
function go(word,reason){if(!bridge.known(word))return;beforeOpen();if(reason==='next')event('related_next',word);bridge.open(word);}
function updateHome(){const el=$('readerHomeV24');if(!el||!ready)return;const last=store.last;
 el.innerHTML='<div class="rd-home-bar"><span>查一个词，也可以走一小段路。</span>'+(last?'<button data-reader="resume">继续上次 · '+esc(last.word)+' →</button>':'')+'</div><details class="rd-route-picker"><summary>挑一条短路线 · 每条 4 词</summary><div class="rd-route-grid">'+routes.map(r=>'<button data-reader="start-route" data-route="'+esc(r.id)+'"><small>'+esc(r.tag)+'</small><b>'+esc(r.title)+'</b><span>'+esc(r.description)+'</span><em>'+r.words.length+' 词 · '+esc(r.kind)+'</em></button>').join('')+'</div></details>';}
async function loadDetails(){if(!ready||!ctx||loading||bridge.loaded(ctx.word)||!$('readerV24')?.querySelector('.rd-full')?.open)return;const word=ctx.word;loading=true;const slot=$('readerV24').querySelector('.rd-detail-loading');if(slot)slot.textContent='正在读取该词的完整释义与例句…';
 try{await bridge.hydrate(word);if(ctx?.word!==word)return;loading=false;error='';const y=window.scrollY;bridge.refresh();window.scrollTo({top:y,behavior:'instant'});}
 catch(_){if(ctx?.word!==word)return;loading=false;error='当前网络未能读取扩展资料。已有释义与词源仍可阅读。';const slot=$('readerV24').querySelector('.rd-detail-loading');if(slot)slot.innerHTML=esc(error)+' <button data-reader="retry-detail" class="rd-text">重试</button>';}}
function statsMarkup(){const c=store.counts;return '<article id="readingStatsV24" class="card rd-local-stats"><h3>我的阅读足迹</h3><p>只统计本机操作；没有上传数据，也不是学习效果评分。</p><div class="rd-stats-grid"><div><b>'+c.views+'</b><span>查词浏览</span></div><div><b>'+c.expands+'</b><span>探索展开</span></div><div><b>'+c.completed+'</b><span>路线完成</span></div><div><b>'+Math.floor(c.seconds/60)+'</b><span>前台活跃分钟（估计）</span></div></div><p>回忆题首答：'+c.correct+' / '+c.answered+'。计时会排除隐藏页面及长时间未操作。</p><button data-reader="export" class="outline-btn">导出阅读记录</button><button data-reader="clear" class="rd-text">清空阅读足迹</button><hr><h3>离线资料</h3><p>基础中文释义与精选资料可离线。其他完整英文释义和例句会按需缓存；也可一次下载全部扩展资料（约 11 MB，不含已缓存部分）。</p><button data-reader="offline" class="outline-btn">下载完整离线资料</button><button data-reader="cancel-offline" class="rd-text">停止下载</button><p id="rdOfflineProgress" role="status">未开始下载。</p></article>';}
function setView(view){visible=view==='learn';stamp=Date.now();if(view==='profile'){
 $('readingStatsV24')?.remove();$('profileBody')?.insertAdjacentHTML('beforeend',statsMarkup());} }
function startRoute(id){const r=routes.find(x=>x.id===id);if(!r)return;store.route={id,index:0,seen:[],done:false};store.mode='explore';store.counts.started++;event('route_start',r.words[0]);go(r.words[0]);}
function act(btn){const cmd=btn.dataset.reader;
 if(cmd==='mode'){remember();store.mode=btn.dataset.mode==='explore'?'explore':'quick';if(store.mode==='explore'){store.counts.expands++;event('explore_open',ctx.word);}paint();save();}
 else if(cmd==='speak')bridge.speak(ctx.word);
 else if(cmd==='speak-example'){const ex=cards[ctx.word]?.example?.[0]||ctx.example; if(ex)bridge.speak(ex);}
 else if(cmd==='favorite')bridge.favorite(ctx.word);
 else if(cmd==='plan')bridge.plan(ctx.word);
 else if(cmd==='full'){const details=$('readerV24').querySelector('.rd-full');details.open=true;details.scrollIntoView({block:'start',behavior:'smooth'});loadDetails();}
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
 else if(cmd==='finish-home'){store.route=null;store.mode='quick';paint();window.scrollTo({top:0,behavior:'smooth'});save();}
 else if(cmd==='answer'){if(store.answers[ctx.word])return;const q=quiz(ctx),i=Number(btn.dataset.index);if(!q||!Number.isInteger(i)||i<0||i>=q.options.length)return;store.answers[ctx.word]={index:i,correct:i===q.answer};store.counts.answered++;if(i===q.answer)store.counts.correct++;event('quiz_answer',ctx.word);const y=window.scrollY;paint();window.scrollTo({top:y,behavior:'instant'});}
 else if(cmd==='skip-quiz'){event('quiz_skip',ctx.word);$('readerV24').querySelector('.rd-next')?.scrollIntoView({block:'start',behavior:'smooth'});}
 else if(cmd==='offline'){if(offlineController)return;offlineController=new AbortController();const slot=()=>document.getElementById('rdOfflineProgress');if(slot())slot().textContent='正在准备完整资料…';bridge.downloadAll(offlineController.signal,(done,total)=>{if(slot())slot().textContent='已缓存 '+done+' / '+total+' 个资料包。';}).then(()=>{if(slot())slot().textContent='完整离线资料已就绪。';}).catch(err=>{if(slot())slot().textContent=err.name==='AbortError'?'下载已停止；已缓存资料保留。':'网络暂不可用，已有资料仍可阅读。再次点击可继续。';}).finally(()=>{offlineController=null;});}
 else if(cmd==='cancel-offline'){offlineController?.abort();}
 else if(cmd==='export'){remember();const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json;charset=utf-8'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='词根实验室_阅读足迹.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 else if(cmd==='clear'){if(confirm('只清空阅读足迹；原来的收藏和复习计划不会删除。')){store=blank();save();setView('profile');updateHome();}}
}
let initializing=false;
function init(api){if(ready)return;bridge=api;ready=true;document.body.classList.add('reader-v24');
 const parent=$('learnLayout');const article=document.createElement('article');article.id='readerV24';article.className='rd-reader';parent.parentNode.insertBefore(article,parent);
 const home=document.createElement('div');home.id='readerHomeV24';$('learnView').querySelector('.hero').after(home);
 initializing=true;const url=new URL(location.href),word=(url.searchParams.get('word')||'').toLowerCase();if(validWord(word)&&bridge.known(word)){store.mode=url.searchParams.get('mode')==='explore'?'explore':store.mode;bridge.open(word);}else show(bridge.current());initializing=false;updateHome();
 document.addEventListener('click',e=>{const b=e.target.closest('[data-reader]');if(b){e.preventDefault();e.stopImmediatePropagation();lastInput=Date.now();act(b);return;}
 const hist=e.target.closest('#readerV24 [data-action="wiktionary-etymology"]');if(hist){e.preventDefault();e.stopImmediatePropagation();const node=hist.closest('.historical-source-action').querySelector('[data-word] .wiktionary-source-result')||hist.parentNode.querySelector('.wiktionary-source-result');window.RootLabHistoryUI.fetchRemote(hist.dataset.word,node);}},true);
 for(const ev of ['pointerdown','keydown','touchstart','wheel'])document.addEventListener(ev,()=>{lastInput=Date.now();},{passive:true});
 let scrollTimer=0;addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(remember,200);},{passive:true});
 document.addEventListener('visibilitychange',()=>{stamp=Date.now();if(document.hidden)remember();});
 addEventListener('pagehide',remember);
 setInterval(()=>{const now=Date.now(),dt=Math.min(5,Math.max(0,(now-stamp)/1000));stamp=now;if(visible&&inViewport&&!document.hidden&&document.hasFocus()&&now-lastInput<30000){store.counts.seconds+=dt;save();}},5000);
}
window.RootLabReader={init,show,beforeOpen,afterOpen,view:setView,get ready(){return ready;},get state(){return store;},get context(){return ctx;},recommendations,
 exportState(){remember();return JSON.parse(JSON.stringify(store));},importState(raw){if(raw){store=clean(raw);save();updateHome();}},clearData(){store=blank();save();updateHome();},startRoute};
})();
