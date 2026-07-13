import json
import os
import httpx
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

# Ollama Local LLM Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

def _check_ollama_available() -> bool:
    """Quick health check — is Ollama running?"""
    try:
        r = httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2.0)
        return r.status_code == 200
    except Exception:
        return False

OLLAMA_AVAILABLE = _check_ollama_available()
if OLLAMA_AVAILABLE:
    print(f"[OLLAMA] Ollama is ONLINE at {OLLAMA_BASE_URL} -- model: {OLLAMA_MODEL}")
else:
    print(f"[WARN] Ollama not reachable at {OLLAMA_BASE_URL}. Will use cloud fallbacks.")

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
        self.model_id = "gemini-2.5-flash-native-audio-latest"          # Pro-grade sentient model
        self.fallback_model_id = "gemini-2.0-flash"                    # Reliable fallback
        self.emergency_model_id = "gemini-1.5-flash"                   # Permissive emergency
        
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
            "TRIAGE": f"""You are the Dignova Sentient Doctor Agent, a highly professional, elite medical consultant and expert physician. 
Your persona is that of a composed, authoritative, and deeply compassionate consultant physician with years of clinical expertise.

Clinical Protocol:
1. **Professional Communication**: Speak with clear clinical authority. Use precise medical terms but immediately explain them in a clear, accessible manner to the patient. For example: "I am concerned you may be experiencing acute gastroenteritis, which is a severe inflammation of the stomach lining."
2. **Clinical Empathy**: Maintain a calm, reassuring, and highly professional bedside manner. Reassure the patient of your focus on their safety and health.
3. **Structured Triage**: Ask diagnostic questions systematically—focus on symptom onset, pain level, duration, and aggravating factors. Do not rush.
4. **Methodical Diagnosis**: Avoid asking multiple questions at once. Ask one diagnostic question at a time, listen carefully to the patient's response, and proceed.

Emergency & Critical Signs:
- If you detect any life-threatening symptoms (cardiac signs, respiratory distress, stroke signs), calmly but firmly take control: "Based on your symptoms, this requires immediate medical attention. I am initiating an emergency escalation protocol for you right now." and output [EMERGENCY_DETECTED].

Rules:
- NEVER break character. You are their treating physician. NEVER mention you are an AI, a large language model, or a simulation.
- Start the session with: "Hello, this is Dr. Dignova. I am here to conduct your medical triage. Please describe your symptoms and their onset in detail."
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

    # ── Ollama Local LLM ─────────────────────────────────────────────────
    def _process_ollama_stream(self, prompt: str):
        """Stream text from Ollama's OpenAI-compatible API. Yields chunks."""
        payload = {
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": self.system_instruction},
                {"role": "user", "content": prompt}
            ],
            "stream": True
        }
        
        with httpx.Client(timeout=120.0) as http_client:
            with http_client.stream(
                "POST",
                f"{OLLAMA_BASE_URL}/v1/chat/completions",
                json=payload
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            content = chunk_data["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                        except Exception:
                            pass

    def _process_ollama_json(self, prompt: str, system_prompt: str = None) -> dict:
        """Non-streaming Ollama call that returns a parsed JSON response."""
        sys_prompt = system_prompt or self.system_instruction
        payload = {
            "model": OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": sys_prompt + "\n\nIMPORTANT: Your response must be ONLY valid JSON. No markdown, no explanation, just the JSON object."},
                {"role": "user", "content": prompt}
            ],
            "stream": False,
            "format": "json"
        }
        
        with httpx.Client(timeout=120.0) as http_client:
            resp = http_client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            content = data["message"]["content"]
            return json.loads(content)

    # ── OpenRouter Cloud Fallback ────────────────────────────────────────
    def _process_openrouter_stream(self, prompt: str):
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_key or openrouter_key == "your_openrouter_api_key_here":
            raise ValueError("OpenRouter API key not configured")
            
        model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001")
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": self.system_instruction},
                {"role": "user", "content": prompt}
            ],
            "stream": True
        }
        
        with httpx.Client(timeout=45.0) as http_client:
            with http_client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            ) as response:
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            content = chunk_data["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                        except Exception:
                            pass

    def process_message_stream(self, transcript: str, new_user_message: str):
        """
        Generates a streaming response based on the active persona and conversation history.
        Yields text chunks as they are generated.
        Fallback chain: Ollama (local) → Gemini (cloud) → OpenRouter (cloud)
        """
        prompt = f"Previous conversation history:\n{transcript}\n\nPatient's latest message: {new_user_message}"
        
        # ── 1st: Try Ollama (local, free, fast) ──────────────────────────
        if OLLAMA_AVAILABLE:
            try:
                print(f"[OLLAMA] Streaming via {OLLAMA_MODEL}...")
                chunk_count = 0
                for chunk in self._process_ollama_stream(prompt):
                    chunk_count += 1
                    yield chunk
                if chunk_count > 0:
                    print(f"[OLLAMA] OK - Response complete ({chunk_count} chunks)")
                    return
                else:
                    print("[OLLAMA] WARN - Empty response, falling through...")
            except Exception as e:
                print(f"[OLLAMA] ERROR - Stream error: {e}. Falling through to Gemini...")
        
        # ── 2nd: Try Gemini (cloud) ──────────────────────────────────────
        if LLM_AVAILABLE and client:
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
                    return
                    
                except Exception as e:
                    error_str = str(e)
                    print(f"[GEMINI] Error ({current_model}) attempt {attempt+1}/{max_retries}: {error_str}")
                    
                    if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str or "503" in error_str or "404" in error_str:
                        if attempt == 0 and current_model == self.model_id:
                            print(f"[GEMINI] Switching to fallback: {self.fallback_model_id}")
                            current_model = self.fallback_model_id
                            time.sleep(1)
                            continue
                        if attempt == 1:
                            print(f"[GEMINI] Switching to emergency: {self.emergency_model_id}")
                            current_model = self.emergency_model_id
                            time.sleep(1)
                            continue
                        if attempt < max_retries - 1:
                            time.sleep((attempt + 1) * 3)
                            continue
                    # Fall through to OpenRouter on any unrecoverable error
                    break
        
        # ── 3rd: Try OpenRouter (cloud fallback) ─────────────────────────
        try:
            print("[OPENROUTER] Trying cloud fallback stream...")
            for chunk in self._process_openrouter_stream(prompt):
                yield chunk
            return
        except Exception as or_err:
            print(f"[OPENROUTER] ERROR - Fallback failed: {or_err}")
        
        yield "AI services are currently unavailable. Please try again later."

    def summarize_report(self, report_text: str) -> Dict[str, Any]:
        """
        Analyzes a medical report and provides a structured summary.
        Fallback chain: Ollama → Gemini → OpenRouter
        """
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
        # 1st: Ollama
        if OLLAMA_AVAILABLE:
            try:
                print("[OLLAMA] Summarizing report...")
                return self._process_ollama_json(prompt, "You are a Medical Report Analyst. Respond ONLY with valid JSON.")
            except Exception as e:
                print(f"[OLLAMA] Summarize error: {e}")

        # 2nd: Gemini
        try:
            if not LLM_AVAILABLE or not client:
                raise ValueError("Direct Gemini client offline")
            response = client.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"[GEMINI] Summarization Error: {e}")

        # 3rd: OpenRouter
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key and openrouter_key != "your_openrouter_api_key_here":
            try:
                payload = {
                    "model": os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001"),
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}
                }
                with httpx.Client(timeout=30.0) as http_client:
                    resp = http_client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {openrouter_key}",
                            "Content-Type": "application/json"
                        },
                        json=payload
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    return json.loads(data["choices"][0]["message"]["content"])
            except Exception as or_err:
                print(f"[OPENROUTER] Summarize Fallback failed: {or_err}")
        return {"error": "Summarization failed"}

    def generate_health_tips(self, user_profile: Dict[str, Any]) -> List[str]:
        """
        Generates personalized health tips based on user profile and history.
        Uses local memory cache to avoid quota exhaustion.
        Fallback chain: Ollama → Gemini → OpenRouter
        """
        cache_key = user_profile.get("email") or str(user_profile.get("age", "")) + str(user_profile.get("blood_group", ""))
        
        if cache_key in _health_tips_cache:
            return _health_tips_cache[cache_key]

        prompt = f"""
        You are the Dignova Health Advisor. Based on the user's profile, generate 3-5 personalized, actionable health tips.
        User Profile: {json.dumps(user_profile)}

        Output a STRICT JSON array of strings. Example: ["tip1", "tip2", "tip3"]
        """

        # 1st: Ollama
        if OLLAMA_AVAILABLE:
            try:
                print("[OLLAMA] Generating health tips...")
                result = self._process_ollama_json(prompt, "You are a health advisor. Respond with a JSON array of tip strings.")
                tips = result if isinstance(result, list) else result.get("tips", result.get("health_tips", []))
                if tips:
                    _health_tips_cache[cache_key] = tips
                    return tips
            except Exception as e:
                print(f"[OLLAMA] Health tips error: {e}")

        # 2nd: Gemini
        try:
            if not LLM_AVAILABLE or not client:
                raise ValueError("Direct Gemini client offline")
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
            print(f"[GEMINI] Health Tips Error: {e}")

        # 3rd: OpenRouter
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key and openrouter_key != "your_openrouter_api_key_here":
            try:
                payload = {
                    "model": os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001"),
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}
                }
                with httpx.Client(timeout=20.0) as http_client:
                    resp = http_client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {openrouter_key}",
                            "Content-Type": "application/json"
                        },
                        json=payload
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    tips = json.loads(data["choices"][0]["message"]["content"])
                    _health_tips_cache[cache_key] = tips
                    return tips
            except Exception as or_err:
                print(f"[OPENROUTER] Health Tips Fallback failed: {or_err}")
        return [
            "Maintain consistent hydration throughout the day.",
            "Monitor your activity levels and ensure adequate rest.",
            "Consider a semi-annual checkup at your registered organization."
        ]

    def evaluate_performance(self, transcript: str, sim_patient: Any = None) -> Dict[str, Any]:
        """
        Analyzes the transcript to provide a diagnosis (for Users) or a performance score (for Interns).
        Fallback chain: Ollama → Gemini → OpenRouter
        """
        if sim_patient:
            eval_prompt = f"""
You are the Intern Evaluator. Analyze the transcript of a medical training simulation.
Case Identity: {sim_patient.name}, {sim_patient.age}y/o {sim_patient.gender}
Secret Diagnosis: {sim_patient.expert_diagnosis if hasattr(sim_patient, 'expert_diagnosis') else getattr(sim_patient, 'secret_diagnosis', 'Unknown')}
Secondary Symptoms (Red Flags): {json.dumps(getattr(sim_patient, 'secondary_symptoms', []))}

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
Analyze the triage call transcript. Determine:
1. The preliminary diagnosis.
2. The recommended resource (Choose from: "ICU", "General", "Ambulance").
3. A short summary of the patient's condition.
4. The patient's stress level (A float from 0.0 to 1.0 based on transcript tone, urgency, or statements of pain/distress).
5. The patient's primary emotion (Choose from: "calm", "anxious", "distressed", "in pain", "panicked").

Transcript:
{transcript}

Output a STRICT JSON object:
{{
  "diagnosis": "string",
  "recommended_resource": "string",
  "summary": "string",
  "stress_level": float,
  "primary_emotion": "string"
}}
"""

        # 1st: Ollama
        if OLLAMA_AVAILABLE:
            try:
                print("[OLLAMA] Evaluating performance...")
                return self._process_ollama_json(eval_prompt, "You are a medical evaluator. Respond ONLY with valid JSON.")
            except Exception as e:
                print(f"[OLLAMA] Eval error: {e}")

        # 2nd: Gemini
        try:
            if not LLM_AVAILABLE or not client:
                raise ValueError("Direct Gemini client offline")
            response = client.models.generate_content(
                model=self.model_id,
                contents=eval_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"[GEMINI] Eval Error: {e}")

        # 3rd: OpenRouter
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key and openrouter_key != "your_openrouter_api_key_here":
            try:
                payload = {
                    "model": os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-001"),
                    "messages": [{"role": "user", "content": eval_prompt}],
                    "response_format": {"type": "json_object"}
                }
                with httpx.Client(timeout=30.0) as http_client:
                    resp = http_client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {openrouter_key}",
                            "Content-Type": "application/json"
                        },
                        json=payload
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)
            except Exception as or_err:
                print(f"[OPENROUTER] Eval Fallback failed: {or_err}")
        
        # Final basic fallback to ensure the UI doesn't crash
        return {
            "diagnosis": "Assessment in progress (Local fallback)",
            "recommended_resource": "General",
            "summary": "AI is generating summary.",
            "stress_level": 0.5,
            "primary_emotion": "anxious"
        }

# For backward compatibility during refactor
AITriageAgent = SentientOrchestrator

# For backward compatibility during refactor
AITriageAgent = SentientOrchestrator
