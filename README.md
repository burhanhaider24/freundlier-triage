# 🏥 Freundlier Clinical Triage
**An AI-Powered Enterprise Clinical Triage System**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](#)
[![Built with Next.js](https://img.shields.io/badge/Built_with-Next.js_14-black?logo=next.js)](#)
[![Database by Supabase](https://img.shields.io/badge/Database-Supabase-green?logo=supabase)](#)

Freundlier is a next-generation psychological intake platform that uses RAG (Retrieval-Augmented Generation), Multi-LLM failover architectures, and real-time database syncing to safely bridge the gap between patients in distress and clinical professionals.

---

## 🏆 Built by Team Med-Excel
This project was conceptualized, architected, and engineered over a single hackathon weekend by a multi-disciplinary team of medical and tech professionals:

* **Burhan Haider** (M.Phil Biological Sciences) – Lead Architecture & AI Integration
* **Amber Roohee** (Clinical Psychologist) – Clinical Workflow & Psychological Guardrails
* **Maryam Mudassir** (MBBS Student) – Medical Logic & Patient Experience
* **Muhammad Zahid Iqbal** (Pharm D) – Pharmacological Context & System Testing
* **Mehak Jairam** (DPT) – Rehabilitation Triage & QA

---

## 🚀 Key Architectural Features
- **Multi-LLM Failover Engine:** Primary inference via Groq (Llama 3), with an automatic, zero-downtime hot-swap to Google Gemini and OpenRouter if rate limits are hit.
- **Strict Regex Crisis Tripwires:** Bilingual (English/Urdu) crisis detection that intercepts self-harm language, triggers a secondary AI validation, and instantly locks the UI while alerting the doctor.
- **Real-Time Doctor Dashboard:** Built on Supabase web-sockets, allowing clinicians to see live alerts, manage appointments, and view risk assessments instantly.
- **Automated Clinical Artifacts:** Generates formatted, printable PDF clinical summaries directly from the AI triage parsing engine.

---

## 💻 Setup & Instructions
To run this project locally:

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/burhanhaider24/freundlier-triage.git
   \`\`\`
2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
3. **Environment Variables:**
   Create a `.env.local` file in the root directory and add your keys for Supabase, Groq, Gemini, and OpenRouter.
4. **Run the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`
5. **Access the Application:**
   Open [http://localhost:3000/login](http://localhost:3000/login) in your browser.