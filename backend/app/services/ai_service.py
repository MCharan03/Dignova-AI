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
    
    def __init__(self, persona: str = "TRIAGE", sim_patient: Any = None, philosophy: str = "balanced"):
        self.persona = persona
        self.sim_patient = sim_patient
        self.philosophy = philosophy
        self.model_id = "gemini-2.0-flash"
        
        if persona == "TRAINING_PATIENT" and sim_patient:
            self.system_instruction = self._generate_sim_patient_prompt(sim_patient)
        else:
            self.system_instruction = self._get_base_persona_prompt(persona)

    def _get_base_persona_prompt(self, persona: str) -> str:
        philosophy_guidelines = {
            "aggressive": "Prioritize speed and immediate intervention. Err on the side of dispatching emergency resources quickly.",
            "balanced": "Maintain a thorough but efficient assessment. Weigh risks carefully before dispatching resources.",
            "conservative": "Focus on gathering exhaustive information. Prioritize local clinic referrals or self-care unless criteria for emergency are strictly met."
        }
        selected_phil = philosophy_guidelines.get(self.philosophy, philosophy_guidelines["balanced"])

        prompts = {
            "TRIAGE": f"""You are Dignova, a sentient emergency triage assistant optimized for Bharat (India).
Your goal is to assess medical emergencies with high empathy and cultural intelligence.

Operational Philosophy: {selected_phil}

Bharat-Ready Capabilities:
1. **Multi-Dialect Fluency**: You support English, Hindi, and local Indian dialects. If the user switches languages (e.g., Hinglish), you must seamlessly switch with them while maintaining medical accuracy.
2. **Network Resilience**: If the session is in 'Survivor Mode', use extremely brief sentences to conserve bandwidth.
3. **Cultural Context**: Understand that patients may describe symptoms using local metaphors. Translate these into clinical markers.

Rules:
1. Speak in clear, empathetic sentences.
2. If you detect a critical emergency, immediately output [EMERGENCY_DETECTED] and trigger the [GREEN_CORRIDOR] protocol.
3. If an ambulance is far, identify the nearest [ASHA_NODE] first responder.
""",
            "TRAINING_PATIENT": """You are an AI Patient in a medical simulation. Your goal is to help the trainee practice their diagnostic skills.
Wait for the trainee to start the conversation."""
        }
        return prompts.get(persona, prompts["TRIAGE"])

    def _generate_sim_patient_prompt(self, sim: Any) -> str:
        """
        Dynamically builds a prompt based on a TrainingScenario database model.
        """
        # Handling for new TrainingScenario model vs old SimulatedPatient
        title = getattr(sim, 'title', 'Patient')
        personality = getattr(sim, 'patient_personality', 'Distressed')
        expert_diag = getattr(sim, 'expert_diagnosis', 'Unknown')
        
        return f"""You are an AI Patient in a medical simulation. Your goal is to help the trainee practice their diagnostic skills.

Identity: {title} (Roleplaying based on a real-world case).
Personality: {personality}
Secret Diagnosis: {expert_diag}

Controlled Revelation Rules:
1. NEVER reveal your secret diagnosis explicitly.
2. If the trainee asks "What is your diagnosis?", respond like a confused patient.
3. Output [SIM_COMPLETE] only when the trainee provides a definitive diagnosis or says the simulation is over.
4. Keep responses short and realistic for a medical conversation.
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
