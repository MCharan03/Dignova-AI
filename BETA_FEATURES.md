# Dignova AI: Sentient OS Layer - Feature Roadmap

This document tracks the evolution of Dignova-AI from a triage tool to a sentient OS-inspired medical layer.

## 1. Emotional & Vital Telemetry (Voice Analysis)
- **Goal**: Detect stress, urgency, and pain levels from vocal tone during live streaming.
- **Tech**: Gemini 2.0 (Multimodal Audio) or specialized sentiment analysis.
- **Status**: **In Progress** (Integrated into Sentient Backbone via system prompts).

## 2. Passive Multimodal Awareness (Visual Triage)
- **Goal**: Analyze wound photos, prescriptions, and medical monitors via Gemini Vision.
- **Tech**: Gemini 1.5 Flash (Multimodal).
- **Status**: **Refactored** (Core logic moved to n8n vision nodes for easier maintenance).

## 3. Hospital Homeostasis (Self-Healing Resource Management)
- **Goal**: Proactively re-allocate resources based on surge patterns detected in the node network.
- **Tech**: Background task for predictive analytics.
- **Status**: **In Progress** (Aggregated analytics now driving Admin Dashboard metrics).

## 4. Interactive 3D Medical HUD (Digital Twin)
- **Goal**: Respond to triage states with a 3D avatar highlighting affected areas on the dashboard.
- **Tech**: React Three Fiber / Drei.
- **Status**: **Backlog** (Unused prototype removed for project optimization).

---

## [COMPLETED]

### Sentient Backbone (Real-time Voice Streaming)
- **Description**: Transitioned from walkie-talkie style calls to real-time, low-latency WebSocket streaming using Direct App Audio Streams and Gemini 2.0 Multimodal Live API.
- **Features**: Immediate interruption, emotional tone detection, and background ambient listening.
- **Status**: Completed.

### System Overrides & Control Panel
- **Description**: Added a comprehensive "Admin Overrides" interface to control every aspect of the engine (Telemetry, Security, Nodes, Aesthetics, API).
- **Status**: Completed & Seeding Logic Verified.

### Admin Promotion & DB Initialization
- **Description**: Promoted user mallelacharankumar@gmail.com to Admin and initialized new system setting keys in the database.
- **Status**: Completed.
