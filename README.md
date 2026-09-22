# 🏷️ Hệ Thống Tra Cứu Mã Phiếu Mua Hàng - Siêu Thị 1841

> Ứng dụng tra cứu mã phiếu mua hàng 10 ký tự, kết nối trực tiếp với [Google Spreadsheet: 1841 - PHIẾU MUA HÀNG EVENT](https://docs.google.com/spreadsheets/d/17rloLx_U9GhO_QNdpfhsMNEzKnMzCVli9sieVRlmKDU/edit?usp=sharing).

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=flat&logo=google-sheets&logoColor=white)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-222222?style=flat&logo=github&logoColor=white)

---

## 🚀 Tính Năng Chính

1. **Kết Nối Trực Tiếp Google Sheet**:
   - Dữ liệu được đồng bộ trực tiếp theo thời gian thực từ [1841 - PHIẾU MUA HÀNG EVENT](https://docs.google.com/spreadsheets/d/17rloLx_U9GhO_QNdpfhsMNEzKnMzCVli9sieVRlmKDU/edit?usp=sharing) bằng Google Sheets Visualization API.
   - Có nút **"📊 Mở Sheet"** mở trực tiếp trang tính Google Sheet gốc.
2. **Lọc Theo Ngày Thông Minh**:
   - Chọn ngày nhanh chóng qua dropdown danh sách ngày sự kiện (từ `18/09/2026` đến `27/09/2026`).
   - Nút chuyển ngày `◀`, `▶` và nút `Hôm nay`.
3. **Tìm Kiếm Tức Thì Không Dấu (Live Search)**:
   - Gõ 1 vài ký tự tên sản phẩm (không cần gõ dấu tiếng Việt):
     - `bep ga` ➔ *Bếp gas đôi Sunhouse SHB3105MD*
     - `noi com` ➔ *Nồi cơm nắp gài Toshiba* & *Nồi cơm điện tử Toshiba*
     - `rapido` ➔ *Bình đun siêu tốc Rapido*
     - `bear` ➔ *Máy xay thịt Bear*
     - `midea` ➔ *Quạt đứng Midea* & *Máy lọc không khí Midea*
     - `kangaroo` ➔ *Bếp điện từ Kangaroo*, *Nồi chiên Kangaroo*, *Nồi lẩu Kangaroo*...
4. **Nút "Sao Chép" 1-Click**:
   - Click là tự động copy mã phiếu vào Clipboard máy tính / điện thoại.
   - Tự động đánh dấu trạng thái "Đã sử dụng" và lưu trữ cục bộ.
   - Khi kết hợp với Google Apps Script Web App, tự động tick Checkbox ở Cột B và ghi nhận thời gian vào Cột C trên Google Sheet.
   - Hỗ trợ nút **"Hoàn tác"** nếu bấm nhầm.

---

## 📂 Cấu Trúc Thư Mục

```text
├── index.html          # Giao diện Web App chạy trên GitHub Pages (kết nối trực tiếp Google Sheet)
├── Code.gs             # Mã nguồn Google Apps Script (All-In-One chạy trực tiếp trên Google Sheet)
├── HD_CaiDat.md        # Hướng dẫn chi tiết cài đặt và sử dụng
└── README.md           # Tài liệu dự án
```

---

## 🌐 Triển Khai Lên GitHub Pages

1. Vào repository trên GitHub của bạn.
2. Chọn tab **Settings** ➔ **Pages**.
3. Tại mục **Build and deployment** / **Branch**:
   - Chọn nhánh: `main`.
   - Chọn thư mục: `/ (root)`.
   - Bấm **Save**.
4. Sau 1-2 phút, bạn sẽ nhận được đường link Web App công khai:
   `https://[username].github.io/[repo-name]/`

---

## 📊 Liên Kết Trực Tiếp Google Sheet
- **Trang tính gốc:** [1841 - PHIẾU MUA HÀNG EVENT](https://docs.google.com/spreadsheets/d/17rloLx_U9GhO_QNdpfhsMNEzKnMzCVli9sieVRlmKDU/edit?usp=sharing)
- **Sheet ID:** `17rloLx_U9GhO_QNdpfhsMNEzKnMzCVli9sieVRlmKDU`
