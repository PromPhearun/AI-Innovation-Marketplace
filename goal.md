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

When an idea is submitted, multiple AI reviewers automatically evaluate it.

### Business Impact Agent

Evaluates:

* Revenue potential
* Cost reduction
* Productivity improvement

Returns:

* Score (1-10)
* Explanation

---

### Feasibility Agent

Evaluates:

* Technical complexity
* Resource requirements
* Dependencies

Returns:

* Score (1-10)
* Explanation

---

### Employee Impact Agent

Evaluates:

* Number of employees affected
* Productivity benefits
* User adoption potential

Returns:

* Score (1-10)
* Explanation

---

### Innovation Agent

Evaluates:

* Originality
* Strategic value
* Competitive advantage

Returns:

* Score (1-10)
* Explanation

---

## 3. Innovation Scoring

Generate an overall Innovation Score based on AI evaluations.

Example Formula:

Final Score =
(Business Impact × 40%)

* (Feasibility × 25%)
* (Employee Impact × 20%)
* (Innovation × 15%)

Display:

* Overall Score
* Individual Category Scores
* AI Recommendations

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

* gemini-3.5-flash

---

## Vector Search

Use Firestore Vector Search / Embeddings for:

* Duplicate Detection
* Similar Idea Discovery

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

# Future Enhancements (Out of Scope for MVP)

* Slack Integration
* ClickUp Integration
* Deriv Brain Integration
* SSO Integration
* Automated Project Creation
* AI-Generated PRDs
* AI Roadmap Generation
* Department-Specific AI Reviewers
* Innovation Analytics Dashboard

These features should be considered after the MVP is completed.

---

# Vision Statement

Create a culture where every employee can contribute ideas, receive immediate AI-powered feedback, and help shape the future of Deriv through a transparent and data-driven innovation process.
