const auth = require("../../utils/auth");
const catalog = require("../../utils/catalog");
const storage = require("../../utils/storage");
const format = require("../../utils/format");

Page({
  data: {
    form: {},
    records: []
  },

  onLoad(options) {
    this.templateSlug = options.template || "";
  },

  onShow() {
    if (!auth.requireLogin()) return;
    const form = catalog.getForm(this.templateSlug);
    if (!form) {
      wx.showToast({ title: "表单不存在", icon: "none" });
      wx.switchTab({ url: "/pages/index/index" });
      return;
    }
    const records = storage.listRecords({ templateSlug: form.slug }).map((record) => ({
      ...record,
      ...format.recordTitleParts(record),
      statusText: format.statusLabel(record.status)
    }));
    this.setData({ form, records });
  },

  newRecord() {
    wx.navigateTo({ url: `/pages/record-form/record-form?template=${this.templateSlug}` });
  },

  goDetail(event) {
    wx.navigateTo({ url: `/pages/record-detail/record-detail?id=${event.currentTarget.dataset.id}` });
  },

  goHaccp() {
    wx.navigateTo({ url: "/pages/haccp-report/haccp-report" });
  }
});
