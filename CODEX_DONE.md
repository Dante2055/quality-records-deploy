# CODEX_DONE

## 实现内容

- 删除旧 Next.js Web 管理端运行文件，重建为微信小程序原生工程。
- 保留 `data/form-catalog.seed.json` 作为机器可读种子源，原始 8 个模块、37 张表格全部保留在数据映射中。
- 新增 `data/form-catalog.seed.js` 作为微信小程序运行时可 `require` 的种子桥接文件。
- 使用桃金娘 logo 建立米色、深红、暖白配色。
- 增加本地 tabBar PNG 图标，底部导航不依赖网络资源。
- 实现登录、修改密码；已移除用户注册功能。
- 默认本地账号包含梁登庭（13926362866）、李春宇（15119485833）、关雪（15819177379）、冯晓红（18312257989），初始密码均为“123456”，并清理旧默认账号；已存在账号不会在启动时覆盖用户自行修改后的密码。
- 填表人锁定为当前登录用户。
- 移除通用“责任人”字段，避免与系统锁定的填表人重复；保留操作人、检验员、处理人、验收人等具体业务责任字段。
- 移除用户可见的“记录标题”字段，记录显示名改为系统按表单、日期、批次/姓名等自动生成。
- 所有表单的备注字段统一移动到最后一栏。
- 实现首页、模块页、表单页、新增/编辑页、详情页、记录列表、A4 预览页、HACCP CCP 报告页、我的页面。
- 实现原始 8 个业务模块；手机端显示 36 张原表录入入口和 3 张补充核心表单，共 39 张手机录入表单。“合格供方名录”保留为 PC 端汇总导出表。
- 实现本地缓存记录存储、状态流、审核、退回、软删除。
- 已按本轮要求加入一次性记录清理版本：小程序下次启动时会清空旧填写记录和记录关联的本地图片，保留默认登录账号；同一清理版本不会重复执行。
- 已提交和已审核记录不可直接覆盖；已审核记录可通过“发起更正”复制生成新草稿，原记录保留。
- 编辑记录时保留原创建人，另记录最后修改人；已审核记录在存储层禁止删除。
- 状态流在存储层限制为草稿/已退回→已提交、已提交→已审核/已退回，避免误调用跳过审核。
- “制曲”调整为原表“生产过程关键控制点记录”中的关键控制点项目，并实现温度、湿度、开始时间、结束时间、操作人、纠偏措施字段。
- 制曲 CCP 临界值调整为温度 ≤ 40℃、湿度 60% - 100%；超标保存时要求填写纠偏措施。
- 出厂/检验相关表单补充干豆豉/即食豆豉产品类型、第三方委托检验机构、报告编号、盐分、氨基酸态氮、水分、微生物和黄曲霉毒素字段。
- 将“桃金娘豆豉每日质量安全检查记录”显示名改为“每日质量安全检查记录”，将“桃金娘豆豉每周质量安全排查治理报告”显示名改为“每周质量安全排查治理报告”。
- 每日、每周检查表改为使用原 Word 表格检查项文字，并通过单选项填写。
- 每日、每周检查表的“填表人”显示为“自查人员”；每周检查 10.2 默认选择“不适用”。
- 设备设施与环境卫生模块中的“厂区环境卫生检查记录”和“生产场所及设备设施卫生检查记录表”改为使用原 Word 检查项文字，并通过“合格 / 不合格”单选项填写，默认合格。
- “生产场所及设备设施卫生检查记录表”已按七个原表大类分组显示，录入页、详情页、打印页和表格导出均保留分类。
- “从业人员职业健康监护档案”已调整员工号为第一项，新建时按现有档案最大员工号自动递增生成 `000001` 格式编号且允许修改；从业时间、建档时间无历史记录时默认当天，员工号或姓名匹配到历史档案时显示历史记录并自动带出历史从业时间、建档时间；该表录入页的填表人移动到字段最后。
- “从业人员职业健康监护档案”已改为纸质档案式数据结构：主表保存姓名、性别、工作岗位、员工号、出生年月、从业时间、健康证号、家庭病史、建档时间和照片；检查时间、检查单位、检查项目、检查结果、采取措施、备注保存为同一记录下的 `healthChecks` 明细数组。录入页支持新增/删除多条健康检查明细，详情页、打印页和表格导出均支持显示该明细数组。
- 该档案总备注已移动到照片上传下方、健康检查明细上方；健康检查明细中的“采取措施”和明细“备注”默认填“无”，详情页、打印页、追加年度检查和存储归一化也按“无”兜底。
- 员工档案详情页新增“新增年度检查”入口，打开独立页面只填写年度检查明细；检查时间默认当天，检查单位默认上一条检查单位，检查项目默认“健康证”，检查结果默认“正常”，采取措施和备注默认“无”。该入口允许对已审核档案追加年度检查，但只追加 `healthChecks` 明细，不修改基础档案字段，并写入追加人和追加时间。
- 全部固定选项字段统一改为直接单选框，默认选择第一个业务正常项，例如合格、符合、正常、委托第三方。
- 全部表单已统一增加“无”默认值规则：备注、其他资料、其他问题、存在问题、纠正/纠偏/处置措施、异常处置、家庭病史、原因分析、处理结果等可空说明类字段默认填“无”，保存时若仍为空也按“无”保存；姓名、数量、日期、供方、产品名等业务实填字段不做“无”默认。
- 隐藏手机端“合格供方名录”录入入口；供方评价表已按原 Word 供方评价表重做字段，覆盖供方基本信息、采购产品分类、生产企业评价内容、评价结论和审批意见，地址位于联系人前，采购产品分类保留“原料/相关产品”并默认原料，评价频次位于评价结论和评价人之间，使用“3年一次/每年一次/每半年一次/每季度一次/每批次”下拉菜单并默认 3 年一次，营业执照和生产许可证各支持上传 1 张本地图片，单选项默认常用正常项，评价人/审批人默认当前登录人且可修改，审批日期默认当天；PC 端可由供方评价记录汇总导出合格供方名录。
- 供应商与采购模块排序调整为“供方评价表 → 采购计划 → 进货查验记录 → 原料验收记录 → 原辅材料采购台帐”；进货查验记录由仓管员填写，原料验收记录由检验员填写。
- 供应商与采购关键字段已设为必填：供方地址、联系人、联系电话、生产厂家、评价人、审批日期；采购计划名称；进货查验名称、供方、生产厂家、仓管员；原料验收批次、品名、生产厂家、生产日期、保质期、检验员；台账批次、名称、生产日期、保质期、供方、采购日期、检验员。台账检验员默认当前登录人并锁定不可修改。
- 原料验收记录字段顺序已调整为“规格型号 → 单位 → 数量”，便于按收货信息连续填写。
- 进货查验记录的批号默认按年月和 6 位流水号生成，例如 `202605000001`，从当月 `000001` 开始递增，生成后仍可手动修改。
- 采购计划、进货查验记录、原料验收记录、原辅材料采购台帐已接入供方评价表联动：产品字段从已登记且未判定为不合格的供方评价记录生成下拉列表，选中产品后自动带出供方/生产厂家等已有字段；同一产品存在多个供方时，供方字段改为下拉菜单。
- 采购计划运输日期、原料验收记录进货日期、原辅材料采购台帐采购日期默认当天。
- 进货查验记录会从最近日期的采购计划自动带出规格型号、单位、进货数量、供方信息；原料验收记录和原辅材料采购台帐均增加“批次”下拉，原料验收记录只显示已进货但尚未验收的批次，台账只显示已验收但尚未入台账的批次；有可用批次时默认选数字最小的批次，没有可用批次时显示“暂无可选批次”；选择批次后自动带出对应记录的规格型号、单位、数量、生产日期、保质期、供方等信息，自动带出内容允许继续修改，台账检验员默认当前填表人且不可修改。
- 新增通用图片字段渲染能力，录入页支持拍照/相册选择、缩略图预览和删除，详情页和打印页显示图片缩略图，导出表格中记录图片名称；真机端已补充相机权限说明、隐私授权兜底和明确失败提示，上传入口改为自定义居中按钮并优先使用更稳定的 `wx.chooseImage`。
- 实现按批次生成 HACCP CCP 报告，并可导出本地 Excel 兼容报告。
- 实现单条记录 A4 黑白友好预览和本地 Excel 兼容表格导出。
- 记录列表和导出表格已同步每日、每周检查表的“自查人员”标签。
- 默认记录日期按北京时间（Asia/Shanghai）生成，避免设备时区不同导致日期偏差。
- 自动记录名补充识别供方、采购品、原料、样品、设备、客户、投诉人等业务主字段；HACCP 报告跳转批次号已做 URL 编码。
- 最近记录卡片标题统一改为两行显示，第一行保留“表单名 -”，第二行显示日期和业务对象，避免表单名前缀被删掉或长标题挤压状态标签。
- 表单页和模块表单列表已隐藏来源文档/来源表格提示；源文档映射字段仍保留在数据中供后续导出使用。
- 详情页、打印页和导出工具已补充空记录数据保护，避免记录未加载时访问 `record.data` 出错。
- CCP 判定、HACCP 筛选和打印字段生成已兼容旧缓存或导入数据缺失 `data` 的记录。
- 录入页已避免真机选择图片返回后重复执行 `onShow` 初始化，防止未保存字段被清空。
- 模块顺序已调整，`运输销售与追溯` 在小程序中显示为第 4 个模块 `运输与销售`。

