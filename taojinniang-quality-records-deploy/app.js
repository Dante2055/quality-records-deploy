const auth = require("./utils/auth");
const storage = require("./utils/storage");

App({
  onLaunch() {
    auth.ensureDefaultUser();
    storage.clearRecordsOnce("2026-05-17-clear-filled-records");
    storage.ensureStore();
  },
  globalData: {
    appName: "桃金娘质量安全记录小程序"
  }
});
