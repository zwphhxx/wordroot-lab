/* One authoritative input value. Popup selection replaces, never appends.
 * Compositions finish before lookup; stale debounced suggestions cannot reopen.
 * Accessible manual-selection combobox: arrows, Enter, Escape and pointer input. */
(function(){'use strict';
window.RootLabSearch={create:function({input,popup,render,onPick,onSearch,onClear}){
 let timer=0,revision=0,composing=false,active=-1,committed=input.value||'',guardUntil=0,selectionPointer=null,refocusSelect=false,suppressClick=0;
 const options=()=>[...popup.querySelectorAll('[data-word], [data-query]')];
 const sync=()=>{const shown=!popup.classList.contains('hidden');input.setAttribute('aria-expanded',String(shown));options().forEach((el,i)=>{el.id='search-option-'+i;el.setAttribute('role','option');el.setAttribute('aria-selected',String(i===active));el.tabIndex=-1;});if(shown&&active>=0&&options()[active])input.setAttribute('aria-activedescendant',options()[active].id);else input.removeAttribute('aria-activedescendant');};
 const cancel=()=>{clearTimeout(timer);timer=0;revision++;};
 const close=()=>{cancel();active=-1;popup.classList.add('hidden');sync();};
 function show(){if(composing||document.activeElement!==input)return;active=-1;render(input.value);sync();}
 function schedule(){cancel();const token=revision,q=input.value;timer=setTimeout(()=>{if(token!==revision||q!==input.value||document.activeElement!==input||composing)return;show();},100);}
 function setValue(value){committed=String(value||'');guardUntil=Date.now()+180;close();input.value=committed;}
 function accept(el){if(!el)return;const choice={word:el.dataset.word||'',root:el.dataset.root||'',query:el.dataset.query||'',action:el.dataset.action||''};const value=choice.word||choice.query;if(!value)return;
  setValue(value);composing=false;input.blur();input.value=value;
  // Some mobile IMEs finalize a pending replacement while blur is dispatched.
  queueMicrotask(()=>{if(document.activeElement!==input&&committed===value)input.value=value;});
  setTimeout(()=>{if(document.activeElement!==input&&committed===value&&Date.now()<guardUntil)input.value=value;},0);
  onPick(choice);sync();
 }
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-haspopup','listbox');input.setAttribute('autocomplete','off');input.setAttribute('autocorrect','off');input.setAttribute('autocapitalize','none');input.setAttribute('enterkeyhint','search');
 input.addEventListener('focus',()=>{guardUntil=0;if(input.value&&input.value===committed){refocusSelect=true;input.select();requestAnimationFrame(()=>{if(document.activeElement===input&&refocusSelect)input.select();});}show();});
 input.addEventListener('pointerup',e=>{if(refocusSelect&&document.activeElement===input){e.preventDefault();input.select();refocusSelect=false;}});
 input.addEventListener('mouseup',e=>{if(refocusSelect){e.preventDefault();input.select();refocusSelect=false;}});
 input.addEventListener('compositionstart',()=>{composing=true;cancel();});
 input.addEventListener('compositionend',()=>{composing=false;if(document.activeElement!==input&&Date.now()<guardUntil){input.value=committed;return;}schedule();});
 input.addEventListener('beforeinput',e=>{if(document.activeElement!==input&&Date.now()<guardUntil&&e.cancelable)e.preventDefault();});
 input.addEventListener('input',e=>{if(document.activeElement!==input&&Date.now()<guardUntil){input.value=committed;return;}refocusSelect=false;if(composing||e.isComposing){cancel();return;}schedule();});
 input.addEventListener('keydown',e=>{
  if(composing||e.isComposing||e.keyCode===229)return;
  if(e.key==='Escape'){e.preventDefault();close();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();cancel();if(popup.classList.contains('hidden'))show();const opts=options();if(!opts.length)return;active=(active+(e.key==='ArrowDown'?1:-1)+opts.length)%opts.length;sync();opts[active].scrollIntoView({block:'nearest'});return;}
  if(e.key==='Enter'){e.preventDefault();cancel();const opt=!popup.classList.contains('hidden')&&active>=0?options()[active]:null;if(opt)accept(opt);else{close();onSearch();sync();}return;}
  if(e.key==='Tab')close();
 });
 // A tap is committed on release, so scrolling the popup does not choose a word.
 popup.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-word],[data-query]');if(!el)return;selectionPointer={id:e.pointerId,x:e.clientX,y:e.clientY,el};if(e.pointerType==='mouse')e.preventDefault();},true);
 popup.addEventListener('pointerup',e=>{const p=selectionPointer;selectionPointer=null;if(!p||p.id!==e.pointerId||Math.hypot(e.clientX-p.x,e.clientY-p.y)>12)return;const el=e.target.closest('[data-word],[data-query]');if(el!==p.el)return;e.preventDefault();e.stopPropagation();suppressClick=Date.now()+500;accept(el);},true);
 popup.addEventListener('pointercancel',()=>{selectionPointer=null;});
 popup.addEventListener('click',e=>{const el=e.target.closest('[data-word],[data-query],[data-action="clear-history"]');if(!el)return;e.preventDefault();e.stopPropagation();if(Date.now()<suppressClick)return;if(el.dataset.action==='clear-history'){onClear();close();return;}accept(el);},true);
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#searchWrap'))close();},true);
 input.addEventListener('blur',()=>{refocusSelect=false;cancel();setTimeout(()=>{if(document.activeElement!==input&&!selectionPointer)close();},140);});
 sync();return{setValue,close,sync,show,accept,get composing(){return composing;}};
}};
})();
