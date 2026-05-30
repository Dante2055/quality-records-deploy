const auth = require("../../utils/auth");

Page({
  data: {
    user: {}
  },

  onShow() {
    if (!auth.requireLogin()) return;
    this.setData({ user: auth.currentUser() });
  },

  goPassword() {
    wx.navigateTo({ url: "/pages/password/password" });
  },

  goHaccp() {
    wx.navigateTo({ url: "/pages/haccp-report/haccp-report" });
  },

  logout() {
    auth.logout();
    wx.reLaunch({ url: "/pages/login/login" });
  }
});
