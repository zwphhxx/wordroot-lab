/* V2.18: semantic group identity is separate from physical card length.
 * Whole bilingual records are indivisible. Never infer equivalence from spelling.
 * Broad WordNet categories use the published lexicographer-file numbers, not
 * old translated domain labels. Original records/IDs remain untouched.
 * Reference: https://wordnet.princeton.edu/documentation/lexnames5wn */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabReadingLayout=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const norm=x=>String(x??'').replace(/\s+/g,' ').trim();
function weight(r){if(typeof r==='string')return r.replace(/[\u3400-\u9fff]/g,'AA').length+65;
 const fields=[r.en,r.zh,r.definitionPair?.en||r.definition,r.definitionPair?.zh||r.definitionZh,r.note,r.noteEn,r.noteZh,r.text,r.term,r.labelEn,r.labelZh,r.meaning];return [...new Set(fields.map(norm).filter(Boolean))].join(' ').replace(/[\u3400-\u9fff]/g,'AA').length+65;}
function pack(rows,budget=1150){if(!Number.isFinite(budget)||budget<=0)throw Error('Invalid reading budget');const out=[];let part=[],n=0;
 for(const r of rows){const size=weight(r);if(part.length&&n+size>budget){out.push(part);part=[];n=0;}part.push(r);n+=size;}if(part.length)out.push(part);
 if(out.length>1&&out.at(-1).length===1&&weight(out.at(-1)[0])<budget*.3){const a=out.at(-2),b=out.at(-1);if(a.length>2)b.unshift(a.pop());else if([...a,...b].reduce((s,r)=>s+weight(r),0)<=budget*1.15)out.splice(-2,2,[...a,...b]);}return out;
}
const lex={4:['行为与活动','Actions'],5:['动物','Animals'],6:['物品与工具','Objects & equipment'],7:['属性与特征','Attributes'],8:['身体部位','Body parts'],9:['思维与知识','Thought & knowledge'],10:['表达与交流','Communication'],11:['自然事件','Natural events'],12:['情感','Feelings'],13:['食物与饮品','Food & drink'],14:['群体与集合','Groups & collections'],15:['位置与场所','Places'],16:['动机与目的','Motives'],17:['自然物与地形','Natural objects'],18:['人物与角色','People'],19:['自然现象','Natural phenomena'],20:['植物','Plants'],21:['财产与储备','Possessions & reserves'],22:['过程','Processes'],23:['数量与单位','Quantities'],24:['关系','Relations'],25:['形状','Shapes'],26:['状态','States'],27:['物质与材料','Substances'],28:['时间','Time'],29:['身体活动','Bodily activities'],30:['变化','Change'],31:['思考与判断','Thinking'],32:['表达与交流','Communication'],33:['竞争与比赛','Competition'],34:['饮食与消耗','Consumption'],35:['接触与操作','Contact & handling'],36:['制作与创造','Creation'],37:['感受与情绪','Emotions'],38:['移动与运动','Motion'],39:['感知','Perception'],40:['拥有与交易','Possession & transactions'],41:['社会活动','Social activities'],42:['存在与关系','States & relations'],43:['天气','Weather']};
const pos={n:['名词','Noun'],v:['动词','Verb'],a:['形容词','Adjective'],s:['形容词','Adjective'],r:['副词','Adverb'],adj:['形容词','Adjective'],adv:['副词','Adverb']};
function sourceCategory(s){const match=String(s.id||'').match(/^wn30:.*%[1-5]:(\d\d):/);const name=match&&lex[Number(match[1])];return name?{key:'wn:'+match[1],zh:name[0],en:name[1],evidence:'WordNet lexicographer file '+match[1]}:null;}
const bankGroups={finance:['金融与存取款','Banking & saving'],land:['河岸、堤与堆积','Banks, ridges & embankments'],storage:['储备与储存机构','Reserves & storage'],array:['成排或成组排列','Rows & arrays'],tilt:['倾斜与转弯','Tilting & turning'],gaming:['游戏中的庄家','Banker in a game'],fire:['封火与控火','Banking a fire'],trust:['信赖与指望','Trust & reliance']};
const bankRules=[
 ['wn30:bank%1:14:00::','a financial institution that accepts deposits and channels the money into lending activities','finance'],
 ['wn30:bank%1:06:00::','a building in which the business of banking transacted','finance'],
 ['wn30:bank%1:06:01::','a container (usually with a slot in the top) for keeping money at home','finance'],
 ['wn30:bank%2:40:02::','do business with a bank or keep an account at a bank','finance'],
 ['wn30:bank%2:40:01::','be in the banking business','finance'],
 ['wn30:bank%2:40:00::','put into a bank account','finance'],
 ['wn30:bank%1:17:01::','sloping land (especially the slope beside a body of water)','land'],
 ['wn30:bank%1:17:00::','a long ridge or pile','land'],
 ['wn30:bank%2:35:00::','enclose with a bank','land'],
 ['native:bank:d3c81bc3275260fa88:embankment','An embankment or raised strip of ground, often alongside water.','land'],
 ['wn30:bank%1:21:00::','a supply or stock held in reserve for future use (especially in emergencies)','storage'],
 ['native:bank:c5a6460c9ec19d0b18','A facility that collects and keeps material for later use, such as donated blood or corneas.','storage'],
 ['wn30:bank%1:14:01::','an arrangement of similar objects in a row or in tiers','array'],
 ['wn30:bank%1:17:02::','a slope in the turn of a road or track; the outside is higher than the inside in order to reduce the effects of centrifugal force','tilt'],
 ['wn30:bank%1:04:00::','a flight maneuver; aircraft tips laterally about its longitudinal axis (especially in turning)','tilt'],
 ['wn30:bank%2:38:00::','tip laterally','tilt'],
 ['wn30:bank%1:21:01::','the funds held by a gambling house or the dealer in some gambling games','gaming'],
 ['wn30:bank%2:40:03::','act as the banker in a game or in gambling','gaming'],
 ['wn30:bank%2:35:01::','cover with ashes so to control the rate of burning','fire'],
 ['wn30:bank%2:31:02::','have confidence or faith in','trust']
];
function meaningGroups(rows,word=''){
 const out=new Map(),editorial=rows.length>=8&&rows.every(s=>s.source==='Editorial');
 const domains=[['everyday','日常与运输','Everyday & transport',/日常|物流|运输|航空|舰船|车辆|递送|保险/],['technology','通信与技术','Communication & technology',/通信|信号|电子|物理|化学|材料/],['life','生命与医学','Life & medicine',/医学|遗传|生物/]];
 for(const s of rows){let g;const rule=word==='bank'&&bankRules.find(r=>r[0]===s.id&&r[1]===norm(s.en));
  if(rule){const k=rule[2],label=bankGroups[k];g={key:'reviewed-bank-'+k,zh:label[0],en:label[1],method:'reviewed-id-and-definition',evidence:'Published bank sense ID and exact English definition',order:Object.keys(bankGroups).indexOf(k)};}
  if(!g&&editorial){const d=domains.find(d=>d[3].test(s.domainZh||''));if(d)g={key:d[0],zh:d[1],en:d[2],method:'existing-editorial-domain'};}
  const p=pos[s.pos]||['词义','Meaning'],cat=sourceCategory(s);
  if(!g&&cat)g={key:(s.pos||'other')+'-'+cat.key.replace(':','-'),zh:p[0]+' · '+cat.zh,en:p[1]+' · '+cat.en,method:'source-category-not-equivalence',evidence:cat.evidence};
  if(!g)g={key:'pos-'+(s.pos||'other'),zh:p[0]+'用法',en:p[1]+' uses',method:'unassigned-pos-only'};
  if(!out.has(g.key))out.set(g.key,{...g,rows:[]});out.get(g.key).rows.push(s);
 }
 const groups=[...out.values()];if(word==='bank')groups.sort((a,b)=>(a.order??99)-(b.order??99));return groups;
}
return {pack,weight,meaningGroups,sourceCategory,bankRules,bankGroups};
});
