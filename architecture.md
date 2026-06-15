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

* gemini-3.5-flash

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

├── Idea Evaluation Agent

├── Feasibility Agent

├── Innovation Agent

├── Employee Impact Agent

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

## Agent 1

Business Impact Agent

Responsibilities:

* Revenue potential
* Cost reduction
* Productivity gain

Output:

```json
{
  "score": 9,
  "analysis": "High impact"
}
```

---

## Agent 2

Feasibility Agent

Responsibilities:

* Technical complexity
* Resources required
* Timeline

Output:

```json
{
  "score": 7,
  "analysis": "Medium complexity"
}
```

---

## Agent 3

Employee Impact Agent

Responsibilities:

* Employee productivity
* Adoption potential
* Department coverage

Output:

```json
{
  "score": 8,
  "analysis": "Affects multiple teams"
}
```

---

## Agent 4

Innovation Agent

Responsibilities:

* Creativity
* Strategic advantage
* Competitive value

Output:

```json
{
  "score": 8,
  "analysis": "Novel solution"
}
```

---

# Scoring Engine

Formula:

```typescript
finalScore =
businessImpact * 0.4 +
feasibility * 0.25 +
employeeImpact * 0.2 +
innovation * 0.15;
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

# Future Enhancements

Phase 2:

* Slack Integration
* ClickUp Integration
* Deriv Brain Integration
* AI PRD Generator
* AI Roadmap Generator
* AI Innovation Council
* Department-Specific AI Agents

These are intentionally excluded from the hackathon MVP.
