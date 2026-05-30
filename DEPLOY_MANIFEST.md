# DEPLOY_MANIFEST

当前目录是微信小程序工程，不是 Web 服务部署包。

## 包含内容

- `app.js` / `app.json` / `app.wxss`
- `project.config.json` / `sitemap.json`
- `pages/` 微信小程序页面
- `utils/` 本地认证、表单目录、记录存储工具
- `data/form-catalog.seed.json` 原始机器可读种子
- `data/form-catalog.seed.js` 小程序运行时种子桥接
- `images/logo.png`
- `templates/阳江市桃金娘豆豉有限公司质量安全管理通用记录表单YJTJN-BGS-a-00002 A2026.docx`
- `scripts/verify-miniprogram.js`

## 不包含内容

- Next.js
- SQLite
- API 路由
- 服务器部署脚本
- `node_modules`
- `package.json`

## 使用方式

用微信开发者工具导入本目录：

```text
/Volumes/Assets/编程/桃金娘质量安全记录小程序/taojinniang-quality-records-deploy
```

不要部署到服务器。
