# 🏥 Freundlier Clinical Triage
**Safety-Engineered AI for Mental Health Intake**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](#)
[![Built with Next.js](https://img.shields.io/badge/Built_with-Next.js_14-black?logo=next.js)](#)
[![Database by Supabase](https://img.shields.io/badge/Database-Supabase-green?logo=supabase)](#)

Freundlier is an AI-powered clinical triage system designed to support mental health intake workflows through structured conversation, crisis detection, and real-time clinician reporting. Built during the 48-hour HEC Generative AI Hackathon, Freundlier demonstrates how Generative AI can be responsibly deployed in high-risk healthcare environments.



---

## 🔑 Live Demo Credentials
We invite the judges to test the live Multi-LLM triage and real-time dashboard themselves:

**🔗 Live App:** [https://freundlier-triage.vercel.app](https://freundlier-triage.vercel.app)

* **👨‍⚕️ Clinician View:** `dramber@freundlier.com` | PW: `123456`
* **🤒 Patient 1 (Male, 23):** `patient1@freundlier.com` | PW: `123456`
* **🤒 Patient 2 (Female, 22):** `patient2@freundlier.com` | PW: `123456`

---

## 🧠 System Overview
Freundlier is not a generic chatbot wrapper. It combines **RAG**, **Multi-LLM failover orchestration**, **Regex-anchored crisis detection**, and **Real-time clinician dashboards** to create a controlled, safety-aware AI intake pipeline.

### ⚙️ Architecture Highlights

*(Drop a screenshot of your Architecture Diagram or Patient Chat here!)*

* **🔁 Multi-LLM Failover Engine:** Primary inference via Groq (LLaMA 3). Automatic zero-downtime hot-swap to OpenRouter (Meta-Llama) and Google Gemini if rate limits occur. 
* **🛡️ Bilingual Crisis Tripwires:** English + Urdu regex boundary detection with secondary LLM validation before escalation. Instantly locks the session on confirmed risk.
* **📚 RAG-Grounded Responses:** Gemini embeddings generate semantic vectors, retrieving relevant CBT knowledge from Supabase to reduce hallucination risk.
* **📊 Real-Time Doctor Workspace:** Live triage queue via Supabase subscriptions, visual risk indicators, and printable clinical PDF exports.

---

## 🌍 Impact & Alignment
Freundlier supports:
* **SDG 3 (Target 3.4):** Early detection and structured intervention for mental health risk.
* **SDG 9:** Resilient AI healthcare infrastructure.
* **SDG 10 (Target 10.8):** Bilingual access to reduce healthcare inequality.

## 💼 Business Model
Designed as a subscription-based SaaS platform for clinics and hospitals:
* **Basic Tier:** AI Triage + Dashboard
* **Pro Tier:** Structured Reports + Priority Alerts
* **Enterprise Tier:** EHR Integration + Custom Deployment

---

## 👥 Built by Team Med-Excel
Developed by a multidisciplinary medical and life sciences team for the HEC Generative AI Training (sponsored by HEC-Pakistan, ULEF-PK, & NCEAC):

* **Burhan Haider** (M.Phil Biological Sciences) – Lead Architecture & AI Integration
* **Amber Roohee** (Clinical Psychologist) – Clinical Guardrails & Workflow
* **Maryam Mudassir** (MBBS Student) – Medical Logic & Patient UX
* **Muhammad Zahid Iqbal** (Pharm D) – Pharmacological Context & Testing
* **Mehak Jairam** (DPT) – Rehabilitation Triage & QA

---

## 🚀 Local Setup
1. **Clone the repository:** `git clone https://github.com/burhanhaider24/freundlier-triage.git`
2. **Install dependencies:** `npm install`
3. **Environment Variables:** Create a `.env.local` file with keys for Supabase, Groq, Gemini, and OpenRouter.
4. **Run development server:** `npm run dev`

> **⚠️ Disclaimer:** Freundlier is a hackathon prototype and is not intended to replace licensed mental health professionals.
