const auth = require("../../utils/auth");

Page({
  data: {
    user: {},
    oldPassword: "",
    newPassword: ""
  },
  onShow() {
    if (!auth.requireLogin()) return;
    this.setData({ user: auth.currentUser() });
  },
  onOld(event) {
    this.setData({ oldPassword: event.detail.value });
  },
  onNew(event) {
    this.setData({ newPassword: event.detail.value });
  },
  save() {
    const result = auth.changePassword(this.data.oldPassword, this.data.newPassword);
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: "none" });
      return;
    }
    wx.showToast({ title: "密码已修改", icon: "success" });
    auth.logout();
    wx.reLaunch({ url: "/pages/login/login" });
  }
});
