# AI Answer Extension

Tiện ích mở rộng Chrome/Edge giúp **chụp ảnh màn hình** và nhận **câu trả lời từ AI** tự động. Hoạt động theo mô hình Client–Server: Extension giao tiếp với Backend Python để xử lý ảnh và gọi AI.

---

## Cấu trúc dự án

```
cheat-extension/
├── src/                    # Extension Frontend (TypeScript + Vite)
│   ├── popup.ts/html/css   # Popup chính của extension
│   ├── content.ts/css      # Content script chạy trên trang web
│   ├── background.ts       # Service worker của extension
│   └── options.ts/html/css # Trang cài đặt
├── backend/                # Backend Python (FastAPI)
│   ├── main.py             # Entry point, định nghĩa API routes
│   ├── vision_service.py   # Gọi Gemini Vision API để OCR ảnh
│   ├── requirements.txt
│   ├── .env                # Chứa API keys (không commit lên git)
│   └── agent/
│       ├── core.py         # Agent logic + API Key Queue
│       ├── tools.py        # Tools: calculate, search_web, get_time
│       └── prompts.py      # System prompts
└── dist/                   # Extension đã build (load vào trình duyệt)
```

---

## Luồng xử lý

```
Extension (chụp ảnh)
    → POST /analyze (base64 image)
    → vision_service.py  →  Gemini Vision API  (OCR text từ ảnh)
    → Agent (core.py)    →  Gemini Flash       (suy luận + gọi tools)
    → Trả kết quả về Extension
```

---

## 1. Yêu cầu hệ thống

- **Node.js** ≥ 18 (để build Extension)
- **Python** ≥ 3.8 (để chạy Backend)
- **Google Gemini API Key** (bắt buộc) – lấy tại [aistudio.google.com](https://aistudio.google.com)
- *(Tùy chọn)* **Tavily API Key** – nếu dùng tính năng tìm kiếm web

---

## 2. Cài đặt & Chạy Backend

### 2.1. Tạo môi trường ảo và cài thư viện

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2.2. Cấu hình API Keys (`.env`)

Tạo file `backend/.env` dựa theo `.env.example`:

```env
# === BẮT BUỘC ===
GEMINI_API_KEY=AIzaSy...key_chinh...

# === NHIỀU KEY GEMINI (tránh giới hạn RPM) ===
# Agent sẽ luân phiên dùng các key này tự động
GEMINI_API_KEY_1=AIzaSy...key_2...
GEMINI_API_KEY_2=AIzaSy...key_3...
# Thêm bao nhiêu key tùy ý (GEMINI_API_KEY_3, _4, ...)

# === TÙY CHỌN ===
TAVILY_API_KEY=tvly-...   # Dùng tool tìm kiếm web
```

> **Lưu ý về API Key Queue:** Agent sẽ tự động phát hiện tất cả key có dạng `GEMINI_API_KEY`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`,... và dùng luân phiên sau mỗi lần gọi, giúp tránh lỗi **429 Too Many Requests** của Google.

### 2.3. Khởi chạy Server

```bash
# Từ thư mục backend/
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Server chạy tại: `http://localhost:8000`

**API Endpoints:**

| Method | Endpoint   | Mô tả                            |
|--------|------------|----------------------------------|
| GET    | `/health`  | Kiểm tra server đang hoạt động   |
| POST   | `/analyze` | Nhận ảnh base64, trả lời từ AI   |

---

## 3. Build Extension (Frontend)

```bash
# Từ thư mục root của dự án
npm install

# Build production (tạo thư mục dist/)
npm run build
```

---

## 4. Cài Extension lên trình duyệt

1. Mở trình duyệt, truy cập:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
2. Bật **Developer mode** (góc trên phải).
3. Nhấn **Load unpacked** → chọn thư mục `dist/`.
4. Ghim Extension lên thanh công cụ.

---

## 5. Sử dụng

1. **Kiểm tra kết nối:** Mở extension → vào **Settings** → nhấn **Test Connection**.  
   Đảm bảo backend đang chạy ở `http://localhost:8000`.
2. **Phân tích ảnh:** Chụp màn hình hoặc chọn vùng → Extension gửi ảnh lên backend → AI trả lời.
