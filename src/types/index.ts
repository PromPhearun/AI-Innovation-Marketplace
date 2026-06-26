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
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'implemented';
  innovationScore: number;
  expectedBenefits?: string;
  createdBy: string;
  createdAt: string;
  votes?: Vote[];
  comments?: Comment[];
  clickup?: ClickUpSync;
  managerComment?: string;
  
  // Implementation/operational details for live apps in Project Directory
  systemOwner?: string;
  backupSystemOwner?: string;
  slackChannel?: string;
  implementedAt?: string;
  isManualProject?: boolean;
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
  createdAt?: string;
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

export interface PRD {
  ideaId: string;
  markdown: string;
  generatedAt: string;
}

export interface RoadmapPhase {
  phaseNumber: number;
  title: string;
  weeks: string;
  deliverables: string[];
  tasks: string[];
  ownerDepartment: string;
}

export interface Roadmap {
  ideaId: string;
  phases: RoadmapPhase[];
  generatedAt: string;
}

export interface ClickUpTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface ClickUpSync {
  ideaId: string;
  ticketKey: string;
  ticketUrl: string;
  syncedAt: string;
  subtasks: ClickUpTask[];
}
