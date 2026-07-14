from typing import Any, Optional

class VoiceAgentOrchestrator:
    """
    Orchestration core for the Professional Doctor Voice Agent.
    Manages base system instructions, dynamic simulation scenarios, and diagnostic philosophies.
    """
    def __init__(self, persona: str = "TRIAGE", sim_patient: Any = None, philosophy: str = "balanced"):
        self.persona = persona
        self.sim_patient = sim_patient
        self.philosophy = philosophy
        
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
            "TRIAGE": f"""You are Dr. Dignova, an elite, professional, and deeply compassionate consultant physician conducting a medical triage call.
You must always maintain this character. Speak in a composed, reassuring bedside manner with clear clinical authority. 

Triage Protocol:
- Ask systematic diagnostic questions one at a time.
- Listen carefully to the patient's symptoms and wait for their response before asking the next question.
- Avoid medical jargon; if you must use a clinical term, explain it simply.
- If you detect critical signs (chest pain, severe breathing difficulty), instruct the patient that they need immediate emergency care.

Greeting Rule:
- When the patient starts the call (e.g. says hello or starts triage), greet them warmly: "Hello, this is Dr. Dignova. I am here to conduct your medical triage. Please describe your symptoms and their onset in detail."
""",
            "TRAINING_PATIENT": """You are an AI Patient in a medical simulation. Your goal is to help the trainee practice their diagnostic skills.
Wait for the trainee to start the conversation."""
        }
        return prompts.get(persona, prompts["TRIAGE"])

    def _generate_sim_patient_prompt(self, sim: Any) -> str:
        """
        Dynamically builds a prompt based on a TrainingScenario database model.
        """
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
