import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { mockDB } from '@/lib/mock-db';
import { AIReview } from '@/types';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';

export const reviewsService = {
  async getReviews(ideaId: string): Promise<AIReview[]> {
    if (!isFirebaseConfigured) {
      return mockDB.getReviews(ideaId);
    }

    try {
      const q = query(collection(db, 'reviews'), where('ideaId', '==', ideaId));
      const querySnapshot = await getDocs(q);
      const reviews: AIReview[] = [];
      querySnapshot.forEach((doc) => {
        reviews.push({ id: doc.id, ...doc.data() } as AIReview);
      });
      return reviews;
    } catch (error) {
      console.error('Error fetching reviews from Firestore:', error);
      return mockDB.getReviews(ideaId);
    }
  },

  async createReview(review: AIReview): Promise<AIReview> {
    if (!isFirebaseConfigured) {
      return mockDB.createReview(review);
    }

    try {
      const docRef = doc(db, 'reviews', review.id);
      await setDoc(docRef, review);
      return review;
    } catch (error) {
      console.error('Error creating review in Firestore:', error);
      return mockDB.createReview(review);
    }
  }
};
