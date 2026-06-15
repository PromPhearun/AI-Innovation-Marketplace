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
* Create Supabase project
* Configure environment variables

### Deliverables

* Running application
* Supabase connection established
* Development environment ready

### Status

* [ ] Complete

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
* Supabase types generated

### Status

* [ ] Complete

---

# Phase 2: Authentication & Core UI

## Day 3 - Authentication

### Tasks

* Implement Supabase Authentication
* Login page
* Logout functionality
* Protected routes
* User session management

### Deliverables

* Users can login
* Protected dashboard access

### Status

* [ ] Complete

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

* [ ] Complete

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

* [ ] Complete

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

* [ ] Complete

---

# Phase 4: AI Evaluation Engine

## Day 7 - AI Service Setup

### Tasks

Configure AI provider:

Preferred:

* Gemini 2.5 Pro

Alternative:

* OpenAI GPT-4o

Create:

* AI Service Layer
* Prompt Management
* API Error Handling

### Deliverables

* AI communication working

### Status

* [ ] Complete

---

## Day 8 - Multi-Agent Evaluation

### Tasks

Build:

### Business Impact Agent

Evaluate:

* Revenue potential
* Cost savings
* Productivity gain

### Feasibility Agent

Evaluate:

* Complexity
* Resources
* Dependencies

### Employee Impact Agent

Evaluate:

* Adoption
* Employee benefit
* Process improvement

### Innovation Agent

Evaluate:

* Creativity
* Strategic value

Store reviews in database.

### Deliverables

* Automatic AI reviews generated

### Status

* [ ] Complete

---

# Phase 5: Innovation Scoring

## Day 9 - Scoring Engine

### Tasks

Implement score calculation:

Business Impact × 40%

Feasibility × 25%

Employee Impact × 20%

Innovation × 15%

Generate:

* Overall Score
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

* [ ] Complete

---

# Phase 6: Duplicate Detection

## Day 10 - Similar Idea Detection

### Tasks

Implement:

* Text embeddings
* pgvector storage
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

* [ ] Complete

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

* [ ] Complete

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

* [ ] Complete

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

* [ ] Complete

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

* [ ] Complete

---

# Stretch Goals (Only If Time Permits)

## Future Feature 1

Slack Integration

Allow idea submission from Slack.

---

## Future Feature 2

ClickUp Integration

Generate ClickUp tasks from approved ideas.

---

## Future Feature 3

Deriv Brain Integration

Retrieve supporting information and references.

---

## Future Feature 4

AI PRD Generator

Generate Product Requirement Documents automatically.

---

## Future Feature 5

AI Roadmap Generator

Create implementation plans and timelines.

---

# MVP Definition of Done

The MVP is complete when:

* Users can submit ideas.
* AI evaluates ideas automatically.
* Innovation scores are generated.
* Similar ideas are detected.
* Executive summaries are generated.
* Users can vote and comment.
* Management dashboard is functional.
* Demo scenario works end-to-end.
