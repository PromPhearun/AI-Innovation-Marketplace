import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { mockDB } from '@/lib/mock-db';
import { Idea, Vote, Comment, Summary } from '@/types';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';

export const ideasService = {
  async getIdeas(): Promise<Idea[]> {
    if (!isFirebaseConfigured) {
      return mockDB.getIdeas();
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'ideas'));
      const ideas: Idea[] = [];
      querySnapshot.forEach((doc) => {
        ideas.push({ id: doc.id, ...doc.data() } as Idea);
      });
      return ideas;
    } catch (error) {
      console.error('Error fetching ideas from Firestore:', error);
      return mockDB.getIdeas();
    }
  },

  async getIdea(id: string): Promise<Idea | null> {
    if (!isFirebaseConfigured) {
      return mockDB.getIdea(id) || null;
    }

    try {
      const docRef = doc(db, 'ideas', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Idea;
      }
      return null;
    } catch (error) {
      console.error('Error fetching idea from Firestore:', error);
      return mockDB.getIdea(id) || null;
    }
  },

  async createIdea(idea: Idea): Promise<Idea> {
    if (!isFirebaseConfigured) {
      return mockDB.createIdea(idea);
    }

    try {
      const docRef = doc(db, 'ideas', idea.id);
      await setDoc(docRef, idea);
      return idea;
    } catch (error) {
      console.error('Error creating idea in Firestore:', error);
      return mockDB.createIdea(idea);
    }
  },

  async updateIdeaStatus(id: string, status: Idea['status']): Promise<Idea | null> {
    if (!isFirebaseConfigured) {
      return mockDB.updateIdeaStatus(id, status) || null;
    }

    try {
      const docRef = doc(db, 'ideas', id);
      await updateDoc(docRef, { status });
      const updatedSnap = await getDoc(docRef);
      return { id: updatedSnap.id, ...updatedSnap.data() } as Idea;
    } catch (error) {
      console.error('Error updating idea status in Firestore:', error);
      return mockDB.updateIdeaStatus(id, status) || null;
    }
  },

  // Votes API
  async getVotes(ideaId: string): Promise<Vote[]> {
    if (!isFirebaseConfigured) {
      return mockDB.getVotes(ideaId);
    }

    try {
      const q = query(collection(db, 'votes'), where('ideaId', '==', ideaId));
      const querySnapshot = await getDocs(q);
      const votes: Vote[] = [];
      querySnapshot.forEach((doc) => {
        votes.push(doc.data() as Vote);
      });
      return votes;
    } catch (error) {
      console.error('Error fetching votes from Firestore:', error);
      return mockDB.getVotes(ideaId);
    }
  },

  async getAllVotes(): Promise<Vote[]> {
    if (!isFirebaseConfigured) {
      return mockDB.getAllVotes();
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'votes'));
      const votes: Vote[] = [];
      querySnapshot.forEach((doc) => {
        votes.push(doc.data() as Vote);
      });
      return votes;
    } catch (error) {
      console.error('Error fetching all votes from Firestore:', error);
      return mockDB.getAllVotes();
    }
  },

  async addVote(vote: Vote): Promise<void> {
    if (!isFirebaseConfigured) {
      mockDB.addVote(vote);
      return;
    }

    try {
      // composite ID to prevent duplicates: ideaId_userId
      const docRef = doc(db, 'votes', `${vote.ideaId}_${vote.userId}`);
      await setDoc(docRef, vote);
    } catch (error) {
      console.error('Error adding vote in Firestore:', error);
      mockDB.addVote(vote);
    }
  },

  async removeVote(ideaId: string, userId: string): Promise<void> {
    if (!isFirebaseConfigured) {
      mockDB.removeVote(ideaId, userId);
      return;
    }

    try {
      const docRef = doc(db, 'votes', `${ideaId}_${userId}`);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error removing vote in Firestore:', error);
      mockDB.removeVote(ideaId, userId);
    }
  },

  // Comments API
  async getComments(ideaId: string): Promise<Comment[]> {
    if (!isFirebaseConfigured) {
      return mockDB.getComments(ideaId);
    }

    try {
      const q = query(collection(db, 'comments'), where('ideaId', '==', ideaId));
      const querySnapshot = await getDocs(q);
      const comments: Comment[] = [];
      querySnapshot.forEach((doc) => {
        comments.push({ id: doc.id, ...doc.data() } as Comment);
      });
      // Sort comments by date
      return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      console.error('Error fetching comments from Firestore:', error);
      return mockDB.getComments(ideaId);
    }
  },

  async addComment(comment: Comment): Promise<Comment> {
    if (!isFirebaseConfigured) {
      return mockDB.addComment(comment);
    }

    try {
      const docRef = doc(db, 'comments', comment.id);
      await setDoc(docRef, comment);
      return comment;
    } catch (error) {
      console.error('Error adding comment in Firestore:', error);
      return mockDB.addComment(comment);
    }
  },

  // Executive Summary API
  async getSummary(ideaId: string): Promise<Summary | null> {
    if (!isFirebaseConfigured) {
      const summary = mockDB.getSummary(ideaId);
      if (summary) return summary;

      // default fallbacks for default ideas
      if (ideaId === 'idea_1') {
        return {
          ideaId,
          summary: `### Executive Summary: AI Webinar Campaign Planner\n\n**Problem:** Campaign execution suffers from disjointed task orchestration across tools, delayed turnarounds, and heavy manual involvement.\n\n**Proposed Solution:** A unified Generative AI Planner to automate copywriting, segment lists, and publish scheduling automatically.\n\n**Expected Benefits:** 70% time reduction for campaign coordinators, leading to double the active webinar volume.\n\n**Recommendation:** Fast-track implementation of the landing-page and email drafting modules as initial proofs-of-concept.`,
          generatedAt: new Date().toISOString()
        };
      }
      if (ideaId === 'idea_2') {
        return {
          ideaId,
          summary: `### Executive Summary: AI Partner Risk Detection\n\n**Problem:** Regional partner vetting is complex, manual, and relies on disjointed global registers, exposing the company to regulatory audit failure risks.\n\n**Proposed Solution:** Continuous screening agent that monitors regulatory compliance feeds, news sources, and trading behaviors to produce risk alerts.\n\n**Expected Benefits:** Sub-minute automatic reports, lowering administrative overhead and legal exposure.\n\n**Recommendation:** Integrate directly into the initial onboarding registry for automatic validation checks.`,
          generatedAt: new Date().toISOString()
        };
      }
      return null;
    }

    try {
      const docRef = doc(db, 'summaries', ideaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Summary;
      }
      return null;
    } catch (error) {
      console.error('Error fetching summary from Firestore:', error);
      return null;
    }
  },

  async saveSummary(ideaId: string, summaryText: string): Promise<void> {
    const summaryData: Summary = {
      ideaId,
      summary: summaryText,
      generatedAt: new Date().toISOString()
    };

    if (!isFirebaseConfigured) {
      mockDB.saveSummary(summaryData);
      return;
    }

    try {
      const docRef = doc(db, 'summaries', ideaId);
      await setDoc(docRef, summaryData);
    } catch (error) {
      console.error('Error saving summary to Firestore:', error);
    }
  }
};
