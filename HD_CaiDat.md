# HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG HỆ THỐNG TRA CỨU PHIẾU MUA HÀNG (PMH)

Dành cho Google Spreadsheet: **[1841 - PHIẾU MUA HÀNG EVENT](https://docs.google.com/spreadsheets/d/17rloLx_U9GhO_QNdpfhsMNEzKnMzCVli9sieVRlmKDU/edit?usp=sharing)**

---

## BƯỚC 1: MỞ TRÌNH SOẠN THẢO APPS SCRIPT TRÊN GOOGLE SHEETS
1. Mở file Google Sheet **1841 - PHIẾU MUA HÀNG EVENT**.
2. Trên thanh menu trên cùng của Google Sheets, chọn: **Tiện ích mở rộng (Extensions)** ➔ **Apps Script**.
3. Một tab mới sẽ mở ra trình soạn thảo mã nguồn Google Apps Script.

---

## BƯỚC 2: DÁN MÃ NGUỒN VÀO APPS SCRIPT

### 1. File `Code.gs`:
- Ở cột danh sách tệp bên trái, bạn bấm vào file **`Code.gs`** có sẵn.
- Xóa toàn bộ nội dung mặc định và copy toàn bộ nội dung trong tệp [Code.gs](file:///Users/linhvu/.gemini/antigravity-ide/scratch/google-apps-script-pmh/Code.gs) dán vào.
- Bấm biểu tượng **Lưu (Save)** 💾 (hoặc nhấn `Ctrl + S` / `Cmd + S`).

### 2. Tạo File `Index.html`:
- Bên cạnh chữ **Tệp (Files)** ở cột bên trái, bấm vào dấu **➕** ➔ Chọn **HTML**.
- Đặt tên file là **`Index`** (hệ thống sẽ tự thêm đuôi `.html` thành `Index.html`).
- Xóa toàn bộ nội dung mặc định và copy toàn bộ nội dung trong tệp [Index.html](file:///Users/linhvu/.gemini/antigravity-ide/scratch/google-apps-script-pmh/Index.html) dán vào.
- Bấm biểu tượng **Lưu (Save)** 💾.

---

## BƯỚC 3: CẤP QUYỀN & CHẠY LẦN ĐẦU TIÊN
1. Tại giao diện Apps Script, ở thanh công cụ phía trên (chỗ có ô chọn hàm), chọn hàm **`onOpen`** hoặc **`showSidebar`**.
2. Nhấn nút **Chạy (Run)** ▶️.
3. Google sẽ hiện hộp thoại yêu cầu cấp quyền:
   - Chọn **Xem lại quyền (Review Permissions)**.
   - Chọn tài khoản Google của bạn.
   - Nếu thấy cảnh báo *"Google chưa xác minh ứng dụng này"*, bạn bấm vào **Nâng cao (Advanced)** ➔ Chọn **Đi tới [Tên dự án] (không an toàn)**.
   - Nhấn **Cho phép (Allow)**.
4. Quay trở lại tab Google Sheets:
   - Bạn sẽ thấy một Menu mới xuất hiện trên thanh công cụ: **🏷️ Tra Cứu Phiếu Mua Hàng**.
   - Bấm vào mục **⚡ Cài đặt Cột Checkbox & Định dạng Sheet**: Hệ thống sẽ tự động tạo tiêu đề **"ĐÃ SỬ DỤNG"** ở Cột B và **"THỜI GIAN SỬ DỤNG"** ở Cột C, đồng thời chèn sẵn Checkbox vào tất cả các dòng phiếu!

---

## BƯỚC 4: SỬ DỤNG FORM TRA CỨU

### Cách 1: Mở dạng Sidebar bên phải màn hình (Tiện lợi nhất)
- Bấm menu: **🏷️ Tra Cứu Phiếu Mua Hàng** ➔ **🔍 Mở Form Tra Cứu (Sidebar bên phải)**.
- Form sẽ mở ở cột bên phải, bạn vừa nhìn bảng tính vừa tìm kiếm và bấm copy rất nhanh!

### Cách 2: Mở dạng Cửa sổ lớn (Modal Dialog)
- Bấm menu: **🏷️ Tra Cứu Phiếu Mua Hàng** ➔ **🖥️ Mở Form Tra Cứu (Cửa sổ lớn Dialog)**.
- Màn hình rộng rãi, tập trung tra cứu nhiều sản phẩm.

### Cách 3: Triển khai Web App (Dành cho nhân viên mở trên điện thoại/máy tính bảng)
1. Trong Apps Script, bấm nút **Triển khai (Deploy)** ở góc trên bên phải ➔ **Triển khai mới (New deployment)**.
2. Nhấn biểu tượng bánh răng ⚙️ ➔ Chọn **Ứng dụng web (Web app)**.
3. Cấu hình:
   - **Mô tả**: Form Tra Cứu PMH Siêu Thị.
   - **Thực thi dưới dạng**: *Tôi (Tài khoản của bạn)*.
   - **Người có quyền truy cập**: *Bất kỳ ai (Anyone)* hoặc *Chỉ người trong tổ chức*.
4. Nhấn **Triển khai (Deploy)**.
5. Copy đường link Web App gửi cho nhân viên thu ngân mở trực tiếp trên điện thoại hoặc trình duyệt.

---

## TÍNH NĂNG NỔI BẬT ĐÃ TÍCH HỢP
1. **Lọc theo ngày thông minh**: Dropdown đầy đủ các ngày từ `18/09/2026` đến `27/09/2026` và nút chuyển ngày nhanh hoặc bấm "Hôm nay".
2. **Tìm kiếm tức thì không cần dấu**: Gõ `bep ga`, `noi com`, `rapido`, `bear`, `sunhouse`, `midea`... kết quả lọc ra ngay lập tức.
3. **Nút "Sao chép" 1-Click**:
   - Tự động copy mã 10 ký tự vào Clipboard của máy.
   - Đánh dấu tick `TRUE` vào Cột B trên Google Sheet.
   - Ghi nhận thời gian sử dụng vào Cột C.
   - Gạch ngang và làm mờ dòng ở Cột A trên Sheet.
   - Có nút **"Hoàn tác"** nếu lỡ bấm nhầm.
4. **Bộ đếm tiến độ**: Thống kê số phiếu còn lại, số phiếu đã dùng và thanh tiến độ trực quan trong ngày.
5. **Hỗ trợ Sheet "PMH2" (Cấp theo User 43751 & 7721)**:
   - **Mã hoá mã phiếu thành dấu `*`**: Mã phiếu được bảo mật dưới dạng `**********` với nút mắt 👁️ để xem/ẩn.
   - **Ghi nhận sử dụng tự động**: Khi bấm "Sao chép", mã thực được copy vào clipboard, tự động ghi nhận trạng thái "Đã sử dụng" lên Google Sheet (Cột B: TRUE, Cột C: Thời gian sử dụng, Cột D: User) để thống kê chính xác số phiếu đã dùng và chưa dùng.
   - **Nút Dán dữ liệu PMH2 (Dạng ẩn/hiện)**: Bấm nút "📝 Dán Dữ Liệu PMH2 & Lưu Sheet ▾" để mở khung dán nội dung từ bot, chọn chế độ (Thêm tiếp Append hoặc Ghi đè Overwrite) và bấm "💾 Lưu Ngược Về Sheet PMH2" để cập nhật trực tiếp lên Google Sheets.
   - **Thống kê & Bộ lọc trạng thái**: Dễ dàng lọc và theo dõi theo từng nhân viên (43751 Linh / 7721 Hoa), loại phiếu (ICT / MM) và trạng thái (Khả dụng / Đã dùng / Lỗi).