## 技术栈

- 微信小程序原生框架
- JavaScript
- WXML / WXSS
- 本地缓存 `wx.setStorageSync` / `wx.getStorageSync`

## 文件结构

```text
app.js
app.json
app.wxss
project.config.json
sitemap.json
data/
  form-catalog.seed.json
  form-catalog.seed.js
images/
  logo.png
  tab-home.png
  tab-home-active.png
  tab-records.png
  tab-records-active.png
  tab-profile.png
  tab-profile-active.png
pages/
  login/
  password/
  index/
  module/
  forms/
  record-form/
  record-detail/
  records/
  print/
  haccp-report/
  profile/
utils/
  auth.js
  catalog.js
  ccp.js
  export-file.js
  format.js
  storage.js
scripts/
  verify-miniprogram.js
templates/
  阳江市桃金娘豆豉有限公司质量安全管理通用记录表单YJTJN-BGS-a-00002 A2026.docx
```

## 验证结果

执行目录：

```text
/Volumes/Assets/编程/桃金娘质量安全记录小程序/taojinniang-quality-records-deploy
```

JavaScript 语法检查：

```text
find . -name '*.js' -print0 | xargs -0 -n1 node --check
结果：通过，无错误输出
```

小程序 JSON 文件检查：

```text
app.json
project.config.json
project.private.config.json
sitemap.json
结果：全部可解析
```

