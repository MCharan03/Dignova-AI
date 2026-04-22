# Dignova AI — Sentient OS Layer for Healthcare

Dignova AI is a high-fidelity, autonomous healthcare intelligence system designed to act as a "Sentient Layer" between patients and medical institutions. It leverages a multimodal architecture (Voice, Text, Location) to automate the entire clinical lifecycle—from initial triage to automated prescription delivery and proactive aftercare.

## 🧠 Core Architecture (Sentient Matrix)

The system is built on a **9-Level Automation Hierarchy** that ensures professional clinical safety and autonomous agency:

1.  **Identity Linking:** Seamless onboarding with branded high-fidelity emails and secure Telegram linking.
2.  **Neural Triage:** Multimodal assessment engine supporting both Text and **Voice Notes** (via OpenAI Whisper).
3.  **Clinical Escalation:** Autonomous high-risk detection that dynamically alerts online doctors with interactive "Inline Approval" cards.
4.  **Proactive Aftercare:** An "Empathy Loop" that check-ins on patients 3 days post-consultation to track recovery.
5.  **Smart Logistics:** Real-time Google Calendar synchronization and smart Telegram reminders.
6.  **Asha Geofencing:** Autonomous proximity check-in that detects patient arrival (within 500m) and prepares the clinic.
7.  **Preventive Intelligence:** Daily background scans for overdue check-ups and proactive health nudges.
8.  **Neural Training:** "Ghost Replay" simulation engine for interns to practice triage with automated performance dossiers.
9.  **Secure Delivery:** Digital document vault for encrypted prescription delivery and storage.

## 🚀 Tech Stack

*   **Frontend:** Next.js 14, Framer Motion (Sentient UI), React Three Fiber (3D Monolith & Scene Matrix), GSAP.
*   **Backend:** FastAPI (Python), SQLAlchemy (Async), SQLite/PostgreSQL.
*   **AI Brain:** OpenRouter (Gemini 2.0 Flash), Whisper (Audio Transcription).
*   **Automation Nervous System:** n8n (Production Grade Workflows).
*   **Infrastructure:** Localtunnel/Ngrok (Dual-Tunnel Matrix).

## 🛠️ Setup & Deployment

### 1. Requirements
*   Node.js v18+
*   Python 3.10+
*   n8n (Self-hosted or Cloud)

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
DATABASE_URL=sqlite+aiosqlite:///app/app.db
TELEGRAM_BOT_TOKEN=your_token
OPENROUTER_API_KEY=your_key
N8N_BASE_URL=http://localhost:5678
```

### 3. Execution
**Terminal 1 (Backend):**
```bash
cd backend
python run.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 3 (Automations):**
1. Import JSON files from `n8n_workflows/`.
2. Configure Telegram & SMTP credentials.
3. Toggle workflows to **ACTIVE**.

## 🎨 Visual Language
The system features a cinematic "Sentient OS" aesthetic, including:
*   **3D Monolith:** A majestic octahedron representing the AI brain on the Login/Dashboard.
*   **Noise Overlay:** High-frequency visual texture for a high-fidelity feel.
*   **Asha HUD:** A floating proximity tracker for real-time location awareness.

---
© 2026 Dignova AI — Autonomous Healthcare Intelligence.
