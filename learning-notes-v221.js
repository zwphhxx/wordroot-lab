/* V2.21. Original learning notes and examples, checked against the linked references.
 * Editorial guidance is not a Wikipedia quotation, a corpus-frequency ranking,
 * or a replacement for immutable dictionary source records. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.RootLabLearningNotes=api;})(typeof window==='undefined'?globalThis:window,function(){'use strict';
const refs={
 grammar:'https://dictionary.cambridge.org/us/grammar/british-grammar/reason',
 reason:'https://www.oxfordlearnersdictionaries.com/definition/english/reason_1',
 with:'https://dictionary.cambridge.org/da/ordbog/engelsk/reason-with',
 out:'https://www.ldoceonline.com/es-LA/dictionary/reason-out',
 rationale:'https://dictionary.cambridge.org/ja/dictionary/learner-english/rationale',
 cause:'https://dictionary.cambridge.org/us/dictionary/english/cause'
};
const phrase=(id,group,en,zh,note,exampleEn,exampleZh,source)=>({id:'learning:reason:'+id,group,en,zh,note,exampleEn,exampleZh,source:refs[source],authorship:'original-learning-note',translation:'edited'});
const reason={
 titleZh:'原因；理由',titleEn:'A cause or a reason why',
 introZh:'用来说明事情为什么发生，或者为什么采取某种行动。也可表示理性思考的能力；作动词时，表示通过思考得出判断。',
 introEn:'Use reason to explain why something happens or why someone acts. It can also refer to logical thinking; as a verb, it describes working towards a judgment.',
 exampleEn:'What was your reason for choosing this course?',exampleZh:'你选择这门课程的理由是什么？',
 reviewedAt:'2026-10-30',sources:[refs.grammar,refs.reason,refs.with,refs.out,refs.rationale,refs.cause],
 priority:['wn30:reason%1:10:01::','wn30:reason%1:16:00::','wn30:reason%1:09:00::','wn30:reason%2:31:01::','wn30:reason%1:26:00::'],
 labels:{
  'wn30:reason%1:10:01::':['an explanation of the cause of some phenomenon','原因；缘由','解释事情为什么发生'],
  'wn30:reason%1:16:00::':['a rational motive for a belief or action','理由；动机','支持某种观点或行动的合理根据'],
  'wn30:reason%1:09:00::':['the capacity for rational thought or inference or discrimination','理性；推理能力','运用逻辑思考、推断和辨别事物'],
  'wn30:reason%1:26:00::':['the state of having good sense and sound judgment','理智；判断力','保持清醒判断，作出合理决定'],
  'wn30:reason%1:10:00::':['a justification for something existing or happening','正当理由；依据','说明某件事为什么合理或有必要'],
  'wn30:reason%1:09:01::':['a fact that logically justifies some premise or conclusion','论据；根据','能够支持某一判断或结论的事实'],
  'wn30:reason%2:31:01::':['decide by reasoning; draw or come to a conclusion','推理；得出结论','通过逻辑思考作出判断'],
  'wn30:reason%2:31:00::':['think logically','进行逻辑思考','按逻辑分析问题'],
  'wn30:reason%2:32:00::':['present reasons and arguments','讲道理；论证','提出理由和论据来说明观点']
 },
 phrases:[
  phrase('for','基础句型','reason for + 名词 / doing','……的原因；做某事的理由','for 后接名词或动词 -ing 形式。','Please explain your reason for changing the schedule.','请解释你调整日程的理由。','grammar'),
  phrase('to','基础句型','reason to + 动词原形','做某事的理由','to 后接动词原形。','We have a reason to review the figures again.','我们有理由再核查一次这些数字。','grammar'),
  phrase('this','说明原因','for this reason','因此；出于这个原因','连接前面的原因和后面的结果。','The file was incomplete. For this reason, we postponed the review.','文件不完整，因此我们推迟了审查。','reason'),
  phrase('some','说明原因','for some reason','不知为什么；由于某种原因','具体原因不清楚或未说明。','For some reason, the screen keeps turning off.','不知为什么，屏幕总是自动关闭。','reason'),
  phrase('no','说明原因','for no reason','无缘无故','说明看不出原因。','The alarm went off for no reason.','警报无缘无故响了。','reason'),
  phrase('why','说明原因','the reason why ...','……的原因','why 引出需要解释的事情。','That is the reason why we changed the design.','那就是我们修改设计的原因。','reason'),
  phrase('give','给出依据','give a reason','给出理由','可用 for 补充针对哪件事。','Could you give a reason for rejecting this option?','你能说明拒绝这一方案的理由吗？','reason'),
  phrase('believe','给出依据','have reason to believe','有理由相信','强调判断有一定依据。','We have reason to believe the estimate is too low.','我们有理由相信这一估计偏低。','reason'),
  phrase('good','给出依据','a good reason','充分的理由','good 在这里强调理由站得住脚。','There is a good reason to keep the original record.','保留原始记录有充分的理由。','reason'),
  phrase('every','给出依据','have every reason to ...','完全有理由……','强调有充分依据这样想或这样做。','You have every reason to ask for more detail.','你完全有理由要求更多细节。','reason'),
  phrase('within','理性与判断','within reason','在合理范围内','表示可以接受，但不是毫无限制。','The budget can increase, within reason.','预算可以适度增加，但应控制在合理范围内。','reason'),
  phrase('listen','理性与判断','listen to reason','听从道理；接受理性劝告','强调愿意听取合理意见。','After the discussion, he began to listen to reason.','讨论之后，他开始愿意听取合理意见。','reason'),
  phrase('with','说服与推断','reason with somebody','和某人讲道理；劝说某人','with 后接要劝说的人。','I tried to reason with her about the deadline.','我试着就截止时间的问题和她讲道理。','with'),
  phrase('out','说服与推断','reason something out','通过推理弄清楚某事','代词宾语放在 reason 和 out 之间：reason it out。','We reasoned it out before making a decision.','我们在作出决定前通过推理把事情弄清楚了。','out')
 ],
 comparisons:[
  {word:'cause',zh:'成因',link:'都可以用来回答“为什么”。',difference:'cause 更侧重直接导致某个结果的因素；reason 也可以是作出选择的理由。',en:'Cause focuses on what produces a result; reason can also explain a choice.',a:'The cause of the delay was a signal failure.',az:'延误的成因是信号故障。',b:'My reason for waiting was to meet the team.',bz:'我等待的理由是想见到团队。',source:refs.cause},
  {word:'explanation',zh:'解释；说明',link:'都能说明事情为什么发生。',difference:'explanation 强调把来龙去脉说明白；reason 可以只是其中的一个理由。',en:'An explanation develops the account; a reason may be one point within it.',a:'She gave a detailed explanation of the change.',az:'她详细说明了这次变更。',b:'Cost was one reason for the change.',bz:'成本是作出变更的一个理由。',source:refs.reason},
  {word:'motive',zh:'动机',link:'都可以解释一个人为什么行动。',difference:'motive 侧重行动背后的意图；reason 的范围更广，也能说明事件的原因。',en:'Motive focuses on the intention behind an action.',a:'His motive was to protect the team.',az:'他的动机是保护团队。',b:'The report explains the reason for the delay.',bz:'报告说明了延误的原因。',source:refs.reason},
  {word:'rationale',zh:'整体依据；思路',link:'都能说明决定为什么这样作出。',difference:'rationale 侧重一套决定背后的整体思路；reason 可以是单独一条理由。',en:'A rationale sets out the overall thinking; a reason can be a single point.',a:'Please explain the rationale behind this design.',az:'请说明这项设计背后的整体思路。',b:'Give one reason for choosing this material.',bz:'请给出选择这种材料的一条理由。',source:refs.rationale},
  {word:'excuse',zh:'辩解；借口',link:'都可以解释某种行为。',difference:'excuse 常用于解释或辩护自己的行为，可能带有找借口的意味；reason 更中性。',en:'An excuse defends behaviour and can sound like an attempt to avoid blame.',a:'He offered an excuse for missing the meeting.',az:'他为缺席会议作了解释。',b:'She stated her reason for leaving early.',bz:'她说明了提前离开的理由。',source:refs.reason}
 ]
};
const notes={reason};
function get(word){return Object.hasOwn(notes,word)?notes[word]:null;}
function label(word,row){const x=get(word)?.labels?.[row.id];return x&&String(row.en||'').replace(/\s+/g,' ').trim()===x[0]?{zh:x[1],noteZh:x[2],en:x[0]}:null;}
function speakPhrase(row){return row.exampleEn&&/[+…]|名词|动词|\.\.\./.test(row.en)?row.exampleEn:row.en;}
return {get,label,refs,speakPhrase};
});