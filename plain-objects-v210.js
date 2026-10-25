/* Readable object explanations: editorial Chinese, not a bulk machine translation.
 * Wikipedia text paraphrase: CC BY-SA 4.0. Per-file Commons image credit below. */
(function(){'use strict';
const profiles={
 andiron:{
  meaning:'n. 壁炉柴架（托住木柴的金属支架）',phonetic:'/ˈændˌaɪən/',introTitle:'先看懂它是什么',
  hook:'壁炉里的木柴，为什么要架起来？',lead:'不是木柴，也不是壁炉：andiron 是放在壁炉里面、托住木柴的金属架。',
  story:['通常把两个架子配成一对，木柴横放在上面。这样木柴下面留出空隙，空气能够流通，木头更容易燃烧。'],
  definitions:['n. 壁炉柴架：在开放式壁炉里托住木柴的金属架，通常成对使用。'],
  definitionBreakdown:{original:'metal supports for logs in a fireplace',translation:'放在壁炉里，用来托住木柴的金属支架。',parts:[['n.','名词标记，不是释义的一部分'],['metal','金属的'],['supports','支架、支撑物；这里不是动词“支持”'],['logs','作为燃料的木柴、原木；不是计算机日志'],['in a fireplace','在壁炉里']]},
  phrases:[{en:'a pair of andirons',zh:'一对壁炉柴架',kind:'数量'},{en:'iron andirons',zh:'铁制壁炉柴架',kind:'材质'},{en:'logs on the andirons',zh:'架在柴架上的木柴',kind:'位置'}],
  usage:[{title:'单个用 andiron，一对常用 andirons',body:'这是可以数的器具名词。因为经常成对使用，所以描述壁炉布置时常见 a pair of andirons。',en:'The logs rest on a pair of andirons.',zh:'木柴架在一对壁炉柴架上。'},{title:'为什么资料里还出现 dog？',body:'firedog、dog-iron，甚至 dog 在特定的壁炉器具语境中也可指柴架。这是少见的器具义，不等于说“柴架是一种狗”；日常谈动物时不要互换。',en:'An andiron is also called a firedog.',zh:'andiron 也叫 firedog，都是指壁炉柴架。'}],
  examples:[['The logs rest on a pair of andirons.','木柴架在一对壁炉柴架上。'],['We placed the wood on the andirons.','我们把木柴放到了壁炉柴架上。']],
  forms:[['s','andirons']],
  links:[['fireplace','使用场景','它放在哪里？先认识“壁炉”。'],['log','本句词义','这里是用作燃料的木柴、原木，不是日志。'],['firedog','同物异名（壁炉）','这是同一件器具的另一个名字，不是动物。']],
  quiz:{q:'andiron 指的是哪一个？',options:['壁炉里托住木柴的金属架','放进壁炉燃烧的木柴'],answer:0,why:'andiron 是支架；log 才是这里用来燃烧的木柴。'},
  sources:[{label:'释义参考',url:'https://www.collinsdictionary.com/dictionary/english/andiron'},{label:'器物图文',url:'https://en.wikipedia.org/wiki/Andiron'}]
 }
};
const base=window.ROOTLAB_BASIC_CARDS||(window.ROOTLAB_BASIC_CARDS=Object.create(null));
const cards=window.ROOTLAB_READING_CARDS||(window.ROOTLAB_READING_CARDS=Object.create(null));
for(const [word,p] of Object.entries(profiles)){base[word]=p;cards[word]={hook:p.hook,meaning:p.meaning,lead:p.lead,story:p.story,example:p.examples[0],source:p.sources[0].url,links:p.links,quiz:p.quiz};}
window.ROOTLAB_ENCYCLOPEDIA_SEEDS={andiron:{title:'Andiron',zhTitle:'壁炉柴架',language:'zh-editorial',description:'把单词和实物对应起来',summary:'金属支架将木柴托离壁炉底部，让下面的空气流通；前端的竖起部分也有助于挡住滚动的木柴。通常两个配成一对。',source:'https://en.wikipedia.org/w/index.php?title=Andiron&oldid=1352053935',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',adapted:true,image:{src:'./images/andiron-in-use.png',alt:'壁炉内两只金属柴架托住横放的木柴，下面留有通风空间',caption:'图中的金属支架是 andirons；横放在上面的木头是 logs。',credit:'Pearson Scott Foresman / Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:Andirons_(PSF).png',license:'Public domain',licenseUrl:'https://creativecommons.org/publicdomain/mark/1.0/'}}};
window.RootLabSenseGuard={filter(word,rows){return (rows||[]).filter(x=>!(word==='dog'&&(['andiron','firedog','dogiron'].includes(x.word)||/logs? in a fireplace|metal supports for logs/i.test(x.sense||x.reason||'')))&&!(word==='andiron'&&x.word==='dog'));}};
})();
