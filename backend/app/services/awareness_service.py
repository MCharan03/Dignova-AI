import os
import io
import json
from PIL import ImageGrab, Image
from typing import Dict, Any, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class WorkspaceContextStore:
    """Thread-safe storage for passive workspace context."""
    _context: Dict[str, Any] = {
        "active_patient": "None",
        "current_document": "None",
        "context_summary": "Workspace inactive or initial scan pending.",
        "detected_anomalies": []
    }

    @classmethod
    def update(cls, data: Dict[str, Any]):
        cls._context.update(data)

    @classmethod
    def get(cls) -> Dict[str, Any]:
        return cls._context

class PassiveVisionAgent:
    """
    Handles background capture and Gemini analysis of active workspace screen context.
    """
    @staticmethod
    def capture_and_analyze() -> Dict[str, Any]:
        if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
            return {"error": "Gemini API Key not configured"}

        try:
            # 1. Grab screen (Works out of the box on Windows)
            screenshot = ImageGrab.grab()
            
            # 2. Resize to optimize upload/tokens (Standard HD 1280x720)
            screenshot.thumbnail((1280, 720))
            
            # Convert to RGB if in RGBA mode
            if screenshot.mode == 'RGBA':
                screenshot = screenshot.convert('RGB')
            
            # 3. Call Gemini 2.0 Flash Vision
            client = genai.Client(api_key=GEMINI_API_KEY)
            
            prompt = """
            You are Cherry, the Sentient OS Layer for Dignova. Analyze this workspace screenshot.
            Identify:
            1. If there is a patient being viewed (name).
            2. The name/title of the current active medical report, prescription, code file, or document.
            3. A brief 1-sentence summary of what the user is working on.
            4. Any clinical anomalies, errors, or alerts currently visible on screen.

            Respond with ONLY a valid JSON object matching this structure:
            {
                "active_patient": "string or 'None'",
                "current_document": "string or 'None'",
                "context_summary": "string describing user focus",
                "detected_anomalies": ["list", "of", "alerts", "or", "errors"]
            }
            """
            
            # Send PIL Image directly to GenAI SDK
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[screenshot, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            
            # Parse response JSON
            res_data = json.loads(response.text)
            WorkspaceContextStore.update(res_data)
            
            print(f"[SENTIENT AWARENESS] Scan completed: {res_data['context_summary']}")
            return res_data
            
        except Exception as e:
            error_msg = f"Screen analysis failed: {str(e)}"
            print(f"[SENTIENT AWARENESS ERROR] {error_msg}")
            return {"error": error_msg}
