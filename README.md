# 💡 Deriv AI Innovation Marketplace

An AI-powered, multi-agent platform designed to capture, evaluate, and prioritize employee innovation ideas into structured, data-driven business initiatives across all **Deriv** offices.

The **AI Innovation Marketplace** focuses on decision-making support, multi-agent evaluation councils, duplicate detection, and project prioritization.

---

## 🚀 Key Features

*   **Idea Ingestion & Form Validation:** Rich fields capturing Title, Category, Department, Description, and Expected Benefits.
*   **AI C-Suite Council Evaluation:** 6 specialized AI agents critique every proposal in parallel and render distinct professional reviews.
*   **Consensus-Based Innovation Scoring:** A mathematically weighted scoring formula generating an overall innovation score out of 100.
*   **Semantic Duplicate Detection:** Similarity analysis using text embeddings to identify duplicate or overlapping proposals.
*   **Executive Summary Generator:** Produces under-one-minute management-ready summaries detailing the problem, solution, benefits, risks, and recommendations.
*   **Interactive Collaboration Dashboard:** Supports employee voting, nested commenting, department-specific rankings, and overall trend analysis.
*   **Local Agent Loop & Auto-Build Task Integration:** Standalone, zero-dependency `agent_loop.js` that compiles code locally and prompts the user in the terminal with a dynamic interactive prompt to run another 5 cycles to complete building.
*   **AI-Powered PRD & Roadmap Generator:** One-click automated PRD specifications drafting and structured implementation roadmap generation.
*   **Slack & ClickUp Integrations:** Seamlessly push approved ideas to Slack channels and generate ready-to-work tasks on ClickUp.

---

## 🏢 The 6 AI C-Suite Agents & Scoring Engine

Each idea is evaluated asynchronously by six specialized agent personas defined in `src/lib/ai/evaluation.ts`:

### ⚖️ 1. Strategic Council
*   **💼 CFO Agent (Chief Finance Officer):** Assesses financial ROI, revenue generation potential, and operational cost savings. *(Weight: 25%)*
*   **⚖️ CCO Agent (Chief Compliance Officer):** Audits regulatory alignment, policy adherence, legal/IP issues, and licensing safety. *(Weight: 15%)*
*   **🎯 CGO Agent (Chief Growth Officer):** Evaluates user acquisition friction, customer satisfaction, and market scalability. *(Weight: 10%)*

### 🛠️ 2. Execution Council
*   **🛠️ ChEO Agent (Chief Engineering Officer):** Critiques architecture complexity, tech feasibility, scaling limitations, and infrastructure. *(Weight: 20%)*
*   **👥 CHRO Agent (Chief Human Resources Officer):** Evaluates employee change management, disruption overhead, training requirements, and cultural alignment. *(Weight: 15%)*
*   **🛡️ CSO Agent (Chief Security Officer):** Audits security vulnerability vectors, data privacy policies, and threat surface exposures. *(Weight: 15%)*

### 📊 Scoring Formula
The overall consensus **Innovation Score** is calculated as follows:

$$\text{Innovation Score} = (S_{\text{CFO}} \times 0.25) + (S_{\text{ChEO}} \times 0.20) + (S_{\text{CHRO}} \times 0.15) + (S_{\text{CCO}} \times 0.15) + (S_{\text{CSO}} \times 0.15) + (S_{\text{CGO}} \times 0.10)$$

---

## 🛠️ Technology Stack

*   **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
*   **Database & Auth:** Google Firebase Auth, Cloud Firestore (NoSQL, Vector Search)
## 🤖 AI Technology
*   **AI Layer:** `deepseek-v4-pro` via OpenAI-compatible SDK (LiteLLM proxy at `litellmsa.deriv.ai`)
*   **Model:** DeepSeek V4 Pro (with OpenAI SDK compatibility)
*   **Validation:** React Hook Form & Zod Schema enforcement

---

## ⚙️ Development & Setup

### 1. Environment Configuration
Create a `.env` file in the root directory (copy from `.env.example`):

```env
# OpenAI / LiteLLM
OPENAI_API_KEY=your_api_key
API_BASE_URL=https://litellmsa.deriv.ai/v1
OPENAI_MODEL_NAME=deepseek-v4-pro

# Firebase (set to false for mock DB, true for real Firestore)
NEXT_PUBLIC_USE_FIREBASE=true
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 2. Dependency Installation
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Database Seed
For testing and demonstration, navigate to the `/api/seed` endpoint or click the seed button to pre-populate mock ideas, historical user votes, and baseline AI comments.

---

## 🔒 Security Compliance
This project strictly adheres to OWASP, GDPR/PII protection, and least-privilege Firestore rules. Secrets and API keys must **never** be committed to version control and are guarded in local memory.
