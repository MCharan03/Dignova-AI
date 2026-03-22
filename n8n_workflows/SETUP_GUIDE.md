# Dignova AI — n8n Nervous System Setup Guide

This guide ensures your **n8n** instance is perfectly synchronized with the **Dignova AI Sentient Core** (Production).

## 1. Import Workflows
Import all 8 `.json` files from this directory into your n8n instance. 
*Note: We have added **Workflow 08 (Neural Training)** for the intern simulation feature.*

## 2. Configure Credentials
Create the following credentials in n8n with these exact names:

| Name | Type | Purpose |
| :--- | :--- | :--- |
| `Dignova Telegram Bot` | Telegram API | Triage & Notification delivery. |
| `Dignova Gmail SMTP` | SMTP | Professional email dispatch. |
| `Dignova Google Calendar` | Google Calendar OAuth2 | Appointment synchronization. |

## 3. Production URL Synchronization
All workflows have been refactored to point to your live backend:
`https://dignova-ai-1.onrender.com`

**Action Required**:
In your **Render Dashboard**, ensure your `N8N_BASE_URL` environment variable is set to your n8n instance's public URL (e.g., `https://your-n8n-instance.app`).

## 4. Workflow Path Mapping
The backend triggers n8n via these paths:

*   `/webhook/dignova-onboarding` — New User Registration
*   `/webhook/dignova-prescription` — PDF Delivery
*   `/webhook/dignova-escalate` — Doctor Triage Alerts
*   `/webhook/dignova-aftercare` — Day-3 Check-ins
*   `/webhook/dignova-calendar` — Google Calendar Sync
*   `/webhook/dignova-geofence` — Arriving Alerts
*   `/webhook/dignova-preventive` — Health Nudges
*   `/webhook/dignova-training-result` — Intern Performance Dossiers

## 5. Local Development Note
If you are testing locally, you must adjust the `BACKEND_URL` inside the n8n HTTP nodes from `https://dignova-ai-1.onrender.com` back to `http://localhost:8000`.

---
*Dignova AI — Autonomous Healthcare Intelligence*
