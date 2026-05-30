const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const seed = JSON.parse(fs.readFileSync(path.join(root, "data/form-catalog.seed.json"), "utf8"));
const catalog = require("../utils/catalog");

const modules = catalog.getModules();
const forms = catalog.getForms();
const formSlugs = new Set(forms.map((form) => form.slug));
const pcOnlyFormSlugs = new Set(catalog.pcOnlyFormSlugs || []);
const missingSeedForms = (seed.modules || []).flatMap((moduleItem) => moduleItem.forms || []).filter((form) => !formSlugs.has(form.slug) && !pcOnlyFormSlugs.has(form.slug));
const missingPages = appJson.pages.filter((pagePath) => {
  const base = path.join(root, pagePath);
  return ![".js", ".json", ".wxml", ".wxss"].every((ext) => fs.existsSync(`${base}${ext}`));
});

const result = {
  seedModules: (seed.modules || []).length,
  seedForms: (seed.modules || []).reduce((sum, item) => sum + (item.forms || []).length, 0),
  miniProgramModules: modules.length,
  miniProgramForms: forms.length,
  retainedSeedForms: 37 - missingSeedForms.length,
  pcOnlyForms: Array.from(pcOnlyFormSlugs),
  pages: appJson.pages.length,
  missingPages,
  missingSeedForms: missingSeedForms.map((form) => form.name)
};

console.log(JSON.stringify(result, null, 2));

if (result.miniProgramModules !== 8) throw new Error("小程序模块数量不是 8");
if (result.seedModules !== 8) throw new Error("种子模块数量不是 8");
if (result.seedForms !== 37) throw new Error("种子表单数量不是 37");
if (result.retainedSeedForms !== 37) throw new Error("原始 37 张表未全部保留");
if (result.miniProgramForms !== 39) throw new Error("小程序表单数量不是 39");
if (missingPages.length > 0) throw new Error("存在缺失页面文件");
