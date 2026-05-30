const seed = require("../data/form-catalog.seed.js");

const sourceModules = seed.modules || [];
const pcOnlyFormSlugs = ["approved-supplier-list"];

function field(name, label, type = "text", required = false, options) {
  const item = { name, label, type, required };
  if (options) item.options = options;
  return item;
}

function radioField(name, label, options = yesNoOptions, defaultValue = "是") {
  return { name, label, type: "radio", required: false, options, defaultValue };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findSeedForm(name) {
  for (const moduleItem of sourceModules) {
    const found = (moduleItem.forms || []).find((form) => form.name === name || form.name.includes(name) || name.includes(form.name));
    if (found) return { module: moduleItem, form: found };
  }
  return null;
}

function fromSeed(name, fallbackSlug, overrides = {}) {
  const found = findSeedForm(name);
  if (found) {
    const form = clone(found.form);
    return {
      ...form,
      slug: overrides.slug || form.slug || fallbackSlug,
      name: overrides.name || form.name,
      moduleSlug: overrides.moduleSlug,
      moduleName: overrides.moduleName,
      fields: overrides.fields || form.fields || [],
      sourceModuleSlug: found.module.slug,
      sourceDocName: form.sourceDocName,
      sourceKind: form.sourceKind,
      sourceTableIndex: form.sourceTableIndex,
      entryMode: overrides.entryMode || form.entryMode || "single_entry"
    };
  }
  return {
    slug: fallbackSlug,
    name,
    moduleSlug: overrides.moduleSlug,
    moduleName: overrides.moduleName,
    fields: overrides.fields || [],
    sourceDocName: "小程序新增业务表单，后续同步到官方表单映射",
    sourceKind: "document",
    sourceTableIndex: null,
    entryMode: overrides.entryMode || "single_entry"
  };
}

const commonFields = [
  field("recordDate", "记录日期", "date", true),
  field("batchNo", "批次号", "text", false),
  field("remarks", "备注", "textarea", false)
];

const ccpFields = [
  field("recordDate", "记录日期", "date", true),
  field("batchNo", "批次号", "text", true),
  field("checkTime", "检查时间", "time", false),
  field("controlPointName", "关键控制点名称", "select", true, ["制曲", "拌盐", "运输温度", "其他"]),
  field("processRequirement", "工艺要求及控制参数", "textarea", false),
  field("startTime", "制曲开始时间", "time", false),
  field("endTime", "制曲结束时间", "time", false),
  field("temperature", "温度记录（℃）", "number", false),
  field("humidity", "湿度记录（%）", "number", false),
  field("actualResult", "实际结果", "text", false),
  field("operationStatus", "运行情况", "text", false),
  field("operator", "操作人", "text", false),
  field("deviationAction", "临界值超标纠偏措施", "textarea", false),
  field("abnormalHandling", "异常处置措施", "textarea", false),
  field("remarks", "备注", "textarea", false)
];

const thirdPartyInspectionFields = [
  field("productType", "产品类型", "select", false, ["干豆豉", "即食豆豉"]),
  field("inspectionMode", "检验方式", "select", false, ["委托第三方", "自检", "自检+委托第三方"]),
  field("thirdPartyLab", "委托检验机构", "text", false),
  field("thirdPartyReportNo", "第三方报告编号", "text", false),
  field("saltContent", "盐分检测结果", "text", false),
  field("aminoAcidNitrogen", "氨基酸态氮检测结果", "text", false),
  field("moisture", "水分检测结果", "text", false),
  field("microbiologyResult", "微生物检测结果", "text", false),
  field("aflatoxinResult", "黄曲霉毒素检测结果", "text", false)
];

const yesNoOptions = ["是", "否"];

function radioNoDefault(name, label, options, required = false, categoryTitle = "", defaultValue = "") {
  const item = { name, label, type: "radio", required, options };
  if (categoryTitle) item.categoryTitle = categoryTitle;
  if (defaultValue) item.defaultValue = defaultValue;
  return item;
}

function selectField(name, label, options, required = false, defaultValue = "") {
  const item = { name, label, type: "select", required, options, keepSelect: true };
  if (defaultValue) item.defaultValue = defaultValue;
  return item;
}

function imageField(name, label, maxCount = 1) {
  return { name, label, type: "image", required: false, maxCount };
}

function healthChecksField() {
  return {
    name: "healthChecks",
    label: "健康检查记录",
    type: "healthChecks",
    required: false
  };
}

const noDefaultFieldNames = new Set([
  "remarks",
  "otherMaterials",
  "deviationAction",
  "abnormalHandling",
  "causeAnalysis",
  "disposalMeasure",
  "disposalResult",
  "mainProblems",
  "correctiveResult",
  "correctiveAction",
  "otherProblems",
  "problemAnalysisReport",
  "problems",
  "improvementMeasures",
  "familyMedicalHistory",
  "handlingResult",
  "disposalMeasures",
  "problemDescription",
  "expectedCompletion",
  "nextMeasures",
  "implementationSummary",
  "otherNotes"
]);

function shouldDefaultNo(fieldItem) {
  if (!fieldItem || fieldItem.required) return false;
  if (!["text", "textarea"].includes(fieldItem.type)) return false;
  return noDefaultFieldNames.has(fieldItem.name) || /备注/.test(fieldItem.label || "");
}

function applyNoDefaults(fields) {
  return (fields || []).map((item) => (shouldDefaultNo(item) ? { ...item, defaultValue: item.defaultValue || "无" } : item));
}

const supplierEvaluationFields = [
  { ...field("recordDate", "评价日期", "date", true), categoryTitle: "基本信息" },
  field("productName", "产品名称", "text", true),
  field("supplierName", "供方名称", "text", true),
  field("supplierAddress", "地址", "text", true),
  field("contactPerson", "联系人", "text", true),
  field("contactPhone", "联系电话", "text", true),
  field("manufacturer", "生产厂家", "text", true),
  field("manufacturerAddress", "生产厂家地址", "text", false),
  radioNoDefault("purchaseProductCategory", "采购产品分类", ["原料", "相关产品"], true, "采购产品分类", "原料"),
  radioNoDefault("businessLicenseStatus", "年检有效期内的营业执照", ["已提供", "未提供"], false, "生产企业评价内容", "已提供"),
  imageField("businessLicenseImages", "营业执照图片", 1),
  field("creditCode", "统一社会信用代码", "text", false),
  radioNoDefault("productionLicenseStatus", "有效期内的生产许可证", ["有", "没有"], false, "", "有"),
  imageField("productionLicenseImages", "生产许可证图片", 1),
  field("licenseNo", "生产许可证编号", "text", false),
  radioNoDefault("inspectionCapability", "具有产品出厂检验能力", ["有", "没有"], false, "", "有"),
  field("otherMaterials", "其他资料", "textarea", false),
  radioNoDefault("publicCreditEvaluation", "社会公布的相关信用评价信息", ["好", "一般", "差"], false, "", "好"),
  radioNoDefault("qualityStability", "质量稳定性", ["好", "不好"], false, "", "好"),
  radioNoDefault("deliveryTimeliness", "交付及时性", ["好", "不好"], false, "", "好"),
  radioNoDefault("serviceSituation", "服务情况", ["好", "不好"], false, "", "好"),
  radioNoDefault("evaluationResult", "评价结论", ["合格供方", "不合格供方"], true, "评价结论", "合格供方"),
  selectField("evaluationFrequency", "评价频次", ["3年一次", "每年一次", "每半年一次", "每季度一次", "每批次"], false, "3年一次"),
  field("evaluator", "评价人", "text", true),
  radioNoDefault("approvalDecision", "审批意见", ["同意列入合格供方名录", "暂不列入合格供方名录"], false, "审批", "同意列入合格供方名录"),
  field("approver", "审批人", "text", false),
  field("approvalDate", "审批日期", "date", true),
  field("remarks", "备注", "textarea", false)
];

const dailyCheckItems = [
  ["daily_1_1", "1.1 厂区无扬尘、无积水，厂区、车间卫生整洁。生产场所无虫害迹象。"],
  ["daily_1_2", "1.2 生产车间与库房的墙壁、地面表面应平整光滑，清洁卫生良好。"],
  ["daily_1_3", "1.3 洁净区门窗处于常闭状态。"],
  ["daily_2_1", "2.1 通风、防尘、排水、照明、温控等设备设施与防鼠、防蝇、防虫害装置正常运行。"],
  ["daily_2_2", "2.2 更衣、洗手、干手、消毒等卫生设备设施满足正常使用。"],
  ["daily_2_3", "2.3 库房物料离墙、离地、离顶存放，按品种分区存放和标识，与非食品相关产品物料隔离存放。"],
  ["daily_2_4", "2.4 生产设备设施按期维护。"],
  ["daily_3_1", "3.1 原辅料贮存条件符合要求。防护设施运行正常有效。原辅料使用台账记录清晰、完整。"],
  ["daily_4_1", "4.1 生产投入的原辅料的品种、数量符合生产投计划、生产工艺与质量控制要求。"],
  ["daily_4_2", "4.2 不存在有使用违规材料投入生产的情况。"],
  ["daily_4_3", "4.3 生产加工过程关键控制点的工艺参数符合生产工艺与质量控制要求。有温湿度等生产环境监测要求的，定期进行监测并记录。"],
  ["daily_4_4", "4.4 人流、物流不存在交叉污染。"],
  ["daily_4_5", "4.5 对不合格品、水口、边角料等进行处置且有记录。"],
  ["daily_5_1", "5.1 有合格证。标签标注的事项完整、真实（包括标签、说明书、获证产品生产许可证标志和编号，根据产品的特点难以附加标识的裸装产品除外），不存在标注虚假生产日期或批号的情况。内容符合GB 4806.1等国家强制标准的规定。"],
  ["daily_6_1", "6.1 产品的贮存或运输条件符合相关要求。用于包装、贮存和装卸的容器、工具和设备清洁卫生良好。"],
  ["daily_7_1", "7.1 按照产品标准规定进行检验，且有原始检验数据和检验报告记录。"],
  ["daily_7_2", "7.2 对检验不合格产品有相应处置记录。"],
  ["daily_8_1", "8.1 如实记录出厂产品的名称、规格、数量、生产日期或者生产批号、保质期、检验合格证号、销售日期以及购货者名称、地址、联系方式等内容，并保存相关凭证。"],
  ["daily_9_1", "9.1 工作人员穿戴工作衣帽，经洗手消毒后方进入生产车间，不存在个人卫生不符合规定的情况。生产车间内不存在与生产无关的个人用品或者其他与生产不相关物品。"]
];

const weeklyCheckItems = [
  ["weekly_1_1", "1.1 厂区或附近无影响生产或可能污染食品相关产品的污染源。", yesNoOptions],
  ["weekly_1_2", "1.2 厂区无扬尘、无积水，厂区、车间卫生整洁。无杂物堆放，无虫害迹象。", yesNoOptions],
  ["weekly_1_3", "1.3 生产工艺流程合理，不存在交叉污染。", yesNoOptions],
  ["weekly_1_4", "1.4 生产车间与库房的墙壁、地面表面卫生良好，生产车间顶棚清洁无霉变或冷凝水。", yesNoOptions],
  ["weekly_2_1", "2.1 通风、防尘、排水、照明、温控等设备设施正常运行，存放垃圾、废弃物的设备设施标识清晰，具备有效防护。", yesNoOptions],
  ["weekly_2_2", "2.2 具备更衣、洗手、干手、消毒等卫生设备设施，满足正常使用。", yesNoOptions],
  ["weekly_2_3", "2.3 生产设备、监控设备（如压力表、温度计）、检验设备等定期检定或校准、维护，有相关记录。", yesNoOptions],
  ["weekly_2_4", "2.4 防鼠、防蝇、防虫害装置正常使用并有相应检查记录。", yesNoOptions],
  ["weekly_2_5", "2.5 对有空气净化要求的，对空气洁净度、压差、换气次数、温度、湿度等进行监测及记录，其参数符合相应要求。", yesNoOptions],
  ["weekly_2_6", "2.6 库房物料离墙、离地、离顶存放，按品种分区存放和标识，与非食品相关产品物料隔离存放，不存在交叉污染。有毒有害物料、易燃易爆物料未单独存放。", yesNoOptions],
  ["weekly_3_1", "3.1 查验原辅料供货者的许可证（如有）、产品合格证明文件等；供货者无法提供有效合格证明文件的，有检验记录。", yesNoOptions],
  ["weekly_3_2", "3.2 进货查验记录及证明材料真实、完整、合规。", yesNoOptions],
  ["weekly_3_3", "3.3 有原辅料的贮存、使用记录、领用出库和退库记录。对首次使用的原辅料、配方和生产工艺未进行安全评估及验证。", yesNoOptions],
  ["weekly_4_1", "4.1 使用的原辅料的品种与索证索票、进货查验记录内容一致。", yesNoOptions],
  ["weekly_4_2", "4.2 生产投料符合生产计划、生产工艺与质量控制要求，其记录包括投料品名、生产日期或批号、使用数量等。", yesNoOptions],
  ["weekly_4_3", "4.3 不存在有使用违规和不符合食品安全国家标准的原料投入生产的情况。", yesNoOptions],
  ["weekly_4_4", "4.4 生产工艺和参数符合质量控制要求，且与许可时保持一致。有对生产加工过程关键控制点的控制情况进行记录。", yesNoOptions],
  ["weekly_4_5", "4.5 关键控制点记录完整，并有可追溯性。", yesNoOptions],
  ["weekly_4_6", "4.6 用于非食品接触面的印刷油墨层不应与食品直接接触，严格控制因堆叠或卷绕引起的黏粘等方式造成的从印刷面转移到食品接触面的物质。", yesNoOptions],
  ["weekly_5_1", "5.1 产品有合格证和标签，标签标注的事项完整、真实、合规。", yesNoOptions],
  ["weekly_5_2", "5.2 不存在标注虚假生产日期或批号的情况。", yesNoOptions],
  ["weekly_6_1", "6.1 根据产品特点建立和执行相适应的贮存、运输及交付控制制度和记录。", yesNoOptions],
  ["weekly_6_2", "6.2 产品在贮存过程中，应选择合适的贮存条件，以保证产品安全质量不受影响。在贮存和运输过程中应加强防护，防止成品出现损伤、污染。", yesNoOptions],
  ["weekly_7_1", "7.1 有原始检验数据和检验报告记录，检验记录真实、完整、合规。", yesNoOptions],
  ["weekly_7_2", "7.2 自行检验项目与委托有资质检验机构进行检验的项目应覆盖食品安全国家标准中的检验项目要求。", yesNoOptions],
  ["weekly_7_3", "7.3 对检验不合格产品划定区域存放，具有明显标示，有相应处置记录。", yesNoOptions],
  ["weekly_8_1", "8.1 对不符合食品安全的产品召回，召回和处理情况有向所在地市场监督管理部门报告。", yesNoOptions],
  ["weekly_8_2", "8.2 有召回计划、公告等相应记录；召回产品有处置记录。", yesNoOptions],
  ["weekly_8_3", "8.3 对召回产品实施无害化处理、销毁，不存在召回产品再次流入市场的情况（对因标签存在瑕疵实施召回的除外）。", yesNoOptions],
  ["weekly_8_4", "8.4 对消费者投诉进行处置并记录。", yesNoOptions],
  ["weekly_9_1", "9.1 按要求配备质量安全员。（获证企业以及其他涉及人身健康和生命财产安全并有强制性国家标准要求的食品相关产品大中型生产单位，应按规定同时配备质量安全总监）。", yesNoOptions],
  ["weekly_9_2", "9.2 不存在在岗人员不符合上岗资质的情况。。", yesNoOptions],
  ["weekly_9_3", "9.3 企业主要负责人、质量安全总监、质量安全员在企业内部制度制定、涉及质量安全的重大决策、过程控制、安全培训、安全检查以及质量安全事件或事故调查、问题整改等环节履行了岗位职责并有相关记录。", yesNoOptions],
  ["weekly_9_4", "9.4 建立从业人员食品安全知识培训制度，有相关培训记录。有质量安全管理人员、专业技术人员培训和考核记录，不存在未经考核或考核不合格人员上岗的情况。", yesNoOptions],
  ["weekly_10_1", "10.1 有产品质量安全处置方案，定期检查产品质量安全防范措施落实情况。", yesNoOptions],
  ["weekly_10_2", "10.2 有发生产品质量安全事故的，对导致或者可能导致产品质量安全事故的产品及原料、工具、设备、设施等，立即采取封存等控制措施，向事故发生地市场监督管理部门报告。", ["是", "否", "不适用"], "不适用"]
];

const factorySanitationItems = [
  ["factory_1", "1 厂区道路：按要求硬化良好、干净、平整、无尘土、无杂物、无积水。"],
  ["factory_2", "2 厂区院落：绿化良好、干净、无尘土、无杂物"],
  ["factory_3", "3 给排水：给排水设备运行良好，无长流水现象；排水通畅、封闭、设施合理有效。"],
  ["factory_4", "4 垃圾（污物）管理：污物（加工后的废弃物）存放远离车间，存放设施密闭，清理及时。"],
  ["factory_5", "5 车辆存放：按指定位置存放，摆放整齐有序，表面洁净。"],
  ["factory_6", "6 外来人员及车辆管理：控制严格；不洁净及运输有害物资车辆严禁进入生产区。"]
];

const productionSanitationGroups = [
  {
    title: "一、更衣室、通道消毒状况",
    items: [
      ["site_1_1", "1、洗手及鞋靴消毒设施完好"],
      ["site_1_2", "2、消毒液配比浓度符合要求"],
      ["site_1_3", "3、地面、墙壁及门窗清洁"],
      ["site_1_4", "4、空气消毒、照明和冲刷设施良好"],
      ["site_1_5", "5、衣柜、衣架整洁完好"]
    ]
  },
  {
    title: "二、从业人员卫生状况",
    items: [
      ["site_2_1", "1、健康状况良好，持证上岗"],
      ["site_2_2", "2、无感染的伤口"],
      ["site_2_3", "3、接触食品的手套、工作服清洁切消毒"],
      ["site_2_4", "4、从业人员操作不得引起食品污染"]
    ]
  },
  {
    title: "三、食品接触面状况",
    items: [
      ["site_3_1", "1、设备、工具清洁或消毒措施到位"],
      ["site_3_2", "2、消毒液配比浓度符合要求"],
      ["site_3_3", "3、车间地面、墙壁、屋顶、门帘整洁"],
      ["site_3_4", "4、车间洁净度满足要求"]
    ]
  },
  {
    title: "四、防止交叉污染情况",
    items: [
      ["site_4_1", "1、无人流、物流、上下工序、生熟交叉"],
      ["site_4_2", "2、原料与成品、半成品隔离存放"],
      ["site_4_3", "3、包装材料存放合理，使用前按规定消毒"],
      ["site_4_4", "4、辅料正确存放"],
      ["site_4_5", "5、排水通畅，排水道封闭、无异味，防护设施有效"],
      ["site_4_6", "6、生产中废物有专用容器存放并合理消除"],
      ["site_4_7", "7、维修工具、清洁工具定点存放"]
    ]
  },
  {
    title: "五、生产用水卫生状况",
    items: [
      ["site_5_1", "1、生产用水净化或消毒"],
      ["site_5_2", "2、加工用水与污水不交叉"],
      ["site_5_3", "3、水源管理良好，设施合理有效"]
    ]
  },
  {
    title: "六、防虫、灭害措施状况",
    items: [
      ["site_6_1", "1、防蝇、防鼠、防虫设施完好、有效"]
    ]
  },
  {
    title: "七、有毒有害物质使用管理情况",
    items: [
      ["site_7_1", "1、操作程序正确"],
      ["site_7_2", "2、正确存放、防护设施有效"]
    ]
  }
];

function appendFields(fields, extraFields) {
  const names = new Set((fields || []).map((item) => item.name));
  const result = [...(fields || [])];
  extraFields.forEach((item) => {
    if (!names.has(item.name)) result.push(item);
  });
  return result;
}

function insertFieldAfter(fields, afterName, newField) {
  if ((fields || []).some((item) => item.name === newField.name)) return fields;
  const result = [];
  (fields || []).forEach((item) => {
    result.push(item);
    if (item.name === afterName) result.push(newField);
  });
  if (!result.some((item) => item.name === newField.name)) result.push(newField);
  return result;
}

function updateField(fields, name, changes) {
  return (fields || []).map((item) => (item.name === name ? { ...item, ...changes } : item));
}

function moveFieldAfter(fields, name, afterName) {
  const target = (fields || []).find((item) => item.name === name);
  if (!target) return fields;
  const withoutTarget = (fields || []).filter((item) => item.name !== name);
  const result = [];
  withoutTarget.forEach((item) => {
    result.push(item);
    if (item.name === afterName) result.push(target);
  });
  if (!result.some((item) => item.name === name)) result.push(target);
  return result;
}

function moveFieldFirst(fields, name) {
  const target = (fields || []).find((item) => item.name === name);
  if (!target) return fields;
  return [target, ...(fields || []).filter((item) => item.name !== name)];
}

function requireFields(fields, names) {
  const requiredNames = new Set(names);
  return (fields || []).map((item) => (requiredNames.has(item.name) ? { ...item, required: true } : item));
}

function normalizeFields(fields) {
  const withoutSystemFields = (fields || []).filter((item) => item.name !== "title" && item.name !== "responsiblePerson");
  const remarks = withoutSystemFields.filter((item) => item.name === "remarks");
  const normal = withoutSystemFields
    .filter((item) => item.name !== "remarks")
    .map((item) => {
      if (item.type === "select" && !item.keepSelect && Array.isArray(item.options) && item.options.length <= 4) {
        return {
          ...item,
          type: "radio",
          defaultValue: item.defaultValue || item.options[0]
        };
      }
      return item;
    });
  return applyNoDefaults([...normal, ...remarks.slice(0, 1)]);
}

function groupedRadioFields(groups, options, defaultValue) {
  return groups.flatMap((group) => group.items.map((item, index) => ({
    ...radioField(item[0], item[1], options, defaultValue),
    categoryTitle: index === 0 ? group.title : ""
  })));
}

function normalizeSeedForm(form) {
  if (form.slug === "supplier-evaluation") {
    return {
      ...form,
      fields: normalizeFields(supplierEvaluationFields)
    };
  }
  if (form.slug === "daily-quality-safety-check") {
    return {
      ...form,
      name: "每日质量安全检查记录",
      fields: normalizeFields([
        field("recordDate", "记录日期", "date", true),
        field("checkDate", "检查日期", "date", false),
        ...dailyCheckItems.map((item) => radioField(item[0], item[1])),
        field("otherProblems", "其他问题", "textarea", false),
        field("remarks", "备注", "textarea", false)
      ])
    };
  }
  if (form.slug === "weekly-quality-safety-report") {
    return {
      ...form,
      name: "每周质量安全排查治理报告",
      fields: normalizeFields([
        field("recordDate", "记录日期", "date", true),
        field("checkDate", "检查日期", "date", false),
        ...weeklyCheckItems.map((item) => radioField(item[0], item[1], item[2], item[3] || "是")),
        field("otherProblems", "其他问题", "textarea", false),
        field("problemAnalysisReport", "问题分析与治理情况报告", "textarea", false),
        field("remarks", "备注", "textarea", false)
      ])
    };
  }
  if (form.slug === "raw-material-purchase-ledger") {
    let result = normalizeFields(form.fields);
    result = insertFieldAfter(result, "recordDate", field("batchNo", "批次", "text", true));
    result = insertFieldAfter(result, "specification", field("unit", "单位", "text", false));
    result = updateField(result, "productName", { label: "名称" });
    result = updateField(result, "productionDateOrBatch", { label: "生产日期" });
    result = requireFields(result, ["batchNo", "productName", "productionDateOrBatch", "shelfLife", "supplierName", "purchaseDate", "inspector"]);
    return {
      ...form,
      fields: result
    };
  }
  if (form.slug === "incoming-inspection-record") {
    const fields = insertFieldAfter(
      form.fields.map((item) => (item.name === "inspector" ? { ...item, label: "仓管员" } : item)),
      "specification",
      field("unit", "单位", "text", false)
    );
    return {
      ...form,
      fields: requireFields(normalizeFields(appendFields(fields, [
        field("warehouseKeeper", "仓管员", "text", true)
      ])), ["purchaseProductName", "supplierName", "manufacturer", "warehouseKeeper"])
    };
  }
  if (form.slug === "raw-material-acceptance") {
    let fields = insertFieldAfter(form.fields, "recordDate", field("batchNo", "批次", "text", true));
    fields = insertFieldAfter(fields, "specification", field("unit", "单位", "text", false));
    fields = moveFieldAfter(fields, "quantity", "unit");
    fields = insertFieldAfter(fields, "productionDateOrBatch", field("shelfLife", "保质期", "text", true));
    fields = updateField(fields, "productionDateOrBatch", { label: "生产日期" });
    return {
      ...form,
      fields: requireFields(normalizeFields(appendFields(fields, [
        field("inspector", "检验员", "text", true)
      ])), ["batchNo", "itemName", "manufacturer", "productionDateOrBatch", "shelfLife", "inspector"])
    };
  }
  if (form.slug === "purchase-plan") {
    return {
      ...form,
      fields: requireFields(normalizeFields(form.fields), ["materialName"])
    };
  }
  if (form.slug === "employee-health-file") {
    let fields = normalizeFields(appendFields(form.fields, [
      imageField("employeePhoto", "照片", 1),
      healthChecksField()
    ]).filter((item) => !["checkTime", "checkUnit", "checkItem", "checkResult", "measureTaken"].includes(item.name)));
    fields = updateField(fields, "gender", { type: "select", options: ["男", "女"], defaultValue: "男", keepSelect: true });
    fields = moveFieldAfter(fields, "archiveDate", "employeeNo");
    fields = moveFieldAfter(fields, "employeePhoto", "familyMedicalHistory");
    fields = moveFieldAfter(fields, "remarks", "employeePhoto");
    return {
      ...form,
      fields: moveFieldFirst(fields, "employeeNo")
    };
  }
  if (form.slug === "factory-environment-sanitation-check") {
    return {
      ...form,
      fields: normalizeFields([
        field("recordDate", "记录日期", "date", true),
        field("checkDate", "检查日期", "date", false),
        ...factorySanitationItems.map((item) => radioField(item[0], item[1], ["合格", "不合格"], "合格")),
        field("mainProblems", "存在主要问题", "textarea", false),
        field("correctiveResult", "问题纠正措施及结果", "textarea", false),
        field("remarks", "备注", "textarea", false)
      ])
    };
  }
 if (form.slug === "production-site-equipment-sanitation-check") {
    return {
      ...form,
      fields: normalizeFields([
        field("recordDate", "记录日期", "date", true),
        field("checkDate", "检查日期", "date", false),
        ...groupedRadioFields(productionSanitationGroups, ["合格", "不合格"], "合格"),
        field("correctiveAction", "问题纠正", "textarea", false),
        field("remarks", "备注", "textarea", false)
      ])
    };
  }
  if (form.slug === "critical-control-point-record") {
    return {
      ...form,
      fields: normalizeFields(ccpFields),
      entryMode: "ledger_entry"
    };
  }
  if (["finished-product-inspection-ledger", "inspection-report", "instant-douchi-inspection-report", "entrusted-inspection-register"].includes(form.slug)) {
    return {
      ...form,
      fields: normalizeFields(appendFields(form.fields, thirdPartyInspectionFields))
    };
  }
  return {
    ...form,
    fields: normalizeFields(form.fields)
  };
}

const supplementalFormsByModule = {
  production: [
    fromSeed("拌盐记录表", "salt-mixing-record", {
      fields: normalizeFields([
        ...commonFields,
        field("materialWeight", "原料重量（kg）", "number", true),
        field("saltWeight", "加盐量（kg）", "number", true),
        field("saltRatio", "盐量比例（%）", "number", false),
        field("operator", "操作人", "text", true)
      ])
    })
  ],
  "quality-routine": [
    fromSeed("文件发放记录", "document-issue-record", {
      fields: normalizeFields([
        ...commonFields,
        field("documentName", "文件名称", "text", true),
        field("documentNo", "文件编号", "text", false),
        field("receiver", "接收人", "text", true),
        field("issueDate", "发放日期", "date", true)
      ]),
      entryMode: "ledger_entry"
    }),
    fromSeed("记录归档登记", "record-archive-register", {
      fields: normalizeFields([
        ...commonFields,
        field("recordName", "记录名称", "text", true),
        field("archiveNo", "归档编号", "text", false),
        field("archiveDate", "归档日期", "date", true),
        field("keeper", "保管人", "text", true)
      ]),
      entryMode: "ledger_entry"
    })
  ]
};

const formOrderByModule = {
  "supplier-purchase": [
    "supplier-evaluation",
    "purchase-plan",
    "incoming-inspection-record",
    "raw-material-acceptance",
    "raw-material-purchase-ledger"
  ]
};

function orderForms(moduleSlug, forms) {
  const order = formOrderByModule[moduleSlug];
  if (!order) return forms;
  return [...forms].sort((a, b) => {
    const aIndex = order.includes(a.slug) ? order.indexOf(a.slug) : order.length;
    const bIndex = order.includes(b.slug) ? order.indexOf(b.slug) : order.length;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
}

const moduleOrder = [
  "supplier-purchase",
  "production",
  "inspection-retention",
  "sales-traceability",
  "equipment-environment",
  "quality-routine",
  "personnel-training",
  "complaint-accident-recall"
];

const moduleOverrides = {
  "sales-traceability": {
    name: "运输与销售"
  }
};

const miniModules = sourceModules.map((moduleItem) => ({
  ...clone(moduleItem),
  ...(moduleOverrides[moduleItem.slug] || {}),
  forms: orderForms(moduleItem.slug, [
    ...(moduleItem.forms || []).map((formItem) => normalizeSeedForm(clone(formItem))),
    ...(supplementalFormsByModule[moduleItem.slug] || [])
  ].filter((formItem) => !pcOnlyFormSlugs.includes(formItem.slug)))
})).sort((a, b) => {
  const aIndex = moduleOrder.includes(a.slug) ? moduleOrder.indexOf(a.slug) : moduleOrder.length;
  const bIndex = moduleOrder.includes(b.slug) ? moduleOrder.indexOf(b.slug) : moduleOrder.length;
  if (aIndex !== bIndex) return aIndex - bIndex;
  return (a.sortOrder || 0) - (b.sortOrder || 0);
}).map((moduleItem, moduleIndex) => ({
  ...moduleItem,
  sortOrder: moduleIndex + 1,
  forms: moduleItem.forms.map((formItem, formIndex) => ({
    ...formItem,
    moduleSlug: moduleItem.slug,
    moduleName: moduleItem.name,
    sortOrder: formIndex + 1
  }))
}));

function getModules() {
  return clone(miniModules);
}

function getModule(moduleSlug) {
  return getModules().find((item) => item.slug === moduleSlug) || null;
}

function getForms(moduleSlug) {
  const modules = getModules();
  const forms = [];
  modules.forEach((moduleItem) => {
    if (!moduleSlug || moduleItem.slug === moduleSlug) {
      moduleItem.forms.forEach((formItem) => forms.push(formItem));
    }
  });
  return forms;
}

function getForm(templateSlug) {
  return getForms().find((item) => item.slug === templateSlug) || null;
}

module.exports = {
  getModules,
  getModule,
  getForms,
  getForm,
  pcOnlyFormSlugs,
  sourceSeedVersion: seed.version || "unknown"
};
