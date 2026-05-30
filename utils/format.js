const statusLabels = {
  draft: "草稿",
  submitted: "已提交",
  approved: "已审核",
  rejected: "已退回"
};

function statusLabel(status) {
  return statusLabels[status] || status;
}

function today() {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  return value || "-";
}

function recordTitleParts(record) {
  const title = String(record.title || "");
  const templateName = String(record.templateName || "");
  const prefix = `${templateName} - `;
  if (templateName && title.startsWith(prefix)) {
    return {
      titleMain: prefix,
      titleSub: title.slice(prefix.length)
    };
  }
  if (templateName && title && title !== templateName) {
    return {
      titleMain: prefix,
      titleSub: title
    };
  }
  return {
    titleMain: title || templateName || "记录",
    titleSub: ""
  };
}

module.exports = {
  statusLabel,
  statusLabels,
  today,
  formatDate,
  recordTitleParts
};
