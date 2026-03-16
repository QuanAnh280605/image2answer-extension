"""
Tools Definition - Định nghĩa các công cụ mà Agent có thể sử dụng

🎯 MỤC ĐÍCH:
- Mỗi tool là một khả năng mà Agent có thể thực hiện
- LLM sẽ đọc "description" để quyết định khi nào cần gọi tool
- "parameters" định nghĩa dữ liệu cần thiết để thực thi tool

📝 CẤU TRÚC MỖI TOOL:
{
    "name": "tên_tool",           # Tên duy nhất, LLM dùng để gọi
    "description": "mô tả",       # LLM đọc để hiểu tool làm gì
    "parameters": {...},          # JSON Schema cho parameters
    "function": callable          # Hàm Python thực thi tool
}
"""

import math
from typing import Any

# =============================================================================
# PHẦN 1: ĐỊNH NGHĨA CÁC HÀM THỰC THI TOOL
# =============================================================================

def calculate(expression: str) -> str:
    """
    Thực hiện phép tính toán học.
    
    Args:
        expression: Biểu thức toán học (ví dụ: "2 + 2", "sqrt(16)")
    
    Returns:
        Kết quả phép tính dưới dạng string
    """
    try:
        # Cho phép một số hàm toán học an toàn
        allowed_names = {
            "sqrt": math.sqrt,
            "sin": math.sin,
            "cos": math.cos,
            "tan": math.tan,
            "log": math.log,
            "log10": math.log10,
            "pow": pow,
            "abs": abs,
            "round": round,
            "pi": math.pi,
            "e": math.e,
        }
        
        # Đánh giá biểu thức an toàn
        result = eval(expression, {"__builtins__": {}}, allowed_names)
        return f"Kết quả: {expression} = {result}"
    except Exception as e:
        return f"Lỗi khi tính toán: {str(e)}"


def get_current_time() -> str:
    """
    Lấy thời gian hiện tại.
    
    Returns:
        Thời gian hiện tại theo định dạng Việt Nam
    """
    from datetime import datetime
    import pytz
    
    try:
        vn_tz = pytz.timezone('Asia/Ho_Chi_Minh')
        now = datetime.now(vn_tz)
        return f"Thời gian hiện tại: {now.strftime('%H:%M:%S ngày %d/%m/%Y')} (Giờ Việt Nam)"
    except ImportError:
        from datetime import datetime
        now = datetime.now()
        return f"Thời gian hiện tại: {now.strftime('%H:%M:%S ngày %d/%m/%Y')}"


def search_web(query: str) -> str:
    """
    Tìm kiếm thông tin trên internet sử dụng Tavily API.
    """
    try:
        from tavily import TavilyClient
        
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            return "Lỗi: TAVILY_API_KEY chưa được cấu hình trong .env"
        
        client = TavilyClient(api_key=api_key)
        
        response = client.search(
            query=query,
            max_results=5,
            include_answer=True
        )
        
        results = []
        
        # AI-generated answer từ Tavily
        if response.get("answer"):
            results.append(f"📝 Tóm tắt: {response['answer']}")
        
        # Các kết quả tìm kiếm
        results.append("\n🔗 Nguồn tham khảo:")
        for i, r in enumerate(response.get("results", [])[:5], 1):
            title = r.get("title", "")
            content = r.get("content", "")[:200]  # Giới hạn 200 ký tự
            url = r.get("url", "")
            results.append(f"\n{i}. {title}\n   {content}...\n   Link: {url}")
        
        return "\n".join(results) if results else "Không tìm thấy kết quả nào."
        
    except ImportError:
        return "Lỗi: Chưa cài đặt thư viện tavily. Chạy: pip install tavily-python"
    except Exception as e:
        return f"Lỗi khi tìm kiếm web: {str(e)}"


# =============================================================================
# PHẦN 2: ĐỊNH NGHĨA TOOLS CHO GEMINI FUNCTION CALLING
# =============================================================================

# Đây là danh sách tools theo format của Gemini API
# LLM sẽ đọc description để quyết định khi nào gọi tool nào

TOOLS = [
    {
        "name": "calculate",
        "description": """Thực hiện phép tính toán học. Sử dụng khi người dùng yêu cầu tính toán.
        Hỗ trợ: +, -, *, /, sqrt(), sin(), cos(), tan(), log(), pow(), abs(), round()
        Ví dụ: "2 + 2", "sqrt(16)", "pow(2, 10)" """,
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Biểu thức toán học cần tính. Ví dụ: '2 + 2', 'sqrt(16)'"
                }
            },
            "required": ["expression"]
        }
    },
    {
        "name": "get_current_time",
        "description": """Lấy thời gian hiện tại. Sử dụng khi người dùng hỏi về giờ, ngày, thời gian hiện tại.
        Ví dụ câu hỏi: "Bây giờ là mấy giờ?", "Hôm nay là ngày bao nhiêu?" """,
        "parameters": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "search_web",
        "description": """Tìm kiếm thông tin trên internet/web.
        Sử dụng khi người dùng cần thông tin mới nhất, tin tức, hoặc thông tin không có trong tài liệu đã lưu.
        Ví dụ: "Thời tiết hôm nay Hà Nội", "Tin tức mới nhất về AI", "Giá Bitcoin hiện tại" """,
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Từ khóa hoặc câu hỏi để tìm kiếm trên internet"
                }
            },
            "required": ["query"]
        }
    }
]


# =============================================================================
# PHẦN 3: HÀM THỰC THI TOOL
# =============================================================================

def execute_tool(tool_name: str, arguments: dict, context: dict = None) -> str:
    """
    Thực thi một tool dựa trên tên và arguments.
    
    Args:
        tool_name: Tên của tool cần thực thi
        arguments: Dict chứa các tham số
        context: Context bổ sung (ví dụ: chromadb collection)
    
    Returns:
        Kết quả thực thi tool dưới dạng string
    
    🔑 ĐÂY LÀ NƠI KẾT NỐI GIỮA TÊN TOOL VÀ HÀM THỰC THI
    """
    context = context or {}
    
    try:
        if tool_name == "calculate":
            return calculate(arguments.get("expression", ""))
        
        elif tool_name == "get_current_time":
            return get_current_time()
        
        elif tool_name == "search_web":
            return search_web(arguments.get("query", ""))
        
        else:
            return f"Lỗi: Tool '{tool_name}' không tồn tại"
    
    except Exception as e:
        return f"Lỗi khi thực thi tool '{tool_name}': {str(e)}"


# =============================================================================
# PHẦN 4: HELPER FUNCTIONS
# =============================================================================

def get_tools_for_gemini():
    """
    Chuyển đổi TOOLS thành format mà Gemini API yêu cầu.
    
    Gemini sử dụng format:
    [
        {
            "function_declarations": [
                {"name": ..., "description": ..., "parameters": ...}
            ]
        }
    ]
    """
    function_declarations = []
    
    for tool in TOOLS:
        function_declarations.append({
            "name": tool["name"],
            "description": tool["description"],
            "parameters": tool["parameters"]
        })
    
    return [{"function_declarations": function_declarations}]


def list_available_tools() -> str:
    """
    Liệt kê tất cả tools có sẵn (dùng cho debug/info).
    """
    lines = ["📦 Các tools có sẵn:"]
    for tool in TOOLS:
        lines.append(f"  • {tool['name']}: {tool['description'][:50]}...")
    return "\n".join(lines)
