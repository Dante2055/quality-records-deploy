const auth = require("../../utils/auth");
const catalog = require("../../utils/catalog");
const storage = require("../../utils/storage");
const format = require("../../utils/format");
const ccp = require("../../utils/ccp");

const EMPLOYEE_HEALTH_SLUG = "employee-health-file";

const SUPPLIER_LINK_CONFIG = {
  "purchase-plan": {
    productField: "materialName",
    supplierField: "supplierName",
    dateFields: ["deliveryDate"]
  },
  "incoming-inspection-record": {
    productField: "purchaseProductName",
    supplierField: "supplierName",
    fillFields: { manufacturer: "manufacturer" }
  }
};

const PURCHASE_RECORD_LINK_CONFIG = {
  "incoming-inspection-record": {
    productField: "purchaseProductName",
    sourceTemplateSlug: "purchase-plan",
    sourceProductField: "materialName",
    sourceDateFields: ["deliveryDate", "recordDate"],
    fillFields: {
      specification: "specification",
      unit: "unit",
      purchaseQuantity: "quantity",
      supplierName: "supplierName"
    }
  }
};

const BATCH_LINK_CONFIG = {
  "raw-material-acceptance": {
    sourceTemplateSlug: "incoming-inspection-record",
    targetTemplateSlug: "raw-material-acceptance",
    sourceDateFields: ["recordDate"],
    fillFields: {
      itemName: "purchaseProductName",
      specification: "specification",
      unit: "unit",
      manufacturer: "manufacturer",
      quantity: "purchaseQuantity"
    }
  },
  "raw-material-purchase-ledger": {
    sourceTemplateSlug: "raw-material-acceptance",
    targetTemplateSlug: "raw-material-purchase-ledger",
    sourceDateFields: ["incomingDate", "recordDate"],
    fillFields: {
      productName: "itemName",
      specification: "specification",
      unit: "unit",
      quantity: "quantity",
      productionDateOrBatch: "productionDateOrBatch",
      shelfLife: "shelfLife",
      supplierName: "supplierName"
    }
  }
};

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function currentYearMonth() {
  return format.today().slice(0, 7).replace("-", "");
}

