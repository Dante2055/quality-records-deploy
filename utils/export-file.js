function text(value) {
  return String(value === undefined || value === null || value === "" ? "-" : value);
}

function xmlEscape(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeFileName(value) {
  return text(value).replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 48) || "quality-record";
}

function utf8Bytes(value) {
  const bytes = [];
  const source = String(value);
  for (let index = 0; index < source.length; index += 1) {
    let code = source.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < source.length) {
      const next = source.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }
    if (code <= 0x7f) bytes.push(code);
    else if (code <= 0x7ff) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code <= 0xffff) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return new Uint8Array(bytes);
}

const crcTable = (() => {
  const table = [];
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pushU16(bytes, value) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushU32(bytes, value) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function appendBytes(target, bytes) {
  for (let index = 0; index < bytes.length; index += 1) target.push(bytes[index]);
}

function makeZip(files) {
  const body = [];
  const central = [];
  const entries = files.map((file) => ({
    nameBytes: utf8Bytes(file.name),
    dataBytes: utf8Bytes(file.content),
    name: file.name
  }));

  entries.forEach((entry) => {
    const offset = body.length;
    const crc = crc32(entry.dataBytes);
    pushU32(body, 0x04034b50);
    pushU16(body, 20);
    pushU16(body, 0x0800);
    pushU16(body, 0);
    pushU16(body, 0);
    pushU16(body, 0);
    pushU32(body, crc);
    pushU32(body, entry.dataBytes.length);
    pushU32(body, entry.dataBytes.length);
    pushU16(body, entry.nameBytes.length);
    pushU16(body, 0);
    appendBytes(body, entry.nameBytes);
    appendBytes(body, entry.dataBytes);

    pushU32(central, 0x02014b50);
    pushU16(central, 20);
    pushU16(central, 20);
    pushU16(central, 0x0800);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, crc);
    pushU32(central, entry.dataBytes.length);
    pushU32(central, entry.dataBytes.length);
    pushU16(central, entry.nameBytes.length);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, 0);
    pushU32(central, offset);
    appendBytes(central, entry.nameBytes);
  });

  const centralOffset = body.length;
  appendBytes(body, central);
  pushU32(body, 0x06054b50);
  pushU16(body, 0);
  pushU16(body, 0);
  pushU16(body, entries.length);
  pushU16(body, entries.length);
  pushU32(body, central.length);
  pushU32(body, centralOffset);
  pushU16(body, 0);
  return new Uint8Array(body).buffer;
}

function cell(ref, value, styleId) {
  const style = styleId ? ` s="${styleId}"` : "";
  return `<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEscape(value)}</t></is></c>`;
}

function row(number, label, value, styleId) {
  return `<row r="${number}" ht="24" customHeight="1">${cell(`A${number}`, label, styleId)}${cell(`B${number}`, value, styleId)}</row>`;
}

function fillerLabel(record) {
  return ["daily-quality-safety-check", "weekly-quality-safety-report"].includes(record.templateSlug) ? "自查人员" : "填表人";
}

function buildRows(record, fields) {
  const signerLabel = fillerLabel(record);
  const recordData = record.data || {};
  const rows = [
    ["阳江市桃金娘豆豉有限公司", "质量安全管理记录", 1],
    ["表单名称", record.templateName, 2],
    ["记录编号", record.id, 0],
    ["原记录编号", record.correctionOf || "-", 0],
    ["记录日期", record.recordDate || "-", 0],
    ["状态", record.statusText || record.status || "-", 0],
    [signerLabel, recordData.filledBy || record.createdByName || record.createdBy || "-", 0]
  ];
  fields.forEach((field) => {
    if (field.categoryTitle) rows.push([field.categoryTitle, "", 2]);
    if (field.type === "healthChecks") {
      rows.push([field.label, "", 2]);
      rows.push(["检查时间", "检查单位 | 检查项目 | 检查结果 | 采取措施 | 备注", 2]);
      const healthChecks = Array.isArray(field.healthChecks) ? field.healthChecks : [];
      if (healthChecks.length === 0) {
        rows.push(["-", "-", 0]);
      } else {
        healthChecks.forEach((item) => {
          rows.push([
            item.checkTime || "-",
            `${text(item.checkUnit)} | ${text(item.checkItem)} | ${text(item.checkResult)} | ${text(item.measureTaken)} | ${text(item.remarks)}`,
            0
          ]);
        });
      }
    } else {
      rows.push([field.label, field.value || "-", 0]);
    }
  });
  rows.push([`${signerLabel}签名`, "", 0], ["审核人签名", "", 0], ["日期", "", 0]);
  return rows.map((item, index) => row(index + 1, item[0], item[1], item[2])).join("");
}

function buildSheet(record, fields) {
  const rows = buildRows(record, fields);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="24"/>
  <cols><col min="1" max="1" width="22" customWidth="1"/><col min="2" max="2" width="58" customWidth="1"/></cols>
  <sheetData>${rows}</sheetData>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

function buildRecordXlsx(record, fields) {
  return makeZip([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="质量记录" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3"><font><sz val="11"/><name val="SimSun"/></font><font><b/><sz val="14"/><name val="SimSun"/></font><font><b/><sz val="12"/><name val="SimSun"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: buildSheet(record, fields)
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xmlEscape(record.templateName || "质量记录")}</dc:title>
  <dc:creator>桃金娘质量安全管理记录系统</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-05-16T00:00:00Z</dcterms:created>
</cp:coreProperties>`
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>桃金娘质量安全管理记录系统</Application></Properties>`
    }
  ]);
}

function exportRecordXlsx(record, fields) {
  return new Promise((resolve, reject) => {
    const filePath = `${wx.env.USER_DATA_PATH}/${safeFileName(record.templateName)}_${safeFileName(record.id)}.xlsx`;
    wx.getFileSystemManager().writeFile({
      filePath,
      data: buildRecordXlsx(record, fields),
      success: () => resolve(filePath),
      fail: reject
    });
  });
}

module.exports = {
  exportRecordXlsx,
  buildRecordXlsx
};
