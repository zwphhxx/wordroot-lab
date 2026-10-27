/* V2.13 reading navigation. Presentation state only; no writes to lexical data,
 * learner storage, browser history, or analytics. All learning modules stay open. */
(function(){'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let root=null,context=null,sections=[],frame=0,observer=null;
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
function topbar(){let bar=document.getElementById('readingContext');if(bar)return bar;
 const parent=document.querySelector('.header-main');if(!parent)return null;
 bar=document.createElement('div');bar.id='readingContext';bar.className='reading-context';bar.innerHTML='<button class="context-word" data-ui="word" aria-label="返回单词 / Back to word"></button><button data-ui="contents" aria-label="定位章节 / Reading contents">目录 <small>Contents</small></button><button class="context-search" data-ui="search" aria-label="搜索新词 / Search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg></button><button class="context-audio" data-reader="speak" aria-label="朗读单词 / Listen">'+(window.RootLabBilingual?.soundIcon||'听')+'</button>';
 parent.querySelector('.brand')?.after(bar);return bar;
}
function update(){frame=0;const active=root?.isConnected&&!root.hidden&&document.body.dataset.appView==='learn'&&!window.RootLabReader?.isHome;
 const deep=Boolean(active&&root.querySelector('.rd-word-row')?.getBoundingClientRect().bottom<65);
 document.body.classList.toggle('reading-deep',deep);
 if(!active)return;
 let current=sections[0];for(const s of sections)if(s.getBoundingClientRect().top<=125)current=s;
 for(const a of root.querySelectorAll('.reading-map a')){const selected=a.getAttribute('href')==='#'+current?.id;a.classList.toggle('is-current',selected);if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}
}
function schedule(){if(!frame)frame=requestAnimationFrame(update);}
function enhance(node,c,plan){root=node;context=c;sections=[...root.querySelectorAll('[data-reading-stage]')];const bar=topbar();if(bar){bar.querySelector('.context-word').textContent=c.word;bar.querySelector('.context-audio').setAttribute('aria-label','朗读 '+c.word+' / Listen');}
 const titles=Object.fromEntries((plan?.sections||[]).map(s=>[s.id,[s.titleZh,s.titleEn]]));
 const nav=document.createElement('nav');nav.className='reading-map';nav.id='readingMap';nav.setAttribute('aria-label','阅读定位 / Reading contents');
 nav.innerHTML=sections.map(s=>{const key=s.dataset.module;s.id='read-section-'+key;s.tabIndex=-1;let [zh,en]=titles[key]||['阅读','Read'];return '<a href="#'+s.id+'" data-ui-jump><span lang="zh-CN">'+esc(zh)+'</span><small lang="en">'+esc(en)+'</small></a>';}).join('');
 root.querySelector('[data-reading-stage][data-module=meaning]')?.after(nav);
 observer?.disconnect();if('ResizeObserver'in window){observer=new ResizeObserver(schedule);observer.observe(root);}
 update();
}
function view(name){if(name!=='learn'){document.body.classList.remove('reading-deep');observer?.disconnect();}schedule();}
function jump(el){if(!el)return;el.scrollIntoView({block:'start',behavior:motion()});if(el.tabIndex<0||el.matches('input'))el.focus({preventScroll:true});}
document.addEventListener('click',e=>{const a=e.target.closest('[data-ui-jump]');if(a){const id=a.getAttribute('href')?.slice(1),target=id&&document.getElementById(id);if(target){e.preventDefault();jump(target);}return;}
 const b=e.target.closest('[data-ui]');if(!b)return;e.preventDefault();
 if(b.dataset.ui==='word')jump(root?.querySelector('.lr-word-card'));
 if(b.dataset.ui==='contents')jump(document.getElementById('readingMap'));
 if(b.dataset.ui==='search'){const input=document.getElementById('searchInput');input?.scrollIntoView({block:'center',behavior:'instant'});input?.focus({preventScroll:true});input?.select();}
});
window.addEventListener('rootlab:audio',e=>{const {text,state,message}=e.detail||{};
 for(const b of document.querySelectorAll('[data-reader="speak"],[data-reader="speak-line"],[data-reader="speak-example"]')){
 const target=b.dataset.text||context?.word,active=target===text&&(state==='loading'||state==='playing');b.classList.toggle('is-speaking',active);b.setAttribute('aria-busy',String(active));}
 let status=document.getElementById('audioStatus');if(!status){status=document.createElement('span');status.id='audioStatus';status.className='sr-only';status.setAttribute('role','status');document.body.append(status);}
 status.textContent=state==='playing'?'正在朗读 / Playing':state==='error'?(message||'播放失败')+' / Audio unavailable':'';
});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
window.RootLabReadingUI={enhance,view,refresh:schedule};
})();
