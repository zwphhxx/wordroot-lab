/* URL is the shareable source of the selected word and view.
 * No personal study state is put into the URL. Existing local learning keys remain.
 */
(function(){'use strict';
let api=null,locked=false,started=false,timer=0;
const views=new Set(['learn','roots','review','profile']);
function fromURL(){const u=new URL(location.href);return{word:(u.searchParams.get('word')||'').toLowerCase(),view:views.has(u.searchParams.get('view'))?u.searchParams.get('view'):'learn',root:u.searchParams.get('root')||''};}
function position(){if(!started||locked)return;try{const old=history.state||{};history.replaceState({...old,rootlab:{...(old.rootlab||fromURL()),y:Math.max(0,scrollY),anchor:window.RootLabReader?.capturePosition?.()}},'',location.href);}catch(_){}}
function commit(word,view='learn',root=''){
 if(!started||locked)return;word=String(word||'').toLowerCase();if(word&&!/^[a-z][a-z'-]{0,49}$/.test(word))return;if(!views.has(view))view='learn';
 const u=new URL(location.href),old=fromURL();u.searchParams.set('v','2.14.0');u.searchParams.delete('mode');
 if(word)u.searchParams.set('word',word);else u.searchParams.delete('word');
 if(view==='learn')u.searchParams.delete('view');else u.searchParams.set('view',view);
 if(root)u.searchParams.set('root',root);else u.searchParams.delete('root');
 const next={word,view,root,y:0},same=old.word===word&&old.view===view&&old.root===root;
 try{if(same)history.replaceState({...history.state,rootlab:{...next,y:history.state?.rootlab?.y||0,anchor:history.state?.rootlab?.anchor||null}},'',u);else history.pushState({rootlab:next},'',u);}catch(_){}
 document.title=(word?word+' · ':'')+'词根实验室';
}
function apply(state){
 const target=fromURL(),saved=state?.rootlab;locked=true;
 try{
  if(target.word&&api.bridge.known(target.word))api.bridge.open(target.word,target.root||undefined);
  else if(/^[a-z][a-z'-]{0,49}$/.test(target.word)&&api.bridge.lookup)api.bridge.lookup(target.word);
  else api.home();
  if(target.view!=='learn')api.bridge.navigate(target.view);
  document.title=(target.word?target.word+' · ':'')+'词根实验室';
 }finally{locked=false;}
 const y=saved&&saved.word===target.word&&saved.view===target.view?Number(saved.y)||0:0;
 clearTimeout(timer);timer=setTimeout(()=>window.RootLabReader?.restorePosition(saved?.anchor,y),170);
}
function start(options){if(started)return;api=options;started=true;try{history.scrollRestoration='manual';}catch(_){}
 const target=fromURL(),online=/^[a-z][a-z'-]{0,49}$/.test(target.word)&&!api.bridge.known(target.word),word=online?target.word:!api.isHome()?api.bridge.current()?.word||'':'';
 locked=true;try{if(online&&api.bridge.lookup)api.bridge.lookup(target.word);if(target.view!=='learn')api.bridge.navigate(target.view);}finally{locked=false;}
 const u=new URL(location.href);u.searchParams.set('v','2.14.0');u.searchParams.delete('mode');if(word)u.searchParams.set('word',word);else u.searchParams.delete('word');
 try{history.replaceState({...history.state,rootlab:{word,view:target.view,root:target.root,y:0}},'',u);}catch(_){}
 document.title=(word?word+' · ':'')+'词根实验室';
 addEventListener('popstate',event=>apply(event.state));
 let scrollTimer;addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(position,180);},{passive:true});
 addEventListener('pagehide',position);
}
window.RootLabNavigation={start,commit,position,get restoring(){return locked;}};
})();
