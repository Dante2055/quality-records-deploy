const auth = require("../../utils/auth");

Page({
  data: {
    username: "13926362866",
    password: "",
    next: ""
  },
  onLoad(options) {
    auth.ensureDefaultUser();
    this.setData({ next: options.next || "" });
    if (auth.currentUser()) {
      wx.switchTab({ url: "/pages/index/index" });
    }
  },
  onUsername(event) {
    this.setData({ username: event.detail.value });
  },
  onPassword(event) {
    this.setData({ password: event.detail.value });
  },
  login() {
    const result = auth.login(this.data.username, this.data.password);
    if (!result.ok) {
      wx.showToast({ title: result.message, icon: "none" });
      return;
    }
    wx.showToast({ title: "登录成功", icon: "success" });
    if (this.data.next) {
      wx.redirectTo({ url: decodeURIComponent(this.data.next) });
      return;
    }
    wx.switchTab({ url: "/pages/index/index" });
  }
});
