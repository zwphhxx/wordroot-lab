# V2.15 短卡与图片修复

保留词义→理解→用法→拓展的阶段顺序，阶段不再是大卡片。义项、例句、搭配、词源、词族及百科段落按完整语义分卡；中英对照不拆开，不折叠、不裁切或静默丢记录。

## 本次修复
- 卡片和百科使用相同边界与内边距；手机长解释单列；阶段编号不挤占正文起点。
- carrier 等多义词按语境、条数及文字量拆卡；保留原稳定义项和阅读锚点。
- dogwood 保持为查询词；百科的 Cornus 属名及具体植物图片单独说明。
- dogwood / species 的已发现错译采用可审计校订层，原数据、原义项ID、原译文不覆盖。
- species 分类示意图与 dogwood 配图落为许可核对过的本地资源，首次查看后可离线缓存。
- 确认查询后提前检索主题；代表图缺少时查同条目其他图片，保留许可筛选及主题选择；用户关闭自动图片时不自动请求。
- 图片网络失败与无匹配图分开；真实失败可重试。已确认图片前置，百科摘要独立拆卡，不覆盖查询词。

## 验收
全库49,426词、110,238义项、75,858例句、17,152搭配、84,682关系、71,561原中文来源块及3,662资料包通过保全检查。基本资料包字节不变，有限编辑校订单独保存。

新增32项短卡检查、16项媒体检查、8项图像失败恢复检查、11项旧版升级检查均通过；8组既有回归及复习算法11项、读取组件10项通过。具体代码哈希与测试证据见 reports/reading-v215-acceptance.json。

这些检查不等于所有译文已逐条审核，不等于所有实际iPhone/Safari已验证。短卡缩短单个阅读块，但完整页面总高度可能增加；不声称整页更短或学习效果已被测量。

## 来源与许可
- dogwood 植物义：https://plants.ces.ncsu.edu/plants/cornus/common-name/dogwood/
- 照片对象、作者与许可：https://commons.wikimedia.org/wiki/File:Bgbo_cornus_kousa_var_chinensis_ies.jpg
- species 分类图：https://commons.wikimedia.org/wiki/File:Biological_classification_L_Pengo_vflip.svg
- 模式种定义边界：https://code.iczn.org/types-in-the-genus-group/article-67-general-provisions/
- 媒体回退接口：https://www.mediawiki.org/wiki/API:Images 和 https://www.mediawiki.org/wiki/API:Imageinfo

## 发布与恢复
门禁通过后正常合并 main、推送、验证 Pages 与公网资源哈希。回滚基线 cb1514b2051fe68759088a1fd04eb3795df18ac7；以正常 git revert 回滚，不 force push、不清除学习记录。

## 公网重试检查的时序修正
首次公网检查在图片尺寸可读但完整文件未加载时读取状态，记录为失败并保留。诊断确认 naturalWidth=500 时 complete=false、状态仍为 loading；完整加载后状态为 ready。测试改为等待 complete、naturalWidth 和 ready 三项并执行 decode()，原断言保留，连续两次公网8项检查通过。生产业务代码未因该测试修正而变化。
