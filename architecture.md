# Deriv AI Innovation Marketplace

---

# Architecture Overview

Deriv AI Innovation Marketplace is a web application that allows employees to submit innovation ideas and receive AI-powered evaluations, scoring, duplicate detection, and executive summaries.

The architecture is designed for rapid development during a hackathon while remaining scalable enough for future expansion.

---

# Technology Stack

## Frontend

* Next.js 15 (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui
* React Hook Form
* Zod Validation

---

## Backend

* Next.js API Routes
* Firebase Authentication
* Cloud Firestore
* Firebase Storage
* Firebase Hosting (optional)

---

## AI Layer

Primary:

* deepseek-v4-pro

---

# High-Level Architecture

Frontend

↓

Next.js API Routes

↓

Firebase Services

├── Authentication

├── Firestore

├── Storage

└── Analytics (Future)

↓

AI Services

├── 💼 CFO Agent (Chief Finance Officer)

├── ⚖️ CCO Agent (Chief Compliance Officer)

├── 🎯 CGO Agent (Chief Growth Officer)

├── 🛠️ ChEO Agent (Chief Engineering Officer)

├── 👥 CHRO Agent (Chief Human Resources Officer)

├── 🛡️ CSO Agent (Chief Security Officer)

└── Executive Summary Generator

---

# Folder Structure

```text
src/
│
├── app/
│   ├── dashboard/
│   ├── ideas/
│   ├── submit/
│   ├── login/
│   ├── api/
│   │   ├── evaluate/
│   │   ├── summarize/
│   │   ├── similarity/
│   │   └── score/
│
├── components/
│   ├── dashboard/
│   ├── ideas/
│   ├── forms/
│   ├── layout/
│   └── ui/
│
├── lib/
│   ├── firebase/
│   ├── ai/
│   ├── scoring/
│   └── similarity/
│
├── services/
│   ├── ideas.service.ts
│   ├── reviews.service.ts
│   └── users.service.ts
│
├── types/
│
├── hooks/
│
└── utils/
```

---

# Firebase Architecture

## Authentication

Firebase Auth

Supported Providers:

* Email + Password
* Google Login

User Roles:

* Employee
* Manager
* Admin

Store role in Firestore.

---

# Firestore Collections

## users

```json
{
  "id": "uid",
  "name": "John Doe",
  "email": "john@deriv.com",
  "role": "employee",
  "department": "MarTech",
  "createdAt": "timestamp"
}
```

---

## ideas

```json
{
  "id": "idea_id",
  "title": "AI Webinar Planner",
  "description": "Automate webinar campaign creation.",
  "department": "Marketing",
  "category": "Automation",
  "status": "submitted",
  "innovationScore": 87,
  "createdBy": "uid",
  "createdAt": "timestamp"
}
```

---

## reviews

```json
{
  "id": "review_id",
  "ideaId": "idea_id",
  "agentType": "business",
  "score": 9,
  "analysis": "Strong productivity impact."
}
```

---

## votes

```json
{
  "ideaId": "idea_id",
  "userId": "uid",
  "vote": 1
}
```

---

## comments

```json
{
  "ideaId": "idea_id",
  "userId": "uid",
  "comment": "Great idea",
  "createdAt": "timestamp"
}
```

---

## summaries

```json
{
  "ideaId": "idea_id",
  "summary": "Executive summary content",
  "generatedAt": "timestamp"
}
```

---

## embeddings

```json
{
  "ideaId": "idea_id",
  "embedding": [0.12, 0.55, 0.92]
}
```

Note:

For MVP, embeddings can remain in Firestore.

For production scale:

* Pinecone
* Weaviate
* Vertex AI Vector Search

---

# API Architecture

## POST /api/ideas

Purpose:

Create new idea.

Actions:

* Save idea
* Trigger AI evaluation
* Trigger similarity detection
* Generate executive summary

Returns:

```json
{
  "success": true,
  "ideaId": "123"
}
```

---

## POST /api/evaluate

Purpose:

Run AI evaluation agents.

Returns:

```json
{
  "business": 9,
  "feasibility": 7,
  "innovation": 8,
  "employeeImpact": 8
}
```

---

## POST /api/similarity

Purpose:

Find similar ideas.

Returns:

```json
{
  "similarIdeas": [
    {
      "title": "Automated Webinar Tool",
      "similarity": 92
    }
  ]
}
```

---

## POST /api/summarize

Purpose:

Generate executive summary.

Returns:

```json
{
  "summary": "..."
}
```

---

## GET /api/dashboard

Purpose:

Dashboard statistics.

Returns:

```json
{
  "totalIdeas": 50,
  "topScore": 95,
  "mostVoted": 120
}
```

---

# AI Agent Architecture

The evaluation pipeline contains 6 specialized C-Suite AI agents divided into two functional councils:

## 1. Strategic Council

### 💼 CFO Agent (Chief Finance Officer)
*   **Key Focus:** Financial viability, revenue generation potential, operational cost reduction, and business ROI.
*   **Database Key:** `business`
*   **Persona Prompt:** Critique the financial viability of this idea. Evaluate its potential for revenue generation, cost saving, and operational ROI. Give a score from 0-100 indicating financial return and viability.

### ⚖️ CCO Agent (Chief Compliance Officer)
*   **Key Focus:** Regulatory alignment, policy adherence, legal constraints, IP, and licensing compliance.
*   **Database Key:** `innovation`
*   **Persona Prompt:** Audit this idea for regulatory alignment, policy adherence, legal constraints, intellectual property issues, and licensing compliance. Give a score from 0-100 indicating safety from compliance risks.

### 🎯 CGO Agent (Chief Growth Officer)
*   **Key Focus:** User acquisition, customer delight, onboarding friction, and market-facing scalability.
*   **Database Key:** `customerImpact`
*   **Persona Prompt:** Assess user acquisition, customer delight, onboarding friction, retention impact, and market-facing scalability. Give a score from 0-100 on customer and market growth impact.

---

## 2. Execution Council

### 🛠️ ChEO Agent (Chief Engineering Officer)
*   **Key Focus:** Technical feasibility, infrastructure, scaling limitations, and development complexity.
*   **Database Key:** `feasibility`
*   **Persona Prompt:** Critically analyze technical feasibility, architecture requirements, infrastructure impact, scaling limitations, and development complexity. Give a score from 0-100 representing technical ease of implementation.

### 👥 CHRO Agent (Chief Human Resources Officer)
*   **Key Focus:** Employee productivity, workflow disruption, change management, training, and cultural fit.
*   **Database Key:** `employeeImpact`
*   **Persona Prompt:** Evaluate how this idea impacts employee workflow, organizational culture, change management, training timelines, and employee productivity. Give a score from 0-100 on organizational synergy.

### 🛡️ CSO Agent (Chief Security Officer)
*   **Key Focus:** Security posture, data privacy implications (GDPR/PII), vulnerability exposure, and threat surface.
*   **Database Key:** `security`
*   **Persona Prompt:** Evaluate the security posture, data privacy implications (GDPR/PII), vulnerability exposure, and threat surface. Give a score from 0-100 representing the strength of security risk mitigation.

---

# Scoring Engine

Formula:

The weighted consensus score is calculated from the individual C-Suite evaluation scores:

```typescript
finalScore =
  CFO (business) * 0.25 +
  ChEO (feasibility) * 0.20 +
  CHRO (employeeImpact) * 0.15 +
  CCO (innovation) * 0.15 +
  CSO (security) * 0.15 +
  CGO (customerImpact) * 0.10;
```

---

# Similarity Detection

Workflow:

New Idea

↓

Generate Embedding

↓

Load Existing Embeddings

↓

Calculate Cosine Similarity

↓

Return Similar Ideas

Threshold:

```typescript
0.85
```

Meaning:

85% similarity or higher.

---

# Executive Summary Generator

Prompt Structure

Input:

* Idea Title
* Description
* AI Reviews

Output:

* Problem Statement
* Proposed Solution
* Benefits
* Risks
* Recommendation

Maximum:

300 words

---

# Dashboard Widgets

## Overview

* Total Ideas
* Ideas This Month
* Approved Ideas
* Average Innovation Score

---

## Rankings

* Top Rated Ideas
* Most Voted Ideas
* Most Discussed Ideas

---

## Analytics

* Ideas by Department
* Ideas by Category
* Innovation Trends

---

# Security Rules

Users:

* Read all ideas
* Create own ideas
* Vote
* Comment

Managers:

* Read all
* Review ideas

Admins:

* Full access

---

# Environment Variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

GEMINI_API_KEY=
```

---

# MVP Definition

MVP is complete when:

✅ User authentication works

✅ Idea submission works

✅ AI evaluation works

✅ Innovation score generated

✅ Similar idea detection works

✅ Executive summary generated

✅ Voting works

✅ Comments work

✅ Dashboard displays insights

---

# Completed Advanced Engineering Features & Future Enhancements

The following advanced engineering capabilities are fully implemented in the prototype:

*   **Slack Integration:** Instant alerts and review summaries pushed to Slack channels.
*   **ClickUp Integration:** Automated, structured task breakdown pushing straight into ClickUp.
*   **AI PRD Generator:** Automated, highly detailed Product Requirement Document drafting.
*   **AI Roadmap Generator:** Dynamic development roadmap milestones and timelines.
*   **Local Agent Loop Task System:** Zero-dependency standalone sandbox script `agent_loop.js` compiling code locally with dynamic interactive continuation terminal prompts.

## Future Scope (Phase 2)

*   Deriv Brain Integration (Semantic knowledge retrieval)
*   AI Innovation Council (Collaborative multi-agent consensus debate)
*   Department-Specific Custom AI Agent Personas
