# V2.12 执行续接说明（2026-10-26）

## 授权与边界

用户最新指示是“mac已上线，请开始计划并部署”，之后明确“继续”。已经授权在完成既定验收后部署；不是授权绕过发布门禁。原有 `docs/bilingual-v212-plan.md`、`schemas/publish-gates-v212.json` 中所有质量与数据保全要求继续适用。未达到当前构建的 PASS 时禁止推送生产。主工作区仍有原草稿，不允许 reset/clean/强制覆盖。所有项目运行目录必须位于 `/Users/zhuwenpeng/Developer`。

主工作区：`/Users/zhuwenpeng/Developer/wordroot-lab-deploy`
隔离工作区：`/Users/zhuwenpeng/Developer/wordroot-lab-bilingual-staging`
隔离分支：`work/bilingual-sense-v212`
运行及快照：`/Users/zhuwenpeng/Developer/wordroot-lab-workspace`
原始语料：主工作区 `.v12-work`，不上传模型、原始临时数据或用户资料。

迁移已经核实完成，不重复迁移；先检查实际文件、进程及 `.work/bilingual-v212/state.json`，不要把本文的旧数字当作实时状态。超时写操作先查原调用结果。使用可验证进程身份的单写者锁。

## 本轮实际完成

1. 修复未带点词性标记 n/v 的解析，影响 10,011 个词，重新分开原来被合并的来源义项；literal `a` 不视为无点形容词标记。`tests/test_source_parser_v212.py` 11 项通过。
2. 从确切 WordNet 来源记录恢复 104 处搭配解释和 3 处例句截断。保留原文、来源行、hash、变更记录。报告 `reports/source-fragment-restoration.json`。
3. 短语有自己的稳定词义身份，不再要求等于所含单词的义项。原始构建脚本中 `wnphrases.setdefault` 的确切取源过程已重放，恢复 push up / shake off / throw off 的来源位置；保留所有候选，绝非随意选择相同释义的第一项。`reports/phrase-provenance-recovery.json`。
4. `siting` 源数据混入 `sit` 的义项。按 Cambridge 的 siting=site 现在分词证据，只排除 10 条确切错误来源，原记录与审计仍保留。`data/source-exclusions-reviewed-v212.json`。
5. 原始中文来源块不与 WordNet 列表按序拼接，改为独立中英来源块；其英文候选尚未补完，不得把原文删掉来提高覆盖。
6. 新增精确译文修订并合入 `data/translation-corrections-v212.json`，本轮结束时累计 186 条。审阅者是助手，不得声称人工专家逐词审核。
7. 对固定 120 条候选样本实际逐条检查：78 条修订、36 条未见实质错误、6 条源文问题需进一步处理。这不是整体错误率，更不是全库批准。`reports/semantic-sample-review-resume.json`。其中 4 个源文问题的结构修复已有证据，但仍应跟踪语义结果；syne 与 creed 摘录需进一步核实。
8. 原 apple 等已核准搭配保留，新增来源搭配在完全展开的独立补充区域显示；恢复推荐关系类型（例如词义对比），不把它们都叫同根词。
9. 数据构建身份包含源记录、译文修订、原中文候选、质量队列、契约和输入包 hash；同一不可变目录若内容不同直接失败。来源配对、版本hash校验与学习状态测试均有独立证据。

本轮结构测试：来源解析 11/11、全库修复完整性 9/9、分包仓库 10/10、复习算法 11/11；专项浏览器 25/25。旧卡片 37/37、搜索与整词 38/38、图片 31/31、扩展释义 37/37。旧 repair/async 中仍有两个与“英语单独呈现”旧契约有关的失败，不可删测后冒充全通过；需保留原始证据，并用明确更强的新双语/来源/异步隔离测试验证契约变更。

## 关键现状与不得做的事

- 本轮最终候选构建 `v212-e9d5d0c16b8035`，49,426 词、110,508 个去重义项、75,858 条例句、17,152 条搭配、84,682 条语义关系；以现场 manifest 为准。
- 发布门禁仍 BLOCKED。原始中文来源块还有 67,044 个出现位置没有英文对应，原数据仍保留。此数字不是“缺少中文的英文单词数”。
- 当前规则筛查发现 1,849 条独立候选文本需复核；当前发布数据有 385 个乱码/异常符号出现位置，不能直接上线。风险文本和风险出现次数不是相同计数。
- 80词的基准语义审核尚未完成；120条有限样本不能替代它，也不能把修正过的训练样本当独立新抽样。
- 本机旧 OPUS-MT 在语义抽查里有明显错译，例：受凉→冷静、火柴→比赛、suffragist→窒息症。即使无规则告警也不等于准确。大批量“machine_screened”只是规则筛查标签。
- 本机 Gemma4 的一次六条复核也出现 yellowish→黄褐色，已由助手改正。其 `uncertain=false`、模型评分或自评不能自动升格为已核准。
- 不允许通过隐藏原文、删缺译例句/义项、把“暂无译文”当译文、改小分母、放宽门禁、删除失败断言来通过验收。
- 原生网页 `.bi-preview-notice` 仍标“未发布”；线上仍保留原正式版本。本轮没有推送生产。

