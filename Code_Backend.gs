/**
 * ========================================================================================
 * HỆ THỐNG TRA CỨU & QUẢN LÝ PHIẾU MUA HÀNG (PMH) - GOOGLE APPS SCRIPT
 * Dành cho trang tính: 1841 - PHIẾU MUA HÀNG EVENT
 * ========================================================================================
 */

// Tên trang tính chứa dữ liệu phiếu mua hàng (để trống "" sẽ tự động lấy trang tính đang chọn)
const SHEET_NAME = "PMH";

/**
 * 1. Tự động tạo Menu "🏷️ Tra Cứu Phiếu Mua Hàng" trên thanh công cụ khi mở Sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🏷️ Tra Cứu Phiếu Mua Hàng")
    .addItem("🔍 Mở Form Tra Cứu (Sidebar bên phải)", "showSidebar")
    .addItem("🖥️ Mở Form Tra Cứu (Cửa sổ lớn Dialog)", "showDialog")
    .addSeparator()
    .addItem("👑 Quản Lý & Tạo Bản Sao Ứng Dụng (CLONES)", "setupClonesSheetPrompt")
    .addItem("🧹 Dọn Dẹp Sheet PMH2 (Chỉ giữ User 43751 & 7721)", "cleanPmh2SheetData")
    .addItem("⚡ Cài đặt Cột Checkbox & Định dạng Sheet", "setupSheetFormatting")
    .addItem("ℹ️ Hướng Dẫn Sử Dụng", "showHelp")
    .addToUi();
}

/**
 * 2. Mở form dưới dạng Sidebar bên phải màn hình (Khuyên dùng)
 */
