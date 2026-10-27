/* V2.16: quiet page navigation; full contents lives behind the existing Contents action.
 * Vocabulary, history, review dates and page records are never mutated here. */
(function(){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let root=null,context=null,currentPlan=null,sections=[],frame=0,observer=null,opener=null,jumping=false;
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
const labels={senses:['释义','Meanings'],native:['补充释义','Source meanings'],phrases:['搭配','Phrases'],'authored-usage':['用法说明','Usage notes'],forms:['词形','Forms'],examples:['例句','Examples'],plain:['具体理解','Understanding'],morphology:['构词拆解','Word formation'],story:['词语来历','Word background'],history:['历史线索','Word history'],'definition-breakdown':['读懂定义','Definition'],family:['同根词与词族','Root family'],relations:['词义关联','Connections'],quiz:['语境练习','Practice']};
function topbar(){let bar=document.getElementById('readingContext');if(bar)return bar;
 const parent=document.querySelector('.header-main');if(!parent)return null;
 bar=document.createElement('div');bar.id='readingContext';bar.className='reading-context';bar.innerHTML='<button class="context-word" data-ui="word" aria-label="返回单词 / Back to word"></button><button data-ui="contents" aria-label="阅读目录 / Reading contents" aria-haspopup="dialog" aria-controls="readingContentsDialog">目录 <small>Contents</small></button><button class="context-search" data-ui="search" aria-label="搜索新词 / Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></button><button class="context-audio" data-reader="speak" aria-label="朗读单词 / Listen">'+(window.RootLabBilingual?.soundIcon||'听')+'</button>';
 parent.querySelector('.brand')?.after(bar);return bar;
}
function selectedLink(a,selected){a.classList.toggle('is-current',selected);if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}
function update(){frame=0;const active=root?.isConnected&&!root.hidden&&document.body.dataset.appView==='learn'&&!window.RootLabReader?.isHome;
 document.body.classList.toggle('reading-deep',Boolean(active&&root.querySelector('.rd-word-row')?.getBoundingClientRect().bottom<65));
 if(!active)return;
 let current=sections[0];for(const s of sections)if(s.getBoundingClientRect().top<=125)current=s;
 for(const a of root.querySelectorAll('.reading-map a'))selectedLink(a,a.getAttribute('href')==='#'+current?.id);
 const links=[...root.querySelectorAll('.rp-section-links a')];let sub=links[0];
 for(const a of links){const node=document.getElementById(a.getAttribute('href').slice(1));if(node?.getBoundingClientRect().top<=125)sub=a;}
 for(const a of links)selectedLink(a,a===sub);
}
function schedule(){if(!frame)frame=requestAnimationFrame(update);}
function contentsMarkup(){
 const link=(id,zh,en,cls='')=>'<a data-ui-jump href="#'+esc(id)+'" class="'+cls+'"><span lang="zh-CN">'+esc(zh)+'</span><small lang="en">'+esc(en)+'</small></a>';
 return (currentPlan?.sections||[]).map(s=>{
  let body=link('read-section-'+s.id,s.titleZh,s.titleEn,'contents-stage');
  for(const mod of s.modules){const id='module-'+mod.moduleId.replace(':','-');if(!labels[mod.type]||!document.getElementById(id))continue;
   body+=link(id,...labels[mod.type],'contents-module');
   if(mod.type==='senses'){
    const groups=mod.cards?.filter(c=>c.firstInGroup)||[];
    if(groups.length>1)body+=groups.map(c=>link(c.cardId,c.titleZh,c.titleEn,'contents-group')).join('');
   }
  }
  return '<section class="contents-section">'+body+'</section>';
 }).join('');
}
function refreshContents(dialog){const focused=dialog.querySelector(':focus')?.getAttribute('href');
 dialog.querySelector('.contents-word').textContent=context?.word||'';
 dialog.querySelector('.contents-links').innerHTML=contentsMarkup();
 if(focused)dialog.querySelector('a[href="'+CSS.escape(focused)+'"]')?.focus({preventScroll:true});
}
function closeContents(forJump=false){const dialog=document.getElementById('readingContentsDialog');if(!dialog?.open)return; // close() restores focus before the subsequent jump.
 jumping=forJump;dialog.close();}
function openContents(button){if(!root?.isConnected||!currentPlan)return;
 let dialog=document.getElementById('readingContentsDialog');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='readingContentsDialog';dialog.className='reading-contents';dialog.setAttribute('aria-labelledby','readingContentsTitle');
  dialog.innerHTML='<header class="contents-head"><div><h2 id="readingContentsTitle">阅读目录 <small lang="en">Contents</small></h2><p class="contents-word" lang="en"></p></div><button type="button" data-ui="close-contents" aria-label="关闭目录 / Close contents">×</button></header><nav class="contents-links" aria-label="全部章节与义项分组 / All sections and meaning groups"></nav>';
  document.body.append(dialog);
  dialog.addEventListener('close',()=>{const shouldRestore=!jumping;jumping=false;if(shouldRestore&&opener?.isConnected)opener.focus({preventScroll:true});});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeContents();});
 }
 opener=button||document.querySelector('.reading-map-contents');refreshContents(dialog);jumping=false;
 if(!dialog.open)dialog.showModal();dialog.querySelector('[data-ui="close-contents"]')?.focus({preventScroll:true});
}
function enhance(node,c,plan){const changed=context?.word!==c.word;if(changed)closeContents(true);
 root=node;context=c;currentPlan=plan;sections=[...root.querySelectorAll('[data-reading-stage]')];const bar=topbar();
 if(bar){bar.querySelector('.context-word').textContent=c.word;bar.querySelector('.context-audio').setAttribute('aria-label','朗读 '+c.word+' / Listen');}
 const titles=Object.fromEntries((plan?.sections||[]).map(s=>[s.id,[s.titleZh,s.titleEn]]));
 root.querySelectorAll('.reading-map').forEach(n=>n.remove());
 const nav=document.createElement('nav');nav.className='reading-map';nav.id='readingMap';nav.setAttribute('aria-label','阅读定位 / Reading contents');
 nav.innerHTML=sections.map(s=>{const key=s.dataset.module;s.id='read-section-'+key;s.tabIndex=-1;const [zh,en]=titles[key]||['阅读','Read'];return '<a href="#'+s.id+'" data-ui-jump><span lang="zh-CN">'+esc(zh)+'</span><small lang="en">'+esc(en)+'</small></a>';}).join('')+'<button type="button" class="reading-map-contents" data-ui="contents" aria-label="完整阅读目录 / Full reading contents" aria-haspopup="dialog" aria-controls="readingContentsDialog"><span>目录</span><small lang="en">Contents</small></button>';
 root.querySelector('[data-reading-stage][data-module=meaning]')?.after(nav);
 const dialog=document.getElementById('readingContentsDialog');if(dialog?.open)refreshContents(dialog);
 observer?.disconnect();if('ResizeObserver'in window){observer=new ResizeObserver(schedule);observer.observe(root);}update();
}
function view(name){if(name!=='learn'){closeContents(true);document.body.classList.remove('reading-deep');observer?.disconnect();}schedule();}
function jump(el){if(!el)return;if(!el.matches('input,button,a[href]'))el.tabIndex=-1;el.scrollIntoView({block:'start',behavior:motion()});el.focus({preventScroll:true});}
document.addEventListener('click',e=>{
 const a=e.target.closest('[data-ui-jump]');if(a){const id=a.getAttribute('href')?.slice(1),target=id&&document.getElementById(id);if(target){e.preventDefault();if(a.closest('#readingContentsDialog')){closeContents(true);requestAnimationFrame(()=>jump(target));}else jump(target);}return;}
 const b=e.target.closest('[data-ui]');if(!b)return;e.preventDefault();
 if(b.dataset.ui==='word')jump(root?.querySelector('.lr-word-card'));
 if(b.dataset.ui==='contents')openContents(b);
 if(b.dataset.ui==='close-contents')closeContents();
 if(b.dataset.ui==='search'){const input=document.getElementById('searchInput');input?.scrollIntoView({block:'center',behavior:'instant'});input?.focus({preventScroll:true});input?.select();}
});
window.addEventListener('rootlab:audio',e=>{const {text,state,message}=e.detail||{};
 for(const b of document.querySelectorAll('[data-reader="speak"],[data-reader="speak-line"],[data-reader="speak-example"]')){
  const target=b.dataset.text||context?.word,active=target===text&&(state==='loading'||state==='playing');b.classList.toggle('is-speaking',active);b.setAttribute('aria-busy',String(active));}
 let status=document.getElementById('audioStatus');if(!status){status=document.createElement('span');status.id='audioStatus';status.className='sr-only';status.setAttribute('role','status');document.body.append(status);}
 status.textContent=state==='playing'?'正在朗读 / Playing':state==='error'?(message||'播放失败')+' / Audio unavailable':'';
});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
window.RootLabReadingUI={enhance,view,refresh:schedule,openContents};
})();