## 增量处理入口

Python：`/Users/zhuwenpeng/Developer/wordroot-lab-workspace/runtime/venv-bilingual/bin/python`
工作目录：隔离工作区。
候选译文缓存：`.work/bilingual-v212/en_zh-translations.jsonl`、`zh_en-translations.jsonl`。
原始中文块英文候选：`.work/bilingual-v212/native-zh-en-candidates.jsonl`，本轮累计 4,224 个独立条目。文件可能继续增长，应现场计数。

`translate_native_summaries_v212.py` 支持 `--limit` 有界增量和 `STOP_NATIVE_AFTER_BATCH` 安全停止。本轮已经在完整批次后停止；没有遗留翻译任务。再次启动前先验证进程并移除属于本任务的停止标记；使用有限批次、单个推理任务，避免和大模型同时占满内存。现有原中文候选是未审核候选，下一步应把 lemma、义项/领域/术语上下文加入缓存身份与质量复核，不得只凭相同短中文标签跨词盲用。

`review_translation_batch_v212.py` 只连接 127.0.0.1 的用户已有 Ollama，通过 ProxyHandler({}) 防止本机调用绕到代理。生成结果默认 needs_independent_review，不能自动并入正式修订。外部付费模型未获授权，不调用。

构建顺序（读取当前脚本后执行，不盲贴）：
1. 对增量源变更与新译文重新审计；使用 `audit_dictionary_v212.py --project <隔离路径> --raw-dir <主目录/.v12-work> --out reports`。
2. `build_bilingual_v212.py` 生成候选。
3. `normalize_bilingual_v212.py` 生成版本隔离的数据包。
4. `bind_candidate_build_v212.py` 绑定相同数据版本。
5. 结构/语义/浏览器/动态内容验证。
6. `release_preflight_v212.py`，BLOCKED 会返回退出码2。

注意：`restore_source_fragments_v212.py`、`reparse_source_pos_v212.py` 已执行；现有报告是变更证据。不要简单重跑后用“本次零变化”覆盖历史审计。需要重建原资料时应保证源修复步骤幂等且累计保留变更凭据。一次性 UI 安装脚本也不应重复作用于已经补丁后的文件。

`audit_dictionary_v212.py` 已保护旧的120条样本：新审核创建带 hash 的样本文件并更新 `translation_sample_current.json`；保留已经审核的老样本与对应证据。

## 余下优先顺序

A. 按真实语境修复机译，先高风险及高频词；完成80词基准与新的独立分层抽样，所有修订附原文、来源和理由。技术/医学/法律词条只作词典内容，不扩写为专业行动建议。
B. 补全独立原中文来源块的英文候选并进行风险筛查，不机械地和 WordNet 意义一一对位。不能把短中文术语当详细释义。
C. 重新对账所有采用的来源；继续核查源词条误配与词源摘录残句。
D. 为动态百科、候选图说明、词源原文、小题、已有自编卡片建立全模块覆盖审计，不能只扫描已使用 `bi-pair` 的节点而漏掉其他英文段落。两种语言的独立百科摘要要明确区别于逐句译文。
E. 保留旧测试，解释两个契约变化，并新增至少同等严格的证据：不捏造译文、原始来源可访问、请求跨重绘/跨单词不串内容。没有新证据前仍是失败。
F. 全部门禁通过后才准备发布。用独立干净发布工作区从现场最新远程main集成经核准代码与唯一需要的数据版本；保留当前主目录未提交草稿，不强制reset或覆盖。推送必须正常快进，不force。仅发布公开词库、代码和必要许可，不发布模型、检查点、翻译缓存和批量候选旧构建。复核生产网页、资源hash、浏览器载入和主要学习状态，再宣布部署。

## 任务报告

每次执行一个或若干有界阶段，完成或阻断后保存检查点。只通知真正进展、必要操作或最终上线结果；离线或无变化不刷屏。不承诺实时在线后瞬间执行。全部完成后暂停续接任务；有明确权限阻碍才请求用户处理，不让用户代替已经能自行做的语义核查。
