const auth = require("../../utils/auth");
const catalog = require("../../utils/catalog");
const storage = require("../../utils/storage");
const format = require("../../utils/format");
const ccp = require("../../utils/ccp");

const EMPLOYEE_HEALTH_SLUG = "employee-health-file";

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

function makeDisplayFields(form, data) {
  return (form.fields || []).map((field) => {
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

function ccpNotice(record) {
  if (!ccp.isKojiRecord(record)) return "";
  const data = record.data || {};
  const result = ccp.evaluateKoji(data);
  const messages = [];
  if (!result.tempOk) messages.push("温度超出临界值");
  if (!result.humidityOk) messages.push("湿度超出临界范围");
  if (messages.length === 0) return "本记录未发现临界值超标。";
  return `${messages.join("，")}；纠偏措施：${data.deviationAction || "未填写"}`;
}

Page({
  data: {
    record: { data: {} },
    displayFields: [],
    canEdit: false,
    canSubmit: false,
    canReview: false,
    canDelete: false,
    canCorrect: false,
    canAppendHealthCheck: false,
    isHaccp: false,
    fillerLabel: "填表人",
    ccpNotice: ""
  },

  onLoad(options) {
    this.recordId = options.id || "";
  },

  onShow() {
    if (!auth.requireLogin()) return;
    this.loadRecord();
  },

  loadRecord() {
    const record = storage.getRecord(this.recordId);
    if (!record) {
      wx.showToast({ title: "记录不存在", icon: "none" });
      wx.switchTab({ url: "/pages/records/records" });
      return;
    }
    const form = catalog.getForm(record.templateSlug);
    const normalized = { ...record, data: record.data || {}, statusText: format.statusLabel(record.status) };
    this.setData({
      record: normalized,
      displayFields: makeDisplayFields(form || {}, record.data || {}),
      canEdit: record.status === "draft" || record.status === "rejected",
      canSubmit: record.status === "draft" || record.status === "rejected",
      canReview: record.status === "submitted",
      canDelete: record.status !== "approved",
      canCorrect: record.status === "approved",
      canAppendHealthCheck: record.templateSlug === EMPLOYEE_HEALTH_SLUG,
      isHaccp: ccp.isKojiRecord(record),
      fillerLabel: ["daily-quality-safety-check", "weekly-quality-safety-report"].includes(record.templateSlug) ? "自查人员" : "填表人",
      ccpNotice: ccpNotice(record)
    });
  },

  editRecord() {
    wx.navigateTo({ url: `/pages/record-form/record-form?id=${this.recordId}` });
  },

  submitRecord() {
    wx.showModal({
      title: "提交审核",
      content: "提交后不可直接编辑，确认提交？",
      success: (res) => {
        if (!res.confirm) return;
        try {
          storage.changeStatus(this.recordId, "submitted");
          wx.showToast({ title: "已提交", icon: "success" });
          this.loadRecord();
        } catch (error) {
          wx.showToast({ title: error.message || "提交失败", icon: "none" });
        }
      }
    });
  },

  approveRecord() {
    const user = auth.currentUser();
    try {
      storage.changeStatus(this.recordId, "approved", { reviewedBy: user.name || user.username, reviewComment: "审核通过" });
      wx.showToast({ title: "已审核", icon: "success" });
      this.loadRecord();
    } catch (error) {
      wx.showToast({ title: error.message || "审核失败", icon: "none" });
    }
  },

  rejectRecord() {
    wx.showModal({
      title: "退回修改",
      editable: true,
      placeholderText: "请输入退回原因",
      success: (res) => {
        if (!res.confirm) return;
        const user = auth.currentUser();
        try {
          storage.changeStatus(this.recordId, "rejected", { reviewedBy: user.name || user.username, reviewComment: res.content || "退回修改" });
          wx.showToast({ title: "已退回", icon: "success" });
          this.loadRecord();
        } catch (error) {
          wx.showToast({ title: error.message || "退回失败", icon: "none" });
        }
      }
    });
  },

  deleteRecord() {
    wx.showModal({
      title: "删除记录",
      content: "记录将从列表隐藏，确认删除？",
      success: (res) => {
        if (!res.confirm) return;
        try {
          storage.softDeleteRecord(this.recordId);
          wx.showToast({ title: "已删除", icon: "success" });
          wx.switchTab({ url: "/pages/records/records" });
        } catch (error) {
          wx.showToast({ title: error.message || "删除失败", icon: "none" });
        }
      }
    });
  },

  correctRecord() {
    wx.showModal({
      title: "发起更正",
      content: "将复制当前已审核记录生成一条新的草稿，原记录不会被覆盖。确认继续？",
      success: (res) => {
        if (!res.confirm) return;
        try {
          const record = storage.createCorrectionRecord(this.recordId);
          wx.showToast({ title: "已生成草稿", icon: "success" });
          wx.redirectTo({ url: `/pages/record-form/record-form?id=${record.id}` });
        } catch (error) {
          wx.showToast({ title: error.message || "更正失败", icon: "none" });
        }
      }
    });
  },

  appendHealthCheck() {
    wx.navigateTo({ url: `/pages/health-check-form/health-check-form?id=${this.recordId}` });
  },

  goPrint() {
    wx.navigateTo({ url: `/pages/print/print?id=${this.recordId}` });
  },

  goHaccp() {
    wx.navigateTo({ url: `/pages/haccp-report/haccp-report?batchNo=${encodeURIComponent(this.data.record.batchNo || "")}` });
  },

  previewImage(event) {
    const { name, index } = event.currentTarget.dataset;
    const field = this.data.displayFields.find((item) => item.name === name);
    const urls = ((field || {}).images || []).map((item) => item.path);
    if (urls.length === 0) return;
    wx.previewImage({ urls, current: urls[Number(index)] || urls[0] });
  }
});
