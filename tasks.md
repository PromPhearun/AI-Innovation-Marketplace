# Deriv AI Innovation Marketplace

## 14-Day Development Plan (tasks.md)

---

# Project Objective

Build an AI-powered innovation platform where employees can submit ideas, receive AI evaluations, identify similar ideas, generate executive summaries, and help management prioritize innovation opportunities.

Target: Functional MVP ready for hackathon demo within 14 days.

---

# Phase 1: Project Setup & Foundation

## Day 1 - Environment Setup

### Tasks

* Create Next.js project with TypeScript
* Configure Tailwind CSS
* Install shadcn/ui
* Configure ESLint and Prettier
* Create Git repository
* Create Supabase project (migrated to Firebase for MVP)
* Configure environment variables

### Deliverables

* Running application
* Firebase connection established
* Development environment ready

### Status

* [x] Complete

---

## Day 2 - Database Design

### Tasks

Create database schema:

#### ideas

* id
* title
* description
* department
* category
* innovation_score
* status
* created_by
* created_at

#### ai_reviews

* id
* idea_id
* reviewer_type
* score
* analysis

#### votes

* id
* idea_id
* user_id
* vote

#### comments

* id
* idea_id
* user_id
* comment

### Deliverables

* Database tables created
* Relationships configured
* Firebase collections and config initialized

### Status

* [x] Complete

---

# Phase 2: Authentication & Core UI

## Day 3 - Authentication

### Tasks

* Implement Firebase Authentication
* Login page
* Logout functionality
* Protected routes
* User session management

### Deliverables

* Users can login
* Protected dashboard access

### Status

* [x] Complete

---

## Day 4 - Application Layout

### Tasks

Create:

* Navigation Sidebar
* Header
* Dashboard Layout
* Responsive Design
* Theme Support

Pages:

* Dashboard
* Ideas
* Submit Idea
* Idea Details

### Deliverables

* Complete application shell

### Status

* [x] Complete

---

# Phase 3: Idea Management

## Day 5 - Idea Submission

### Tasks

Build Idea Submission Form:

Fields:

* Title
* Description
* Department
* Category
* Expected Benefits

Validation:

* Required fields
* Character limits

### Deliverables

* Ideas can be submitted
* Data saved to database

### Status

* [x] Complete

---

## Day 6 - Idea Listing & Detail Page

### Tasks

Create:

### Ideas List Page

Display:

* Title
* Category
* Department
* Status
* Innovation Score

### Idea Detail Page

Display:

* Full description
* Reviews
* Votes
* Comments

### Deliverables

* Browse all ideas
* View individual idea details

### Status

* [x] Complete

---

# Phase 4: AI Evaluation Engine

## Day 7 - AI Service Setup

### Tasks

Configure AI provider:

Preferred:

* deepseek-v4-pro

Create:

* AI Service Layer
* Prompt Management
* API Error Handling

### Deliverables

* AI communication working

### Status

* [x] Complete

---

## Day 8 - Multi-Agent Evaluation

### Tasks

Build six specialized C-Suite AI Agents:

### 💼 CFO (Chief Finance Officer)
*   Evaluate: Revenue generation, operational cost reduction, and financial ROI.

### 🛠️ ChEO (Chief Engineering Officer)
*   Evaluate: Technical feasibility, infrastructure requirements, scaling limitations, and development complexity.

### 👥 CHRO (Chief Human Resources Officer)
*   Evaluate: Employee workflow, organizational culture, change management, training, and productivity.

### ⚖️ CCO (Chief Compliance Officer)
*   Evaluate: Regulatory alignment, policy adherence, legal constraints, intellectual property issues, and licensing.

### 🛡️ CSO (Chief Security Officer)
*   Evaluate: Security posture, data privacy implications (GDPR/PII), vulnerability exposure, and threat surface.

### 🎯 CGO (Chief Growth Officer)
*   Evaluate: User acquisition, customer delight, onboarding friction, retention, and market scalability.

Store reviews in database.

### Deliverables

* Automatic multi-agent C-Suite reviews generated asynchronously

### Status

