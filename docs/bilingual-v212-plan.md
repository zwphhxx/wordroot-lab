# V2.12 全词库义项级中英适配：执行与部署约束

## 用户最新授权

2026-10-26 用户确认 Mac 已上线，要求开始计划并部署。此前部署前检查要求继续有效：只在所有真实发布门禁通过后部署；未通过不得以删数据、放宽测试或机译标签替代质量验收。

## 固定工作位置

- 主项目：`/Users/zhuwenpeng/Developer/wordroot-lab-deploy`
- 隔离 worktree：`/Users/zhuwenpeng/Developer/wordroot-lab-bilingual-staging`
- 分支：`work/bilingual-sense-v212`
- 台账、快照和测试环境：`/Users/zhuwenpeng/Developer/wordroot-lab-workspace`
- 公开原始语料与模型：主项目 `.v12-work`，只读复用，不提交模型。
- 新处理结果和进程检查点：隔离区 `.work/bilingual-v212`。
- 已确认生产基线：`b12bc8b3f62967d1e2b2911ee4b98810344bd936`，实际发布前必须再核对远端。

## 已执行

M0：主目录和所有已存在的本项目工作区迁入 Developer；原始语料、模型及未提交草稿保留。创建独立 staging 分支。迁移详情及一次预检缺陷的处置记录在 reports/migration-report.md；该缺陷已修复，完整翻译输出与输入集合及原文件前缀校验完成。

P1：全库49,426词审计完成。初始英文翻译165,284条与中文反向翻译7,975条均生成。源词典续行导入修复后补译5,208条合并文本，保留旧检查点。对5,203个词条的14,431个续行保留逐行映射。审计分母独立于发布输出。

P2/P3：候选数据采用schema3、稳定内部ID、WordNet 3.0 sense keys、原始来源身份和单独义项编号。修复把其他词的定义贴到关联词下面、英文换行误拆义项、由机译文本产生的ID冲突。精确重复源记录有可对账合并。

P4：对已有候选译文执行异常字符、否定、数值、术语、重复、格式等风险筛查；已写25条逐源文校订。筛查不是语义准确性保证；大量候选仍待复核。另有本机模型生成修订候选的有界批处理脚本，其输出绝不自动升级为已核准。

P5：本机预览使用统一中英pair。carrier拥有15个分领域义项，例句、搭配、关联语境分别配对。所有学习卡片展开。机译不得自动进入计分练习。外部百科缺少对应语种时不能宣称已提供双语。

P7：版本化manifest及校验码绑定整个资料包；所有行校验完成后才写入内存，失败可重试；防跨版本混读。按前缀细分资料包，最大约512KiB，不把全部数据塞入首屏。学习存储键保持不变。

P8：已执行8项源解析单元测试、10项资料仓库单元测试、25项针对性浏览器检查及11项旧复习算法检查。已建立80个语义基准词清单，但不能把尚未复核的清单当成80项通过。完整历史浏览器回归、动态内容配对及来源版本映射审核仍须完成。

## 必须继续解决

1. 全库高风险译文、异常字符、否定与专业术语；机器分数和回译不能直接代替语义审核。
2. 搭配的完整短语义项与当前单词义项的映射，不能按字符串相似强连。独立习语/复合词若不适宜绑定一个父义项，要明确其自身词义模型并保留证据，不可简单改状态让门禁变绿。
3. 三条尚未确定义项的例句；原中文释义块到完整英语义项的来源对账。
4. WordNet与Chinese Open Wordnet来源版本、许可证和映射审计。
5. 每个基准词的独立预期及真实复核证据。所有学习区域的双语覆盖，包括词源、图片caption、百科主题与正文，不允许只测试主释义。
6. 完整旧功能浏览器回归；保持URL、输入法、候选词、前进后退、PWA、收藏、复习日期和阅读记录。

## 候选数据生成

```sh
cd /Users/zhuwenpeng/Developer/wordroot-lab-bilingual-staging
python3 scripts/prepare_bilingual_v212.py
/Users/zhuwenpeng/Developer/wordroot-lab-workspace/runtime/venv-bilingual/bin/python scripts/translate_bilingual_v212.py --direction en_zh --beam 2
python3 scripts/audit_dictionary_v212.py --project "$PWD" --raw-dir /Users/zhuwenpeng/Developer/wordroot-lab-deploy/.v12-work --out "$PWD/reports"
python3 scripts/build_bilingual_v212.py
python3 scripts/normalize_bilingual_v212.py
python3 scripts/bind_candidate_build_v212.py
```

重新构建前查进程及锁，禁止并发writer。同一阶段已有完成检查点时不重复做大批翻译。原始OPUS缓存是候选；不能因恢复任务便自动信任。

## 检查入口

```sh
python3 tests/test_source_parser_v212.py
node tests/test_repository_v212.cjs
node tests/check_memory_v2.cjs
CDP_PORT=9280 node tests/browser_bilingual_v212.cjs
/Users/zhuwenpeng/Developer/wordroot-lab-workspace/runtime/venv-bilingual/bin/python scripts/release_preflight_v212.py
```

浏览器测试只能使用Developer工作目录下专用Chrome profile，不得清空用户真实浏览器。浏览器clientWidth与innerWidth可能因原生滚动条相差15px；无横向溢出的断言应比较documentElement.clientWidth与scrollWidth，不能以移除溢出检查让测试通过。

## 部署门禁

`schemas/publish-gates-v212.json` 规定门槛；`reports/release-gate.json` 是当前结果。退出码2表示BLOCKED，不是测试运行失败。发布必须同时有当前buildId下的源对账、双语完整性、已知严重语义错误为0、重点高风险复核、80词语义基准、动态外部资料审计、旧功能回归等真实证据。

本机候选可用于查看进展，不能称为线上正式版。禁止将未通过的候选推送main或绕开门禁发布部分坏数据。只在通过后按用户最新授权发布，并校验GitHub Pages构建、实际公网资源hash、查询/刷新/离线/存储迁移。报告中严格区分字段覆盖、机器筛查、助手复核和人工审核。
