const auth = require("../../utils/auth");
const storage = require("../../utils/storage");
const format = require("../../utils/format");

const statusValues = ["", "draft", "submitted", "approved", "rejected"];
const selfCheckForms = ["daily-quality-safety-check", "weekly-quality-safety-report"];

Page({
  data: {
    keyword: "",
    statusIndex: 0,
    statusOptions: ["全部状态", "草稿", "已提交", "已审核", "已退回"],
    records: []
  },

  onShow() {
    if (!auth.requireLogin()) return;
    this.loadRecords();
  },

  onKeyword(event) {
    this.setData({ keyword: event.detail.value }, () => this.loadRecords());
  },

  onStatus(event) {
    this.setData({ statusIndex: Number(event.detail.value) }, () => this.loadRecords());
  },

  loadRecords() {
    const status = statusValues[this.data.statusIndex];
    const records = storage.listRecords({
      keyword: this.data.keyword,
      status
    }).map((record) => ({
      ...record,
      ...format.recordTitleParts(record),
      statusText: format.statusLabel(record.status),
      fillerLabel: selfCheckForms.includes(record.templateSlug) ? "自查人员" : "填表人"
    }));
    this.setData({ records });
  },

  goDetail(event) {
    wx.navigateTo({ url: `/pages/record-detail/record-detail?id=${event.currentTarget.dataset.id}` });
  }
});
