export interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  department: string;
  category: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  innovationScore: number;
  expectedBenefits?: string;
  createdBy: string;
  createdAt: string;
}

export interface AIReview {
  id: string;
  ideaId: string;
  agentType: 'business' | 'feasibility' | 'employeeImpact' | 'innovation' | 'security' | 'customerImpact';
  score: number;
  analysis: string;
}

export interface Vote {
  ideaId: string;
  userId: string;
  vote: number; // star rating 1-5
}

export interface Comment {
  id: string;
  ideaId: string;
  userId: string;
  userName?: string;
  comment: string;
  createdAt: string;
}

export interface Summary {
  ideaId: string;
  summary: string;
  generatedAt: string;
}

export interface Embedding {
  ideaId: string;
  embedding: number[];
}