* [x] Complete

---

# Phase 5: Innovation Scoring

## Day 9 - Scoring Engine

### Tasks

Implement weighted consensus score calculation:

* CFO (business): 25%
* ChEO (feasibility): 20%
* CHRO (employeeImpact): 15%
* CCO (innovation): 15%
* CSO (security): 15%
* CGO (customerImpact): 10%

Generate:

* Overall Score (0-100)
* Rating Label

Example:

90+
Transformational

80+
High Value

70+
Promising

Below 70
Needs Review

### Deliverables

* Automatic innovation score

### Status

* [x] Complete

---

# Phase 6: Duplicate Detection

## Day 10 - Similar Idea Detection

### Tasks

Implement:

* Text embeddings
* Vector storage
* Similarity search

Workflow:

New Idea

↓

Generate Embedding

↓

Compare Existing Ideas

↓

Return Similarity Results

### Deliverables

* Duplicate ideas detected
* Similarity percentage shown

### Status

* [x] Complete

---

# Phase 7: Executive Summary Generator

## Day 11 - AI Summary Generation

### Tasks

Generate:

### Executive Summary

Include:

* Problem Statement
* Proposed Solution
* Benefits
* Estimated Impact
* Recommendation

Display summary on Idea Detail Page.

### Deliverables

* One-click executive summary

### Status

* [x] Complete

---

# Phase 8: Collaboration Features

## Day 12 - Voting & Comments

### Tasks

Build:

### Voting

* Upvote
* Remove Vote

### Comments

* Create Comment
* Display Comments

### Deliverables

* Community engagement features

### Status

* [x] Complete

---

# Phase 9: Dashboard & Analytics

## Day 13 - Management Dashboard

### Tasks

Create Dashboard Widgets:

### Overview

* Total Ideas
* Ideas This Month
* Top Innovation Score
* Most Voted Idea

### Rankings

* Top 10 Ideas
* Most Voted Ideas
* Highest Scoring Ideas

### Analytics

* Ideas by Department
* Ideas by Category

### Deliverables

* Executive dashboard complete

### Status

* [x] Complete

---

# Phase 10: Demo Preparation

## Day 14 - Final Polish

### Tasks

UI Improvements

* Loading states
* Empty states
* Error handling
* Animations

Demo Data

Create sample ideas:

* AI Webinar Planner
* AI Partner Risk Detection
* Smart CRM Segmentation
* AI Support Assistant

Testing

* Authentication
* AI Evaluation
* Scoring
* Voting
* Dashboard

Prepare Demo Script

### Deliverables

* Demo-ready MVP

### Status

* [x] Complete

---

# Stretch Goals & Advanced Engineering (Fully Implemented)

## Feature 1: Slack Integration

* [x] Complete
* Allow idea details & reviews notifications to be pushed directly into Slack channels.

---

## Feature 2: ClickUp Integration

* [x] Complete
* Generate task lists and product-level subtasks directly onto ClickUp boards from approved ideas.

---

## Feature 3: AI PRD Generator

* [x] Complete
* Generate detailed, complete, production-ready Product Requirement Documents (PRDs) on the fly based on consensus specifications.

---

## Feature 4: AI Roadmap Generator

* [x] Complete
* Automatically draft development roadmaps, milestones, and project timelines.

---

## Feature 5: Local Agent Loop Task System & Interactive Terminal Prompt

* [x] Complete
* Scaffolds a standalone, zero-dependency `agent_loop.js` local script in the workspace that auto-runs code compilation, packages installation, and syntax verification tests.
* Includes an interactive terminal-based continuation prompt (`Would you like to run another 5 cycles to complete building the project? (y/n): `) that dynamically extends development cycles by another 5 iterations when requested.

---

# MVP Definition of Done

The MVP is complete when:

* [x] Users can submit ideas.
* [x] AI evaluates ideas automatically.
* [x] Innovation scores are generated.
* [x] Similar ideas are detected.
* [x] Executive summaries are generated.
* [x] Users can vote and comment.
* [x] Management dashboard is functional.
* [x] Demo scenario works end-to-end.
