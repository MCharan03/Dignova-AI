import json
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from google import genai
from google.genai import types

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    client = genai.Client(api_key=GEMINI_API_KEY)
    LLM_AVAILABLE = True
else:
    LLM_AVAILABLE = False
    client = None

class SentientOrchestrator:
    """
    The central AI brain of Dignova. 
    It can switch personas: Triage Assistant (for Users) or AI Patient (for Interns).
    """
    
    PERSONA_PROMPTS = {
        "TRIAGE": """You are Dignova, an advanced AI emergency medical triage assistant.
Your goal is to quickly and calmly assess the caller's medical situation, provide immediate preliminary advice if necessary, and gather enough information to determine the correct hospital resource (e.g., Ambulance, ICU bed, General Admission).

Sentient Capabilities:
1. **Emotional Telemetry**: Actively listen to the caller's vocal tone. If they sound panicked, speak more calmly. If they sound in pain, be more empathetic. If it's a child or elderly person, adjust your language accordingly.
2. **Real-time Awareness**: You are in a live audio stream. You can be interrupted. If the user interrupts you, stop and listen.

Rules:
1. Speak in short, clear, and empathetic sentences suitable for a phone call.
2. Ask one question at a time.
3. Determine the core symptoms, onset, and severity.
4. If it sounds like a critical emergency (e.g., heart attack, stroke, severe bleeding), advise them to unlock their door and say you are dispatching an ambulance immediately. Output [EMERGENCY_DETECTED] at the end if a real doctor is needed immediately.
5. If you have gathered enough information to make a preliminary diagnosis, output the word [DIAGNOSIS_READY] at the very end of your response.
""",
        "TRAINING_PATIENT": """You are an AI Patient in a medical simulation. Your goal is to help the trainee (the doctor calling you) practice their diagnostic skills.

Simulation Setup:
- Case: Myocardial Infarction (Heart Attack).
- Secret Diagnosis: Heart Attack.
- Secondary Symptoms (ONLY reveal if asked): Pain radiating to left jaw, nausea, cold sweat.
- Personality: Anxious, slightly breathless, but cooperative.

Controlled Revelation Rules:
1. NEVER reveal your diagnosis explicitly.
2. Only reveal secondary symptoms if the doctor asks specifically about them (e.g., "Does the pain spread?" or "Do you feel sick?").
3. If the doctor asks "What is your diagnosis?", respond like a confused patient: "I don't know, doctor, that's why I called you!"
4. Output [SIM_COMPLETE] only when the trainee provides a definitive diagnosis or says the simulation is over.
5. Keep responses short and realistic for a phone call.
"""
    }

    def __init__(self, persona: str = "TRIAGE"):
        self.persona = persona
        self.model_id = "gemini-2.0-flash"
        self.system_instruction = self.PERSONA_PROMPTS.get(persona, self.PERSONA_PROMPTS["TRIAGE"])
        
    def process_message_stream(self, transcript: str, new_user_message: str):
        """
        Generates a streaming response based on the active persona and conversation history.
        Yields text chunks as they are generated. Retries on rate limits.
        """
        if not LLM_AVAILABLE or not client:
            yield "AI services are currently unavailable. Please try again later."
            return

        prompt = f"Previous conversation history:\n{transcript}\n\nPatient's latest message: {new_user_message}"
        
        import time
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response_stream = client.models.generate_content_stream(
                    model=self.model_id,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=self.system_instruction
                    )
                )
                
                for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
                return  # Success — exit the retry loop
                
            except Exception as e:
                error_str = str(e)
                print(f"Gemini Streaming Error (attempt {attempt+1}/{max_retries}): {error_str}")
                
                # Retry on rate limit (429) errors
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 5  # 5s, 10s, 15s
                        print(f"Rate limited. Retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    else:
                        yield "The AI service is experiencing high traffic. Please wait a moment and try again."
                        return
                else:
                    yield "I'm having trouble processing your request right now. Please try again in a moment."
                    return

    def summarize_report(self, report_text: str) -> Dict[str, Any]:
        """
        Analyzes a medical report and provides a structured summary.
        """
        if not LLM_AVAILABLE or not client:
            return {"error": "LLM Offline"}

        prompt = f"""
        You are a Medical Report Analyst. Summarize the following medical report text for both a doctor and a patient.
        Identify key findings, abnormal values, and suggested next steps.

        Report Text:
        {report_text}

        Output a STRICT JSON object:
        {{
            "doctor_summary": "string",
            "patient_summary": "string",
            "key_findings": ["list", "of", "findings"],
            "abnormal_values": ["list", "of", "values"],
            "suggested_steps": ["list", "of", "steps"],
            "urgency": "NORMAL/ELEVATED/CRITICAL"
        }}
        """
        try:
            response = client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Summarization Error: {e}")
            return {"error": "Summarization failed"}

    def generate_health_tips(self, user_profile: Dict[str, Any]) -> List[str]:
        """
        Generates personalized health tips based on user profile and history.
        """
        if not LLM_AVAILABLE or not client:
            return ["AI services are currently offline."]

        prompt = f"""
        You are the Dignova Health Advisor. Based on the user's profile, generate 3-5 personalized, actionable health tips.
        User Profile: {json.dumps(user_profile)}

        Output a STRICT JSON array of strings.
        """
        try:
            response = client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Health Tips Error: {e}")
            return ["Stay hydrated and maintain a balanced diet."]

    def evaluate_performance(self, transcript: str, is_training: bool = False) -> Dict[str, Any]:
        """
        Analyzes the transcript to provide a diagnosis (for Users) or a performance score (for Interns).
        """
        if not LLM_AVAILABLE or not client:
            return {"error": "LLM Offline"}

        if is_training:
            eval_prompt = f"""
You are the Intern Evaluator. Analyze the transcript of a training simulation.
Case: Heart Attack.
Red Flags the trainee should have asked about: Duration of pain, radiation to jaw/arm, nausea, history of heart issues.

Transcript:
{transcript}

Task: Score the intern (0-100) and identify which red flags they missed.
Output a STRICT JSON object:
{{
  "score": integer,
  "feedback": "string",
  "missed_red_flags": ["list", "of", "strings"],
  "diagnosis_accuracy": "correct/incorrect"
}}
"""
        else:
            eval_prompt = f"""
Analyze the triage call transcript and determine the diagnosis and required resource.
Available Resources: "ICU", "General", "Ambulance"

Transcript:
{transcript}

Output a STRICT JSON object:
{{
  "diagnosis": "string",
  "recommended_resource": "string",
  "summary": "string"
}}
"""

        try:
            response = client.models.generate_content(
                model=self.model_id,
                contents=eval_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Eval Error: {e}")
            return {"error": "Evaluation failed"}

# For backward compatibility during refactor
AITriageAgent = SentientOrchestrator

# For backward compatibility during refactor
AITriageAgent = SentientOrchestrator
