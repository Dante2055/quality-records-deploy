const catalog = require("./catalog");
const auth = require("./auth");

const RECORDS_KEY = "tjn_records";
const RECORDS_RESET_KEY = "tjn_records_reset_version";
const EMPLOYEE_HEALTH_SLUG = "employee-health-file";
const allowedStatusTransitions = {
  draft: ["submitted"],
  rejected: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: []
};

function ensureStore() {
  const records = wx.getStorageSync(RECORDS_KEY);
  if (!Array.isArray(records)) wx.setStorageSync(RECORDS_KEY, []);
}

function allRecords() {
  ensureStore();
  return wx.getStorageSync(RECORDS_KEY) || [];
}

function saveRecords(records) {
  wx.setStorageSync(RECORDS_KEY, records);
}

function collectLocalImagePaths(value, paths = []) {
  if (!value) return paths;
  if (Array.isArray(value)) {
    value.forEach((item) => collectLocalImagePaths(item, paths));
    return paths;
  }
  if (typeof value === "object") {
    const candidate = value.path || value.localPath || "";
    if (candidate) paths.push(candidate);
    Object.keys(value).forEach((key) => collectLocalImagePaths(value[key], paths));
  }
  return paths;
}

function removeLocalFiles(filePaths) {
  if (!wx.getFileSystemManager) return;
  const fs = wx.getFileSystemManager();
  Array.from(new Set(filePaths)).forEach((filePath) => {
    if (!filePath || /^https?:\/\//.test(filePath)) return;
    fs.unlink({
      filePath,
      fail: () => {}
    });
  });
}

function clearRecordsOnce(version) {
  if (wx.getStorageSync(RECORDS_RESET_KEY) === version) {
    ensureStore();
    return false;
  }
  const records = wx.getStorageSync(RECORDS_KEY);
  if (Array.isArray(records)) removeLocalFiles(collectLocalImagePaths(records));
  wx.setStorageSync(RECORDS_KEY, []);
  wx.setStorageSync(RECORDS_RESET_KEY, version);
  return true;
}

function now() {
  return new Date().toISOString();
}

function recordTitle(form, values) {
  const parts = [form.name];
  const primaryKeys = [
    "batchNo",
    "supplierName",
    "purchaseProductName",
    "materialName",
    "itemName",
    "productName",
    "foodName",
    "sampleName",
    "employeeName",
    "equipmentName",
    "instrumentName",
    "documentName",
    "recordName",
    "buyerName",
    "complainantName",
    "accidentName"
  ];
  const primaryKey = primaryKeys.find((key) => values[key]);
  const primary = primaryKey ? values[primaryKey] : "";
  if (values.recordDate) parts.push(values.recordDate);
  if (primary) parts.push(primary);
  return parts.join(" - ");
}

function listRecords(filters = {}) {
  let records = allRecords().filter((record) => !record.deletedAt);
  if (filters.moduleSlug) records = records.filter((record) => record.moduleSlug === filters.moduleSlug);
  if (filters.templateSlug) records = records.filter((record) => record.templateSlug === filters.templateSlug);
  if (filters.status) records = records.filter((record) => record.status === filters.status);
  if (filters.keyword) {
    const keyword = String(filters.keyword).trim();
    records = records.filter((record) => JSON.stringify(record).includes(keyword));
  }
  return records.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function getRecord(id) {
  return allRecords().find((record) => record.id === id && !record.deletedAt) || null;
}

function createRecord(templateSlug, values) {
  const form = catalog.getForm(templateSlug);
  if (!form) throw new Error("表单不存在");
  const user = auth.currentUser();
  const record = {
    id: `R${Date.now()}${Math.floor(Math.random() * 1000)}`,
    templateSlug: form.slug,
    templateName: form.name,
    moduleSlug: form.moduleSlug,
    moduleName: form.moduleName,
    recordDate: values.recordDate || "",
    title: recordTitle(form, values),
    batchNo: values.batchNo || "",
    status: "draft",
    data: values,
    createdBy: user ? user.username : "",
    createdByName: user ? user.name || user.username : "",
    reviewedBy: "",
    reviewComment: "",
    createdAt: now(),
    updatedAt: now(),
    submittedAt: "",
    reviewedAt: "",
    deletedAt: ""
  };
  const records = allRecords();
  records.unshift(record);
  saveRecords(records);
  return record;
}

function updateRecord(id, values) {
  const records = allRecords();
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) throw new Error("记录不存在");
  if (records[index].status === "approved" || records[index].status === "submitted") {
    throw new Error("已提交或已审核记录不可直接编辑");
  }
  const user = auth.currentUser();
  records[index] = {
    ...records[index],
    recordDate: values.recordDate || records[index].recordDate,
    title: recordTitle(catalog.getForm(records[index].templateSlug) || { name: records[index].templateName }, values),
    batchNo: values.batchNo || "",
    data: values,
    updatedBy: user ? user.username : records[index].updatedBy || "",
    updatedByName: user ? user.name || user.username : records[index].updatedByName || "",
    updatedAt: now()
  };
  saveRecords(records);
  return records[index];
}

function createCorrectionRecord(id) {
  const original = getRecord(id);
  if (!original) throw new Error("原记录不存在");
  if (original.status !== "approved") throw new Error("仅已审核记录需要发起更正");
  const form = catalog.getForm(original.templateSlug);
  if (!form) throw new Error("表单不存在");
  const user = auth.currentUser();
  const copiedValues = { ...(original.data || {}) };
  copiedValues.filledBy = user ? user.name || user.username : copiedValues.filledBy || "";
  const record = {
    id: `R${Date.now()}${Math.floor(Math.random() * 1000)}`,
    templateSlug: original.templateSlug,
    templateName: original.templateName,
    moduleSlug: original.moduleSlug,
    moduleName: original.moduleName,
    recordDate: original.recordDate || copiedValues.recordDate || "",
    title: `${recordTitle(form, copiedValues)} - 更正`,
    batchNo: original.batchNo || copiedValues.batchNo || "",
    status: "draft",
    data: copiedValues,
    correctionOf: original.id,
    createdBy: user ? user.username : "",
    createdByName: user ? user.name || user.username : "",
    reviewedBy: "",
    reviewComment: "",
    createdAt: now(),
    updatedAt: now(),
    submittedAt: "",
    reviewedAt: "",
    deletedAt: ""
  };
  const records = allRecords();
  records.unshift(record);
  saveRecords(records);
  return record;
}

function changeStatus(id, nextStatus, options = {}) {
  const records = allRecords();
  const index = records.findIndex((record) => record.id === id);
  if (index < 0) throw new Error("记录不存在");
  const current = records[index];
  const allowedNext = allowedStatusTransitions[current.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new Error("当前状态不允许执行该操作");
  }
  const user = auth.currentUser();
  const update = {
    status: nextStatus,
    updatedBy: user ? user.username : current.updatedBy || "",
    updatedByName: user ? user.name || user.username : current.updatedByName || "",
    updatedAt: now()
  };
  if (nextStatus === "submitted") update.submittedAt = now();
  if (nextStatus === "approved" || nextStatus === "rejected") {
    update.reviewedAt = now();
    update.reviewedBy = options.reviewedBy || "";
    update.reviewComment = options.reviewComment || "";
  }
  records[index] = { ...current, ...update };
  saveRecords(records);
  return records[index];
}

function softDeleteRecord(id) {
  const records = allRecords();
  const index = records.findIndex((record) => record.id === id);
  if (index >= 0) {
    if (records[index].status === "approved") throw new Error("已审核记录不可删除");
    const user = auth.currentUser();
    records[index].deletedAt = now();
    records[index].deletedBy = user ? user.username : "";
    records[index].deletedByName = user ? user.name || user.username : "";
    records[index].updatedAt = now();
    saveRecords(records);
  }
}

function countByTemplate(templateSlug) {
  return listRecords({ templateSlug }).length;
}

function haccpRecords(batchNo) {
  return listRecords().filter((record) => {
    const data = record.data || {};
    const isCurrent = record.templateSlug === "critical-control-point-record" && String(data.controlPointName || "").includes("制曲");
    const isLegacy = record.templateSlug === "koji-making-record";
    const matchedBatch = !batchNo || record.batchNo === batchNo || data.batchNo === batchNo;
    return (isCurrent || isLegacy) && matchedBatch;
  });
}

function normalizeHealthChecks(data) {
  const rows = Array.isArray((data || {}).healthChecks) ? data.healthChecks : [];
  const normalized = rows
    .map((row) => ({
      checkTime: (row || {}).checkTime || "",
      checkUnit: (row || {}).checkUnit || "",
      checkItem: (row || {}).checkItem || "",
      checkResult: (row || {}).checkResult || "",
      measureTaken: (row || {}).measureTaken || "无",
      remarks: (row || {}).remarks || "无",
      appendedBy: (row || {}).appendedBy || "",
      appendedByName: (row || {}).appendedByName || "",
      appendedAt: (row || {}).appendedAt || ""
    }))
    .filter((row) => ["checkTime", "checkUnit", "checkItem", "checkResult", "measureTaken", "remarks"].some((key) => String(row[key] || "").trim()));
  if (normalized.length) return normalized;
  if ((data || {}).checkTime || (data || {}).checkUnit || (data || {}).checkItem || (data || {}).checkResult || (data || {}).measureTaken) {
    return [{
      checkTime: data.checkTime || "",
      checkUnit: data.checkUnit || "",
      checkItem: data.checkItem || "",
      checkResult: data.checkResult || "",
      measureTaken: data.measureTaken || "无",
      remarks: data.remarks || "无",
      appendedBy: "",
      appendedByName: "",
      appendedAt: ""
    }];
  }
  return [];
}

function appendEmployeeHealthCheck(id, values) {
  const records = allRecords();
  const index = records.findIndex((record) => record.id === id && !record.deletedAt);
  if (index < 0) throw new Error("记录不存在");
  const current = records[index];
  if (current.templateSlug !== EMPLOYEE_HEALTH_SLUG) throw new Error("仅职业健康档案可追加年度检查");
  const user = auth.currentUser();
  const appendedAt = now();
  const row = {
    checkTime: values.checkTime || "",
    checkUnit: values.checkUnit || "",
    checkItem: values.checkItem || "",
    checkResult: values.checkResult || "",
    measureTaken: values.measureTaken || "无",
    remarks: values.remarks || "无",
    appendedBy: user ? user.username : "",
    appendedByName: user ? user.name || user.username : "",
    appendedAt
  };
  const data = { ...(current.data || {}) };
  const healthChecks = normalizeHealthChecks(data).concat([row]);
  const appendLogs = Array.isArray(data.healthCheckAppendLogs) ? data.healthCheckAppendLogs : [];
  const nextData = {
    ...data,
    healthChecks,
    healthCheckAppendLogs: appendLogs.concat([{
      checkTime: row.checkTime,
      checkItem: row.checkItem,
      appendedBy: row.appendedBy,
      appendedByName: row.appendedByName,
      appendedAt
    }])
  };
  records[index] = {
    ...current,
    data: nextData,
    updatedBy: row.appendedBy || current.updatedBy || "",
    updatedByName: row.appendedByName || current.updatedByName || "",
    updatedAt: appendedAt
  };
  saveRecords(records);
  return records[index];
}

module.exports = {
  ensureStore,
  clearRecordsOnce,
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  createCorrectionRecord,
  changeStatus,
  softDeleteRecord,
  countByTemplate,
  haccpRecords,
  appendEmployeeHealthCheck
};
