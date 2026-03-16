# AI Answer Extension

Đây là tiện ích mở rộng (Chrome/Edge Extension) giúp chụp ảnh màn hình và nhận câu trả lời từ AI. Dự án hoạt động theo mô hình Client-Server, trong đó Extension (Client) sẽ giao tiếp với một Backend nội bộ (Server) được viết bằng Python.

## Cấu trúc dự án
- **Root (`/`)**: Mã nguồn Frontend của tiện ích mở rộng (được xây dựng bằng Vite, TypeScript).
- **`backend/`**: Mã nguồn Backend API AI (được xây dựng bằng Python, FastAPI, xử lý các mô hình AI như Gemini, OpenAI, Claude).

---

## 1. Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:
- **Node.js** (Phiên bản 18 trở lên) để build Extension.
- **Python** (Phiên bản 3.8 trở lên) để chạy Server backend.
- Cấu hình **API Keys** hợp lệ (Google Gemini / OpenAI / Anthropic).

---

## 2. Hướng dẫn cài đặt và chạy Backend (Python API)

Backend có nhiệm vụ tiếp nhận yêu cầu từ extension, giao tiếp với các mô hình ngôn ngữ lớn (LLM) và trả về kết quả.

1. **Di chuyển vào thư mục backend:**
   ```bash
   cd backend
   ```

2. **(Tùy chọn) Tạo và kích hoạt môi trường ảo (Virtual Environment):**
   ```bash
   python -m venv .venv
   
   # Windows
   .venv\Scripts\activate
   # macOS/Linux
   source .venv/bin/activate
   ```

3. **Cài đặt các thư viện phụ thuộc:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Thiết lập biến môi trường (.env):**
   - Đảm bảo bạn đã có tệp `.env` bên trong thư mục `backend/` với các thông tin API keys, ví dụ:
     ```env
     GEMINI_API_KEY=your_gemini_api_key_here
     # (Thêm các key khác nếu có)
     ```

5. **Khởi chạy Server Backend:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Server sẽ chạy ở địa chỉ `http://localhost:8000`.*

---

## 3. Hướng dẫn Build Extension (Frontend Vite)

1. **Từ thư mục gốc (root) của dự án, cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Biên dịch mã nguồn (Build Extension):**
   ```bash
   # Dùng lệnh này để build ra sản phẩm dùng trực tiếp
   npm run build
   
   # HOẶC, nếu bạn đang dev và muốn code tự reload khi lưu:
   npm run dev
   ```
   *Sau khi build thành công, mã nguồn extension sẽ nằm ở thư mục `dist/`.*

---

## 4. Hướng dẫn cài đặt Extension lên trình duyệt (Chrome/Edge)

1. Mở trình duyệt và truy cập trang quản lý extension:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
2. Bật chế độ **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
3. Nhấn vào nút **Load unpacked** (Tải tiện ích đã giải nén).
4. Chọn thư mục `dist` nằm trong thư mục gốc của dự án này.
5. Cấp quyền hoặc ghim Extension trên thanh công cụ để dễ dàng sử dụng.

---

## 5. Hướng dẫn sử dụng

1. **Test kết nối:** Khi mở Extension, hãy vào phần Cài đặt và nhấn nút **Test Connection** để đảm bảo Frontend đã kết nối thành công với Backend (đang chạy ở port 8000).
2. **Sử dụng AI:** Sau khi kết nối thành công, bạn có thể sử dụng các chức năng của extension (chụp màn hình, gửi ảnh/câu hỏi lên AI) ngay trên các trang web mong muốn. Backend sẽ xử lý và trả về câu trả lời.
