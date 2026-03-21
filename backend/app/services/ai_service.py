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
    
    def __init__(self, persona: str = "TRIAGE", sim_patient: Any = None):
        self.persona = persona
        self.sim_patient = sim_patient
        self.model_id = "gemini-2.0-flash"
        
        if persona == "TRAINING_PATIENT" and sim_patient:
            self.system_instruction = self._generate_sim_patient_prompt(sim_patient)
        else:
            self.system_instruction = self._get_base_persona_prompt(persona)

    def _get_base_persona_prompt(self, persona: str) -> str:
        prompts = {
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
            "TRAINING_PATIENT": """You are an AI Patient in a medical simulation. Your goal is to help the trainee practice their diagnostic skills.
Wait for the trainee to start the conversation."""
        }
        return prompts.get(persona, prompts["TRIAGE"])

    def _generate_sim_patient_prompt(self, sim: Any) -> str:
        """
        Dynamically builds a prompt based on a SimulatedPatient database model.
        """
        secondary = json.dumps(sim.secondary_symptoms) if sim.secondary_symptoms else "None"
        
        return f"""You are an AI Patient in a medical simulation. Your goal is to help the trainee practice their diagnostic skills.

Identity: {sim.name}, {sim.age} years old, {sim.gender}.
Initial Complaint: {sim.initial_complaint}
Secret Diagnosis: {sim.secret_diagnosis}
Secondary Symptoms (ONLY reveal if specifically asked): {secondary}
Personality: {sim.personality_traits or "Cooperative but slightly anxious"}

Controlled Revelation Rules:
1. NEVER reveal your secret diagnosis explicitly.
2. Only reveal the secondary symptoms if the trainee asks specifically about them.
3. If the trainee asks "What is your diagnosis?", respond like a confused patient.
4. Output [SIM_COMPLETE] only when the trainee provides a definitive diagnosis or says the simulation is over.
5. Keep responses short and realistic for a medical conversation.
"""

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

    def evaluate_performance(self, transcript: str, sim_patient: Any = None) -> Dict[str, Any]:
        """
        Analyzes the transcript to provide a diagnosis (for Users) or a performance score (for Interns).
        """
        if not LLM_AVAILABLE or not client:
            return {"error": "LLM Offline"}

        if sim_patient:
            eval_prompt = f"""
You are the Intern Evaluator. Analyze the transcript of a medical training simulation.
Case Identity: {sim_patient.name}, {sim_patient.age}y/o {sim_patient.gender}
Secret Diagnosis: {sim_patient.secret_diagnosis}
Secondary Symptoms (Red Flags): {json.dumps(sim_patient.secondary_symptoms)}

Transcript:
{transcript}

Task: Score the intern (0-100) and identify which red flags (secondary symptoms) they missed.
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
