const USERS_KEY = "tjn_users";
const CURRENT_USER_KEY = "tjn_current_user";
const DEFAULT_PASSWORD = "123456";
const DEFAULT_USERS = [
  { username: "13926362866", password: DEFAULT_PASSWORD, name: "梁登庭" },
  { username: "15119485833", password: DEFAULT_PASSWORD, name: "李春宇" },
  { username: "15819177379", password: DEFAULT_PASSWORD, name: "关雪" },
  { username: "18312257989", password: DEFAULT_PASSWORD, name: "冯晓红" }
];

function getUsers() {
  return wx.getStorageSync(USERS_KEY) || [];
}

function saveUsers(users) {
  wx.setStorageSync(USERS_KEY, users);
}

function ensureDefaultUser() {
  let users = getUsers().filter((user) => !(user.username === "admin" && user.password === "admin123" && user.name === "管理员"));
  DEFAULT_USERS.forEach((defaultUser) => {
    const index = users.findIndex((user) => user.username === defaultUser.username);
    if (index >= 0) {
      users[index] = {
        ...users[index],
        name: defaultUser.name
      };
    } else {
      users.push({
        ...defaultUser,
        createdAt: new Date().toISOString()
      });
    }
  });
  saveUsers(users);
}

function login(username, password) {
  const user = getUsers().find((item) => item.username === String(username || "").trim() && item.password === String(password || ""));
  if (!user) return { ok: false, message: "用户名或密码不正确" };
  wx.setStorageSync(CURRENT_USER_KEY, {
    username: user.username,
    name: user.name || user.username,
    loginAt: new Date().toISOString()
  });
  return { ok: true, user };
}

function logout() {
  wx.removeStorageSync(CURRENT_USER_KEY);
}

function currentUser() {
  return wx.getStorageSync(CURRENT_USER_KEY) || null;
}

function requireLogin() {
  if (currentUser()) return true;
  wx.reLaunch({ url: "/pages/login/login" });
  return false;
}

function changePassword(oldPassword, newPassword) {
  const current = currentUser();
  if (!current) return { ok: false, message: "请先登录" };
  if (!newPassword || String(newPassword).length < 6) return { ok: false, message: "新密码至少 6 位" };
  const users = getUsers();
  const index = users.findIndex((user) => user.username === current.username);
  if (index < 0) return { ok: false, message: "用户不存在" };
  if (users[index].password !== String(oldPassword || "")) return { ok: false, message: "原密码不正确" };
  users[index].password = String(newPassword);
  saveUsers(users);
  return { ok: true };
}

module.exports = {
  ensureDefaultUser,
  login,
  logout,
  currentUser,
  requireLogin,
  changePassword
};