tabBar 图标文件检查：

```text
6 个 tab 图标均为 81 x 81 PNG
logo.png 为 400 x 400 PNG
```

旧 Web 文件检查：

```text
find . -maxdepth 2 \( -name 'package.json' -o -name 'next.config.*' -o -name 'middleware.*' -o -name '.next' -o -name 'node_modules' -o -name 'app' -o -name 'lib' \) -print
结果：无输出
```

小程序结构验证：

```json
{
  "seedModules": 8,
  "seedForms": 37,
  "miniProgramModules": 8,
  "miniProgramForms": 39,
  "retainedSeedForms": 37,
  "pcOnlyForms": ["approved-supplier-list"],
  "pages": 12,
  "missingPages": [],
  "missingSeedForms": []
}
```

最近记录标题拆分验证：

```json
{
  "titleMain": "供方评价表 - ",
  "titleSub": "2026-05-17 - 阳江市拾叁乡油脂有限公司"
}
```

本地存储流程模拟：

```json
{
  "forms": 39,
  "recordStatus": "approved",
  "createdByPreserved": true,
  "approvedOverwriteBlocked": true,
  "approvedDeleteBlocked": true,
  "correctionStatus": "draft",
  "correctionFillerLockedToCurrentUser": true
}
```

表格导出模拟：

