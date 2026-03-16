"""
Vision Service - Xử lý gửi ảnh lên API Gemini
"""

import os
import httpx

# Check if error is quota exceeded
def _is_quota_error(error_msg: str) -> bool:
    quota_patterns = [
        'quota', 'rate limit', 'rate_limit', 'too many requests',
        '429', 'exceeded', 'limit reached', 'insufficient_quota',
        'RESOURCE_EXHAUSTED'
    ]
    lower_error = str(error_msg).lower()
    return any(p in lower_error for p in quota_patterns)


async def analyze_image(base64_image: str, system_prompt: str) -> dict:
    """
    Phân tích hình ảnh sử dụng Gemini Vision API.
    Mặc định sử dụng model gemini-2.5-flash
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"success": False, "error": "Chưa cấu hình GEMINI_API_KEY trong .env"}

    # Xóa prefix nếu có
    if base64_image.startswith("data:image"):
        base64_image = base64_image.split(",")[1]

    model = "gemini-2.5-flash"
    
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [
                    {"text": f"{system_prompt}\n\nPhân tích hình ảnh và trả lời câu hỏi."},
                    {"inline_data": {"mime_type": "image/png", "data": base64_image}}
                ]
            }]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload, timeout=60.0)
            data = response.json()
            
            if "error" in data:
                 return {"success": False, "error": data["error"]["message"], "quotaExceeded": _is_quota_error(data["error"]["message"])}
                 
            answer = data["candidates"][0]["content"]["parts"][0]["text"]
            return {"success": True, "answer": answer}
            
    except Exception as e:
        msg = str(e)
        return {"success": False, "error": msg, "quotaExceeded": _is_quota_error(msg)}
