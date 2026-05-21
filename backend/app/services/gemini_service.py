import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    """
    Direct Google Gemini AI Integration for the Sentient OS Layer.
    Bypasses OpenRouter for core application logic (Triage, Evaluation, Escalation).
    """
    
    API_KEY = os.getenv("GEMINI_API_KEY")
    if API_KEY:
        genai.configure(api_key=API_KEY)
    
    MODEL_NAME = "gemini-2.0-flash" # High-speed, high-fidelity multimodal model
    
    TRIAGE_SYSTEM = """
    You are the Dignova AI Sentient Triage Layer. Your goal is to analyze patient symptoms with extreme clinical precision and empathy.
    
    INPUT: Patient symptoms/complaint.
    OUTPUT: A JSON object with the following fields:
    {
      "response": "Empathetic clinical response to the patient",
      "risk_level": "LOW | MEDIUM | ELEVATED | CRITICAL",
      "confidence": 0.0 to 1.0,
      "diagnosis": "Preliminary diagnostic hypothesis",
      "red_flags": ["list", "of", "concerns"],
      "auto_prescribe": true/false (Only for LOW risk + high confidence),
      "medications": ["list of medications if auto_prescribe is true"],
      "escalate_to_doctor": true/false (For MEDIUM and above),
      "escalation_reason": "Why a doctor must intervene"
    }
    """

    EVALUATION_SYSTEM = """
    You are the Senior Clinical Evaluator for Dignova AI. You evaluate medical interns by comparing their diagnosis against a known Expert Standard.
    
    INPUT: Intern's diagnosis vs Expert Standard.
    OUTPUT: A JSON object with:
    {
      "score": 0-100,
      "alignment_with_expert": 0.0-100.0,
      "grade": "EXCELLENT | PROFICIENT | DEVELOPING | NEEDS_IMPROVEMENT",
      "feedback": "Concise, professional medical feedback",
      "missed_concepts": ["list of what the intern missed"]
    }
    """

    @staticmethod
    async def triage_message(message: str, patient_info: dict = None):
        """Analyzes symptoms using direct Gemini API with OpenRouter fallback."""
        try:
            model = genai.GenerativeModel(
                model_name=GeminiService.MODEL_NAME,
                system_instruction=GeminiService.TRIAGE_SYSTEM
            )
            
            prompt = f"Patient Info: {json.dumps(patient_info)}\nSymptoms: {message}"
            
            response = await model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"⚠️ Direct Gemini Triage Failed: {e}. Falling back to OpenRouter...")
            from .openrouter_service import OpenRouterService
            # OpenRouterService.triage_message(history, msg, info)
            return await OpenRouterService.triage_message(
                conversation_history="",
                new_message=message,
                patient_info=patient_info
            )

    @staticmethod
    async def evaluate_intern(intern_diagnosis: str, expert_diagnosis: str):
        """Directly evaluates intern performance using Gemini with OpenRouter fallback."""
        try:
            model = genai.GenerativeModel(
                model_name=GeminiService.MODEL_NAME,
                system_instruction=GeminiService.EVALUATION_SYSTEM
            )
            
            prompt = f"Intern Diagnosis: {intern_diagnosis}\nExpert Standard: {expert_diagnosis}"
            
            response = await model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"⚠️ Direct Gemini Evaluation Failed: {e}. Falling back to OpenRouter...")
            from .openrouter_service import OpenRouterService
            # We use a custom call to OpenRouter for evaluation since it doesn't have a dedicated method
            payload = {
                "model": os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5"),
                "messages": [
                    {"role": "system", "content": GeminiService.EVALUATION_SYSTEM},
                    {"role": "user", "content": f"Intern Diagnosis: {intern_diagnosis}\nExpert Standard: {expert_diagnosis}"}
                ],
                "response_format": {"type": "json_object"}
            }
            try:
                import httpx
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                            "Content-Type": "application/json"
                        },
                        json=payload
                    )
                    data = resp.json()
                    return json.loads(data["choices"][0]["message"]["content"])
            except:
                return {"score": 0, "feedback": "Evaluation failed completely."}
