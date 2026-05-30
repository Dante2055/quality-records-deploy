const auth = require("../../utils/auth");
const storage = require("../../utils/storage");
const ccp = require("../../utils/ccp");
const format = require("../../utils/format");
const exportFile = require("../../utils/export-file");

function resultText(record) {
  return ccp.evaluateKoji(record.data || {}).ok ? "符合" : "需纠偏";
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value || "");
  } catch (error) {
    return value || "";
  }
}

function reportText(batchNo, records) {
  const lines = [
    "HACCP CCP 制曲关键控制点报告",
    `批次号：${batchNo || "全部批次"}`,
    `临界值：${ccp.kojiLimits.label}`,
    `记录数：${records.length}`
  ];
  records.forEach((record) => {
    const data = record.data || {};
    lines.push(`${record.recordDate || "-"} ${record.batchNo || "-"} 温度${data.temperature || "-"}℃ 湿度${data.humidity || "-"}% ${record.resultText}`);
    if (record.resultText !== "符合") lines.push(`纠偏措施：${data.deviationAction || "未填写"}`);
  });
  return lines.join("\n");
}

function reportFields(batchNo, records) {
  const fields = [
    { label: "批次号", value: batchNo || "全部批次" },
    { label: "临界值", value: ccp.kojiLimits.label },
    { label: "记录数", value: String(records.length) }
  ];
  records.forEach((record, index) => {
    const prefix = `第${index + 1}条`;
    const data = record.data || {};
    fields.push(
      { label: `${prefix} 记录日期`, value: record.recordDate || "-" },
      { label: `${prefix} 批次号`, value: record.batchNo || "-" },
      { label: `${prefix} 制曲开始时间`, value: data.startTime || "-" },
      { label: `${prefix} 制曲结束时间`, value: data.endTime || "-" },
      { label: `${prefix} 温度记录（℃）`, value: data.temperature || "-" },
      { label: `${prefix} 湿度记录（%）`, value: data.humidity || "-" },
      { label: `${prefix} 结论`, value: record.resultText },
      { label: `${prefix} 纠偏措施`, value: data.deviationAction || "-" }
    );
  });
  return fields;
}

Page({
  data: {
    batchNo: "",
    records: [],
    actions: []
  },

  onLoad(options) {
    this.setData({ batchNo: safeDecode(options.batchNo) });
  },

  onShow() {
    if (!auth.requireLogin()) return;
    this.generate();
  },

  onBatch(event) {
    this.setData({ batchNo: event.detail.value });
  },

  generate() {
    const records = storage.haccpRecords(this.data.batchNo).map((record) => ({
      ...record,
      resultText: resultText(record)
    }));
    const actions = records
      .filter((record) => record.resultText !== "符合" || (record.data || {}).deviationAction)
      .map((record) => ({ id: record.id, batchNo: record.batchNo, action: (record.data || {}).deviationAction }));
    this.setData({ records, actions });
  },

  copyReport() {
    wx.setClipboardData({
      data: reportText(this.data.batchNo, this.data.records),
      success: () => wx.showToast({ title: "已复制", icon: "success" })
    });
  },

  exportReport() {
    if (this.data.records.length === 0) {
      wx.showToast({ title: "暂无可导出记录", icon: "none" });
      return;
    }
    const user = auth.currentUser() || {};
    const record = {
      id: `HACCP_${this.data.batchNo || "ALL"}_${Date.now()}`,
      templateSlug: "haccp-ccp-report",
      templateName: "HACCP CCP 制曲关键控制点报告",
      recordDate: format.today(),
      statusText: "报告",
      createdBy: user.username || "",
      createdByName: user.name || user.username || "",
      data: {
        filledBy: user.name || user.username || ""
      }
    };
    wx.showLoading({ title: "正在导出" });
    exportFile.exportRecordXlsx(record, reportFields(this.data.batchNo, this.data.records)).then((filePath) => {
      wx.hideLoading();
      wx.openDocument({
        filePath,
        fileType: "xlsx",
        showMenu: true,
        success: () => wx.showToast({ title: "已导出报告", icon: "success" }),
        fail: () => wx.showModal({
          title: "报告已生成",
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
