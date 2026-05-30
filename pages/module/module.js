const auth = require("../../utils/auth");
const catalog = require("../../utils/catalog");
const storage = require("../../utils/storage");

Page({
  data: {
    module: {},
    forms: []
  },

  onLoad(options) {
    this.moduleSlug = options.module || "";
  },

  onShow() {
    if (!auth.requireLogin()) return;
    const moduleItem = catalog.getModule(this.moduleSlug);
    if (!moduleItem) {
      wx.showToast({ title: "模块不存在", icon: "none" });
      wx.switchTab({ url: "/pages/index/index" });
      return;
    }
    const forms = moduleItem.forms.map((item) => ({
      ...item,
      recordCount: storage.countByTemplate(item.slug)
    }));
    this.setData({ module: moduleItem, forms });
  },

  goForm(event) {
    const slug = event.currentTarget.dataset.slug;
    wx.navigateTo({ url: `/pages/forms/forms?template=${slug}` });
  }
});
