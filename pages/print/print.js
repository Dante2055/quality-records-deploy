const auth = require("../../utils/auth");
const catalog = require("../../utils/catalog");
const storage = require("../../utils/storage");
const format = require("../../utils/format");
const exportFile = require("../../utils/export-file");

function normalizeImages(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : [value];
  return source
    .map((item, index) => {
      if (!item) return null;
      if (typeof item === "string") return { name: `图片${index + 1}`, path: item };
      return { name: item.name || `图片${index + 1}`, path: item.path || item.localPath || "" };
    })
    .filter((item) => item && item.path);
}

function imageText(images) {
  return images.length ? images.map((item) => item.name || "图片").join("、") : "";
}

function normalizeHealthChecks(value, data = {}) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows.map((row) => ({
    checkTime: (row || {}).checkTime || "",
    checkUnit: (row || {}).checkUnit || "",
    checkItem: (row || {}).checkItem || "",
    checkResult: (row || {}).checkResult || "",
    measureTaken: (row || {}).measureTaken || "无",
    remarks: (row || {}).remarks || "无"
  })).filter((row) => Object.keys(row).some((key) => String(row[key] || "").trim()));
  if (normalized.length) return normalized;
  if (data.checkTime || data.checkUnit || data.checkItem || data.checkResult || data.measureTaken) {
    return [{
      checkTime: data.checkTime || "",
      checkUnit: data.checkUnit || "",
      checkItem: data.checkItem || "",
      checkResult: data.checkResult || "",
      measureTaken: data.measureTaken || "无",
      remarks: data.remarks || "无"
    }];
  }
  return [];
}

function fieldsForRecord(record) {
  const form = catalog.getForm(record.templateSlug);
  const data = record.data || {};
  return ((form || {}).fields || []).map((field) => {
    const images = field.type === "image" ? normalizeImages(data[field.name]) : [];
    const healthChecks = field.type === "healthChecks" ? normalizeHealthChecks(data[field.name], data) : [];
    return {
      name: field.name,
      label: field.label,
      type: field.type || "text",
      categoryTitle: field.categoryTitle || "",
      value: field.type === "image" ? imageText(images) : data[field.name] || field.defaultValue || "",
      images,
      healthChecks
    };
  });
}

Page({
  data: {
    record: { data: {} },
    displayFields: [],
    fillerLabel: "填表人"
  },

  onLoad(options) {
    this.recordId = options.id || "";
  },

  onShow() {
    if (!auth.requireLogin()) return;
    const record = storage.getRecord(this.recordId);
    if (!record) {
      wx.showToast({ title: "记录不存在", icon: "none" });
      wx.navigateBack();
      return;
    }
    const displayFields = fieldsForRecord(record);
    this.setData({
      record: { ...record, data: record.data || {}, statusText: format.statusLabel(record.status) },
      displayFields,
      fillerLabel: ["daily-quality-safety-check", "weekly-quality-safety-report"].includes(record.templateSlug) ? "自查人员" : "填表人"
    });
  },

  back() {
    wx.navigateBack();
  },

  exportXls() {
    if (!this.data.record.id) {
      wx.showToast({ title: "记录未加载", icon: "none" });
      return;
    }
    wx.showLoading({ title: "正在导出" });
    exportFile.exportRecordXlsx(this.data.record, this.data.displayFields).then((filePath) => {
      wx.hideLoading();
      wx.openDocument({
        filePath,
        fileType: "xlsx",
        showMenu: true,
        success: () => wx.showToast({ title: "已导出表格", icon: "success" }),
        fail: () => wx.showModal({
          title: "表格已生成",
          content: `文件已保存到小程序本地目录：${filePath}`,
          showCancel: false
        })
      });
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: "导出失败", icon: "none" });
    });
  }
});
