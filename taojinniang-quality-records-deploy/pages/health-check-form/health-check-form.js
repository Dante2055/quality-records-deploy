const auth = require("../../utils/auth");
const storage = require("../../utils/storage");
const format = require("../../utils/format");

const EMPLOYEE_HEALTH_SLUG = "employee-health-file";

function normalizeHealthChecks(data = {}) {
  const rows = Array.isArray(data.healthChecks) ? data.healthChecks : [];
  const normalized = rows
    .map((row) => ({
      checkTime: (row || {}).checkTime || "",
      checkUnit: (row || {}).checkUnit || "",
      checkItem: (row || {}).checkItem || "",
      checkResult: (row || {}).checkResult || "",
      measureTaken: (row || {}).measureTaken || "",
      remarks: (row || {}).remarks || ""
    }))
    .filter((row) => ["checkTime", "checkUnit", "checkItem", "checkResult", "measureTaken", "remarks"].some((key) => String(row[key] || "").trim()));
  if (normalized.length) return normalized;
  if (data.checkTime || data.checkUnit || data.checkItem || data.checkResult || data.measureTaken) {
    return [{
      checkTime: data.checkTime || "",
      checkUnit: data.checkUnit || "",
      checkItem: data.checkItem || "",
      checkResult: data.checkResult || "",
      measureTaken: data.measureTaken || "",
      remarks: data.remarks || ""
    }];
  }
  return [];
}

function lastFilled(rows, key) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = String(rows[index][key] || "").trim();
    if (value) return value;
  }
  return "";
}

Page({
  data: {
    record: { data: {} },
    employeeName: "",
    employeeNo: "",
    form: {
      checkTime: "",
      checkUnit: "",
      checkItem: "健康证",
      checkResult: "正常",
      measureTaken: "无",
      remarks: "无"
    }
  },

  onLoad(options) {
    this.recordId = options.id || "";
  },

  onShow() {
    if (!auth.requireLogin()) return;
    const record = storage.getRecord(this.recordId);
    if (!record || record.templateSlug !== EMPLOYEE_HEALTH_SLUG) {
      wx.showToast({ title: "档案不存在", icon: "none" });
      wx.navigateBack();
      return;
    }
    const data = record.data || {};
    const rows = normalizeHealthChecks(data);
    this.setData({
      record: { ...record, data },
      employeeName: data.employeeName || "",
      employeeNo: data.employeeNo || "",
      form: {
        checkTime: format.today(),
        checkUnit: lastFilled(rows, "checkUnit"),
        checkItem: "健康证",
        checkResult: "正常",
        measureTaken: "无",
        remarks: "无"
      }
    });
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      form: {
        ...this.data.form,
        [key]: event.detail.value
      }
    });
  },

  save() {
    const values = this.data.form;
    if (!values.checkTime) {
      wx.showToast({ title: "请选择检查时间", icon: "none" });
      return;
    }
    if (!values.checkItem) {
      wx.showToast({ title: "请填写检查项目", icon: "none" });
      return;
    }
    if (!values.checkResult) {
      wx.showToast({ title: "请填写检查结果", icon: "none" });
      return;
    }
    try {
      storage.appendEmployeeHealthCheck(this.recordId, values);
      wx.showToast({ title: "已追加", icon: "success" });
      wx.navigateBack();
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  }
});
