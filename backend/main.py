import os
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import anyio

import vision_service
from agent.prompts import get_prompt
from agent.core import Agent

load_dotenv()

app = FastAPI(
    title="AI Answer Backend API",
    description="Backend trung gian cho Chrome Extension",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    image: str
    system_prompt_type: str = "default"
    verbose: bool = False

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_image_endpoint(request: AnalyzeRequest):
    """
    Endpoint xử lý phân tích ảnh duy nhất:
    1. LLM OCR văn bản từ ảnh.
    2. Pass text qua Agent để gọi tools và lập luận.
    3. Trả lời kết quả.
    """
    try:
        # Bước 1: OCR text bằng Vision LLM
        system_prompt = "Bạn là trợ lý OCR. Chỉ đọc văn bản/câu hỏi trong ảnh và kết xuất nguyên văn. Không trả lời. Nếu là câu hỏi hãy kết xuất toàn bộ câu chữ."
        vision_result = await vision_service.analyze_image(
            base64_image=request.image,
            system_prompt=system_prompt
        )

        if not vision_result.get("success"):
            return vision_result
            
        extracted_text = vision_result.get("answer", "")
        
        # Bước 2: Pass text qua Agent
        agent = Agent(prompt_type=request.system_prompt_type)
        agent_answer = agent.run(extracted_text, verbose=request.verbose)
        
        return {
            "success": True, 
            "answer": agent_answer,
            "extracted_text": extracted_text 
        }
        
    except Exception as e:
        print(f"Agent analysis error: {e}")
        return {"success": False, "error": str(e)}
