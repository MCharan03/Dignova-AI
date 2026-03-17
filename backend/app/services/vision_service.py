import os
from google import genai
from google.genai import types
from PIL import Image
import io
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    client = genai.Client(api_key=GEMINI_API_KEY)
    LLM_AVAILABLE = True
else:
    LLM_AVAILABLE = False
    client = None

class VisionService:
    """
    Handles passive multimodal awareness by analyzing images with Gemini 2.0 Flash.
    """
    
    def __init__(self):
        self.model_id = "gemini-1.5-flash"
        self.system_prompt = """
You are the Dignova Visual Triage Engine. Your goal is to analyze medical images provided by patients or interns.
Analyze the image for:
1. Identifying the content (e.g., wound, prescription, medical monitor, patient posture).
2. Estimating clinical urgency/severity (NORMAL, ELEVATED, CRITICAL).
3. Providing a concise, professional analysis for the triage log.

Rules:
- Be precise and objective.
- Output your analysis in the following format:
  SUMMARY: [Your brief analysis]
  SEVERITY: [NORMAL/ELEVATED/CRITICAL]
"""

    async def analyze_image(self, image_bytes: bytes) -> dict:
        if not LLM_AVAILABLE or not client:
            return {
                "analysis": "Visual analysis currently offline (Check API Key).",
                "severity": "UNKNOWN"
            }
            
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            response = client.models.generate_content(
                model=self.model_id,
                contents=[
                    self.system_prompt,
                    image
                ]
            )
            
            res_text = response.text
            severity = "NORMAL"
            if "CRITICAL" in res_text.upper():
                severity = "CRITICAL"
            elif "ELEVATED" in res_text.upper():
                severity = "ELEVATED"
                
            return {
                "analysis": res_text.strip(),
                "severity": severity
            }
        except Exception as e:
            print(f"Vision Analysis Error: {e}")
            return {
                "analysis": f"Visual analysis failed: {str(e)}",
                "severity": "UNKNOWN"
            }

vision_service = VisionService()

vision_service = VisionService()
