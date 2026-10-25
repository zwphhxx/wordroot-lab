/* Independently written beginner-word learning profiles.
 * Definitions/usage verified against the linked dictionaries; examples are original.
 * A whole word is not split into invented Latin/Greek roots. */
(function(){'use strict';
const profiles={
 apple:{
  meaning:'n. 苹果',phonetic:'/ˈæp.əl/',introTitle:'熟悉的词，也有来历',
  hook:'apple 以前只指“苹果”吗？',lead:'从一种熟悉的水果，读到一个更宽泛的旧词义。',
  story:['apple 由古英语 æppel 经中古英语 appel 演变而来。早期这个词的指称范围比今天更宽，可以泛指某些果实；现代日常用法主要指苹果。'],
  history:{summary:'旧词形延续至今，词义逐渐集中到我们熟悉的苹果。',timeline:[{era:'古英语',term:'æppel',note:'用于苹果，也可泛指果实。'},{era:'中古英语',term:'appel',note:'与今天的拼写和读音更加接近。'},{era:'现代英语',term:'apple',note:'日常主要表示苹果；更多引申义在固定表达中理解。'}],sources:[{label:'词源参考',url:'https://www.etymonline.com/word/apple'}]},
  phrases:[{en:'apple juice',zh:'苹果汁',kind:'饮食'},{en:'apple pie',zh:'苹果派',kind:'饮食'},{en:'an apple tree',zh:'一棵苹果树',kind:'事物'},{en:'peel an apple',zh:'给苹果削皮',kind:'动作'},{en:'slice an apple',zh:'把苹果切片',kind:'动作'},{en:'a crisp apple',zh:'一个脆苹果',kind:'描述'}],
  usage:[{title:'一个苹果，为什么是 an apple？',body:'apple 以元音音素开头，单个苹果通常说 an apple；多个用 apples。',en:'I put an apple and two pears in the bag.',zh:'我在袋子里放了一个苹果和两个梨。'},{title:'a bad apple',body:'非正式表达，指群体里行为不良、给他人带来负面影响的人；不是把 apple 单独翻译成“家伙”。',en:'One bad apple should not define the whole team.',zh:'不能因为一个害群之马就否定整个团队。'},{title:"the apple of someone's eye",body:'表达某人特别珍爱的人，可理解为“掌上明珠、心肝宝贝”；属于习语。',en:'His granddaughter is the apple of his eye.',zh:'他的孙女是他的掌上明珠。'},{title:'compare apples and oranges',body:'把性质不同、不宜直接相比的事物硬放在一起比较。',en:'Those two prices cover different services; we are comparing apples and oranges.',zh:'这两个价格包含不同的服务，这样比较并不合适。'}],
  definitions:['n. 苹果；苹果树（按语境）'],
  examples:[['There are three apples in the bowl.','碗里有三个苹果。'],['Would you like apple juice or water?','你想喝苹果汁还是水？']],
  forms:[['s','apples']],
  links:[['fruit','主题关联','从一种水果，学会说“水果”这个总称'],['juice','搭配用词','从 apple juice 延伸到其他饮品表达'],['tree','搭配用词','从苹果树，继续认识树和果实的词汇']],
  quiz:{q:'“一个苹果”应该怎样说？',options:['a apple','an apple'],answer:1,why:'a / an 取决于后面词的起始读音。apple 以元音音素开头，因此用 an。'},
  sources:[{label:'英汉释义与搭配',url:'https://dictionary.cambridge.org/dictionary/english/apple'},{label:'bad apple',url:'https://dictionary.cambridge.org/dictionary/english/bad-apple'},{label:'apple of someone’s eye',url:'https://dictionary.cambridge.org/dictionary/english/apple-of-eye'},{label:'apples and oranges',url:'https://dictionary.cambridge.org/dictionary/english/to-compare-apples-and-with-oranges'}]
 },
 water:{
  meaning:'n. 水；v. 浇水',introTitle:'从词义到动作',hook:'water 不只是“水”，还能“给植物浇水”？',lead:'同一个拼写，换到动词位置，句子的意思就变了。',
  story:['water 指水这种物质时通常不可数。想说具体的量，可以用 a glass of water 或 two bottles of water。','作动词时，water 可以表示给植物或土地浇水。读句子时先看它在什么位置，而不是每次都翻成名词“水”。'],
  phrases:[{en:'a glass of water',zh:'一杯水',kind:'数量'},{en:'two bottles of water',zh:'两瓶水',kind:'数量'},{en:'tap water',zh:'自来水',kind:'种类'},{en:'drinking water',zh:'饮用水',kind:'种类'},{en:'water the plants',zh:'给植物浇水',kind:'动作'},{en:'cold water',zh:'冷水',kind:'描述'}],
  usage:[{title:'some water / a glass of water',body:'泛指液体时用 some water、much water；计数时说杯、瓶等单位。餐饮场景里 a water 可以是省略了份量单位的说法。',en:'Please bring two glasses of water.',zh:'请拿两杯水来。'},{title:'water 作动词',body:'water the plants 表示浇花、给植物浇水，不是“植物的水”。',en:'Could you water the plants this evening?',zh:'今晚你能给植物浇水吗？'}],
  definitions:['n. 水（通常不可数）；水域','v. 给……浇水；供水'],
  examples:[['I filled the bottle with water.','我把瓶子装满了水。'],['She waters the flowers before breakfast.','她在早饭前给花浇水。']],
  links:[['drink','主题关联','从水到“喝”，把事物与动作连起来'],['bottle','搭配用词','一瓶水怎样计数？'],['plant','搭配用词','water the plants 中被浇水的是什么？']],
  quiz:{q:'“Please water the plants.” 的意思是？',options:['请给植物浇水','请拿走植物旁边的水'],answer:0,why:'这里 water 是动词，表示给植物浇水。'},
  sources:[{label:'water 的词义与用法',url:'https://dictionary.cambridge.org/dictionary/english/water'}]
 },
 book:{
  meaning:'n. 书；v. 预订',introTitle:'熟词的另一种用法',hook:'book a room，是在房间里读书吗？',lead:'book 既能表示“书”，也能表示“预订”。',
  story:['book 作名词时可指一本书，作动词时可以表示预订座位、房间或服务。book a room 是预订房间，不是在房间里读书。','books 在部分商业语境中还指账簿、财务记录。先判断词性，再看它与哪些词搭配，往往比继续拆字母更有帮助。'],
  phrases:[{en:'read a book',zh:'读一本书',kind:'阅读'},{en:'borrow a book',zh:'借一本书',kind:'阅读'},{en:'a book review',zh:'一篇书评',kind:'阅读'},{en:'book a room',zh:'预订房间',kind:'预订'},{en:'book a table',zh:'预订餐位',kind:'预订'},{en:'book a ticket',zh:'预订票',kind:'预订'}],
  usage:[{title:'a book / books',body:'表示书籍时，book 通常可数：一本 a book，多本 books。',en:'These books belong to the library.',zh:'这些书属于图书馆。'},{title:'book + 房间／票／座位',body:'book 作动词时表示提前安排或预订，过去式 booked，现在分词 booking。',en:'We booked a room for Friday.',zh:'我们预订了周五的房间。'},{title:'the books',body:'在财务语境中，books 也可指账簿或会计记录，而非书籍。',en:'The accountant checked the books carefully.',zh:'会计仔细检查了账簿。'}],
  definitions:['n. 书；本子；账簿（books）','v. 预订；预约'],
  examples:[['I read a book on the train.','我在火车上读了一本书。'],['Please book a table for four.', '请预订一个四人餐位。']],
  links:[['read','主题关联','把“书”放进阅读的动作里'],['reserve','近义用法','比较预订语境中的 book 和 reserve'],['library','使用场景','借书、还书时会用到哪些词？']],
  quiz:{q:'“I booked a table.” 中 booked 的意思是？',options:['把书放在桌上','预订了餐位'],answer:1,why:'book a table 是餐饮预订表达；这里 book 是动词。'},
  sources:[{label:'book 的名词与动词义项',url:'https://dictionary.cambridge.org/dictionary/english/book'}]
 }
};
window.ROOTLAB_BASIC_CARDS=profiles;
const target=window.ROOTLAB_READING_CARDS||(window.ROOTLAB_READING_CARDS={});
for(const [word,p] of Object.entries(profiles))target[word]={hook:p.hook,meaning:p.meaning,lead:p.lead,story:p.story,example:p.examples[0],source:p.history?.sources?.[0]?.url||p.sources[0].url,links:p.links,quiz:p.quiz};
})();