function showSidebar() {
  const html = getAppHtmlOutput()
    .setTitle("Tra Cứu Mã Phiếu Mua Hàng")
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * 3. Mở form dưới dạng Hộp thoại (Modal Dialog) ở giữa màn hình
 */
function showDialog() {
  const html = getAppHtmlOutput()
    .setWidth(980)
    .setHeight(720);
  SpreadsheetApp.getUi().showModalDialog(html, "Tra Cứu & Quản Lý Phiếu Mua Hàng");
}

/**
 * 4. Mở qua link Web App và API tiếp nhận dữ liệu từ GitHub Pages
 */
function doGet(e) {
  return handleApiOrHtml(e);
}

function doPost(e) {
  return handleApiOrHtml(e);
}

function handleApiOrHtml(e) {
  let params = (e && e.parameter) ? Object.assign({}, e.parameter) : {};
  let postBody = null;

  if (e && e.postData && e.postData.contents) {
    try {
      postBody = JSON.parse(e.postData.contents);
      for (const k in postBody) {
        if (params[k] === undefined) params[k] = postBody[k];
      }
    } catch (err) {
      if (!params.data) params.data = e.postData.contents;
    }
  }

  // API 1: Cập nhật trạng thái phiếu mua hàng (Sheet 1 hoặc sheet PMH2)
  if (params && (params.action === "markUsed" || params.action === "mark")) {
    const row = parseInt(params.row || params.rowIndex, 10);
    const isUsed = (params.used === "true" || params.used === true || params.used === "1");
    const targetCode = params.code ? String(params.code).trim() : "";
    const sheetName = params.sheet ? String(params.sheet).trim() : "";
    const user = params.user ? String(params.user).trim() : "";
    const targetSheetId = params.sheetId || (postBody && postBody.sheetId) || "";
    const res = markVoucher(row, isUsed, targetCode, sheetName, user, targetSheetId);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 2: Dán và lưu ngược dữ liệu vào sheet PMH (Sheet 1)
  if (params && (params.action === "savePmh" || params.action === "appendPmh")) {
    const rawData = params.data || (postBody && postBody.data) || "";
    const mode = params.mode || "append"; // 'append' hoặc 'overwrite'
    const targetSheetId = params.sheetId || (postBody && postBody.sheetId) || "";
    const res = savePmhData(rawData, mode, targetSheetId);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 2b: Dán và lưu ngược dữ liệu vào sheet PMH2
  if (params && (params.action === "savePmh2" || params.action === "appendPmh2")) {
    const rawData = params.data || (postBody && postBody.data) || "";
    const mode = params.mode || "append"; // 'append' hoặc 'overwrite'
    const targetSheetId = params.sheetId || (postBody && postBody.sheetId) || "";
    const res = savePmh2Data(rawData, mode, targetSheetId);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 3: Lấy danh sách phiếu mua hàng dạng JSON
  if (params && params.action === "getData") {
    const sheetName = params.sheet ? String(params.sheet).trim() : "";
    const data = getSheetData(sheetName);
    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 4: Lấy trạng thái ẩn/hiện 2 tab (Sheet 1 và PMH2)
  if (params && params.action === "getTabVisibility") {
    const vis = getTabVisibility();
    return ContentService.createTextOutput(JSON.stringify({ success: true, visibility: vis }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 5: Lưu trạng thái ẩn/hiện 2 tab (Sheet 1 và PMH2)
  if (params && params.action === "setTabVisibility") {
    const sheet1 = params.sheet1 === undefined ? true : (params.sheet1 === "true" || params.sheet1 === true || params.sheet1 === "1");
    const pmh2 = params.pmh2 === undefined ? true : (params.pmh2 === "true" || params.pmh2 === true || params.pmh2 === "1");
    const res = setTabVisibility(sheet1, pmh2);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 6: Lấy danh sách các bản sao ứng dụng
  if (params && params.action === "getClones") {
    const res = getClonesList();
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 7: Lưu hoặc tạo mới bản sao ứng dụng
  if (params && params.action === "saveClone") {
    const slug = params.slug || (postBody && postBody.slug);
    const name = params.name || (postBody && postBody.name);
    const sheetId = params.sheetId || (postBody && postBody.sheetId);
    const webAppUrl = params.webAppUrl || (postBody && postBody.webAppUrl);
    const status = params.status || (postBody && postBody.status);
    const res = saveCloneRecord(slug, name, sheetId, webAppUrl, status);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 8: Xóa bản sao ứng dụng
  if (params && params.action === "deleteClone") {
    const slug = params.slug || (postBody && postBody.slug);
    const res = deleteCloneRecord(slug);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return getAppHtmlOutput()
    .setTitle("Hệ Thống Tra Cứu Phiếu Mua Hàng")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 5. Lấy đối tượng Sheet dữ liệu mục tiêu (hỗ trợ chỉ định SheetName hoặc sheet PMH2)
 */
function getTargetSheet(sheetName, targetSheetId) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (targetSheetId && String(targetSheetId).trim()) {
    try {
      ss = SpreadsheetApp.openById(String(targetSheetId).trim());
    } catch (e) {
      console.warn("Không mở được sheetById:", targetSheetId, e);
    }
  }
  let sheet = null;
  if (sheetName) {
    sheet = ss.getSheetByName(sheetName);
    if (!sheet && sheetName.toUpperCase() === "PMH2") {
      sheet = ss.insertSheet("PMH2");
    }
  }
  if (!sheet && SHEET_NAME) {
    sheet = ss.getSheetByName(SHEET_NAME);
  }
  if (!sheet) {
    sheet = ss.getActiveSheet();
  }
  return sheet;
}

/**
 * 6. Đọc toàn bộ dữ liệu phiếu mua hàng và trạng thái từ Sheet
 * Phân tích cấu trúc từng dòng:
 * "Ngày DD/MM/YYYY : Mã Phiếu mua hàng [X] - dùng cho [Tên sản phẩm]: [Mã phiếu]"
 */
function getSheetData() {
  const sheet = getTargetSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return {
      success: true,
      dates: [],
      products: [],
      items: []
    };
  }

  // Đọc tối đa 3 cột: A (Nội dung phiếu), B (Checkbox Đã dùng), C (Thời gian sử dụng)
  const maxCol = Math.max(sheet.getLastColumn(), 3);
  const dataRange = sheet.getRange(1, 1, lastRow, maxCol).getValues();

  const items = [];
  const datesSet = {};
  const productsSet = {};

  // Regex chuẩn nhận diện dòng phiếu mua hàng
  // Nhóm 1: Ngày (DD/MM/YYYY)
  // Nhóm 2: Số phiếu (nếu có, vd: 1, 2, 3...)
  // Nhóm 3: Tên sản phẩm
  // Nhóm 4: Mã phiếu (chuỗi ký tự ở cuối cùng sau dấu :)
  const lineRegex = /^Ngày\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*:\s*(?:Mã\s*Phiếu\s*mua\s*hàng\s*(\d+)\s*-\s*dùng\s*cho\s*)?([^:]+?)\s*:\s*([A-Za-z0-9]+)\s*$/i;

  for (let r = 0; r < dataRange.length; r++) {
    const rawText = String(dataRange[r][0] || "").trim();
    if (!rawText || !rawText.startsWith("Ngày")) continue;

    const match = rawText.match(lineRegex);
    if (match) {
      const dateStr = match[1].trim();
      const voucherNum = match[2] ? match[2].trim() : "";
      const product = match[3].trim();
      const code = match[4].trim();

      // Kiểm tra trạng thái cột B
      const colBVal = dataRange[r][1];
      const isUsed = (colBVal === true || String(colBVal).toUpperCase() === "TRUE" || String(colBVal).toLowerCase() === "đã sử dụng" || String(colBVal).toLowerCase() === "x");
      const usedTime = dataRange[r][2] ? String(dataRange[r][2]) : "";

      datesSet[dateStr] = true;
      productsSet[product] = true;

      items.push({
        rowIndex: r + 1, // Dòng 1-indexed trong Google Sheet
        date: dateStr,
        voucherNum: voucherNum ? ("Mã " + voucherNum) : "",
        product: product,
        code: code,
        isUsed: isUsed,
        usedTime: usedTime,
        rawText: rawText
      });
    } else {
      // Trường hợp định dạng có chút khác biệt nhưng vẫn có Ngày và dấu : ở cuối
      const parts = rawText.split(":");
      if (parts.length >= 2) {
        const potentialCode = parts[parts.length - 1].trim();
        const dateMatch = rawText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (potentialCode && potentialCode.length >= 6 && dateMatch) {
          const dateStr = dateMatch[1];
          let product = rawText;
          if (product.indexOf("dùng cho") !== -1) {
            product = product.split("dùng cho")[1];
          }
          product = product.replace(":" + potentialCode, "").trim();

          const colBVal = dataRange[r][1];
          const isUsed = (colBVal === true || String(colBVal).toUpperCase() === "TRUE");
          const usedTime = dataRange[r][2] ? String(dataRange[r][2]) : "";

          datesSet[dateStr] = true;
          productsSet[product] = true;

          items.push({
            rowIndex: r + 1,
            date: dateStr,
            voucherNum: "",
            product: product,
            code: potentialCode,
            isUsed: isUsed,
            usedTime: usedTime,
            rawText: rawText
          });
        }
      }
    }
  }

  // Sắp xếp ngày tăng dần
  const dates = Object.keys(datesSet).sort(function(a, b) {
    const pA = a.split("/").map(Number);
    const pB = b.split("/").map(Number);
    const dateA = new Date(pA[2], pA[1] - 1, pA[0]);
    const dateB = new Date(pB[2], pB[1] - 1, pB[0]);
    return dateA - dateB;
  });

  const products = Object.keys(productsSet).sort();

  // Tự động lọc mã trùng: nếu cùng 1 mã phiếu xuất hiện nhiều lần, chỉ giữ lại 1 mã
  const seenCodes = {};
  const uniqueItems = [];
  for (let k = 0; k < items.length; k++) {
    const codeKey = items[k].code ? String(items[k].code).trim().toUpperCase() : "";
    if (codeKey) {
      if (seenCodes[codeKey]) {
        const existing = seenCodes[codeKey];
        if (items[k].isUsed && !existing.isUsed) {
          existing.isUsed = true;
          existing.usedTime = items[k].usedTime;
        }
        continue; // Bỏ qua bản ghi trùng
      }
      seenCodes[codeKey] = items[k];
    }
    uniqueItems.push(items[k]);
  }

  return {
    success: true,
    sheetName: sheet.getName(),
    totalItems: uniqueItems.length,
    dates: dates,
    products: products,
    items: uniqueItems
  };
}

/**
 * 7. Cập nhật trạng thái phiếu mua hàng (Đã dùng / Chưa dùng)
 * Đồng bộ ngay vào Google Sheet (Hỗ trợ cả Sheet 1 và sheet PMH2):
 * - Tự động cập nhật tất cả các dòng chứa mã phiếu trùng lặp
 * - Cột B: Checkbox TRUE / FALSE
 * - Cột C: Thời gian sử dụng (dd/MM/yyyy HH:mm:ss)
 * - Cột D: User thao tác
 * - Cột A: Gạch ngang chữ (line-through) nếu đã dùng
 */
function markVoucher(rowIndex, isUsed, targetCode, sheetName, user, targetSheetId) {
  try {
    const sheet = getTargetSheet(sheetName, targetSheetId);
    let targetRow = parseInt(rowIndex, 10);
    const lastRow = sheet.getLastRow();

    // Nếu có targetCode, tìm tất cả các dòng chứa targetCode để cập nhật đồng loạt
    const matchedRows = [];
    if (targetCode && lastRow > 0) {
      const colA = sheet.getRange(1, 1, lastRow, 1).getValues();
      for (let i = 0; i < colA.length; i++) {
        if (String(colA[i][0]).indexOf(targetCode) !== -1) {
          matchedRows.push(i + 1);
        }
      }
    }

    if (matchedRows.length === 0 && !isNaN(targetRow) && targetRow >= 1 && targetRow <= lastRow) {
      matchedRows.push(targetRow);
    }

    if (matchedRows.length === 0) {
      return { success: false, message: "Không tìm thấy dòng phù hợp: " + rowIndex };
    }

    let timeStr = "";
    if (isUsed) {
      const now = new Date();
      timeStr = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT+7", "dd/MM/yyyy HH:mm:ss");
    }

    // Cập nhật tất cả các dòng trùng mã
    for (let m = 0; m < matchedRows.length; m++) {
      const r = matchedRows[m];
      const cellA = sheet.getRange(r, 1);
      const cellB = sheet.getRange(r, 2);
      const cellC = sheet.getRange(r, 3);
      const cellD = sheet.getRange(r, 4);

      if (isUsed) {
        cellB.setValue(true);
        cellC.setValue(timeStr);
        if (user) {
          cellD.setValue(user);
        }

        if (!sheetName || sheetName === "PMH") {
          cellA.setFontLine("line-through");
          cellA.setFontColor("#718096");
        }
      } else {
        cellB.setValue(false);
        cellC.setValue("");
        cellD.setValue("");

        if (!sheetName || sheetName === "PMH") {
          cellA.setFontLine("none");
          cellA.setFontColor("#000000");
        }
      }
    }

    // Đảm bảo dữ liệu được ghi ngay xuống Sheet
    SpreadsheetApp.flush();

    return {
      success: true,
      rowIndex: matchedRows[0],
      matchedRowsCount: matchedRows.length,
      code: targetCode,
      isUsed: isUsed,
      usedTime: timeStr,
      sheet: sheet.getName()
    };
  } catch (err) {
    return {
      success: false,
      message: err.toString()
    };
  }
}

/**
 * Hàm hỗ trợ lọc dữ liệu thô PMH2: CHỈ GIỮ LẠI các khối/dòng thuộc User 43751 & 7721
 * - Tự động loại bỏ các khối dữ liệu của user khác (12241, 161987, ...)
 * - Tự động loại bỏ các dòng phiếu lẻ loi không rõ user
 */
function filterPmh2RawDataForTargetUsers(rawData) {
  if (!rawData || typeof rawData !== "string") return "";
  const targetUsers = ["43751", "7721"];
  const lines = rawData.split(/\r?\n/).map(function(l) { return l.trimEnd(); });
  const resultLines = [];

  function isVoucherOrStatus(l) {
    return l.includes("PMH") || 
           l.includes("➜") || 
           l.includes("❌") || 
           /hết lượt|không tồn tại|thất bại|không hợp lệ/i.test(l);
  }

  function isSeparator(l) {
    return /^[━\-=─_~*#]{3,}$/.test(l);
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const isVoucher = isVoucherOrStatus(trimmed);
    const isSep = isSeparator(trimmed);

    // Kiểm tra dòng định danh User mục tiêu (43751 hoặc 7721)
    let matchedUser = null;
    for (let u = 0; u < targetUsers.length; u++) {
      if (trimmed.includes(targetUsers[u])) {
        matchedUser = targetUsers[u];
        break;
      }
    }

    if (matchedUser && !isVoucher && !isSep) {
      resultLines.push(lines[i].trim());

      let j = i + 1;
      while (j < lines.length) {
        const nextTrimmed = lines[j].trim();
        if (!nextTrimmed) {
          j++;
          continue;
        }

        const nextIsVoucher = isVoucherOrStatus(nextTrimmed);
        const nextIsSep = isSeparator(nextTrimmed);
        let nextIsTargetUser = false;
        for (let u = 0; u < targetUsers.length; u++) {
          if (nextTrimmed.includes(targetUsers[u])) {
            nextIsTargetUser = true;
            break;
          }
        }
        nextIsTargetUser = nextIsTargetUser && !nextIsVoucher && !nextIsSep;

        // Nếu gặp User khác hoặc User mục tiêu tiếp theo -> dừng khối hiện tại
        if (nextIsTargetUser || (!nextIsVoucher && !nextIsSep)) {
          break;
        }

        if (nextIsVoucher) {
          resultLines.push(lines[j].trim());
          j++;
        } else if (nextIsSep) {
          resultLines.push(lines[j].trim());
          j++;
          break;
        } else {
          j++;
        }
      }
      i = j - 1;
    }
  }

  return resultLines.join("\n").trim();
}

/**
 * 8. Dán dữ liệu thô và lưu ngược vào Sheet "PMH2"
 * - TỰ ĐỘNG LỌC chỉ lưu các dòng thuộc User 43751 & 7721 (bỏ qua mọi user khác)
 * - Hỗ trợ mode = 'append' (mặc định: thêm tiếp vào cuối) hoặc 'overwrite' (ghi đè toàn bộ)
 */
function savePmh2Data(rawData, mode, targetSheetId) {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (targetSheetId && String(targetSheetId).trim()) {
      try {
        ss = SpreadsheetApp.openById(String(targetSheetId).trim());
      } catch (e) {
        console.warn("Không mở được sheetById:", targetSheetId, e);
      }
    }
    let sheet = ss.getSheetByName("PMH2");
    if (!sheet) {
      sheet = ss.insertSheet("PMH2");
    }

    if (!rawData || typeof rawData !== "string") {
      return { success: false, message: "Dữ liệu trống hoặc không hợp lệ" };
    }

    // Tự động lọc chỉ lấy các khối/dòng thuộc User 43751 & 7721
    const filteredData = filterPmh2RawDataForTargetUsers(rawData);
    if (!filteredData) {
      return { 
        success: false, 
        message: "Không tìm thấy dòng phiếu nào thuộc User 43751 hoặc 7721 trong dữ liệu vừa dán! Đã hủy lưu để tránh dữ liệu dư thừa." 
      };
    }

    const lines = filteredData.split(/\r?\n/).map(function(l) { return l.trimEnd(); });
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }

    if (lines.length === 0) {
      return { success: false, message: "Không có dòng dữ liệu hợp lệ để lưu" };
    }

    const rowData = lines.map(function(line) { return [line]; });

    if (mode === "overwrite") {
      sheet.clearContents();
      sheet.getRange(1, 1, rowData.length, 1).setValues(rowData);
    } else {
      const lastRow = sheet.getLastRow();
      const startRow = lastRow + 1;
      sheet.getRange(startRow, 1, rowData.length, 1).setValues(rowData);
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      mode: mode || "append",
      totalLines: lines.length,
      lastRow: sheet.getLastRow(),
      message: "Đã tự động lọc và lưu thành công " + lines.length + " dòng (User 43751 & 7721) vào sheet PMH2"
    };
  } catch (err) {
    return {
      success: false,
      message: err.toString()
    };
  }
}

/**
 * 8b. Dán dữ liệu thô và lưu ngược vào Sheet "PMH" (Sheet 1)
 * - Hỗ trợ mode = 'append' (mặc định: thêm tiếp vào cuối) hoặc 'overwrite' (ghi đè toàn bộ)
 * - Tự động thiết lập cấu trúc: Cột A (Nội dung phiếu), Cột B (Đã sử dụng - Checkbox), Cột C (Thời gian sử dụng)
 */
function savePmhData(rawData, mode, targetSheetId) {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (targetSheetId && String(targetSheetId).trim()) {
      try {
        ss = SpreadsheetApp.openById(String(targetSheetId).trim());
      } catch (e) {
        console.warn("Không mở được sheetById:", targetSheetId, e);
      }
    }
    let sheet = null;
    if (SHEET_NAME) {
      sheet = ss.getSheetByName(SHEET_NAME);
    }
    if (!sheet) {
      sheet = ss.getSheetByName("PMH");
    }
    if (!sheet) {
      sheet = ss.insertSheet("PMH");
    }

    if (!rawData || typeof rawData !== "string") {
      return { success: false, message: "Dữ liệu trống hoặc không hợp lệ" };
    }

    const lines = rawData.split(/\r?\n/).map(function(l) { return l.trim(); });
    const formattedLines = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (!line) continue;
      // Bỏ qua dòng kẻ phân cách
      if (/^[━\-=─_~*#]{3,}$/.test(line)) continue;

      // Xử lý nếu copy từ Excel/Sheets có dấu Tab (\t)
      if (line.indexOf("\t") !== -1) {
        const parts = line.split("\t").map(function(p) { return p.trim(); }).filter(Boolean);
        if (parts.length >= 3) {
          let d = parts[0];
          if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) d = "Ngày " + d;
          line = d + " : " + parts[1] + " : " + parts[2];
        } else if (parts.length === 2) {
          line = parts[0] + " : " + parts[1];
        }
      }

      // Tự động thêm chữ "Ngày " nếu bắt đầu bằng ngày DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(line)) {
        line = "Ngày " + line;
      }

      formattedLines.push(line);
    }

    if (formattedLines.length === 0) {
      return { success: false, message: "Không có dòng dữ liệu hợp lệ để lưu" };
    }

    const rowData = formattedLines.map(function(l) {
      return [l, false, ""];
    });

    if (mode === "overwrite") {
      sheet.clearContents();
      const headerRange = sheet.getRange(1, 1, 1, 3);
      headerRange.setValues([["NỘI DUNG PHIẾU MUA HÀNG", "ĐÃ SỬ DỤNG", "THỜI GIAN SỬ DỤNG"]]);
      headerRange.setFontWeight("bold").setBackground("#2D3748").setFontColor("#FFFFFF").setHorizontalAlignment("center");
      
      const startRow = 2;
      sheet.getRange(startRow, 1, rowData.length, 3).setValues(rowData);
      try {
        const checkboxRange = sheet.getRange(startRow, 2, rowData.length, 1);
        checkboxRange.insertCheckboxes();
        checkboxRange.setHorizontalAlignment("center");
      } catch (cbErr) {}
    } else {
      let lastRow = sheet.getLastRow();
      if (lastRow === 0) {
        sheet.getRange(1, 1, 1, 3).setValues([["NỘI DUNG PHIẾU MUA HÀNG", "ĐÃ SỬ DỤNG", "THỜI GIAN SỬ DỤNG"]]);
        sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#2D3748").setFontColor("#FFFFFF").setHorizontalAlignment("center");
        lastRow = 1;
      }
      const startRow = lastRow + 1;
      sheet.getRange(startRow, 1, rowData.length, 3).setValues(rowData);
      try {
        const checkboxRange = sheet.getRange(startRow, 2, rowData.length, 1);
        checkboxRange.insertCheckboxes();
        checkboxRange.setHorizontalAlignment("center");
      } catch (cbErr) {}
    }

    SpreadsheetApp.flush();

    return {
      success: true,
      mode: mode || "append",
      totalLines: formattedLines.length,
      lastRow: sheet.getLastRow(),
      sheetName: sheet.getName(),
      message: "Đã lưu thành công " + formattedLines.length + " dòng vào sheet " + sheet.getName()
    };
  } catch (err) {
    return {
      success: false,
      message: err.toString()
    };
  }
}

/**
 * Tự động quét và dọn dẹp sheet "PMH2", loại bỏ các user khác, chỉ giữ lại User 43751 & 7721
 */
function cleanPmh2SheetData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("PMH2");
    if (!sheet) {
      SpreadsheetApp.getUi().alert("Thông báo", "Không tìm thấy trang tính PMH2!", SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 1) {
      SpreadsheetApp.getUi().alert("Thông báo", "Trang tính PMH2 đang trống!", SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const values = sheet.getRange(1, 1, lastRow, 1).getValues();
    const rawLines = values.map(function(row) { return row[0] != null ? String(row[0]) : ""; });
    const originalText = rawLines.join("\n");

    const filteredText = filterPmh2RawDataForTargetUsers(originalText);
    if (!filteredText) {
      SpreadsheetApp.getUi().alert("Kết Quả Lọc", "Không tìm thấy dòng nào thuộc User 43751 hoặc 7721 trong sheet PMH2.", SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }

    const newLines = filteredText.split(/\r?\n/).map(function(l) { return [l]; });
    sheet.clearContents();
    sheet.getRange(1, 1, newLines.length, 1).setValues(newLines);
    SpreadsheetApp.flush();

    const removedCount = lastRow - newLines.length;
    SpreadsheetApp.getUi().alert(
      "Đã Dọn Dẹp Sheet PMH2 Thành Công",
      "Đã giữ lại: " + newLines.length + " dòng (thuộc User 43751 & 7721).\n" +
      "Đã loại bỏ: " + (removedCount > 0 ? removedCount : 0) + " dòng dữ liệu thừa của các User khác.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (err) {
    SpreadsheetApp.getUi().alert("Lỗi", "Không thể dọn dẹp sheet PMH2: " + err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * 9. Quản lý trạng thái Ẩn / Hiện 2 Tab (Đồng bộ mọi trình duyệt)
 */
function getTabVisibility() {
  try {
    const props = PropertiesService.getScriptProperties();
    const raw = props.getProperty("TAB_VISIBILITY");
    if (!raw) return { sheet1: true, pmh2: true };
    return JSON.parse(raw);
  } catch (e) {
    return { sheet1: true, pmh2: true };
  }
}

function setTabVisibility(sheet1, pmh2) {
  try {
    const props = PropertiesService.getScriptProperties();
    const val = {
      sheet1: sheet1 === true || sheet1 === "true",
      pmh2: pmh2 === true || pmh2 === "true",
      updatedAt: new Date().toISOString()
    };
    props.setProperty("TAB_VISIBILITY", JSON.stringify(val));
    return { success: true, visibility: val };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * 10. Quản lý Hệ Thống Bản Sao Ứng Dụng (Multi-Store / Multi-Sheet)
 */
function getClonesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("CLONES");
  if (!sheet) {
    sheet = ss.insertSheet("CLONES");
    const headers = [["TÊN RÚT GỌN (SLUG)", "TÊN HIỂN THỊ / CHI NHÁNH", "GOOGLE SHEET ID", "WEB APP URL", "TRẠNG THÁI", "NGÀY TẠO"]];
    const headerRange = sheet.getRange("A1:F1");
    headerRange.setValues(headers);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0369a1");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 220);
    sheet.setColumnWidth(3, 340);
    sheet.setColumnWidth(4, 250);
    sheet.setColumnWidth(5, 120);
    sheet.setColumnWidth(6, 160);
  }
  return sheet;
}

function getClonesList() {
  try {
    const sheet = getClonesSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, clones: [] };
    }
    const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    const clones = values.map(function(row, idx) {
      return {
        rowIndex: idx + 2,
        slug: String(row[0] || "").trim().toLowerCase(),
        name: String(row[1] || "").trim(),
        sheetId: String(row[2] || "").trim(),
        webAppUrl: String(row[3] || "").trim(),
        status: String(row[4] || "active").trim().toLowerCase(),
        createdAt: String(row[5] || "").trim()
      };
    }).filter(function(c) { return c.slug && c.sheetId; });

    return { success: true, clones: clones };
  } catch (err) {
    return { success: false, message: err.toString(), clones: [] };
  }
}

function saveCloneRecord(slug, name, sheetId, webAppUrl, status) {
  try {
    if (!slug || !sheetId) {
      return { success: false, message: "Thiếu tên rút gọn (slug) hoặc Sheet ID" };
    }
    const cleanSlug = String(slug).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanSlug) {
      return { success: false, message: "Tên rút gọn không hợp lệ (chỉ gồm chữ cái a-z, số 0-9 và dấu gạch -)" };
    }

    // Tự trích xuất ID nếu người dùng dán cả URL Google Sheet
    let cleanSheetId = String(sheetId).trim();
    const match = cleanSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      cleanSheetId = match[1];
    }

    const cleanName = String(name || cleanSlug).trim();
    const cleanWebApp = String(webAppUrl || "").trim();
    const cleanStatus = String(status || "active").trim().toLowerCase();
    const nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    const sheet = getClonesSheet();
    const lastRow = sheet.getLastRow();
    let targetRow = -1;

    if (lastRow > 1) {
      const existingSlugs = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < existingSlugs.length; i++) {
        if (String(existingSlugs[i][0]).trim().toLowerCase() === cleanSlug) {
          targetRow = i + 2;
          break;
        }
      }
    }

    if (targetRow !== -1) {
      sheet.getRange(targetRow, 1, 1, 6).setValues([[cleanSlug, cleanName, cleanSheetId, cleanWebApp, cleanStatus, nowStr]]);
    } else {
      sheet.appendRow([cleanSlug, cleanName, cleanSheetId, cleanWebApp, cleanStatus, nowStr]);
    }
    SpreadsheetApp.flush();

    return {
      success: true,
      clone: {
        slug: cleanSlug,
        name: cleanName,
        sheetId: cleanSheetId,
        webAppUrl: cleanWebApp,
        status: cleanStatus,
        createdAt: nowStr
      },
      message: "Đã lưu bản sao thành công!"
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function deleteCloneRecord(slug) {
  try {
    if (!slug) return { success: false, message: "Thiếu tên rút gọn cần xóa" };
    const cleanSlug = String(slug).trim().toLowerCase();
    const sheet = getClonesSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { success: false, message: "Danh sách bản sao đang trống" };

    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let foundRow = -1;
    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim().toLowerCase() === cleanSlug) {
        foundRow = i + 2;
        break;
      }
    }

    if (foundRow === -1) {
      return { success: false, message: "Không tìm thấy bản sao: " + cleanSlug };
    }

    sheet.deleteRow(foundRow);
    SpreadsheetApp.flush();
    return { success: true, message: "Đã xóa bản sao: " + cleanSlug };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function setupClonesSheetPrompt() {
  const sheet = getClonesSheet();
  SpreadsheetApp.getUi().alert(
    "Quản Lý Bản Sao Ứng Dụng",
    "Trang tính CLONES đã được thiết lập sẵn sàng.\n\n" +
    "Bạn có thể xem hoặc chỉnh sửa trực tiếp danh sách bản sao tại sheet CLONES, " +
    "hoặc sử dụng giao diện trên web tại link Admin: https://leevu221-lang.github.io/tracuuphieumuahang/",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 8. Khởi tạo & Làm đẹp định dạng Google Sheet
 * - Tạo tiêu đề Cột B: "ĐÃ SỬ DỤNG (CHECKBOX)"
 * - Tạo tiêu đề Cột C: "THỜI GIAN SỬ DỤNG"
 * - Chèn Checkbox vào Cột B cho tất cả các dòng phiếu
 */
function setupSheetFormatting() {
  const sheet = getTargetSheet();
  const lastRow = sheet.getLastRow();

  // Đặt tiêu đề cột B và C
  const headerRange = sheet.getRange("B1:C1");
  headerRange.setValues([["ĐÃ SỬ DỤNG", "THỜI GIAN SỬ DỤNG"]]);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#2D3748");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");

  // Quét các dòng có chứa dữ liệu phiếu để chèn Checkbox ở Cột B
  const colAValues = sheet.getRange(1, 1, lastRow, 1).getValues();
  let countCheckboxes = 0;

  for (let i = 0; i < colAValues.length; i++) {
    const text = String(colAValues[i][0] || "").trim();
    if (text.startsWith("Ngày")) {
      const rowNum = i + 1;
      const cellB = sheet.getRange(rowNum, 2);
      cellB.insertCheckboxes();
      cellB.setHorizontalAlignment("center");
      countCheckboxes++;
    }
  }

  sheet.setColumnWidth(1, 680);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 180);

  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "Khởi Tạo Hoàn Tất!",
    "Đã thiết lập tiêu đề cột B & C và gắn Checkbox cho " + countCheckboxes + " dòng phiếu mua hàng thành công.\n\nBây giờ bạn có thể mở Form Tra Cứu để bắt đầu sử dụng.",
    ui.ButtonSet.OK
  );
}

/**
 * 9. Hiển thị hộp thoại hướng dẫn sử dụng
 */
function showHelp() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "HƯỚNG DẪN SỬ DỤNG FORM TRA CỨU",
    "1. Mở Form Tra Cứu từ menu hoặc thanh bên (Sidebar).\n" +
    "2. Chọn Ngày cần tra cứu (hoặc để mặc định hôm nay).\n" +
    "3. Gõ 1 vài ký tự tên sản phẩm (không cần gõ dấu, ví dụ: 'bep ga', 'noi com', 'midea'...). Hệ thống sẽ hiển thị kết quả ngay lập tức.\n" +
    "4. Nhấn nút 'Sao chép':\n" +
    "   - Mã phiếu 10 ký tự sẽ được tự động copy vào bộ nhớ tạm (Clipboard).\n" +
    "   - Phiếu sẽ tự động được tick 'Đã sử dụng' và cập nhật ngay vào Google Sheet.\n" +
    "5. Nếu bấm nhầm, bạn có thể nhấn nút 'Hoàn tác' để bỏ tick.",
    ui.ButtonSet.OK
  );
}


/**
 * Trả về giao diện HTML:
 * 1. Ưu tiên nạp từ tệp "Index.html" chuẩn trong Apps Script (Tối ưu nhất, tải nhanh, không lỗi cú pháp)
 * 2. Tự động fallback về chuỗi INDEX_HTML_CONTENT nếu người dùng chỉ dùng 1 tệp Mã.gs All-in-One
 */
function getAppHtmlOutput() {
  try {
    return HtmlService.createHtmlOutputFromFile("Index")
      .setTitle("Tra Cứu Mã Phiếu Mua Hàng")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
  } catch (e) {
    if (typeof INDEX_HTML_CONTENT !== "undefined" && INDEX_HTML_CONTENT) {
      return HtmlService.createHtmlOutput(INDEX_HTML_CONTENT)
        .setTitle("Tra Cứu Mã Phiếu Mua Hàng")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    }
    return HtmlService.createHtmlOutput("<h2>Không tìm thấy tệp Index.html. Vui lòng tạo tệp Index.html trong Apps Script!</h2>");
  }
}
