/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
import { User, Idea, AIReview, Vote, Comment, Summary, PRD, Roadmap, ClickUpSync } from '@/types';

// Let's create an in-memory database for server-side fallback
// and sync with localstorage on client-side.
class MockDB {
  private users: User[] = [];
  private ideas: Idea[] = [];
  private reviews: AIReview[] = [];
  private votes: Vote[] = [];
  private comments: Comment[] = [];
  private summaries: Summary[] = [];
  private prds: PRD[] = [];
  private roadmaps: Roadmap[] = [];
  private clickups: ClickUpSync[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private getFilePath(): string | null {
    if (typeof window !== 'undefined') return null;
    try {
      const req = require;
      const path = req('path');
      return path.join(process.cwd(), 'src/lib/mock-db.json');
    } catch (e) {
      return null;
    }
  }

  private loadFromStorage() {
    if (this.isClient()) {
      try {
        this.users = JSON.parse(localStorage.getItem('dim_users') || '[]');
        this.ideas = JSON.parse(localStorage.getItem('dim_ideas') || '[]');
        this.reviews = JSON.parse(localStorage.getItem('dim_reviews') || '[]');
        this.votes = JSON.parse(localStorage.getItem('dim_votes') || '[]');
        this.comments = JSON.parse(localStorage.getItem('dim_comments') || '[]');
        this.summaries = JSON.parse(localStorage.getItem('dim_summaries') || '[]');
        this.prds = JSON.parse(localStorage.getItem('dim_prds') || '[]');
        this.roadmaps = JSON.parse(localStorage.getItem('dim_roadmaps') || '[]');
        this.clickups = JSON.parse(localStorage.getItem('dim_clickups') || '[]');

        // If empty, initialize with some default data
        if (this.ideas.length === 0) {
          this.initializeDefaultData();
        }
      } catch (e) {
        console.error('Error loading mock DB from localstorage:', e);
      }
    } else {
      // Server-side file persistence
      const filePath = this.getFilePath();
      if (!filePath) return;

      try {
        const req = require;
        const fs = req('fs');
        if (fs.existsSync(filePath)) {
          const rawData = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(rawData);
          this.users = data.users || [];
          this.ideas = data.ideas || [];
          this.reviews = data.reviews || [];
          this.votes = data.votes || [];
          this.comments = data.comments || [];
          this.summaries = data.summaries || [];
          this.prds = data.prds || [];
          this.roadmaps = data.roadmaps || [];
          this.clickups = data.clickups || [];
        } else {
          // Initialize with defaults if file doesn't exist
          this.initializeDefaultData();
          this.saveToStorage();
        }
      } catch (e) {
        console.error('Error loading mock DB from file:', e);
      }
    }
  }

  private saveToStorage() {
    if (this.isClient()) {
      try {
        localStorage.setItem('dim_users', JSON.stringify(this.users));
        localStorage.setItem('dim_ideas', JSON.stringify(this.ideas));
        localStorage.setItem('dim_reviews', JSON.stringify(this.reviews));
        localStorage.setItem('dim_votes', JSON.stringify(this.votes));
        localStorage.setItem('dim_comments', JSON.stringify(this.comments));
        localStorage.setItem('dim_summaries', JSON.stringify(this.summaries));
        localStorage.setItem('dim_prds', JSON.stringify(this.prds));
        localStorage.setItem('dim_roadmaps', JSON.stringify(this.roadmaps));
        localStorage.setItem('dim_clickups', JSON.stringify(this.clickups));
      } catch (e) {
        console.error('Error saving mock DB to localstorage:', e);
      }
    } else {
      // Server-side file persistence
      const filePath = this.getFilePath();
      if (!filePath) return;

      try {
        const req = require;
        const fs = req('fs');
        const data = {
          users: this.users,
          ideas: this.ideas,
          reviews: this.reviews,
          votes: this.votes,
          comments: this.comments,
          summaries: this.summaries,
          prds: this.prds,
          roadmaps: this.roadmaps,
          clickups: this.clickups,
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {
        console.error('Error saving mock DB to file:', e);
      }
    }
  }

  private initializeDefaultData() {
    this.users = [
      {
        id: 'user_1',
        name: 'Sarah Chen',
        email: 'sarah.chen@deriv.com',
        role: 'admin',
        department: 'Engineering',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user_2',
        name: 'John Doe',
        email: 'john.doe@deriv.com',
        role: 'manager',
        department: 'Marketing',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user_3',
        name: 'Alex Rivera',
        email: 'alex.rivera@deriv.com',
        role: 'employee',
        department: 'MarTech',
        createdAt: new Date().toISOString(),
      }
    ];

    this.ideas = [
      {
        id: 'idea_1',
        title: 'AI Webinar Campaign Planner',
        description: 'Automate webinar campaign planning, automated email generation, landing page copies, and scheduled social media posts using generative AI.',
        department: 'Marketing',
        category: 'Automation',
        status: 'approved',
        innovationScore: 88,
        expectedBenefits: 'Reduces manual marketing orchestration overhead by 70% and enables 1-click campaign launches.',
        createdBy: 'user_2',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
      },
      {
        id: 'idea_2',
        title: 'AI Partner Risk Detection',
        description: 'Analyze trading partner behavioral history, compliance updates, and automated news screening to flag high-risk business partners before manual auditing.',
        department: 'Compliance',
        category: 'Risk Management',
        status: 'under_review',
        innovationScore: 92,
        expectedBenefits: 'Real-time alert system to reduce legal and financial compliance risk exposure.',
        createdBy: 'user_1',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
      },
      {
        id: 'idea_3',
        title: 'Smart CRM Segmentation',
        description: 'Utilize predictive customer behavioral models to dynamically segment clients and send target offers, improving active user retention.',
        department: 'MarTech',
        category: 'Customer Retention',
        status: 'submitted',
        innovationScore: 78,
        expectedBenefits: 'Improve open-rates by 25% and overall retention of dormant users.',
        createdBy: 'user_3',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
      }
    ];

    this.reviews = [
      {
        id: 'rev_1_b',
        ideaId: 'idea_1',
        agentType: 'business',
        score: 9,
        analysis: 'Excellent efficiency gains. Saving marketing managers several hours per campaign translates directly to direct cost reduction and faster time-to-market.'
      },
      {
        id: 'rev_1_f',
        ideaId: 'idea_1',
        agentType: 'feasibility',
        score: 8,
        analysis: 'High feasibility. Generative templates for text are straightforward with established LLM libraries. APIs exist for standard social channels.'
      },
      {
        id: 'rev_1_e',
        ideaId: 'idea_1',
        agentType: 'employeeImpact',
        score: 9,
        analysis: 'Significantly improves productivity for the marketing and growth teams, making it easier to orchestrate webinars.'
      },
      {
        id: 'rev_1_i',
        ideaId: 'idea_1',
        agentType: 'innovation',
        score: 9,
        analysis: 'Highly original application tailored perfectly to Deriv\'s frequent webinar campaigns.'
      },
      {
        id: 'rev_1_s',
        ideaId: 'idea_1',
        agentType: 'security',
        score: 9,
        analysis: 'Fully meets corporate compliance requirements. Standard token storage and secure channel communications prevent unauthorized access during campaign orchestration.'
      },
      {
        id: 'rev_1_c',
        ideaId: 'idea_1',
        agentType: 'customerImpact',
        score: 9,
        analysis: 'Empowers smoother user communication flow. Generating timely webinar invites and summaries directly enhances client experience and retention.'
      },
      // Review 2
      {
        id: 'rev_2_b',
        ideaId: 'idea_2',
        agentType: 'business',
        score: 9,
        analysis: 'Very strong business impact by protecting the firm from catastrophic compliance breaches or regulatory fines.'
      },
      {
        id: 'rev_2_f',
        ideaId: 'idea_2',
        agentType: 'feasibility',
        score: 9,
        analysis: 'Moderate complexity but very doable with structured external data. Easy integration with internal audit tooling.'
      },
      {
        id: 'rev_2_e',
        ideaId: 'idea_2',
        agentType: 'employeeImpact',
        score: 9,
        analysis: 'Improves compliance audit workflow. Cuts background research times from hours to seconds.'
      },
      {
        id: 'rev_2_i',
        ideaId: 'idea_2',
        agentType: 'innovation',
        score: 10,
        analysis: 'Transformational regulatory risk modeling using agentic news screening.'
      },
      {
        id: 'rev_2_s',
        ideaId: 'idea_2',
        agentType: 'security',
        score: 9,
        analysis: 'Directly reinforces security. Safeguards partner evaluation processes and runs real-time behavior pattern scans safely within secure networks.'
      },
      {
        id: 'rev_2_c',
        ideaId: 'idea_2',
        agentType: 'customerImpact',
        score: 9,
        analysis: 'Builds platform trust and integrity. Demonstrating stringent partner vetting directly improves customer confidence and long-term brand equity.'
      },
      // Review 3 (Smart CRM Segmentation)
      {
        id: 'rev_3_b',
        ideaId: 'idea_3',
        agentType: 'business',
        score: 8,
        analysis: 'Strong potential to improve customer retention. Targeted offers can lead to higher lifetime value and conversion rates.'
      },
      {
        id: 'rev_3_f',
        ideaId: 'idea_3',
        agentType: 'feasibility',
        score: 7,
        analysis: 'Highly feasible. Customer segmentation models are well-understood and can be built using standard machine learning libraries and historical CRM data.'
      },
      {
        id: 'rev_3_e',
        ideaId: 'idea_3',
        agentType: 'employeeImpact',
        score: 8,
        analysis: 'Reduces manual marketing campaign planning. Allows marketers to easily target segments with minimal overhead.'
      },
      {
        id: 'rev_3_i',
        ideaId: 'idea_3',
        agentType: 'innovation',
        score: 8,
        analysis: 'Good application of predictive modeling to CRM data, though similar systems are standard in mature marketing suites.'
      },
      {
        id: 'rev_3_s',
        ideaId: 'idea_3',
        agentType: 'security',
        score: 8,
        analysis: 'Complies with customer privacy and data localization frameworks. Strictly anonymizes client CRM profiles before predictive clustering passes.'
      },
      {
        id: 'rev_3_c',
        ideaId: 'idea_3',
        agentType: 'customerImpact',
        score: 8,
        analysis: 'Provides highly relevant, custom experiences for platform users, avoiding generic marketing spam and maximizing adoption rates.'
      }
    ];

    this.votes = [
      { ideaId: 'idea_1', userId: 'user_1', vote: 5, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString() },
      { ideaId: 'idea_1', userId: 'user_3', vote: 4, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
      { ideaId: 'idea_2', userId: 'user_2', vote: 5, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString() },
      { ideaId: 'idea_3', userId: 'user_1', vote: 3, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
    ];

    this.comments = [
      {
        id: 'comm_1',
        ideaId: 'idea_1',
        userId: 'user_1',
        userName: 'Sarah Chen',
        comment: 'This is brilliant. We can integrate this directly with our monthly marketing plans.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      },
      {
        id: 'comm_2',
        ideaId: 'idea_2',
        userId: 'user_2',
        userName: 'John Doe',
        comment: 'Critical requirement. Compliance checks have been a bottleneck for our regional launches.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      }
    ];

    this.saveToStorage();
  }

  // Users Service fallback
  getUsers(): User[] {
    this.loadFromStorage();
    return this.users;
  }

  getUser(id: string): User | undefined {
    this.loadFromStorage();
    return this.users.find(u => u.id === id);
  }

  createUser(user: User): User {
    this.loadFromStorage();
    this.users.push(user);
    this.saveToStorage();
    return user;
  }

  // Ideas Service fallback
  getIdeas(): Idea[] {
    this.loadFromStorage();
    return this.ideas;
  }

  getIdea(id: string): Idea | undefined {
    this.loadFromStorage();
    return this.ideas.find(i => i.id === id);
  }

  createIdea(idea: Idea): Idea {
    this.loadFromStorage();
    this.ideas.push(idea);
    this.saveToStorage();
    return idea;
  }

  updateIdeaStatus(id: string, status: Idea['status'], managerComment?: string): Idea | undefined {
    this.loadFromStorage();
    const idea = this.ideas.find(i => i.id === id);
    if (idea) {
      idea.status = status;
      if (managerComment !== undefined) {
        idea.managerComment = managerComment;
      }
      this.saveToStorage();
    }
    return idea;
  }

  // Reviews fallback
  getReviews(ideaId: string): AIReview[] {
    this.loadFromStorage();
    return this.reviews.filter(r => r.ideaId === ideaId);
  }

  createReview(review: AIReview): AIReview {
    this.loadFromStorage();
    this.reviews.push(review);
    this.saveToStorage();
    return review;
  }

  // Votes fallback
  getVotes(ideaId: string): Vote[] {
    this.loadFromStorage();
    return this.votes.filter(v => v.ideaId === ideaId);
  }

  getAllVotes(): Vote[] {
    this.loadFromStorage();
    return this.votes;
  }

  addVote(vote: Vote) {
    this.loadFromStorage();
    this.votes = this.votes.filter(v => !(v.ideaId === vote.ideaId && v.userId === vote.userId));
    this.votes.push(vote);
    this.saveToStorage();
  }

  removeVote(ideaId: string, userId: string) {
    this.loadFromStorage();
    this.votes = this.votes.filter(v => !(v.ideaId === ideaId && v.userId === userId));
    this.saveToStorage();
  }

  // Comments fallback
  getComments(ideaId: string): Comment[] {
    this.loadFromStorage();
    return this.comments.filter(c => c.ideaId === ideaId);
  }

  getAllComments(): Comment[] {
    this.loadFromStorage();
    return this.comments;
  }

  addComment(comment: Comment): Comment {
    this.loadFromStorage();
    this.comments.push(comment);
    this.saveToStorage();
    return comment;
  }

  getSummary(ideaId: string): Summary | undefined {
    this.loadFromStorage();
    return this.summaries.find(s => s.ideaId === ideaId);
  }

  saveSummary(summary: Summary): void {
    this.loadFromStorage();
    this.summaries = this.summaries.filter(s => s.ideaId !== summary.ideaId);
    this.summaries.push(summary);
    this.saveToStorage();
  }

  getPRD(ideaId: string): PRD | undefined {
    this.loadFromStorage();
    return this.prds.find(p => p.ideaId === ideaId);
  }

  savePRD(prd: PRD): void {
    this.loadFromStorage();
    this.prds = this.prds.filter(p => p.ideaId !== prd.ideaId);
    this.prds.push(prd);
    this.saveToStorage();
  }

  getRoadmap(ideaId: string): Roadmap | undefined {
    this.loadFromStorage();
    return this.roadmaps.find(r => r.ideaId === ideaId);
  }

  saveRoadmap(roadmap: Roadmap): void {
    this.loadFromStorage();
    this.roadmaps = this.roadmaps.filter(r => r.ideaId !== roadmap.ideaId);
    this.roadmaps.push(roadmap);
    this.saveToStorage();
  }

  getClickUpSync(ideaId: string): ClickUpSync | undefined {
    this.loadFromStorage();
    return this.clickups.find(c => c.ideaId === ideaId);
  }

  getAllClickUpSyncs(): ClickUpSync[] {
    this.loadFromStorage();
    return this.clickups;
  }

  saveClickUpSync(clickup: ClickUpSync): void {
    this.loadFromStorage();
    this.clickups = this.clickups.filter(c => c.ideaId !== clickup.ideaId);
    this.clickups.push(clickup);
    this.saveToStorage();
  }
}

export const mockDB = new MockDB();
