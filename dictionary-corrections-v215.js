/* Auditable editorial layer over the immutable V2.12 payload. Originals/IDs survive.
 * Exact source-text matches propagate to glosses, examples, phrases and relations.
 * These finite corrections do NOT certify unsampled machine translations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabDictionaryCorrections=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const revision='editorial-v215-1';
const sources={dogwood:'https://plants.ces.ncsu.edu/plants/cornus/common-name/dogwood/',wood:'https://www.collinsdictionary.com/us/dictionary/english/dogwood',poison:'https://plants.ces.ncsu.edu/plants/toxicodendron-vernix/',kind:'https://www.collinsdictionary.com/dictionary/english/species',type:'https://code.iczn.org/types-in-the-genus-group/article-67-general-provisions/',native:'local:adopted-original-Chinese-lexicon-block'};
const edits=[
 ['a tree of shrub of the genus Cornus often having showy bracts resembling flowers','山茱萸属的乔木或灌木，常有醒目、形似花瓣的苞片。','dogwood','A tree or shrub of the genus Cornus, often with showy bracts resembling flowers.'],
 ['hard tough wood of any dogwood of the genus Cornus; resembles boxwood','山茱萸属植物坚硬而有韧性的木材，类似黄杨木。','wood'],
 ['smooth American swamp shrub with pinnate leaves and greenish flowers followed by greenish white berries; yields an irritating oil','生长在北美沼泽地的无毛灌木，具有羽状复叶和淡绿色花，结绿白色浆果；会产生刺激性油脂。','poison'],
 ['a specific kind of something','某一种类或类型的事物。','kind'],
 ['a species of molecule','一种分子。','kind'],
 ['a species of villainy','一种恶行。','kind'],
 ['(biology) the species that best exemplifies the essential characteristics of the genus to which it belongs','（动物命名法）作为某个名义属或亚属的名称承载模式的名义种；不是按外形挑选的“最典型物种”。','type','In zoological nomenclature, a nominal species serving as the name-bearing type of a genus or subgenus.']
].map(([en,zh,source,replacementEn],i)=>({id:revision+':'+i,en,zh,source:sources[source],replacementEn,reviewer:'assistant_linguistic_review'}));
const pairs=new Map(edits.map(e=>[e.en,e]));
const native={dogwood:{'n. 山茱萸科植物':'noun: trees or shrubs in the dogwood family.','[医] 北美山茱萸':'medicine: American dogwood.'},species:{'n. 种, 类, 外形':'noun: species; kinds or categories; outward form or appearance.','[医] 茶剂; 种':'medicine (historical usage): a herbal tea mixture; species.'}};
const summaries={dogwood:{summaryZh:'山茱萸属植物；这类植物的木材',summaryEn:'Trees or shrubs known as dogwoods; also their hard wood.'},species:{summaryZh:'物种；种类、类型',summaryEn:'A biological species; also a kind or type of something.'}};
const cache=new WeakMap();
function revisePair(o,enKey,zhKey,method){const e=pairs.get(o[enKey]);if(!e)return;const old={en:o[enKey],zh:o[zhKey],translation:o[method]};if(e.replacementEn)o[enKey]=e.replacementEn;o[zhKey]=e.zh;if(method)o[method]='edited';o.editorialRevision={id:e.id,source:e.source,reviewer:e.reviewer,original:old};o.reviewStatus='editorial';o.qualityIssues=[];if(o.pairId){o.originalPairId=o.pairId;o.pairId=revision+':'+o.pairId;}if(o.wordZh)o.wordZh=o[zhKey];}
function walk(o){if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){if(k==='sourceRefs'||k==='editorialRevision'||k==='sourceSegments')continue;if(v&&typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);}
 revisePair(o,'en','zh','translation');revisePair(o,'contextEn','contextZh',null);revisePair(o,'definition','definitionZh','definitionTranslation');
 if(pairs.has(o.definitionEn)){const e=pairs.get(o.definitionEn);o.originalDefinitionEn=o.definitionEn;if(e.replacementEn)o.definitionEn=e.replacementEn;}
 // A phrase title can use the source gloss as its meaning; update it with that gloss.
 if(o.meaningDisplay==='sense_definition'&&o.definitionPair?.editorialRevision){o.zh=o.definitionPair.zh;o.definitionZh=o.definitionPair.zh;o.definition=o.definitionPair.en;o.translation=o.definitionTranslation='edited';}
}
function apply(word,raw){if(!raw)return raw;if(cache.has(raw))return cache.get(raw);
 const text=JSON.stringify(raw);if(!summaries[word]&&!edits.some(e=>text.includes(e.en))){cache.set(raw,raw);return raw;}
 const out=JSON.parse(text);walk(out);
 if(summaries[word])Object.assign(out,summaries[word]);
 for(const p of out.nativeSourceSummary?.pairs||[]){const en=native[word]?.[p.sourceText];if(!en)continue;p.editorialRevision={id:revision+':native:'+p.id,source:sources.native,reviewer:'assistant_linguistic_review',original:{en:p.en,zh:p.zh,translation:p.translation}};p.en=en;p.translation='edited';p.reviewStatus='editorial';p.originalPairId=p.pairId;p.pairId=revision+':'+p.pairId;p.counterpartMethod='reviewed_word_bound_translation';p.qualityIssues=[];}
 if(word==='dogwood'){for(const s of out.senses){s.domainZh='植物与木材';s.domainEn='Plants / wood';s.labelZh=s.id.includes('%1:20:02::')?'山茱萸属植物的木材':'山茱萸属植物';s.labelEn=s.id.includes('%1:20:02::')?'dogwood timber':'dogwood tree or shrub';}}
 if(word==='species'){const s=out.senses.find(x=>x.id==='wn30:species%1:14:00::');if(s){s.domainZh='生物分类';s.domainEn='Biological classification';}const generic=out.senses.find(x=>x.id==='wn30:species%1:09:00::');if(generic){generic.labelZh='种类；类型';generic.labelEn='kind or type';}}
 out.editorialLayer={version:revision,scope:'Exact reviewed translations; source payload and record IDs preserved.'};cache.set(raw,out);return out;
}
return {apply,revision,edits,native,sources};
});