```text
生成文件头：PK
ZIP 包含 xl/workbook.xml、xl/worksheets/sheet1.xml
工作表包含产品名称、豆豉
结果：通过
```

表单结构复查：

```json
{
  "today": "2026-05-17",
  "forms": 39,
  "issues": []
}
```

本次字段必填与台账锁定复查：

```text
find . -name '*.js' -print0 | xargs -0 -n1 node --check
结果：通过，无语法错误

node scripts/verify-miniprogram.js
seedModules=8, seedForms=37, miniProgramModules=8, miniProgramForms=39, retainedSeedForms=37, pcOnlyForms=["approved-supplier-list"], pages=12, missingPages=[], missingSeedForms=[]

字段必填检查
issues=[], checkedForms=5

台账检验员锁定检查
raw-material-purchase-ledger.inspector 默认当前登录人，并在表单渲染时设置 readonly=true、disabled=true
```

本次从业人员职业健康监护档案复查：

```json
{
  "orderOk": true,
  "emptyState": {
    "employeeNo": "000001",
    "startWorkDate": "2026-05-20",
    "archiveDate": "2026-05-20",
    "fillerAtEnd": true
  },
  "historyState": {
    "employeeNo": "000002",
    "startWorkDate": "2024-01-02",
    "archiveDate": "2024-01-03",
    "historyCount": 1
  }
}
```

本次职业健康档案明细数组复查：

```json
{
  "firstField": "employeeNo",
  "hasPhoto": true,
  "hasHealthChecks": true,
  "hasOldSingleCheckFields": false,
  "savedRows": [
    {
      "checkTime": "2026-05-20",
      "checkUnit": "阳江市人民医院",
      "checkItem": "健康证",
      "checkResult": "正常",
      "measureTaken": "无",
      "remarks": "无"
    }
  ]
}
```

本次年度检查追加流程复查：

```json
{
  "defaults": {
    "checkTime": "2026-05-20",
    "checkUnit": "阳江市人民医院",
    "checkItem": "健康证",
    "checkResult": "正常",
    "measureTaken": "无",
    "remarks": "无"
  },
  "approvedRecordAppend": {
    "status": "approved",
    "rows": 2,
    "newCheckTime": "2027-05-20",
    "appendedByName": "梁登庭"
  }
}
```

本次全表“无”默认值复查：

```json
{
  "defaultNoFieldCount": 62,
  "dailyQualitySafetyCheckSave": {
    "otherProblems": "无",
    "remarks": "无"
  },
  "detailBlankFallback": {
    "remarks": "无"
  },
  "ccpExceededGuard": "温度超过 40℃ 时，纠偏措施为“无”仍会拦截保存并要求填写真实纠偏措施"
}
```

## 已知限制

- 尚未在微信开发者工具中实际点击编译；当前已完成文件级和逻辑级本地校验。
- 原始 37 张表格已保留在种子数据和映射中；其中“合格供方名录”作为 PC 端汇总导出表，不作为手机录入入口。3 张补充表单还需要后续同步到正式 DOCX 映射。
- 本地账号和记录保存在小程序缓存中，清缓存会丢失数据。
- 密码为本地 MVP 明文缓存，不能作为生产安全方案。
- 小程序不能直接写入手机任意下载目录，当前导出到小程序本地文件目录并打开系统表格预览，用户可从预览页保存或分享。
- 营业执照和生产许可证图片当前只保存到小程序本地文件目录；正式上线后建议迁移到微信云存储或自建对象存储，记录中补充云端文件标识。
- 暂未实现 DOCX 精准回填。

## JARVIS 备注

- 本项目现在是微信小程序工程，不需要启动 `localhost:3001`。
- 请用微信开发者工具导入 `taojinniang-quality-records-deploy` 目录。
- 不要部署服务器。
- 不要修改或删除 DOCX 源文件。
