# 🧠 Dignova AI — Sentient Medical OS

> *The first AI that thinks, listens, and heals — before you even know you need it.*

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Voice](https://img.shields.io/badge/Voice-Twilio%20+%20Gemini%20Live-F22F46?style=flat-square&logo=twilio)](https://www.twilio.com/)

---

## What Is Dignova AI?

Dignova AI is a **Sentient Medical Operating System** that triages patients via text, voice browser sessions, or real phone calls — all powered by Gemini Live. It routes critical cases, writes prescriptions, and runs a full hospital management layer underneath.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PATIENT / DOCTOR                         │
└──────────────┬──────────────┬──────────────┬───────────────────┘
               │ Text Chat    │ Browser Voice │ Phone Call (Twilio)
               ▼              ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│                   Next.js Frontend (Vercel)                   │
│  /user/chat-triage   /user/voice-triage   /user/call         │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / WS
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Render / Gunicorn)              │
│                                                               │
│  /api/calls        — CRUD, streaming chat                     │
│  /api/twilio/*     — Inbound bot, outbound dial, callbacks    │
│  /ws/twilio-media  — Gemini Live ↔ Twilio audio bridge       │
│  /api/hospital/*   — Appointments, prescriptions, alerts      │
│  /api/auth/*       — JWT authentication                       │
│  /api/admin/*      — Super admin, org management             │
└──────┬───────────────────────────────────────────────┬───────┘
       │ SQLAlchemy async                               │ Twilio REST
       ▼                                               ▼
┌────────────┐                               ┌──────────────────┐
│ SQLite /   │                               │  Twilio Platform │
│ PostgreSQL │                               │  (voice calls)   │
└────────────┘                               └──────────────────┘
       │ Gemini Live API
       ▼
┌──────────────────────────────────┐
│  Google Gemini 2.0 Flash Live    │
│  Real-time audio ↔ AI doctor     │
└──────────────────────────────────┘
```

---

## Triage Modes

| Mode | How It Works | Latency |
|------|-------------|---------|
| **Neural Chat** | Text chat → streaming AI → auto-booking | ~100ms |
| **Browser Voice** | Browser mic → STT → AI text → TTS | ~500ms |
| **Gemini Live WS** | Browser mic → direct Gemini Live socket | ~50ms |
| **Twilio Phone Call** | Patient's phone ↔ Twilio ↔ Gemini Live | ~200ms |

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python run.py
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite or PostgreSQL connection string |
| `JWT_SECRET_KEY` | JWT signing secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (E.164) |
| `BACKEND_URL` | Public HTTPS URL of this backend |
| `BACKEND_URL_WS` | Public WSS URL of this backend |
| `OPENROUTER_API_KEY` | OpenRouter for fallback LLM |
| `N8N_BASE_URL` | n8n webhook base URL |
| `TELEGRAM_BOT_TOKEN` | Telegram bot for alerts |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend base URL |

---

## Twilio Call Bot Setup

1. Buy a Twilio phone number
2. Set **Voice webhook** → `POST https://your-backend.com/api/twilio/incoming`
3. Set **Status callback** → `POST https://your-backend.com/api/twilio/status-callback`
4. Fill `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`
5. Set `BACKEND_URL_WS=wss://your-backend.com`

Patient calls your Twilio number → AI picks up → Gemini Live conversation → transcript saved → auto-escalation on CRITICAL.

**Outbound calling** (we call the patient):
```bash
POST /api/twilio/outbound
{ "phone_number": "+919876543210", "patient_name": "Ravi" }
```

---

## Directory Structure

```
Dignova-AI/
├── backend/
│   ├── app/
│   │   ├── auth/           # JWT auth routes
│   │   ├── hospital/       # All clinical routes
│   │   │   ├── twilio_routes.py   # Twilio call bot
│   │   │   ├── calls.py           # Call CRUD + chat
│   │   │   ├── voice_routes.py    # Browser voice triage
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── ai_service.py      # SentientOrchestrator
│   │   │   ├── tts_service.py     # OpenAI TTS
│   │   │   └── ...
│   │   ├── ws/
│   │   │   └── twilio_media.py    # Gemini Live ↔ Twilio bridge
│   │   ├── models.py      # All SQLAlchemy models
│   │   └── main.py        # FastAPI app entry
│   ├── scripts/           # One-off admin/debug scripts
│   ├── tests/             # Test suite
│   ├── migrations/        # DB migration scripts
│   ├── run.py             # Dev server entry
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (dashboard)/user/call/    # Triage mode selection
│       │   ├── (dashboard)/user/voice-triage/
│       │   └── (dashboard)/user/chat-triage/
│       └── components/
│           ├── ui/         # GlassCard, SentientMotion, etc.
│           └── dashboard/
├── .gemini/skills/ponytail/   # Ponytail lazy-dev skill (project-local)
└── README.md
```

---

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | JWT login |
| `POST` | `/api/calls/start` | Start a triage call |
| `POST` | `/api/calls/{id}/chat` | Stream text chat with AI |
| `POST` | `/api/calls/{id}/voice-text` | Voice triage (text→audio) |
| `GET` | `/api/calls/{id}/summary` | Post-call AI summary |
| `POST` | `/api/twilio/incoming` | Twilio inbound webhook |
| `POST` | `/api/twilio/outbound` | Trigger outbound call |
| `POST` | `/api/twilio/status-callback` | Twilio call end callback |
| `WS` | `/ws/twilio-media` | Gemini Live ↔ Twilio bridge |
| `GET` | `/api/health` | Health check |

---

## Security

- JWT auth on all protected endpoints
- Rate limiting via `slowapi` (100 req/min default)
- Security headers: HSTS, X-Frame-Options, X-XSS-Protection
- Zero-trust audit logging for all write operations
- Encrypted call transcripts (`EncryptedText` column type)

---

*Built with 🔥 by the Dignova AI team*
