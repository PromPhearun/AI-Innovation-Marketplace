# Deriv AI Innovation Marketplace

## Project Overview

Deriv AI Innovation Marketplace is an AI-powered platform that transforms employee ideas into structured, data-driven business initiatives.

The platform enables employees across all Deriv offices to submit innovation ideas, receive instant AI-powered evaluations, identify similar initiatives, estimate business impact, and help management prioritize the most valuable opportunities.

Unlike Deriv Brain, which focuses on knowledge retrieval and answering questions, Deriv AI Innovation Marketplace focuses on decision-making, innovation management, and idea prioritization.

---

# Problem Statement

Innovation ideas are often scattered across Slack conversations, meetings, emails, ClickUp tasks, and informal discussions.

As a result:

* Valuable ideas are lost or forgotten.
* Similar ideas are repeatedly proposed.
* Employees lack visibility into innovation initiatives.
* Management struggles to evaluate and prioritize ideas efficiently.
* Business impact and ROI are difficult to estimate consistently.

The company needs a centralized platform that captures, evaluates, and prioritizes innovation opportunities.

---

# Project Goal

Build a web-based AI Innovation Marketplace where employees can:

1. Submit innovation ideas.
2. Receive AI-generated business evaluations.
3. Detect duplicate or similar ideas.
4. Generate executive summaries automatically.
5. Vote and comment on ideas.
6. View a prioritized innovation dashboard.

The platform should help leadership identify high-impact initiatives while encouraging a culture of innovation across the organization.

---

# Target Users

## Employees

* Submit ideas
* Vote on ideas
* Comment on ideas
* Track idea status

## Managers

* Review ideas
* View AI evaluations
* Monitor innovation trends

## Leadership

* View prioritized initiatives
* Analyze business impact
* Identify high-value opportunities

---

# Core Features (MVP)

## 1. Idea Submission

Employees can submit ideas with:

* Title
* Description
* Department
* Category
* Expected Benefits

Example:

Title:
AI Webinar Campaign Planner

Description:
Automate webinar campaign planning and execution using AI.

---

## 2. AI Multi-Agent Evaluation

When an idea is submitted, six specialized C-Suite AI Agents automatically audit and critique the proposal from their professional perspectives:

### 💼 CFO (Chief Finance Officer)
*   **Focus:** Financial viability, revenue generation potential, operational cost reduction, and business ROI.
*   **Metric:** Score (0-100) indicating financial return and viability.

### 🛠️ ChEO (Chief Engineering Officer)
*   **Focus:** Technical feasibility, architecture requirements, infrastructure impact, scaling limitations, and development complexity.
*   **Metric:** Score (0-100) representing technical ease of implementation.

### 👥 CHRO (Chief Human Resources Officer)
*   **Focus:** Employee workflow, organizational culture, change management, training timelines, and employee productivity.
*   **Metric:** Score (0-100) on organizational synergy.

### ⚖️ CCO (Chief Compliance Officer)
*   **Focus:** Regulatory alignment, policy adherence, legal constraints, intellectual property issues, and licensing compliance.
*   **Metric:** Score (0-100) indicating safety from compliance risks.

### 🛡️ CSO (Chief Security Officer)
*   **Focus:** Security posture, data privacy implications (GDPR/PII), vulnerability exposure, and threat surface.
*   **Metric:** Score (0-100) representing the strength of security risk mitigation.

### 🎯 CGO (Chief Growth Officer)
*   **Focus:** User acquisition, customer delight, onboarding friction, retention impact, and market-facing scalability.
*   **Metric:** Score (0-100) on customer and market growth impact.

---

## 3. Innovation Scoring

Generate an overall weighted Innovation Score (0-100) based on all six C-Suite evaluations.

Mathematical Consensus Formula:

```typescript
Final Score =
  CFO (business) * 0.25 +
  ChEO (feasibility) * 0.20 +
  CHRO (employeeImpact) * 0.15 +
  CCO (innovation) * 0.15 +
  CSO (security) * 0.15 +
  CGO (customerImpact) * 0.10;
```

Display:
* Overall Score (0-100) with classification (e.g., Transformational, High Value, Promising, Needs Review)
* Individual C-Suite Scores & Detailed Critical Analysis
* AI Recommendations & Combined Action Steps

---

## 4. Duplicate Idea Detection

Before creating a new idea:

* Generate embeddings for all ideas.
* Compare similarity scores.
* Identify duplicate or related ideas.

Example:

Current Idea:
AI Webinar Campaign Planner

Existing Idea:
Automated Webinar Creation Tool

Similarity:
92%

Prompt user to collaborate instead of creating duplicates.

---

## 5. Executive Summary Generator

Automatically generate a management-ready summary.

Include:

* Problem
* Proposed Solution
* Expected Benefits
* Estimated Impact
* Recommendation

This summary should be readable in less than one minute.

---

## 6. Voting and Collaboration

Employees can:

* Upvote ideas
* Comment on ideas
* Follow ideas
* Track progress

---

## 7. Management Dashboard

Display:

* Top-Rated Ideas
* Most Voted Ideas
* Newest Ideas
* Ideas by Department
* Ideas by Category

Provide visibility into innovation activity across the company.

---

# Technical Requirements

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui

---

## Backend

* Firebase

Services:

* Authentication
* Firestore (NoSQL Database)
* Cloud Storage
* Vector Search (Firestore Vector Search / Embeddings)

---

## AI

Preferred:

* deepseek-v4-pro

---

## Duplicate Detection

Use Jaccard similarity + title match bonus (token-based engine in `src/lib/ai/similarity.ts`) for:

* Duplicate Detection
* Similar Idea Discovery

Thresholds: ≥50% = critical duplicate, ≥30% = potential similar.

---

# Database Entities

## Ideas

* id
* title
* description
* department
* category
* status
* innovation_score
* created_by
* created_at

---

## AI Reviews

* id
* idea_id
* reviewer_type
* score
* analysis

---

## Votes

* id
* idea_id
* user_id
* vote

---

## Comments

* id
* idea_id
* user_id
* comment

---

# Success Criteria

The MVP is successful if users can:

* Submit ideas successfully.
* Receive AI evaluations within seconds.
* View innovation scores.
* Detect similar ideas automatically.
* Generate executive summaries.
* Vote and collaborate on ideas.
* View a ranked innovation dashboard.

---

# Completed Advanced Features & Future Enhancements

The following advanced, future-scope engineering features are fully implemented in this prototype:

*   **Slack Channel Integration:** Pushes idea details and C-suite evaluations directly to Slack.
*   **ClickUp Integration:** Scaffolds full, action-itemized software tasks on ClickUp boards.
*   **AI-Generated PRDs:** Drafts complete, highly polished Product Requirement Documents.
*   **AI Roadmap Generation:** Automatically plans multi-phased development schedules and timelines.
*   **Local Agent Loop Task System:** Standalone sandbox execution script `agent_loop.js` that locally compiles, verifies packages, and prompts the user in the terminal to interactively add more compilation cycles dynamically.

## Future Scope (Phase 2)

*   Deriv Brain Integration (Semantic knowledge base search)
*   Single Sign-On (SSO) Enterprise integration
*   Department-Specific Custom AI Agent Personas
*   Advanced Interactive Innovation Analytics Dashboard

---

# Vision Statement

Create a culture where every employee can contribute ideas, receive immediate AI-powered feedback, and help shape the future of Deriv through a transparent and data-driven innovation process.
