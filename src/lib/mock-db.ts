/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
import { User, Idea, AIReview, Vote, Comment } from '@/types';

// Let's create an in-memory database for server-side fallback
// and sync with localstorage on client-side.
class MockDB {
  private users: User[] = [];
  private ideas: Idea[] = [];
  private reviews: AIReview[] = [];
  private votes: Vote[] = [];
  private comments: Comment[] = [];

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
      }
    ];

    this.votes = [
      { ideaId: 'idea_1', userId: 'user_1', vote: 1 },
      { ideaId: 'idea_1', userId: 'user_3', vote: 1 },
      { ideaId: 'idea_2', userId: 'user_2', vote: 1 },
      { ideaId: 'idea_3', userId: 'user_1', vote: 1 },
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

  updateIdeaStatus(id: string, status: Idea['status']): Idea | undefined {
    this.loadFromStorage();
    const idea = this.ideas.find(i => i.id === id);
    if (idea) {
      idea.status = status;
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

  addComment(comment: Comment): Comment {
    this.loadFromStorage();
    this.comments.push(comment);
    this.saveToStorage();
    return comment;
  }
}

export const mockDB = new MockDB();
