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
    const res = markVoucher(row, isUsed, targetCode, sheetName, user);
    return ContentService.createTextOutput(JSON.stringify(res))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // API 2: Dán và lưu ngược dữ liệu vào sheet PMH2
  if (params && (params.action === "savePmh2" || params.action === "appendPmh2")) {
    const rawData = params.data || (postBody && postBody.data) || "";
    const mode = params.mode || "append"; // 'append' hoặc 'overwrite'
    const res = savePmh2Data(rawData, mode);
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

  return getAppHtmlOutput()
    .setTitle("Hệ Thống Tra Cứu Phiếu Mua Hàng")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 5. Lấy đối tượng Sheet dữ liệu mục tiêu (hỗ trợ chỉ định SheetName hoặc sheet PMH2)
 */
function getTargetSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
function markVoucher(rowIndex, isUsed, targetCode, sheetName, user) {
  try {
    const sheet = getTargetSheet(sheetName);
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
function savePmh2Data(rawData, mode) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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
 * Trả về giao diện HTML (Tích hợp All-in-One, không sợ lỗi thiếu file Index.html)
 */
function getAppHtmlOutput() {
  try {
    return HtmlService.createHtmlOutputFromFile(Index);
  } catch (e) {
    // Nếu chưa tạo file Index, tự động dùng giao diện tích hợp sẵn bên dưới
    return HtmlService.createHtmlOutput(INDEX_HTML_CONTENT);
  }
}

const INDEX_HTML_CONTENT = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Tra Cứu Mã Phiếu Mua Hàng</title>
  <!-- Google Fonts: Plus Jakarta Sans & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <style>
    :root {
      --primary: #4f46e5;
      --primary-hover: #4338ca;
      --primary-light: #eef2ff;
      --secondary: #0ea5e9;
      --success: #10b981;
      --success-dark: #059669;
      --success-light: #d1fae5;
      --warning: #f59e0b;
      --danger: #ef4444;
      --gray-50: #f8fafc;
      --gray-100: #f1f5f9;
      --gray-200: #e2e8f0;
      --gray-300: #cbd5e1;
      --gray-400: #94a3b8;
      --gray-500: #64748b;
      --gray-600: #475569;
      --gray-700: #334155;
      --gray-800: #1e293b;
      --gray-900: #0f172a;
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
      --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f8fafc;
      color: var(--gray-800);
      line-height: 1.5;
      font-size: 14px;
      padding-bottom: 24px;
    }

    /* Container */
    .app-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 12px 14px;
    }

    /* Header */
    .app-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #ffffff;
      padding: 16px 18px;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
      margin-bottom: 12px;
      position: relative;
      overflow: hidden;
    }

    .app-header::before {
      content: '';
      position: absolute;
      top: -40px;
      right: -40px;
      width: 140px;
      height: 140px;
      background: radial-gradient(circle, rgba(79, 70, 229, 0.35) 0%, rgba(255,255,255,0) 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .app-title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .app-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #6366f1, #4f46e5);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);
    }

    .app-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #ffffff;
    }

    .app-subtitle {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }

    .btn-refresh {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: var(--transition);
    }

    .btn-refresh:hover {
      background: rgba(255, 255, 255, 0.22);
      transform: translateY(-1px);
    }

    .btn-refresh:active {
      transform: translateY(0);
    }

    /* Controls Section */
    .controls-card {
      background: #ffffff;
      border-radius: var(--radius-md);
      padding: 14px;
      box-shadow: var(--shadow-sm);
      border: 1px solid var(--gray-200);
      margin-bottom: 12px;
    }

    /* Date Filter Row */
    .date-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .date-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--gray-600);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 5px;
      min-width: 85px;
    }

    .date-selector-group {
      display: flex;
      flex: 1;
      gap: 6px;
      align-items: center;
      min-width: 240px;
    }

    .date-nav-btn {
      background: var(--gray-100);
      border: 1px solid var(--gray-200);
      color: var(--gray-700);
      width: 34px;
      height: 38px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      cursor: pointer;
      transition: var(--transition);
      font-weight: bold;
    }

    .date-nav-btn:hover {
      background: var(--gray-200);
      color: var(--gray-900);
    }

    .date-select {
      flex: 1;
      height: 38px;
      background: var(--gray-50);
      border: 1.5px solid var(--gray-200);
      border-radius: var(--radius-sm);
      padding: 0 12px;
      font-size: 14px;
      font-weight: 600;
      color: var(--gray-800);
      outline: none;
      cursor: pointer;
      transition: var(--transition);
    }

    .date-select:focus {
      border-color: var(--primary);
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }

    .btn-today {
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid #c7d2fe;
      height: 38px;
      padding: 0 12px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: var(--transition);
    }

    .btn-today:hover {
      background: #e0e7ff;
    }

    /* Search Box */
    .search-wrap {
      position: relative;
      margin-bottom: 12px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: var(--gray-400);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      height: 44px;
      padding: 0 38px 0 38px;
      background: var(--gray-50);
      border: 1.5px solid var(--gray-200);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 500;
      color: var(--gray-900);
      outline: none;
      transition: var(--transition);
    }

    .search-input:focus {
      background: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
    }

    .search-input::placeholder {
      color: var(--gray-400);
      font-weight: 400;
    }

    .btn-clear-search {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: var(--gray-200);
      color: var(--gray-600);
      border: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      cursor: pointer;
      display: none;
      transition: var(--transition);
    }

    .btn-clear-search:hover {
      background: var(--gray-300);
      color: var(--gray-900);
    }

    /* Filter Tabs & Stats */
    .filter-stats-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .filter-tabs {
      display: inline-flex;
      background: var(--gray-100);
      padding: 3px;
      border-radius: var(--radius-sm);
      gap: 3px;
    }

    .filter-tab {
      border: none;
      background: transparent;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--gray-600);
      cursor: pointer;
      transition: var(--transition);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .filter-tab.active {
      background: #ffffff;
      color: var(--gray-900);
      box-shadow: var(--shadow-sm);
    }

    .badge-count {
      background: var(--gray-200);
      color: var(--gray-700);
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 10px;
      font-weight: 700;
    }

    .filter-tab.active .badge-count {
      background: var(--primary-light);
      color: var(--primary);
    }

    .stats-summary {
      font-size: 12px;
      font-weight: 600;
      color: var(--gray-500);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .dot-avail { background: var(--success); }
    .dot-used { background: var(--gray-400); }

    /* Progress bar */
    .progress-bar-wrap {
      width: 100%;
      height: 5px;
      background: var(--gray-100);
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--success), var(--primary));
      width: 0%;
      transition: width 0.4s ease;
    }

    /* Voucher Cards List */
    .voucher-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .voucher-card {
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1.5px solid var(--gray-200);
      padding: 14px 16px;
      box-shadow: var(--shadow-sm);
      transition: var(--transition);
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: relative;
    }

    .voucher-card:hover {
      border-color: #cbd5e1;
      box-shadow: var(--shadow-md);
    }

    /* Card used state */
    .voucher-card.is-used {
      background: #fafbfc;
      border-color: #e5e7eb;
      opacity: 0.92;
    }

    .voucher-card.is-used .voucher-code {
      text-decoration: line-through;
      color: var(--gray-500);
      background: #f1f5f9;
      border-color: #e2e8f0;
    }

    .voucher-card.is-used .product-title {
      color: var(--gray-600);
    }

    /* Card Main Info */
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .product-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--gray-900);
      line-height: 1.35;
      flex: 1;
    }

    .product-title mark {
      background-color: #fef08a;
      color: #854d0e;
      padding: 1px 3px;
      border-radius: 3px;
    }

    .voucher-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 6px;
      white-space: nowrap;
      background: var(--primary-light);
      color: var(--primary);
    }

    /* Code Box & Actions */
    .code-action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }

    .code-box-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .voucher-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: var(--primary);
      background: #f5f3ff;
      border: 1.5px dashed #c4b5fd;
      padding: 6px 14px;
      border-radius: var(--radius-sm);
      display: inline-block;
      user-select: all;
      transition: var(--transition);
    }

    .status-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .status-badge.available {
      background: var(--success-light);
      color: var(--success-dark);
    }

    .status-badge.used {
      background: var(--gray-200);
      color: var(--gray-600);
    }

    /* Actions */
    .card-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
    }

    .btn-copy {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      border: none;
      padding: 9px 18px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
      transition: var(--transition);
      white-space: nowrap;
    }

    .btn-copy:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.45);
    }

    .btn-copy:active {
      transform: translateY(1px);
    }

    .btn-copy.copied {
      background: #047857;
    }

    /* Copy again button for used voucher */
    .btn-copy-again {
      background: var(--gray-100);
      color: var(--gray-700);
      border: 1px solid var(--gray-300);
      padding: 7px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: var(--transition);
    }

    .btn-copy-again:hover {
      background: var(--gray-200);
      color: var(--gray-900);
    }

    /* Undo button */
    .btn-undo {
      background: transparent;
      color: var(--gray-500);
      border: 1px dashed var(--gray-300);
      padding: 7px 10px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .btn-undo:hover {
      background: #fee2e2;
      color: var(--danger);
      border-color: #fca5a5;
    }

    /* Empty state */
    .empty-state {
      background: #ffffff;
      border-radius: var(--radius-md);
      padding: 40px 20px;
      text-align: center;
      color: var(--gray-500);
      border: 1.5px dashed var(--gray-300);
      margin-top: 10px;
    }

    .empty-icon {
      font-size: 42px;
      margin-bottom: 12px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--gray-800);
      margin-bottom: 4px;
    }

    .empty-desc {
      font-size: 13px;
      color: var(--gray-500);
    }

    /* Loading overlay */
    .loading-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 50px 20px;
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--gray-200);
    }

    .spinner {
      width: 38px;
      height: 38px;
      border: 3.5px solid var(--gray-200);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 12px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35);
      z-index: 9999;
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .toast-code {
      font-family: 'JetBrains Mono', monospace;
      color: #34d399;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* Sync Indicator */
    .sync-indicator {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: #94a3b8;
    }

    .sync-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .sync-dot.updating {
      background: var(--warning);
      box-shadow: 0 0 6px var(--warning);
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* Responsive adjustments */
    @media (max-width: 480px) {
      .app-container {
        padding: 8px;
      }
      .code-action-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .card-actions {
        width: 100%;
        margin-left: 0;
        margin-top: 4px;
      }
      .btn-copy {
        width: 100%;
        justify-content: center;
      }
      .btn-copy-again {
        flex: 1;
        justify-content: center;
      }
    }
  </style>
</head>
<body>

  <div class="app-container">

    <!-- Header -->
    <header class="app-header">
      <div class="header-top">
        <div class="app-title-wrap">
          <div class="app-icon">🏷️</div>
          <div>
            <h1 class="app-title">Tra Cứu Mã Phiếu Mua Hàng</h1>
            <p class="app-subtitle" id="sheetInfo">Đang kết nối trang tính PMH...</p>
          </div>
        </div>
        <button class="btn-refresh" id="btnRefresh" title="Làm mới dữ liệu từ Sheet">
          <span>🔄</span> <span>Tải lại</span>
        </button>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <div class="sync-indicator">
          <span class="sync-dot" id="syncDot"></span>
          <span id="syncText">Đã kết nối Sheet</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8;" id="totalCouponsBadge">
          330 phiếu • Siêu thị 1841
        </div>
      </div>
    </header>

    <!-- Controls Card: Date selector, Search, and Tabs -->
    <div class="controls-card">

      <!-- Date selector row -->
      <div class="date-row">
        <label class="date-label" for="dateSelect">
          <span>📅</span> <span>Ngày:</span>
        </label>
        <div class="date-selector-group">
          <button class="date-nav-btn" id="btnPrevDate" title="Ngày trước">◀</button>
          <select class="date-select" id="dateSelect">
            <option value="">Đang tải danh sách ngày...</option>
          </select>
          <button class="date-nav-btn" id="btnNextDate" title="Ngày sau">▶</button>
          <button class="btn-today" id="btnToday">Hôm nay</button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          class="search-input" 
          id="searchInput" 
          placeholder="Gõ vài ký tự sản phẩm (vd: Sunhouse, Toshiba, bep ga, noi com, rapido...)"
          autocomplete="off"
        >
        <button class="btn-clear-search" id="btnClearSearch" title="Xóa tìm kiếm">✕</button>
      </div>

      <!-- Filter tabs & Stats -->
      <div class="filter-stats-row">
        <div class="filter-tabs">
          <button class="filter-tab active" data-status="all">
            Tất cả <span class="badge-count" id="countAll">0</span>
          </button>
          <button class="filter-tab" data-status="available">
            <span class="stat-dot dot-avail"></span> Chưa dùng <span class="badge-count" id="countAvail">0</span>
          </button>
          <button class="filter-tab" data-status="used">
            <span class="stat-dot dot-used"></span> Đã dùng <span class="badge-count" id="countUsed">0</span>
          </button>
        </div>

        <div class="stats-summary">
          <span class="stat-item">
            <span class="stat-dot dot-avail"></span> Còn: <strong id="statAvail" style="color: var(--success-dark);">0</strong>
          </span>
          <span class="stat-item">
            <span class="stat-dot dot-used"></span> Đã dùng: <strong id="statUsed">0</strong>
          </span>
        </div>
      </div>

      <!-- Mini Progress bar -->
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" id="progressBar"></div>
      </div>

    </div>

    <!-- Main Results Section -->
    <main id="mainContent">
      <div class="loading-wrap" id="loadingBox">
        <div class="spinner"></div>
        <p style="font-weight: 600; color: var(--gray-700);">Đang đọc dữ liệu phiếu mua hàng...</p>
        <p style="font-size: 12px; color: var(--gray-400); margin-top: 4px;">Vui lòng chờ trong giây lát</p>
      </div>

      <div class="voucher-list" id="voucherList" style="display: none;"></div>

      <div class="empty-state" id="emptyState" style="display: none;">
        <div class="empty-icon">🔎</div>
        <h3 class="empty-title">Không tìm thấy phiếu phù hợp</h3>
        <p class="empty-desc" id="emptyDesc">Thử đổi từ khóa tìm kiếm hoặc chọn ngày khác xem nhé.</p>
      </div>
    </main>

  </div>

  <!-- Toast Notification -->
  <div class="toast" id="toastBox">
    <span>✅</span>
    <span>Đã sao chép mã: <span class="toast-code" id="toastCode"></span> & đánh dấu đã sử dụng!</span>
  </div>

  <script>
    /**
     * STATE MANAGEMENT
     */
    const state = {
      items: [],
      dates: [],
      products: [],
      selectedDate: '',
      searchQuery: '',
      statusFilter: 'all', // 'all' | 'available' | 'used'
      isLoading: false
    };

    /**
     * DOM ELEMENTS
     */
    const els = {
      sheetInfo: document.getElementById('sheetInfo'),
      syncDot: document.getElementById('syncDot'),
      syncText: document.getElementById('syncText'),
      totalCouponsBadge: document.getElementById('totalCouponsBadge'),
      btnRefresh: document.getElementById('btnRefresh'),
      dateSelect: document.getElementById('dateSelect'),
      btnPrevDate: document.getElementById('btnPrevDate'),
      btnNextDate: document.getElementById('btnNextDate'),
      btnToday: document.getElementById('btnToday'),
      searchInput: document.getElementById('searchInput'),
      btnClearSearch: document.getElementById('btnClearSearch'),
      filterTabs: document.querySelectorAll('.filter-tab'),
      countAll: document.getElementById('countAll'),
      countAvail: document.getElementById('countAvail'),
      countUsed: document.getElementById('countUsed'),
      statAvail: document.getElementById('statAvail'),
      statUsed: document.getElementById('statUsed'),
      progressBar: document.getElementById('progressBar'),
      loadingBox: document.getElementById('loadingBox'),
      voucherList: document.getElementById('voucherList'),
      emptyState: document.getElementById('emptyState'),
      emptyDesc: document.getElementById('emptyDesc'),
      toastBox: document.getElementById('toastBox'),
      toastCode: document.getElementById('toastCode')
    };

    /**
     * VIETNAMESE DIACRITIC STRIPPER (TÌM KIẾM KHÔNG DẤU)
     */
    function boDauTiengViet(str) {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .trim();
    }

    /**
     * TOAST MESSAGE
     */
    let toastTimeout = null;
    function showToast(code, message) {
      if (toastTimeout) clearTimeout(toastTimeout);
      els.toastCode.textContent = code;
      els.toastBox.classList.add('show');
      toastTimeout = setTimeout(() => {
        els.toastBox.classList.remove('show');
      }, 3000);
    }

    /**
     * COPY TO CLIPBOARD WITH FALLBACK
     */
    function copyToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand('copy');
          document.body.removeChild(textarea);
          return Promise.resolve();
        } catch (err) {
          document.body.removeChild(textarea);
          return Promise.reject(err);
        }
      }
    }

    /**
     * LOAD DATA FROM APPS SCRIPT OR LOCAL MOCK
     */
    function loadData() {
      state.isLoading = true;
      els.loadingBox.style.display = 'flex';
      els.voucherList.style.display = 'none';
      els.emptyState.style.display = 'none';
      els.syncDot.className = 'sync-dot updating';
      els.syncText.textContent = 'Đang tải...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        // Môi trường Google Apps Script thật
        google.script.run
          .withSuccessHandler(onDataLoaded)
          .withFailureHandler(onDataError)
          .getSheetData();
      } else {
        // Chế độ mô phỏng kiểm thử trình duyệt
        console.warn('Google Script Run not detected. Loading local test data...');
        setTimeout(() => {
          onDataLoaded(getMockData());
        }, 300);
      }
    }

    function onDataLoaded(res) {
      state.isLoading = false;
      els.loadingBox.style.display = 'none';
      els.syncDot.className = 'sync-dot';
      els.syncText.textContent = 'Đã kết nối Sheet';

      if (!res || !res.success) {
        showError('Không thể đọc dữ liệu: ' + (res ? res.message : 'Lỗi không xác định'));
        return;
      }

      state.items = res.items || [];
      state.dates = res.dates || [];
      state.products = res.products || [];

      els.sheetInfo.textContent = 'Trang tính: ' + (res.sheetName || 'PMH') + ' (' + state.items.length + ' phiếu)';
      els.totalCouponsBadge.textContent = state.items.length + ' phiếu • PMH Event';

      populateDates();
      renderVouchers();
    }

    function onDataError(err) {
      state.isLoading = false;
      els.loadingBox.style.display = 'none';
      els.syncDot.className = 'sync-dot updating';
      els.syncText.textContent = 'Lỗi kết nối';
      showError('Lỗi kết nối Google Sheet: ' + err);
    }

    function showError(msg) {
      els.emptyState.style.display = 'block';
      els.emptyTitle = 'Đã có lỗi xảy ra';
      els.emptyDesc.textContent = msg;
    }

    /**
     * POPULATE DATES DROPDOWN
     */
    function populateDates() {
      els.dateSelect.innerHTML = '';

      if (state.dates.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Không có dữ liệu ngày';
        els.dateSelect.appendChild(opt);
        return;
      }

      // Tùy chọn tất cả các ngày
      const allOpt = document.createElement('option');
      allOpt.value = 'ALL';
      allOpt.textContent = '🌟 Tất cả các ngày (' + state.dates.length + ' ngày)';
      els.dateSelect.appendChild(allOpt);

      // Thêm từng ngày
      state.dates.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = '📅 Ngày ' + d;
        els.dateSelect.appendChild(opt);
      });

      // Mặc định: kiểm tra ngày hôm nay
      const now = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const todayStr = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear();

      if (state.dates.includes(todayStr)) {
        state.selectedDate = todayStr;
      } else if (!state.selectedDate || !state.dates.includes(state.selectedDate)) {
        // Nếu không có hôm nay, chọn ngày đầu tiên
        state.selectedDate = state.dates[0];
      }

      els.dateSelect.value = state.selectedDate;
    }

    /**
     * FILTER & RENDER VOUCHERS
     */
    function renderVouchers() {
      const queryClean = boDauTiengViet(state.searchQuery);
      const selDate = state.selectedDate;
      const statusFilt = state.statusFilter;

      // 1. Lọc theo Ngày trước để tính số liệu của ngày đang xem
      const dateItems = state.items.filter(item => {
        if (!selDate || selDate === 'ALL') return true;
        return item.date === selDate;
      });

      // Cập nhật đếm trạng thái cho ngày đang xem
      const totalCount = dateItems.length;
      const availCount = dateItems.filter(i => !i.isUsed).length;
      const usedCount = dateItems.filter(i => i.isUsed).length;

      els.countAll.textContent = totalCount;
      els.countAvail.textContent = availCount;
      els.countUsed.textContent = usedCount;

      els.statAvail.textContent = availCount;
      els.statUsed.textContent = usedCount;

      const pct = totalCount > 0 ? Math.round((usedCount / totalCount) * 100) : 0;
      els.progressBar.style.width = pct + '%';

      // 2. Lọc tiếp theo từ khóa tìm kiếm và tab trạng thái
      const filtered = dateItems.filter(item => {
        // Lọc trạng thái
        if (statusFilt === 'available' && item.isUsed) return false;
        if (statusFilt === 'used' && !item.isUsed) return false;

        // Lọc từ khóa tìm kiếm (tên sản phẩm, mã phiếu, rawText)
        if (queryClean) {
          const prodClean = boDauTiengViet(item.product);
          const codeClean = boDauTiengViet(item.code);
          const rawClean = boDauTiengViet(item.rawText);
          const matchProd = prodClean.indexOf(queryClean) !== -1;
          const matchCode = codeClean.indexOf(queryClean) !== -1;
          const matchRaw = rawClean.indexOf(queryClean) !== -1;
          if (!matchProd && !matchCode && !matchRaw) return false;
        }

        return true;
      });

      // 3. Render giao diện
      if (filtered.length === 0) {
        els.voucherList.style.display = 'none';
        els.emptyState.style.display = 'block';
        if (queryClean) {
          els.emptyDesc.textContent = 'Không tìm thấy sản phẩm nào khớp với từ khóa "' + state.searchQuery + '".';
        } else {
          els.emptyDesc.textContent = 'Không có phiếu nào trong mục lọc này.';
        }
        return;
      }

      els.emptyState.style.display = 'none';
      els.voucherList.style.display = 'flex';
      els.voucherList.innerHTML = '';

      filtered.forEach(item => {
        const card = createVoucherCard(item);
        els.voucherList.appendChild(card);
      });
    }

    /**
     * CREATE VOUCHER CARD ELEMENT
     */
    function createVoucherCard(item) {
      const card = document.createElement('div');
      card.className = 'voucher-card' + (item.isUsed ? ' is-used' : '');
      card.id = 'card-row-' + item.rowIndex;

      // Highlight keyword in product title
      let titleHtml = escapeHtml(item.product);
      if (state.searchQuery.trim()) {
        const q = state.searchQuery.trim();
        const regex = new RegExp('(' + escapeRegex(q) + ')', 'gi');
        titleHtml = titleHtml.replace(regex, '<mark>$1</mark>');
      }

      // Tag phiếu (vd: Mã 1, Mã 2...)
      const tagHtml = item.voucherNum ? '<span class="voucher-tag">' + escapeHtml(item.voucherNum) + '</span>' : '';

      // Trạng thái badge
      let statusHtml = '';
      if (item.isUsed) {
        statusHtml = '<span class="status-badge used"><span>⚫</span> <span>Đã dùng' + (item.usedTime ? ' (' + formatShortTime(item.usedTime) + ')' : '') + '</span></span>';
      } else {
        statusHtml = '<span class="status-badge available"><span>🟢</span> <span>Chưa dùng</span></span>';
      }

      // Action button
      let actionButtonsHtml = '';
      if (!item.isUsed) {
        actionButtonsHtml = \`
          <button class="btn-copy" onclick="handleCopyAndMark(\${item.rowIndex}, '\${item.code}')">
            <span>📋</span> <span>Sao chép</span>
          </button>
        \`;
      } else {
        actionButtonsHtml = \`
          <button class="btn-copy-again" onclick="handleCopyAgain('\${item.code}')" title="Sao chép lại mã">
            <span>📋</span> <span>Sao chép lại</span>
          </button>
          <button class="btn-undo" onclick="handleUndo(\${item.rowIndex})" title="Bỏ đánh dấu đã sử dụng">
            <span>↩️</span> <span>Hoàn tác</span>
          </button>
        \`;
      }

      card.innerHTML = \`
        <div class="card-header-row">
          <div class="product-title">\${titleHtml}</div>
          <div style="display: flex; align-items: center; gap: 6px;">
            \${tagHtml}
          </div>
        </div>

        <div class="code-action-row">
          <div class="code-box-group">
            <span class="voucher-code" id="code-\${item.rowIndex}">\${item.code}</span>
            \${statusHtml}
          </div>
          <div class="card-actions">
            \${actionButtonsHtml}
          </div>
        </div>
      \`;

      return card;
    }

    /**
     * COPY CODE AND MARK AS USED
     */
    window.handleCopyAndMark = function(rowIndex, code) {
      // 1. Copy to clipboard
      copyToClipboard(code).then(() => {
        showToast(code, 'Đã sao chép và đánh dấu đã dùng!');
      }).catch(() => {
        showToast(code, 'Đã sao chép mã!');
      });

      // 2. Cập nhật state nội bộ ngay lập tức để UI phản hồi tức thì
      const item = state.items.find(i => i.rowIndex === rowIndex);
      if (item) {
        item.isUsed = true;
        const now = new Date();
        const pad = (n) => (n < 10 ? '0' + n : n);
        item.usedTime = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      }

      // 3. Render lại danh sách
      renderVouchers();

      // 4. Gửi lệnh cập nhật về Google Sheet
      els.syncDot.className = 'sync-dot updating';
      els.syncText.textContent = 'Đang lưu Sheet...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler((res) => {
            els.syncDot.className = 'sync-dot';
            els.syncText.textContent = 'Đã kết nối Sheet';
          })
          .withFailureHandler((err) => {
            els.syncDot.className = 'sync-dot updating';
            els.syncText.textContent = 'Lỗi lưu';
            console.error('Lỗi cập nhật dòng ' + rowIndex + ':', err);
          })
          .markVoucher(rowIndex, true);
      } else {
        setTimeout(() => {
          els.syncDot.className = 'sync-dot';
          els.syncText.textContent = 'Đã kết nối Sheet';
        }, 300);
      }
    };

    /**
     * COPY AGAIN (FOR ALREADY USED VOUCHER)
     */
    window.handleCopyAgain = function(code) {
      copyToClipboard(code).then(() => {
        showToast(code, 'Đã sao chép lại mã!');
      });
    };

    /**
     * UNDO / UNMARK VOUCHER
     */
    window.handleUndo = function(rowIndex) {
      const item = state.items.find(i => i.rowIndex === rowIndex);
      if (!item) return;

      item.isUsed = false;
      item.usedTime = '';

      renderVouchers();

      els.syncDot.className = 'sync-dot updating';
      els.syncText.textContent = 'Đang cập nhật...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(() => {
            els.syncDot.className = 'sync-dot';
            els.syncText.textContent = 'Đã kết nối Sheet';
          })
          .withFailureHandler(() => {
            els.syncDot.className = 'sync-dot updating';
            els.syncText.textContent = 'Lỗi lưu';
          })
          .markVoucher(rowIndex, false);
      } else {
        setTimeout(() => {
          els.syncDot.className = 'sync-dot';
          els.syncText.textContent = 'Đã kết nối Sheet';
        }, 300);
      }
    };

    /**
     * HELPERS
     */
    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function escapeRegex(string) {
      return string.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    }

    function formatShortTime(timeStr) {
      if (!timeStr) return '';
      // Nếu có định dạng dd/MM/yyyy HH:mm:ss -> hiển thị HH:mm
      const parts = timeStr.split(' ');
      if (parts.length >= 2) {
        const tParts = parts[1].split(':');
        if (tParts.length >= 2) return tParts[0] + ':' + tParts[1];
      }
      return timeStr;
    }

    /**
     * EVENT LISTENERS
     */
    // Date Select Change
    els.dateSelect.addEventListener('change', (e) => {
      state.selectedDate = e.target.value;
      renderVouchers();
    });

    // Date Previous Button
    els.btnPrevDate.addEventListener('click', () => {
      const curIdx = state.dates.indexOf(state.selectedDate);
      if (curIdx > 0) {
        state.selectedDate = state.dates[curIdx - 1];
        els.dateSelect.value = state.selectedDate;
        renderVouchers();
      }
    });

    // Date Next Button
    els.btnNextDate.addEventListener('click', () => {
      const curIdx = state.dates.indexOf(state.selectedDate);
      if (curIdx !== -1 && curIdx < state.dates.length - 1) {
        state.selectedDate = state.dates[curIdx + 1];
        els.dateSelect.value = state.selectedDate;
        renderVouchers();
      }
    });

    // Today Button
    els.btnToday.addEventListener('click', () => {
      const now = new Date();
      const pad = (n) => (n < 10 ? '0' + n : n);
      const todayStr = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear();
      if (state.dates.includes(todayStr)) {
        state.selectedDate = todayStr;
      } else {
        state.selectedDate = state.dates[0] || 'ALL';
      }
      els.dateSelect.value = state.selectedDate;
      renderVouchers();
    });

    // Search Input Typing (Real-time live search)
    els.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      els.btnClearSearch.style.display = state.searchQuery ? 'flex' : 'none';
      renderVouchers();
    });

    // Clear Search Button
    els.btnClearSearch.addEventListener('click', () => {
      state.searchQuery = '';
      els.searchInput.value = '';
      els.btnClearSearch.style.display = 'none';
      els.searchInput.focus();
      renderVouchers();
    });

    // Filter Tabs
    els.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        els.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.statusFilter = tab.getAttribute('data-status');
        renderVouchers();
      });
    });

    // Refresh Button
    els.btnRefresh.addEventListener('click', () => {
      loadData();
    });

    // Initial load
    document.addEventListener('DOMContentLoaded', () => {
      loadData();
    });

    /**
     * MOCK DATA GENERATOR (CHO MÔ PHỎNG PREVIEW TRÌNH DUYỆT)
     */
    function getMockData() {
      const rawSample = [
        { date: "18/09/2026", row: 3, num: "1", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "BWULE4JY86", used: false },
        { date: "18/09/2026", row: 5, num: "2", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "RJR7KV16UI", used: false },
        { date: "18/09/2026", row: 7, num: "3", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "489ZF7O3LH", used: true, time: "18/09/2026 10:15:00" },
        { date: "18/09/2026", row: 71, num: "1", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "BEUYJ75PL7", used: false },
        { date: "18/09/2026", row: 73, num: "2", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "PGGKMY36AF", used: false },
        { date: "18/09/2026", row: 75, num: "3", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "TPP66BFZ9S", used: false },
        { date: "18/09/2026", row: 131, num: "1", prod: "Bếp điện từ đơn Kangaroo KG20IH10N", code: "S4Y8QLMPCC", used: false },
        { date: "18/09/2026", row: 191, num: "1", prod: "Nồi cơm điện tử Toshiba RC-18DH2PV(W) 1.8L", code: "BTHNQLBZUL", used: false },
        { date: "18/09/2026", row: 251, num: "1", prod: "Nồi chiên không dầu Kangaroo 6.5L KGAF65M1G", code: "TR1PKYZU3VYL", used: false },
        { date: "18/09/2026", row: 311, num: "1", prod: "Quạt đứng Midea FS40-24EVN(K)", code: "663RJ6T1UQ", used: false },
        { date: "18/09/2026", row: 371, num: "1", prod: "Máy lọc không khí Midea KJ400GVN", code: "BVVJFB5MKI", used: false },
        { date: "18/09/2026", row: 431, num: "1", prod: "Nồi lẩu đa năng Kangaroo KG40EH2 4 lít", code: "K5HWP3NU3X", used: false },
        { date: "18/09/2026", row: 491, num: "1", prod: "Bình đun siêu tốc Rapido RK2015-C 2L", code: "9SSUY9LBZ3", used: false },
        { date: "18/09/2026", row: 551, num: "1", prod: "Máy xay thịt Bear CH-5H03P36", code: "1AZXD2GVAZ", used: false },
        { date: "18/09/2026", row: 611, num: "1", prod: "Bếp nướng điện Sunhouse SHD4607", code: "GKLA190PE2", used: false },
        // Ngày 19/09
        { date: "19/09/2026", row: 9, num: "1", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "LFJJSXD6X3", used: false },
        { date: "19/09/2026", row: 11, num: "2", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "MXJY1VM5F0", used: false },
        { date: "19/09/2026", row: 13, num: "3", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "JVCU9MQL9A", used: false },
        { date: "19/09/2026", row: 77, num: "1", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "2CFYYVOK3V", used: false },
        { date: "19/09/2026", row: 79, num: "2", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "90WCCXHY6M", used: false },
        { date: "19/09/2026", row: 81, num: "3", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "205MJ5MK9X", used: false },
        // Ngày 22/09 (hôm nay)
        { date: "22/09/2026", row: 35, num: "1", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "LX67OUUZ87", used: false },
        { date: "22/09/2026", row: 37, num: "2", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "922M517XN5", used: false },
        { date: "22/09/2026", row: 39, num: "3", prod: "Bếp gas đôi Sunhouse SHB3105MD", code: "JE105Y0G71", used: false },
        { date: "22/09/2026", row: 95, num: "1", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "DQ65AOZ3K9", used: false },
        { date: "22/09/2026", row: 97, num: "2", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "JQUBMMH5KL", used: false },
        { date: "22/09/2026", row: 99, num: "3", prod: "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L", code: "BND0RWLRA0", used: false },
        { date: "22/09/2026", row: 155, num: "1", prod: "Bếp điện từ đơn Kangaroo KG20IH10N", code: "0IBW1Z2MII", used: false },
        { date: "22/09/2026", row: 215, num: "1", prod: "Nồi cơm điện tử Toshiba RC-18DH2PV(W) 1.8L", code: "W50ERLMLM2", used: false },
        { date: "22/09/2026", row: 275, num: "1", prod: "Nồi chiên không dầu Kangaroo 6.5L KGAF65M1G", code: "FE8HW1QHRA4J", used: false },
        { date: "22/09/2026", row: 335, num: "1", prod: "Quạt đứng Midea FS40-24EVN(K)", code: "OCGARYRQVG", used: false },
        { date: "22/09/2026", row: 395, num: "1", prod: "Máy lọc không khí Midea KJ400GVN", code: "N7R89S33J3", used: false },
        { date: "22/09/2026", row: 455, num: "1", prod: "Nồi lẩu đa năng Kangaroo KG40EH2 4 lít", code: "XNHVR17SD8", used: false },
        { date: "22/09/2026", row: 515, num: "1", prod: "Bình đun siêu tốc Rapido RK2015-C 2L", code: "SYFKHQ93RS", used: false },
        { date: "22/09/2026", row: 575, num: "1", prod: "Máy xay thịt Bear CH-5H03P36", code: "56JOI110QW", used: false },
        { date: "22/09/2026", row: 635, num: "1", prod: "Bếp nướng điện Sunhouse SHD4607", code: "BYLEFLV1V9", used: false }
      ];

      const dates = ["18/09/2026", "19/09/2026", "20/09/2026", "21/09/2026", "22/09/2026", "23/09/2026", "24/09/2026", "25/09/2026", "26/09/2026", "27/09/2026"];
      const products = [
        "Bình đun siêu tốc Rapido RK2015-C 2L",
        "Bếp gas đôi Sunhouse SHB3105MD",
        "Bếp nướng điện Sunhouse SHD4607",
        "Bếp điện từ đơn Kangaroo KG20IH10N",
        "Máy lọc không khí Midea KJ400GVN",
        "Máy xay thịt Bear CH-5H03P36",
        "Nồi chiên không dầu Kangaroo 6.5L KGAF65M1G",
        "Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L",
        "Nồi cơm điện tử Toshiba RC-18DH2PV(W) 1.8L",
        "Nồi lẩu đa năng Kangaroo KG40EH2 4 lít",
        "Quạt đứng Midea FS40-24EVN(K)"
      ];

      return {
        success: true,
        sheetName: "PMH",
        dates: dates,
        products: products,
        items: rawSample.map(s => ({
          rowIndex: s.row,
          date: s.date,
          voucherNum: "Mã " + s.num,
          product: s.prod,
          code: s.code,
          isUsed: s.used,
          usedTime: s.time || '',
          rawText: "Ngày " + s.date + " : Mã Phiếu mua hàng " + s.num + " - dùng cho " + s.prod + ": " + s.code
        }))
      };
    }
  </script>
</body>
</html>
`;
