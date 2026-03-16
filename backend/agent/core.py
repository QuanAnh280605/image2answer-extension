"""
Agent Core - Logic chính của AI Agent

🎯 MỤC ĐÍCH:
- Nhận input từ user rồ gọi cho LLM cùng với danh sách tools
- Nếu LLM muốn gọi tool → thực thi tool → gửi kết quả lại cho LLM
- Lặp lại cho đến khi LLM có đủ thông tin để trả lời

📝 SỬ DỤNG GEMINI/OPENAI/ANTHROPIC qua Vision Service thay vì gọi Kimi/Nvidia

🔑 API KEY QUEUE:
- Load nhiều key từ env: GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...
- Luân phiên sử dụng để tránh bị giới hạn RPM (Requests Per Minute)
"""

import os
import json
import requests
from collections import deque
from .tools import TOOLS, execute_tool
from .prompts import get_prompt


def _load_api_keys() -> deque:
    """
    Load tất cả API key từ environment variables vào một deque.
    Đọc: GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...
    Bỏ qua các key trống hoặc chưa được set.
    """
    keys = []

    # Key mặc định (không có số)
    default_key = os.getenv("GEMINI_API_KEY", "").strip()
    if default_key:
        keys.append(default_key)

    # Các key có đánh số: GEMINI_API_KEY_1, GEMINI_API_KEY_2, ...
    index = 1
    while True:
        key = os.getenv(f"GEMINI_API_KEY_{index}", "").strip()
        if not key:
            break
        keys.append(key)
        index += 1

    if not keys:
        raise ValueError(
            "Không tìm thấy GEMINI_API_KEY nào trong environment. "
            "Hãy set ít nhất một key: GEMINI_API_KEY hoặc GEMINI_API_KEY_1"
        )

    return deque(keys)


class Agent:
    def __init__(self, api_key: str = None, prompt_type="default"):
        """
        Khởi tạo Agent. Mặc định gọi model Gemini qua OpenAI Compatible.

        Nếu `api_key` được truyền vào thì dùng key đó làm queue 1 phần tử.
        Nếu không, load tất cả keys từ env (GEMINI_API_KEY, GEMINI_API_KEY_1, ...).
        """
        if api_key:
            self._key_queue: deque = deque([api_key])
        else:
            self._key_queue: deque = _load_api_keys()

        self.api_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        self.model_name = "gemini-3.1-flash-lite-preview"

        self.system_prompt = get_prompt(prompt_type)
        self.tools = self._prepare_tools_openai()
        self.max_api_calls = 5
        self.context = {}

    @property
    def api_key(self) -> str:
        """Trả về API key đang được dùng (key đứng đầu queue)."""
        return self._key_queue[0]

    def _rotate_api_key(self) -> None:
        """
        Đẩy key vừa dùng về cuối queue.
        Key tiếp theo sẽ được dùng trong lần gọi API kế.
        """
        self._key_queue.rotate(-1)

    def _prepare_tools_openai(self):
        openai_tools = []
        for tool in TOOLS:
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["parameters"]
                }
            })
        return openai_tools
    
    def _call_api(self, messages: list, verbose: bool = False, stream: bool = False):
        current_key = self.api_key
        key_index = list(self._key_queue).index(current_key) + 1  # 1-based để log

        if verbose:
            print(f"   🔑 Using API key #{key_index} / {len(self._key_queue)}")

        headers = {
            "Authorization": f"Bearer {current_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": 4096,
            "temperature": 0.7,
            "top_p": 0.95,
            "stream": stream,
            "tools": self.tools if self.tools else None,
            "tool_choice": "auto"
        }

        if not self.tools:
            del payload["tools"]
            del payload["tool_choice"]

        if verbose:
            print(f"   📤 Sending to {self.model_name} (stream={stream})...")
            print(f"   📦 Request Payload: {json.dumps(payload, ensure_ascii=False, indent=2)}")

        try:
            response = requests.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=60,
                stream=stream
            )

            if verbose:
                print(f"   📥 Response Status: {response.status_code}")
                try:
                    print(f"   📄 Response Body: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
                except Exception:
                    print(f"   📄 Response Text: {response.text}")

            response.raise_for_status()

            # Rotate key sau khi gọi thành công → key vừa dùng xuống cuối queue
            self._rotate_api_key()

            if stream:
                return response.iter_lines()
            return response.json()
        except requests.exceptions.Timeout as e:
            if verbose:
                print(f"   ⏳ API Timeout Error: {e}")
            # Vẫn rotate để tránh bị kẹt tại một key bị lỗi liên tục
            self._rotate_api_key()
            raise Exception(f"API Timeout: {e}")
        except requests.exceptions.ConnectionError as e:
            if verbose:
                print(f"   🔌 API Connection Error: {e}")
            self._rotate_api_key()
            raise Exception(f"Connection Error: {e}")
        except requests.exceptions.RequestException as e:
            if verbose:
                print(f"   ❌ API Request Error: {e}")
                if hasattr(e, 'response') and e.response is not None:
                    print(f"   📥 Error Response Status: {e.response.status_code}")
                    print(f"   📄 Error Response Body: {e.response.text}")
            # Rotate kể cả khi lỗi (ví dụ: 429 Too Many Requests)
            self._rotate_api_key()
            raise
    
    def run(self, user_input: str, verbose: bool = False) -> str:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_input}
        ]
        
        api_call_count = 0
        
        while api_call_count < self.max_api_calls:
            api_call_count += 1
            
            try:
                response = self._call_api(messages, verbose)
            except Exception as e:
                return f"Lỗi khi gọi API: {str(e)}"
            
            if not response.get("choices"):
                return "Xin lỗi, tôi không thể xử lý yêu cầu này."
            
            assistant_message = response["choices"][0]["message"]
            tool_calls = assistant_message.get("tool_calls", [])
            
            if tool_calls:
                messages.append(assistant_message)
                
                for tool_call in tool_calls:
                    tool_id = tool_call.get("id", "")
                    function_info = tool_call.get("function", {})
                    tool_name = function_info.get("name", "")
                    
                    arguments_str = function_info.get("arguments", "{}")
                    try:
                        arguments = json.loads(arguments_str) if isinstance(arguments_str, str) else arguments_str
                    except json.JSONDecodeError:
                        arguments = {}
                    
                    tool_result = execute_tool(tool_name, arguments, self.context)
                    
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "name": tool_name,
                        "content": tool_result
                    })
                continue
            
            content = assistant_message.get("content", "")
            if content:
                return content
            
            return "Xin lỗi, tôi không thể xử lý yêu cầu này."
        
        return "Xin lỗi, yêu cầu quá phức tạp để xử lý."
