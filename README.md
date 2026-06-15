# Deriv AI Innovation Marketplace

Deriv AI Innovation Marketplace is an AI-powered platform that transforms employee ideas into structured, data-driven business initiatives.

## 📌 Project Overview
The platform enables employees across all Deriv offices to submit innovation ideas, receive instant AI-powered evaluations, identify similar initiatives, estimate business impact, and help management prioritize the most valuable opportunities.

## 🛡️ Security Protocol Compliance
This project strictly complies with the **Security & Malware Protection Protocol** (`security.md`) and global secure coding standards. 

### Key Security Practices:
1. **API Key Safety**: Never commit `.env` or any sensitive API credentials to version control. The `.gitignore` file is pre-configured to exclude these files.
2. **Dependency Verification**: Before adding or installing any packages, verify legitimacy to prevent typosquatting or malicious packages. Keep packages pinned to stable and secure versions.
3. **Secure Input & Injection Prevention**: Sanitize all user-provided fields (titles, descriptions, comments, etc.) to defend against SQL injections, command injections, and XSS attacks.

## 🚀 MVP Features
1. **Idea Submission**: Title, Description, Department, Category, Expected Benefits.
2. **AI Multi-Agent Evaluation**: 
   - Business Impact Agent (Score 1-10)
   - Feasibility Agent (Score 1-10)
   - Employee Impact Agent (Score 1-10)
   - Innovation Agent (Score 1-10)
3. **Innovation Scoring**: Overall score based on weighted averages.
4. **Duplicate Idea Detection**: Similarity comparison using pgvector embeddings.
5. **Executive Summary Generator**: Read-in-under-a-minute business brief.
6. **Voting & Collaboration**: Upvotes and interactive feedback.
7. **Management Dashboard**: Analytical view of prioritized initiatives.

## 🛠️ Stack
- **Frontend**: Next.js (TypeScript, Tailwind CSS, shadcn/ui)
- **Backend**: Supabase (PostgreSQL, Pgvector)
- **AI Models**: `gemini-3.5-flash` via LiteLLM API Proxy
