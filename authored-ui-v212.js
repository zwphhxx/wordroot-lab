/* Exact, reviewed counterparts for authored learning prose. No online translation,
 * no fuzzy string matching and no changing an English source into a guessed Chinese text. */
(function(){'use strict';
const source=window.ROOTLAB_AUTHORED_PAIRS||{},norm=x=>String(x||'').replace(/\s+/g,' ').trim();
const fixed={'前缀':'Prefix','词根':'Root','词根形式':'Root form','后缀':'Suffix','名词后缀':'Noun suffix','形容词后缀':'Adjective suffix','词尾':'Ending','构词部分':'Word component','前缀联想':'Prefix connection','后缀联想':'Suffix connection','核心词根':'Core root','共同的词根线索':'Shared root clue','词根记词':'Learn through roots','词义与来历':'Meaning and origin','从组成关系，到今天的用法':'From word formation to present use','沿着旧词形，找到今天的意思':'Related historical forms and their meanings today','这个意思是怎样形成的？':'How did this meaning develop?','学习范围':'Study level','按词义继续联想':'Explore connections by meaning','词形变化':'Word forms','把词族分开记，比混在一起更清楚':'Separate the meanings within this word family','词缀联想，用于辅助记忆。':'Affix connections for remembering the word.','常用搭配':'Common expressions','用法与固定表达':'Usage and fixed expressions','古典拉丁语':'Classical Latin','拉丁语名词':'Latin noun','中古法语':'Middle French','古英语':'Old English','中古英语':'Middle English','现代英语':'Modern English'};
const skip='.bi-pair,.bi-example,.bi-native-source,.bi-sense,.bi-relations,.wiki-languages,.visual-caption-pair,.definition-decoder,.lr-phrase-row,.lr-group-row,.lr-family-word,.lr-usage-item blockquote,.lr-sources,.wiki-attribution,.bi-method,script,style,[lang="en"],.authored-en,.authored-zh';
const missing=new Map();let running=false,scheduled=false;
function lookup(zh){const x=source[norm(zh)];if(x?.en)return {en:x.en,status:x.status};if(fixed[norm(zh)])return{en:fixed[norm(zh)],status:'editorial_label'};
let m=norm(zh).match(/^从 ([a-z]+) 出发，先理解它的组成和来历。$/i);if(m)return{en:'Start with '+m[1]+': understand its formation and origin.',status:'editorial_template'};
m=norm(zh).match(/^正确答案：(.+)。 (.+)$/);if(m){const a=lookup(m[1]),b=lookup(m[2]);if(a&&b)return{en:'Correct answer: '+a.en+' '+b.en,status:'editorial_template'};}
m=norm(zh).match(/^答对了。 (.+)$/);if(m){const a=lookup(m[1]);if(a)return{en:'Correct. '+a.en,status:'editorial_template'};}
return null;}
function decorate(root=document.getElementById('readerV24')){if(!root||running)return;running=true;
try{const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),pending=[];let text;
while(text=walker.nextNode()){const parent=text.parentElement,zh=norm(text.textContent);if(!parent||parent.closest(skip)||!/[\u3400-\u9fff]/.test(zh)||parent.dataset.authoredDone==='1')continue;
// Recognize an actual existing bilingual owner, not an absent translation.
if(parent.matches('.lr-meaning-text[lang="zh-CN"]')&&parent.nextElementSibling?.matches('.lr-meaning-text[lang="en"]')&&parent.nextElementSibling.textContent.trim())continue;
if(parent.closest('.lr-meaning-source'))continue; // attribution and original-source link
if(zh==='中英为同主题独立摘要 · Independent summaries of the same topic')continue;

if(parent.closest('[data-content-role="headword-gloss"]')&&root.querySelector('h1[lang="en"]'))continue;
if(parent.closest('.bi-sense-heading,.bi-intro-label,.bi-recommendation-type,.bi-recommendation-label,.lr-forms,.lr-recall h3')&&/[A-Za-z]{3}/.test(zh))continue;
if(parent.closest('.lr-data-status')&&parent.closest('.lr-data-status').querySelector('[lang="en"]'))continue;
if(parent.closest('.rd-answers')&&/[—·].*[A-Za-z]{3}/.test(zh))continue;
if(parent.closest('.lr-recall')&&parent.tagName==='P'&&parent.nextElementSibling?.matches('p[lang="en"]'))continue;
const hit=lookup(zh);if(hit)pending.push({text,parent,zh,hit});else if(zh.length>=12&&!parent.closest('.rd-head,.lr-card-head,.rd-actions,.wiki-enrichment,.bi-preview-notice,.lr-next-title,.lr-end-note,.rd-trail,.rd-crumbs'))missing.set(zh,{word:window.RootLabReader?.context?.word||'',zh,tag:parent.tagName,cls:parent.className});}
for(const {text,parent,zh,hit}of pending){if(!text.isConnected||norm(text.textContent)!==zh)continue;
const marker=document.createElement('span');marker.className='authored-zh';marker.lang='zh-CN';marker.textContent=text.textContent;
const en=document.createElement('span');en.className='authored-en';en.lang='en';en.textContent=hit.en;en.dataset.provenance=hit.status;
text.replaceWith(marker,en);parent.dataset.authoredDone='1';parent.dataset.authoredPair='true';missing.delete(zh);}
}finally{running=false;}}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;decorate();});}
function start(){const root=document.getElementById('readerV24');if(!root){setTimeout(start,100);return;}decorate(root);new MutationObserver(changes=>{if(changes.some(c=>[...c.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('authored-en')&&!n.classList?.contains('authored-zh'))))schedule();}).observe(root,{childList:true,subtree:true});}
window.RootLabAuthored={lookup,decorate,audit:()=>({pairs:Object.keys(source).length,unmatched:[...missing.values()]}),clearAudit:()=>missing.clear()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
