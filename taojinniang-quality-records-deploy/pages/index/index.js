const auth = require("../../utils/auth");
const catalog = require("../../utils/catalog");

Page({
  data: {
    modules: []
  },

  onShow() {
    if (!auth.requireLogin()) return;
    this.setData({ modules: catalog.getModules() });
  },

  goModule(event) {
    const slug = event.currentTarget.dataset.slug;
    wx.navigateTo({ url: `/pages/module/module?module=${slug}` });
  },

  goHaccp() {
    wx.navigateTo({ url: "/pages/haccp-report/haccp-report" });
  }
});
