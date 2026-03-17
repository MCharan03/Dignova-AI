# Dignova AI — n8n + Telegram Setup Guide

## What You Need to Do Manually (Step-by-Step)

---

## Step 1: Start n8n Locally

```powershell
# In a NEW terminal window:
npx n8n
```

n8n will open at **http://localhost:5678**. Create a free account on first launch.

---

## Step 2: Create Your Telegram Bot

1. Open Telegram → search for **@BotFather**
2. Send: `/newbot`
3. Choose a name: `Dignova AI` 
4. Choose a username: `dignovaai_bot` (must be unique)
5. Copy the **Token** you receive (looks like `1234567890:ABCDEFG...`)

6. Add the token to your `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_actual_token_here
   ```

---

## Step 3: Get an OpenRouter API Key

1. Go to **https://openrouter.ai/keys**
2. Sign up (free) → Create API Key
3. Add to `.env`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENROUTER_MODEL=google/gemini-flash-1.5
   ```

> **Free model tip:** `google/gemini-flash-1.5` has a free daily limit and is fast for triage. For whisper transcription, `openai/whisper-large-v3` requires credits.

---

## Step 4: Set Up ngrok (For Local Testing)

n8n needs a public URL to receive Telegram webhooks. Use ngrok:

```powershell
# Install (once) - https://ngrok.com/download
# Then run:
ngrok http 5678
```

Copy the `https://xxxx.ngrok-free.app` URL — this is your **n8n public URL**.

Also run for the backend:
```powershell
ngrok http 8000
```
Copy that URL as your **backend public URL** and update `.env`:
```
BACKEND_URL=https://xxxx.ngrok-free.app
N8N_BASE_URL=https://yyyy.ngrok-free.app
```

---

## Step 5: Set Up n8n Credentials

In n8n UI (http://localhost:5678):

### 5a. Telegram Credential
1. Go to **Settings → Credentials → Add Credential**
2. Choose **Telegram API**
3. Paste your Bot Token
4. Save as: `Dignova Telegram Bot`

### 5b. Gmail SMTP Credential
1. **Add Credential → SMTP**
2. Host: `smtp.gmail.com`, Port: `587`
3. User: `cherrycostech@gmail.com`
4. Password: `ksks yfgv rgkd vtvw` (your App Password)
5. Save as: `Dignova Gmail SMTP`

### 5c. Google Calendar OAuth (Workflow 5 only)
1. Go to **console.cloud.google.com** → New Project
2. Enable **Google Calendar API**
3. Create **OAuth 2.0 credentials** → Web Application
4. Add redirect URI: `http://localhost:5678/rest/oauth2-credential/callback`
5. Copy Client ID + Secret to `.env`
6. In n8n: **Add Credential → Google Calendar OAuth2 API**
7. Paste Client ID + Secret → Connect Google Account

---

## Step 6: Import All 7 Workflows

In n8n: **Workflows → Import from File**

Import these files in order from `n8n_workflows/`:

| File | Workflow |
|---|---|
| `workflow_01_onboarding.json` | Welcome email + Telegram greeting |
| `workflow_02_zero_touch_rx.json` | Voice/Text → AI → Auto-Prescription |
| `workflow_03_doctor_escalation.json` | Doctor Highlight Card + Approve/Modify |
| `workflow_04_aftercare.json` | Day-3 inline button follow-up |
| `workflow_05_calendar.json` | Google Calendar 24h reminder |
| `workflow_06_geofence.json` | Live location → 500m check-in |
| `workflow_07_preventive.json` | Annual/semi-annual check-up nudge |

After importing each:
1. Open the workflow
2. Click all **Telegram nodes** → select `Dignova Telegram Bot` credential
3. Click all **Email nodes** → select `Dignova Gmail SMTP` credential
4. For Workflow 5 → select `Dignova Google Calendar` credential
5. **Activate** the workflow (top-right toggle)

---

## Step 7: Set Telegram Bot Webhook

After n8n is running and ngrok is active, register the Telegram webhook:

```powershell
# Replace YOUR_BOT_TOKEN and YOUR_NGROK_URL:
Invoke-WebRequest -Uri "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_NGROK_URL/webhook/dignova-telegram-bot" -Method GET
```

Expected response: `{"ok":true,"result":true}`

---

## Step 8: Start the Dignova AI Backend

```powershell
# From the project root:
.\venv\Scripts\python.exe run.py
```

Backend starts at **http://localhost:8000**

---

## Step 9: Update Your Hospital GPS Coordinates

In `.env`, update:
```
HOSPITAL_LAT=your_hospital_latitude
HOSPITAL_LON=your_hospital_longitude
```

Example (Hyderabad): `17.4486`, `78.3908`

---

## Step 10: Test Each Workflow

### Test 1 — Welcome Email
Register a new user via the frontend → check inbox for branded HTML email.

### Test 2 — Bot Triage (Text)
Message your Telegram bot: *"I have a headache and mild fever since yesterday"*

### Test 3 — Voice Note (Auto-Prescription)
Send a voice note: *"I have seasonal allergies, I need a prescription for antihistamines"*  
→ Should receive PDF within ~10 seconds

### Test 4 — Doctor Escalation (Red Flag)
Send: *"I have chest pain and fever for 4 days and difficulty breathing"*  
→ Doctor's Telegram gets Highlight Card with Approve/Modify buttons

### Test 5 — Aftercare Ping
```powershell
# Manual test (POST to backend):
Invoke-RestMethod -Uri "http://localhost:8000/api/n8n/webhook/preventive-check" -Method POST -ContentType "application/json" -Body '{"mode": "aftercare"}'
```

### Test 6 — Geofence Check-in
Share your *Live Location* in Telegram within 500m of hospital coordinates.

### Test 7 — Preventive Care
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/n8n/webhook/preventive-check" -Method POST -ContentType "application/json" -Body '{"mode": "annual"}'
```

---

## Architecture Summary

```
Telegram User
     │
     ▼
  n8n Bot (Receive message / voice / location / callback)
     │
     ├─── Text/Voice ──► POST /api/n8n/webhook/voice or /triage
     │                        │
     │                   OpenRouter AI Triage
     │                        │
     │              ┌───────────────────────┐
     │              │ LOW RISK + HIGH CONF  │──► Auto-Generate PDF
     │              │                       │──► Email Receipt
     │              │                       │──► Telegram: Send PDF
     │              ├───────────────────────┤
     │              │ RED FLAG / LOW CONF   │──► Highlight Card
     │              │                       │──► Doctor Telegram
     │              │                       │──► Doctor Approves
     │              │                       │──► Prescription to Patient
     │              └───────────────────────┘
     │
     ├─── Location ──► POST /api/n8n/webhook/geofence-checkin
     │                      │
     │               500m check ──► Auto Check-In + Doctor Alert
     │
     └─── Callback ──► POST /api/n8n/webhook/doctor-approval
                            │             /aftercare-response
                            │             /calendar-action
                            ▼
                      DB Update + n8n Response to Telegram
```