function nextIncomingBatchNo() {
  const prefix = currentYearMonth();
  const maxNo = storage.listRecords({ templateSlug: "incoming-inspection-record" })
    .map((record) => String(((record.data || {}).batchNo || record.batchNo || "")).trim())
    .filter((value) => value.startsWith(prefix))
    .map((value) => Number(value.slice(prefix.length)))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(maxNo + 1).padStart(6, "0")}`;
}

function nextEmployeeNo() {
  const maxNo = storage.listRecords({ templateSlug: EMPLOYEE_HEALTH_SLUG })
    .map((record) => String(((record.data || {}).employeeNo || "")).trim())
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0);
  return String(maxNo + 1).padStart(6, "0");
}

function emptyHealthCheckRow() {
  return {
    checkTime: format.today(),
    checkUnit: "",
    checkItem: "健康证",
    checkResult: "正常",
    measureTaken: "无",
    remarks: "无"
  };
}

function hasHealthCheckValue(row) {
  return ["checkTime", "checkUnit", "checkItem", "checkResult", "measureTaken", "remarks"].some((key) => String((row || {})[key] || "").trim());
}

function normalizeHealthChecks(value, legacyData = {}, keepEmpty = false) {
  const source = Array.isArray(value) ? value : [];
  let rows = source.map((row) => ({
    ...emptyHealthCheckRow(),
    ...(row || {})
  })).map((row) => ({
    ...row,
    measureTaken: row.measureTaken || "无",
    remarks: row.remarks || "无"
  })).filter((row) => keepEmpty || hasHealthCheckValue(row));
  if (rows.length === 0 && legacyData && (legacyData.checkTime || legacyData.checkUnit || legacyData.checkItem || legacyData.checkResult || legacyData.measureTaken)) {
    rows = [{
      checkTime: legacyData.checkTime || "",
      checkUnit: legacyData.checkUnit || "",
      checkItem: legacyData.checkItem || "",
      checkResult: legacyData.checkResult || "",
      measureTaken: legacyData.measureTaken || "无",
      remarks: legacyData.remarks || "无"
    }];
  }
  if (rows.length === 0 && keepEmpty) rows = [emptyHealthCheckRow()];
  return rows;
}

function defaultFieldValue(form, field, values, lockedUserName) {
  if (field.type === "healthChecks") return normalizeHealthChecks(values[field.name], values, true);
  if (values[field.name]) return values[field.name];
  if (field.type === "image") return [];
  if (field.name === "recordDate") return format.today();
  if (form.slug === EMPLOYEE_HEALTH_SLUG && field.name === "employeeNo") return nextEmployeeNo();
  if (form.slug === EMPLOYEE_HEALTH_SLUG && (field.name === "startWorkDate" || field.name === "archiveDate")) return format.today();
  if (form.slug === "incoming-inspection-record" && field.name === "batchNo") return nextIncomingBatchNo();
  const linkConfig = SUPPLIER_LINK_CONFIG[form.slug];
  if (linkConfig && (linkConfig.dateFields || []).includes(field.name)) return format.today();
  if (field.name === "deliveryDate") return format.today();
  if (form.slug === "raw-material-acceptance" && field.name === "incomingDate") return format.today();
  if (form.slug === "raw-material-purchase-ledger" && field.name === "purchaseDate") return format.today();
  if (form.slug === "raw-material-purchase-ledger" && field.name === "inspector") return lockedUserName;
  if (form.slug === "incoming-inspection-record" && field.name === "warehouseKeeper") return lockedUserName;
  if (form.slug === "raw-material-acceptance" && field.name === "inspector") return lockedUserName;
  if (form.slug === "supplier-evaluation" && (field.name === "evaluator" || field.name === "approver")) return lockedUserName;
  if (form.slug === "supplier-evaluation" && field.name === "approvalDate") return format.today();
  return field.defaultValue || "";
}

function normalizeImages(value) {
  if (!value) return [];
  const source = Array.isArray(value) ? value : [value];
  return source
    .map((item, index) => {
      if (!item) return null;
      if (typeof item === "string") {
        return { name: `图片${index + 1}`, path: item, uploaded: false };
      }
      return {
        name: item.name || `图片${index + 1}`,
        path: item.path || item.localPath || "",
        uploaded: Boolean(item.uploaded),
        cloudFileId: item.cloudFileId || "",
        savedAt: item.savedAt || ""
      };
    })
    .filter((item) => item && item.path);
}

function withFieldState(field) {
  if (field.type === "healthChecks") return { ...field, value: normalizeHealthChecks(field.value, {}, true) };
  if (field.type !== "image") return field;
  const images = normalizeImages(field.images || field.value);
  const maxCount = field.maxCount || 1;
  return { ...field, value: images, images, maxCount, canAddImage: images.length < maxCount };
}

function applyReadonlyRules(form, fields) {
  if (form.slug !== "raw-material-purchase-ledger") return fields.map((field) => withFieldState(field));
  return fields.map((field) => withFieldState(field.name === "inspector" ? { ...field, readonly: true, disabled: true } : field));
}

function employeeHistoryFields(fields) {
  return {
    employeeNo: String(fieldValue(fields, "employeeNo") || "").trim(),
    employeeName: String(fieldValue(fields, "employeeName") || "").trim()
  };
}

function employeeHistoryRecords(fields, currentRecordId) {
  const key = employeeHistoryFields(fields);
  if (!key.employeeNo && !key.employeeName) return [];
  return storage.listRecords({ templateSlug: EMPLOYEE_HEALTH_SLUG })
    .filter((record) => record.id !== currentRecordId)
    .filter((record) => {
      const data = record.data || {};
      const matchedNo = key.employeeNo && String(data.employeeNo || "").trim() === key.employeeNo;
      const matchedName = key.employeeName && String(data.employeeName || "").trim() === key.employeeName;
      return matchedNo || matchedName;
    });
}

function employeeHistoryItems(fields, currentRecordId) {
  return employeeHistoryRecords(fields, currentRecordId).slice(0, 5).map((record) => {
    const data = record.data || {};
    const firstCheck = normalizeHealthChecks(data.healthChecks, data)[0] || {};
    return {
      id: record.id,
      employeeNo: data.employeeNo || "",
      employeeName: data.employeeName || "",
      startWorkDate: data.startWorkDate || "",
      archiveDate: data.archiveDate || "",
      checkTime: firstCheck.checkTime || "",
      checkUnit: firstCheck.checkUnit || "",
      checkResult: firstCheck.checkResult || "",
      recordDate: data.recordDate || record.recordDate || ""
    };
  });
}

function applyEmployeeHealthHistory(form, fields, currentRecordId) {
  if (form.slug !== EMPLOYEE_HEALTH_SLUG) return fields.map((field) => withFieldState(field));
  const latest = employeeHistoryRecords(fields, currentRecordId)[0];
  if (!latest) return fields.map((field) => withFieldState(field));
  const latestData = latest.data || {};
  return fields.map((field) => {
    if (field.name !== "startWorkDate" && field.name !== "archiveDate") return withFieldState(field);
    const linkedValue = latestData[field.name] || "";
    if (!linkedValue) return withFieldState(field);
    const canFill = !field.value || field.value === format.today() || field.autoFilledHistoryValue === field.value;
    if (!canFill) return withFieldState(field);
    return withFieldState({
      ...field,
      value: linkedValue,
      linkedFromEmployeeHistory: latest.id,
      autoFilledHistoryValue: linkedValue
    });
  });
}

function supplierReferences() {
  return storage.listRecords({ templateSlug: "supplier-evaluation" })
    .map((record) => {
      const data = record.data || {};
      return {
        productName: String(data.productName || "").trim(),
        supplierName: String(data.supplierName || "").trim(),
        supplierAddress: data.supplierAddress || "",
        contactPerson: data.contactPerson || "",
        contactPhone: data.contactPhone || "",
        manufacturer: data.manufacturer || "",
        manufacturerAddress: data.manufacturerAddress || "",
        licenseNo: data.licenseNo || "",
        evaluationResult: data.evaluationResult || "",
        approvalDecision: data.approvalDecision || ""
      };
    })
    .filter((item) => item.productName && item.supplierName)
    .filter((item) => item.evaluationResult !== "不合格供方" && item.approvalDecision !== "暂不列入合格供方名录");
}

function fieldValue(fields, name) {
  const field = fields.find((item) => item.name === name);
  return field ? field.value : "";
}

function updateOptionIndex(field) {
  if (!Array.isArray(field.options)) return field;
  const optionIndex = Math.max(0, field.options.indexOf(field.value));
  return { ...field, optionIndex };
}

function linkedFillMap(config) {
  return {
    supplierName: "supplierName",
    supplierAddress: "supplierAddress",
    contactPerson: "contactPerson",
    contactPhone: "contactPhone",
    manufacturer: "manufacturer",
    manufacturerAddress: "manufacturerAddress",
    licenseNo: "licenseNo",
    ...(config.fillFields || {})
  };
}

function applySupplierLinks(form, fields) {
  const config = SUPPLIER_LINK_CONFIG[form.slug];
  if (!config) return fields.map((field) => withFieldState(field));
  const refs = supplierReferences();
  const productOptions = unique(refs.map((item) => item.productName));
  const productValue = fieldValue(fields, config.productField);
  const candidates = refs.filter((item) => item.productName === productValue);
  const supplierOptions = unique(candidates.map((item) => item.supplierName));
  let selectedSupplier = fieldValue(fields, config.supplierField);
  if (supplierOptions.length === 1) selectedSupplier = supplierOptions[0];
  if (supplierOptions.length > 1 && !supplierOptions.includes(selectedSupplier)) selectedSupplier = supplierOptions[0];
  const selectedRef = candidates.find((item) => item.supplierName === selectedSupplier) || candidates[0] || null;
  const fillMap = linkedFillMap(config);

  return fields.map((field) => {
    let next = { ...field };
    if (field.name === config.productField) {
      next = {
        ...next,
        type: "select",
        options: productOptions.length ? productOptions : ["请先登记供方评价表"],
        value: productOptions.includes(next.value) ? next.value : "",
        optionIndex: Math.max(0, productOptions.indexOf(next.value)),
        disabled: productOptions.length === 0,
        placeholder: productOptions.length ? "请选择" : "请先登记供方评价表"
      };
    }

    if (config.supplierField && field.name === config.supplierField) {
      if (supplierOptions.length > 1) {
        next = updateOptionIndex({
          ...next,
          type: "select",
          options: supplierOptions,
          value: selectedSupplier || "",
          readonly: false,
          disabled: false
        });
      } else if (supplierOptions.length === 1) {
        next = {
          ...next,
          type: "text",
          value: selectedSupplier,
          readonly: true,
          disabled: true
        };
      }
    } else if (selectedRef && fillMap[field.name]) {
      const linkedValue = selectedRef[fillMap[field.name]];
      if (linkedValue) {
        next = {
          ...next,
          value: linkedValue,
          readonly: true,
          disabled: true
        };
      }
    }
    return withFieldState(next);
  });
}

function recordDateKey(record, dateFields) {
  const data = record.data || {};
  return dateFields.map((name) => data[name]).find(Boolean) || record.recordDate || record.updatedAt || record.createdAt || "";
}

function latestPurchaseRecord(productValue, config) {
  if (!productValue) return null;
  return storage.listRecords({ templateSlug: config.sourceTemplateSlug })
    .filter((record) => String((record.data || {})[config.sourceProductField] || "").trim() === productValue)
    .sort((a, b) => String(recordDateKey(b, config.sourceDateFields)).localeCompare(String(recordDateKey(a, config.sourceDateFields))))[0] || null;
}

function batchNoOf(record) {
  return String(((record.data || {}).batchNo || record.batchNo || "")).trim();
}

function usedBatchSet(templateSlug) {
  return new Set(storage.listRecords({ templateSlug }).map((record) => batchNoOf(record)).filter(Boolean));
}

function sourceBatchRecords(config, currentValue) {
  const used = usedBatchSet(config.targetTemplateSlug);
  return storage.listRecords({ templateSlug: config.sourceTemplateSlug })
    .filter((record) => {
      const batchNo = batchNoOf(record);
      return batchNo && (!used.has(batchNo) || batchNo === currentValue);
    })
    .sort((a, b) => batchNoOf(a).localeCompare(batchNoOf(b), "zh-Hans-CN", { numeric: true }));
}

function incomingRecordByBatch(batchNo) {
  if (!batchNo) return null;
  return storage.listRecords({ templateSlug: "incoming-inspection-record" }).find((record) => batchNoOf(record) === batchNo) || null;
}

function sourceDataForBatch(record, formSlug) {
  const data = { ...((record || {}).data || {}) };
  if (formSlug === "raw-material-purchase-ledger" && data.batchNo) {
    const incoming = incomingRecordByBatch(data.batchNo);
    const incomingData = (incoming || {}).data || {};
    if (!data.supplierName && incomingData.supplierName) data.supplierName = incomingData.supplierName;
    if (!data.manufacturer && incomingData.manufacturer) data.manufacturer = incomingData.manufacturer;
  }
  return data;
}

function applyBatchLinks(form, fields) {
  const config = BATCH_LINK_CONFIG[form.slug];
  if (!config) return fields.map((field) => withFieldState(field));
  const currentBatch = fieldValue(fields, "batchNo");
  const records = sourceBatchRecords(config, currentBatch);
  const options = unique(records.map((record) => batchNoOf(record)));
  const selectedBatch = options.includes(currentBatch) ? currentBatch : options[0] || "";
  const selectedRecord = selectedBatch ? records.find((record) => batchNoOf(record) === selectedBatch) : null;
  const sourceData = sourceDataForBatch(selectedRecord, form.slug);

  return fields.map((field) => {
    let next = { ...field };
    if (field.name === "batchNo") {
      next = updateOptionIndex({
        ...next,
        type: "select",
        options: options.length ? options : ["暂无可选批次"],
        value: selectedBatch,
        disabled: options.length === 0,
        placeholder: options.length ? "请选择批次" : "暂无可选批次"
      });
    }
    const sourceName = config.fillFields[field.name];
    if (selectedRecord && sourceName) {
      const linkedValue = sourceData[sourceName] || "";
      if (linkedValue) {
        const shouldFill = !field.value || field.linkedFromBatch !== selectedBatch || field.autoFilledValue === field.value;
        if (shouldFill) {
          next = updateOptionIndex({
            ...next,
            value: linkedValue,
            readonly: false,
            disabled: false,
            linkedFromBatch: selectedBatch,
            autoFilledValue: linkedValue,
            linkedFromRecordId: selectedRecord.id
          });
        }
      }
    }
    return withFieldState(next);
  });
}

function applyPurchaseRecordLinks(form, fields) {
  const config = PURCHASE_RECORD_LINK_CONFIG[form.slug];
  if (!config) return fields.map((field) => withFieldState(field));
  const productValue = fieldValue(fields, config.productField);
  const latest = latestPurchaseRecord(productValue, config);
  if (!latest) return fields.map((field) => withFieldState(field));
  const sourceData = latest.data || {};
  return fields.map((field) => {
    const sourceName = config.fillFields[field.name];
    if (!sourceName) return withFieldState(field);
    const linkedValue = sourceData[sourceName] || "";
    if (!linkedValue) return withFieldState(field);
    const shouldFill = !field.value || field.linkedFromProduct !== productValue || field.autoFilledValue === field.value;
    if (!shouldFill) return withFieldState(field);
    return withFieldState(updateOptionIndex({
      ...field,
      value: linkedValue,
      readonly: false,
      disabled: false,
      linkedFromProduct: productValue,
      autoFilledValue: linkedValue,
      linkedFromRecordId: latest.id
    }));
  });
}

function buildFields(form, values, lockedUserName, recordId) {
  const fields = (form.fields || []).map((field) => {
    const value = defaultFieldValue(form, field, values, lockedUserName);
    const optionIndex = field.options ? Math.max(0, field.options.indexOf(value)) : 0;
    return withFieldState({ ...field, value, optionIndex });
  });
  return applyReadonlyRules(form, applyEmployeeHealthHistory(form, applyPurchaseRecordLinks(form, applyBatchLinks(form, applySupplierLinks(form, fields))), recordId));
}

function collectValues(fields, lockedUserName) {
  const values = { filledBy: lockedUserName };
  fields.forEach((field) => {
    if (field.type === "image") {
      values[field.name] = normalizeImages(field.images || field.value);
    } else if (field.type === "healthChecks") {
      values[field.name] = normalizeHealthChecks(field.value, {}, false);
    } else {
      values[field.name] = field.value || field.defaultValue || "";
    }
  });
  return values;
}

function ccpWarning(values) {
  return ccp.kojiWarning(values);
}

function isCancelMessage(message) {
  return /cancel|取消/i.test(String(message || ""));
}

function privacyAuthorization() {
  return new Promise((resolve, reject) => {
    if (!wx.getPrivacySetting || !wx.requirePrivacyAuthorize) {
      resolve();
      return;
    }
    wx.getPrivacySetting({
      success: (res) => {
        if (!res.needAuthorization) {
          resolve();
          return;
        }
        wx.requirePrivacyAuthorize({
          success: resolve,
          fail: reject
        });
      },
      fail: resolve
    });
  });
}

function chooseOneImage() {
  return new Promise((resolve, reject) => {
    if (wx.chooseImage) {
      wx.chooseImage({
        count: 1,
        sourceType: ["album", "camera"],
        sizeType: ["compressed"],
        success: (res) => resolve((res.tempFilePaths || [])[0]),
        fail: reject
      });
      return;
    }
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => resolve((res.tempFiles || [])[0] && res.tempFiles[0].tempFilePath),
      fail: reject
    });
  });
}

function saveImageFile(tempFilePath) {
  return new Promise((resolve, reject) => {
    if (!tempFilePath) {
      reject(new Error("未选择图片"));
      return;
    }
    const done = (res) => resolve(res.savedFilePath || tempFilePath);
    const fs = wx.getFileSystemManager && wx.getFileSystemManager();
    if (fs && fs.saveFile) {
      fs.saveFile({ tempFilePath, success: done, fail: reject });
      return;
    }
    wx.saveFile({ tempFilePath, success: done, fail: reject });
  });
}

function imageName(field, filePath) {
  const suffix = String(filePath || "").split(/[\\/]/).pop() || "图片";
  return `${field.label}-${suffix}`;
}

Page({
  data: {
    modeText: "新增记录",
    form: {},
    fields: [],
    lockedUserName: "",
    fillerLabel: "填表人",
    fillerAtEnd: false,
    employeeHistory: [],
    ccpWarning: ""
  },

  onLoad(options) {
    this.templateSlug = options.template || "";
    this.recordId = options.id || "";
    this.formLoaded = false;
  },

  onShow() {
    if (this.formLoaded) return;
    if (!auth.requireLogin()) return;
    const user = auth.currentUser();
    const record = this.recordId ? storage.getRecord(this.recordId) : null;
    const form = record ? catalog.getForm(record.templateSlug) : catalog.getForm(this.templateSlug);
    if (!form) {
      wx.showToast({ title: "表单不存在", icon: "none" });
      wx.switchTab({ url: "/pages/index/index" });
      return;
    }
    if (record && (record.status === "submitted" || record.status === "approved")) {
      wx.showModal({
        title: "不可编辑",
        content: "已提交或已审核记录不可直接修改，请在详情页查看。",
        showCancel: false,
        success: () => wx.redirectTo({ url: `/pages/record-detail/record-detail?id=${record.id}` })
      });
      return;
    }
    const values = record ? record.data || {} : {};
    const lockedUserName = record ? (values.filledBy || record.createdByName || record.createdBy || "") : (user.name || user.username);
    const fields = buildFields(form, values, lockedUserName, this.recordId);
    const fillerLabel = ["daily-quality-safety-check", "weekly-quality-safety-report"].includes(form.slug) ? "自查人员" : "填表人";
    const employeeHistory = form.slug === EMPLOYEE_HEALTH_SLUG ? employeeHistoryItems(fields, this.recordId) : [];
    this.setData({
      modeText: record ? "编辑记录" : "新增记录",
      form,
      fields,
      lockedUserName,
      fillerLabel,
      fillerAtEnd: form.slug === EMPLOYEE_HEALTH_SLUG,
      employeeHistory,
      ccpWarning: form.slug === "critical-control-point-record" || form.slug === "koji-making-record" ? ccpWarning(collectValues(fields, lockedUserName)) : ""
    });
    this.formLoaded = true;
  },

  onInput(event) {
    this.updateField(event.currentTarget.dataset.name, event.detail.value);
  },

  onPicker(event) {
    this.updateField(event.currentTarget.dataset.name, event.detail.value);
  },

  onSelect(event) {
    const name = event.currentTarget.dataset.name;
    const fields = this.data.fields.map((field) => {
      if (field.name !== name) return field;
      const optionIndex = Number(event.detail.value);
      return { ...field, optionIndex, value: field.options[optionIndex] || "" };
    });
    this.refreshFields(fields);
  },

  onRadio(event) {
    this.updateField(event.currentTarget.dataset.name, event.detail.value);
  },

  onHealthCheckInput(event) {
    const { name, index, key } = event.currentTarget.dataset;
    const value = event.detail.value;
    const fields = this.data.fields.map((field) => {
      if (field.name !== name) return field;
      const rows = normalizeHealthChecks(field.value, {}, true);
      rows[Number(index)] = {
        ...(rows[Number(index)] || emptyHealthCheckRow()),
        [key]: value
      };
      return { ...field, value: rows };
    });
    this.refreshFields(fields);
  },

  addHealthCheckRow(event) {
    const name = event.currentTarget.dataset.name;
    const fields = this.data.fields.map((field) => {
      if (field.name !== name) return field;
      return { ...field, value: normalizeHealthChecks(field.value, {}, true).concat([emptyHealthCheckRow()]) };
    });
    this.refreshFields(fields);
  },

  removeHealthCheckRow(event) {
    const { name, index } = event.currentTarget.dataset;
    const fields = this.data.fields.map((field) => {
      if (field.name !== name) return field;
      const rows = normalizeHealthChecks(field.value, {}, true).filter((_, rowIndex) => rowIndex !== Number(index));
      return { ...field, value: rows.length ? rows : [emptyHealthCheckRow()] };
    });
    this.refreshFields(fields);
  },

  chooseImage(event) {
    const name = event.currentTarget.dataset.name;
    const field = this.data.fields.find((item) => item.name === name);
    if (!field) return;
    if (!field.canAddImage) {
      wx.showToast({ title: `最多上传${field.maxCount || 1}张`, icon: "none" });
      return;
    }
    privacyAuthorization()
      .then(() => chooseOneImage())
      .then((tempFilePath) => {
        wx.showLoading({ title: "正在保存" });
        return saveImageFile(tempFilePath);
      })
      .then((filePath) => {
        const fields = this.data.fields.map((item) => {
          if (item.name !== name) return item;
          const images = normalizeImages(item.images || item.value).concat([{
            name: imageName(item, filePath),
            path: filePath,
            uploaded: false,
            savedAt: new Date().toISOString()
          }]).slice(0, item.maxCount || 1);
          return withFieldState({ ...item, value: images, images });
        });
        wx.hideLoading();
        this.refreshFields(fields);
      })
      .catch((error) => {
        wx.hideLoading();
        const message = (error && (error.errMsg || error.message)) || "";
        if (isCancelMessage(message)) return;
        wx.showModal({
          title: "上传失败",
          content: message ? `无法打开相机或相册：${message}` : "无法打开相机或相册，请检查微信相机/相册权限后重试。",
          showCancel: false
        });
      });
  },

  removeImage(event) {
    const { name, index } = event.currentTarget.dataset;
    const fields = this.data.fields.map((field) => {
      if (field.name !== name) return field;
      const images = normalizeImages(field.images || field.value).filter((_, itemIndex) => itemIndex !== Number(index));
      return withFieldState({ ...field, value: images, images });
    });
    this.refreshFields(fields);
  },

  previewImage(event) {
    const { name, index } = event.currentTarget.dataset;
    const field = this.data.fields.find((item) => item.name === name);
    const urls = normalizeImages((field || {}).images || (field || {}).value).map((item) => item.path);
    if (urls.length === 0) return;
    wx.previewImage({ urls, current: urls[Number(index)] || urls[0] });
  },

  updateField(name, value) {
    const fields = this.data.fields.map((field) => (field.name === name ? { ...field, value } : field));
    this.refreshFields(fields);
  },

  refreshFields(fields) {
    const readyFields = fields.map((field) => withFieldState(field));
    const linkedFields = applyReadonlyRules(this.data.form, applyEmployeeHealthHistory(this.data.form, applyPurchaseRecordLinks(this.data.form, applyBatchLinks(this.data.form, applySupplierLinks(this.data.form, readyFields))), this.recordId));
    const values = collectValues(linkedFields, this.data.lockedUserName);
    this.setData({
      fields: linkedFields,
      employeeHistory: this.data.form.slug === EMPLOYEE_HEALTH_SLUG ? employeeHistoryItems(linkedFields, this.recordId) : [],
      ccpWarning: this.data.form.slug === "critical-control-point-record" || this.data.form.slug === "koji-making-record" ? ccpWarning(values) : ""
    });
  },

  validate(values) {
    const missing = this.data.fields.find((field) => field.required && !values[field.name]);
    if (missing) return `请填写${missing.label}`;
    const isKoji = (this.data.form.slug === "critical-control-point-record" || this.data.form.slug === "koji-making-record") && ccp.isKojiValues(values);
    if (isKoji) {
      const requiredForKoji = [
        ["startTime", "制曲开始时间"],
        ["endTime", "制曲结束时间"],
        ["temperature", "温度记录"],
        ["humidity", "湿度记录"],
        ["operator", "操作人"]
      ];
      const missingKoji = requiredForKoji.find(([name]) => !values[name]);
      if (missingKoji) return `请填写${missingKoji[1]}`;
    }
    const warning = this.data.form.slug === "critical-control-point-record" || this.data.form.slug === "koji-making-record" ? ccpWarning(values) : "";
    if (warning && (!values.deviationAction || values.deviationAction === "无")) return `${warning}，请填写纠偏措施`;
    return "";
  },

  saveRecord() {
    const values = collectValues(this.data.fields, this.data.lockedUserName);
    const error = this.validate(values);
    if (error) {
      wx.showToast({ title: error, icon: "none" });
      return;
    }
    try {
      const record = this.recordId ? storage.updateRecord(this.recordId, values) : storage.createRecord(this.data.form.slug, values);
      wx.showToast({ title: "已保存", icon: "success" });
      wx.redirectTo({ url: `/pages/record-detail/record-detail?id=${record.id}` });
    } catch (error) {
      wx.showToast({ title: error.message || "保存失败", icon: "none" });
    }
  }
});
