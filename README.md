# Dignova AI - Sentient Hospital Management System

Dignova AI is a next-generation, AI-driven hospital management and triage system designed to act as a "Sentient OS Layer" over traditional healthcare workflows. It features an advanced triage agent, real-time doctor intervention portals, robust automated workflows via n8n, and a fully decoupled architecture.

## 🌟 Key Features

* **AI Triage Agent:** A state-of-the-art conversational AI that interacts with patients, assesses symptoms, Determines severity (Critical, Elevated, Standard), and automatically reserves hospital resources.
* **Doctor Command Center:** A specialized dashboard for medical professionals to monitor the live triage queue, evaluate AI accuracy, and intervene in critical cases instantly.
* **Live Intervention Terminal:** Doctors can silently monitor AI-patient interactions via a live-streaming transcript and instantly take over the conversation when necessary.
* **Separated Architecture:** Clean decoupling of the Next.js frontend and the FastAPI backend, ensuring optimal developer experience and scalability.
* **Automated n8n Workflows:** Fully integrated n8n workflows for zero-touch prescription delivery, dynamic resource allocation, automated billing, and Telegram bot notification systems.
* **Dark Mode & 3D Aesthetics:** A highly polished "anti-gravity" UI utilizing Framer Motion, React Three Fiber, and sleek glassmorphism to provide an immersive, premium experience.

---

## 📸 Screenshots

*(Replace these placeholders with actual screenshots of your application)*

* **Landing Page:** `![Landing Page](./docs/landing-page.png)`
* **Patient Dashboard & AI Chat:** `![Patient Dashboard](./docs/patient-chat.png)`
* **Doctor Command Center:** `![Doctor Dashboard](./docs/doctor-dashboard.png)`
* **Live Intervention Terminal:** `![Intervention Terminal](./docs/intervention.png)`
* **n8n Automation Workflows:** `![n8n Workflows](./docs/n8n-workflows.png)`

---

## ⚙️ A-Z Setup Guide

The application is thoroughly decoupled. You will need to run the **Backend (FastAPI)**, the **Frontend (Next.js)**, and the **Automations (n8n)** independently.

### Prerequisites
* Python 3.10+
* Node.js 18+ & npm
* Docker & Docker Compose (for n8n & Redis)
* A Gemini API Key from Google AI Studio
* A Telegram Bot Token

### 1. Backend Setup (FastAPI)

The backend powers the database, the AI agent integrations, and the API endpoints.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Copy .env.example to .env and configure it
cp .env.example .env 
```

**Essential `.env` configurations for Backend:**
```ini
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./dignova.db
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_jwt_secret_key
# For the pharmacy workflow
PHARMACY_BASE_URL=https://your-store.com/dignova-bridge
```

**Run the Backend:**
```bash
uvicorn app.main:app --reload --port 8000
```
*The backend API will be available at `http://localhost:8000`.*

### 2. Frontend Setup (Next.js)

The frontend is a standalone Next.js application that proxies API requests to the backend during development.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
*The application will be available at `http://localhost:3000`.*

### 3. Automations Setup (n8n & Redis)

Dignova uses n8n for heavily automated background tasks (billing, zero-touch prescriptions).

**Start Services:**
```bash
docker-compose up -d
```
*This starts n8n (port 5678) and Redis (port 6379).*

**Import Workflows:**
1. Navigate to `http://localhost:5678` and set up your owner account.
2. Generate an API key in n8n (Settings > API).
3. Update `n8n_workflows/activate_all.py` with your new `N8N_API_KEY`.
4. Run the activation script to inject all Dignova workflows:
```bash
cd n8n_workflows
python activate_all.py
```
5. Add your Telegram Bot and Gmail credentials directly within the n8n UI, ensuring they are linked to the workflows.

---

## 🏗 Architecture Details

### The Frontend (Next.js App Router)
- Built with React 18, Tailwind CSS, Framer Motion, and Lucide Icons.
- Standard Client/Server Component split.
- Dynamic routes handled seamlessly through standalone Next.js.
- API requests correctly proxied to port 8000 via `next.config.mjs` `rewrites`.

### The Backend (FastAPI + SQLAlchemy)
- Pure REST API utilizing asynchronous routing.
- Handles JWT Authentication and Role-Based Access Control (Patient vs. Doctor).
- Integrates Google's `gemini-2.0-flash` for high-speed triage analysis.

### System Flow
1. **Patient connects:** Patient clicks "Call Agent" on Next.js UI.
2. **AI Triage:** The Next.js frontend connects directly to the FastAPI chatbot endpoint, which leverages Gemini to determine condition severity.
3. **Database Sync:** The call and transcript are continuously saved via SQLAlchemy.
4. **Doctor Oversight:** The Doctor Command Center polls FastAPI for active queue updates.
5. **Intervention:** Doctors can monitor streams and take over the chat dynamically.
6. **Automation:** Upon triage completion, FastAPI triggers n8n webhooks to finalize prescriptions and send notifications.

---

## 🚨 Troubleshooting

* **Gemini 429 Errors (Rate Limits):** Ensure you have sufficient quota. The backend has exponential backoff retry logic built-in to mitigate standard limit hits.
* **CORS Issues:** Ensure `FRONTEND_URL` in the `.env` perfectly matches the URL Next.js is running on (e.g., `http://localhost:3000`).
* **Missing Workflows:** If n8n workflows fail to import, ensure the `N8N_API_KEY` in `activate_all.py` has *Workflow Read/Write* permissions.
