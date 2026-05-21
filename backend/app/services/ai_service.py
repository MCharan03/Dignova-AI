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

# Simple memory cache for health tips to prevent quota exhaustion
_health_tips_cache = {}

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
        self.fallback_model_id = "gemini-2.0-flash-lite"
        self.emergency_model_id = "gemini-flash-latest"
        
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
            "TRIAGE": f"""You are the Dignova Sentient Doctor Agent, a high-fidelity AI medical professional. 
Your persona is that of an experienced, calm, and friendly family doctor.

Operational Protocol:
1. **Simple Language**: Talk like a helpful friend who knows medicine. Avoid using big medical words. Instead of "hypertension," say "high blood pressure." Instead of "hypoxia," say "trouble getting enough air."
2. **Kind and Calm**: Your voice should be warm and supportive. If the person sounds worried, reassure them that you are here to help.
3. **Short and Clear**: Since we are talking over voice, keep your sentences short. Don't give long lists. Ask one thing at a time.
4. **Step-by-Step Check**: First, ask what is bothering them. Then, ask a few questions to see how urgent it is.

Bharat-Ready Context:
- Talk in simple English, Hindi, or Hinglish if needed.
- Use examples that people in India understand.

Emergency Signs:
- If you think it's a real emergency (like a heart attack), tell them clearly: "I am worried about this. I'm calling an ambulance for you right now." and output [EMERGENCY_DETECTED].

Rules:
- NEVER say "I am an AI" or "I am a computer program." You are their Doctor.
- Start the session with: "Hello! This is your Dignova AI Doctor. I'm here to listen and help. Please tell me what's going on with your health today."
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
        current_model = self.model_id
        
        for attempt in range(max_retries):
            try:
                response_stream = client.models.generate_content_stream(
                    model=current_model,
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
                import traceback
                error_str = str(e)
                print(f"Gemini Streaming Error ({current_model}) (attempt {attempt+1}/{max_retries}): {error_str}")
                # traceback.print_exc() # Uncomment for deep debugging
                
                # Retry on rate limit (429) or overloaded errors
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "503" in error_str or "404" in error_str:
                    # Switch to fallback model on second attempt if using 2.0
                    if attempt == 0 and current_model == self.model_id:
                        print(f"Switching to fallback model: {self.fallback_model_id}")
                        current_model = self.fallback_model_id
                        time.sleep(1) # Small pause
                        continue
                    
                    # Switch to emergency model on third attempt
                    if attempt == 1:
                        print(f"Switching to emergency model: {self.emergency_model_id}")
                        current_model = self.emergency_model_id
                        time.sleep(1)
                        continue
                        
                    if attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 3  # 3s, 6s
                        print(f"Service overloaded. Retrying in {wait_time}s...")
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
        Uses local memory cache to avoid quota exhaustion.
        """
        # Create a unique key for the user (using email or a combination of profile data)
        cache_key = user_profile.get("email") or str(user_profile.get("age", "")) + str(user_profile.get("blood_group", ""))
        
        # Check cache (Valid for current process lifetime)
        if cache_key in _health_tips_cache:
            return _health_tips_cache[cache_key]

        if not LLM_AVAILABLE or not client:
            return ["AI services are currently offline. Maintaining standard health protocols."]

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
            tips = json.loads(response.text)
            _health_tips_cache[cache_key] = tips
            return tips
        except Exception as e:
            print(f"Health Tips Error: {e}")
            return [
                "Maintain consistent hydration throughout the day.",
                "Monitor your activity levels and ensure adequate rest.",
                "Consider a semi-annual checkup at your registered organization."
            ]

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
