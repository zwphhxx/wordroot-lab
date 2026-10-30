# 开源数据与第三方声明

词根实验室 V1.2 使用来自 [ECDICT](https://github.com/skywind3000/ECDICT) 的部分英汉词库及词根资料，仅抽取使用所需的字段，不分发完整原始 CSV。

- 项目：skywind3000/ECDICT
- 数据文件：ecdict.csv、wordroot.txt
- 参考提交：ab22ad36302caf （2026-10-25 获取）
- 本地构建快照 SHA-256（ecdict.csv）：`d1ecbdf9ee2b920afb6f430ca6b6bb9f559588cf0dff86e04bd255f9390843cc`
- 许可：MIT；考纲/词频/音标取自第三方资料，**不应视为官方词表或正式音标审定**。
- 原始词根示例仅作教学资料对应与关联提示，**不能自动当作对每个单词历史词源的严格证实**。

## ECDICT 原始 MIT 许可全文

```
MIT License

Copyright (c) 2025 Linwei

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```


## WordNet 3.0（示例句及英语近义词）

本产品部分英文例句及近义词参考了 Princeton University 的 WordNet 3.0，按照其公开许可保留完整说明如下：

```
WordNet Release 3.0

This software and database is being provided to you, the LICENSEE, by
Princeton University under the following license.  By obtaining, using
and/or copying this software and database, you agree that you have
read, understood, and will comply with these terms and conditions.:

Permission to use, copy, modify and distribute this software and
database and its documentation for any purpose and without fee or
royalty is hereby granted, provided that you agree to comply with
the following copyright notice and statements, including the disclaimer,
and that the same appear on ALL copies of the software, database and
documentation, including modifications that you make for internal
use or for distribution.

WordNet 3.0 Copyright 2006 by Princeton University.  All rights reserved.

THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON
UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR
IMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PRINCETON
UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANT-
ABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE
OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT
INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR
OTHER RIGHTS.

The name of Princeton University or Princeton may not be used in
advertising or publicity pertaining to distribution of the software
and/or database.  Title to copyright in this software, database and
any associated documentation shall at all times remain with
Princeton University and LICENSEE agrees to preserve same.

```

## Wiktionary / Wiktextract（单词词源）

本项目精选词库中的单词词源形式、部分历史派生信息和有限的英文摘录由 Wiktionary 贡献者维护的开放资料提供，经 Kaikki.org / Wiktextract 提取整理。所用原始词库以 2026 年 10 月 1 日英文 Wiktionary 数据转储为基础。

原始内容版权归 Wiktionary Contributors，采用 Creative Commons Attribution-ShareAlike 4.0 International（CC BY-SA 4.0）。本项目将部分词源形式改写为简洁中文词源路径，并明确区分可确证的历史记录和教学构词提示。每个词条提供来源 URL 与许可归属。

- 数据作者/贡献者：Wiktionary Contributors
- 原始词条：https://en.wiktionary.org/
- 开放提取工具与数据：https://kaikki.org/dictionary/English/
- 许可：https://creativecommons.org/licenses/by-sa/4.0/
- Kaikki / Wiktextract 由 Tatu Ylonen 开发；详情参见 https://kaikki.org/dictionary/rawdata.html

## V2.7 搭配与语义索引

新增搭配及语义关系使用 ECDICT（MIT）和 Princeton WordNet 3.0 的现有授权资料。自动表达只展示 WordNet 原有英文解释；部分中文学习搭配为独立整理内容。WordNet 的上位、下位概念按其词义分支标注，不能视为全部义项同义或词源关系。上述来源与完整许可条款继续适用。

## V2.8 Wikipedia and Commons visual explanations

The andiron Chinese summary is an adaptation of Wikipedia contributors’ Andiron article, revision 1352053935, licensed CC BY-SA 4.0: https://en.wikipedia.org/w/index.php?title=Andiron&oldid=1352053935 . The learning examples and dictionary breakdown are independently written.

Image: Andirons (PSF).png, Pearson Scott Foresman, Wikimedia Commons; public domain per the file description: https://commons.wikimedia.org/wiki/File:Andirons_(PSF).png . Local image is a resized version.

On-demand Wikipedia extracts retain source URLs and CC BY-SA 4.0 attribution. Commons images are only displayed with verified public-domain or CC0 / CC BY / CC BY-SA metadata and author/license links.

## V2.9 word-sense visual library

85 local thumbnail files are sourced from Wikimedia Commons. Each image record in visual-seeds-v29.js records the original file page, creator, exact license name and license link where applicable. The word-to-sense captions are independently written learning notes. Thumbnail images are shown at reduced sizes without other edits.

All images and metadata were checked against the per-file Commons records; unsupported license variants were excluded from the packaged set rather than assigned another license. Additional live candidates remain user-selectable topics, not automatic lexical conclusions.

## V2.10 Chinese explanatory definitions and root-word illustrations

The 138 Chinese explanatory notes and bilingual learning examples are independently authored. They do not replace the original dictionary entries. The banana reference includes Cambridge Dictionary; other references are linked per entry. Explicitly selected Chinese Wikipedia topic extracts retain their page and CC BY-SA 4.0 attribution and remain topic-scoped.

New Commons pictures and derivative scene mappings are listed in visual-extra-v210.js. Each retains file description URL, original author, license, and license URL; no unsupported-license file is included. Files are display-sized copies, with no transfer of ownership claimed.

## V2.12 候选双语资料

中文概念标签部分采用 Chinese Open Wordnet（Francis Bond、Shan Wang），以PWN 3.0同义词集合编号连接。中文lemma并非逐句释义译文。完整许可见 `data/licenses/COW-LICENSE.txt`。补译候选使用本机 Argos/OPUS-MT，原模型为CC BY 4.0，见 `data/licenses/OPUS-MT-README.txt`。机器译文不能视为原词典作者核准，词典页面保留相应标记；本候选版本未通过发布门禁。


## V2.20 encyclopedia snapshot: Reason / 理智

The brief English and Chinese encyclopedia extracts in `wiki-snapshots-v220.js` are from Wikipedia contributors, retrieved on 2026-10-30. The pages are paired via the same Wikidata entity, Q178354. They concern the faculty of reason, not every lexical sense of the English word. The extracts are independent language summaries, not sentence-by-sentence translations.

- English source: https://en.wikipedia.org/wiki/Reason
- Chinese source: https://zh.wikipedia.org/wiki/理智
- Entity: https://www.wikidata.org/wiki/Q178354
- Text license: Creative Commons Attribution-ShareAlike 4.0 International, https://creativecommons.org/licenses/by-sa/4.0/ . The local text is a shortened excerpt; other page-interface text is independently authored.

The local illustration `images/visual-v220/reason-article.jpg` is a display-sized copy of **Goya Caprichos3.jpg**, Francisco Goya, included in the English Reason article. Wikimedia Commons identifies the image as **Public domain**. No ownership over the image is claimed and no new artwork is represented as a source photograph.

- Original file and license evidence: https://commons.wikimedia.org/wiki/File:Goya_Caprichos3.jpg
- Creator credit: Francisco Goya / Wikimedia Commons

The page preserves a file-source link and creator/license credit next to the displayed illustration. All other on-demand encyclopedia articles and images retain their own source and license information. A missing or unconfirmed image is not replaced by a fabricated source image.
