import { NextResponse } from 'next/server';
import { db, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import mockData from '@/lib/mock-db.json';

export async function POST() {
  if (!isFirebaseConfigured || !db) {
    return NextResponse.json(
      { error: 'Firebase is not configured. Seed aborted.' },
      { status: 400 }
    );
  }

  try {
    const stats = {
      users: 0,
      ideas: 0,
      reviews: 0,
      votes: 0,
      comments: 0,
      summaries: 0,
      prds: 0,
      roadmaps: 0,
      clickups: 0,
    };

    // 1. Seed Users
    if (mockData.users && Array.isArray(mockData.users)) {
      for (const user of mockData.users) {
        const docRef = doc(db, 'users', user.id);
        await setDoc(docRef, user);
        stats.users++;
      }
    }

    // 2. Seed Ideas
    if (mockData.ideas && Array.isArray(mockData.ideas)) {
      for (const idea of mockData.ideas) {
        const docRef = doc(db, 'ideas', idea.id);
        await setDoc(docRef, idea);
        stats.ideas++;
      }
    }

    // 3. Seed Reviews
    if (mockData.reviews && Array.isArray(mockData.reviews)) {
      for (const review of mockData.reviews) {
        const docRef = doc(db, 'reviews', review.id);
        await setDoc(docRef, review);
        stats.reviews++;
      }
    }

    // 4. Seed Votes
    if (mockData.votes && Array.isArray(mockData.votes)) {
      for (const vote of mockData.votes) {
        const docRef = doc(db, 'votes', `${vote.ideaId}_${vote.userId}`);
        await setDoc(docRef, vote);
        stats.votes++;
      }
    }

    // 5. Seed Comments
    if (mockData.comments && Array.isArray(mockData.comments)) {
      for (const comment of mockData.comments) {
        const docRef = doc(db, 'comments', comment.id);
        await setDoc(docRef, comment);
        stats.comments++;
      }
    }

    // 6. Seed Summaries
    if (mockData.summaries && Array.isArray(mockData.summaries)) {
      for (const summary of mockData.summaries) {
        const docRef = doc(db, 'summaries', summary.ideaId);
        await setDoc(docRef, summary);
        stats.summaries++;
      }
    }

    // 7. Seed PRDs
    if ('prds' in mockData && mockData.prds && Array.isArray(mockData.prds)) {
      for (const prd of mockData.prds) {
        const docRef = doc(db, 'prds', prd.ideaId);
        await setDoc(docRef, prd);
        stats.prds++;
      }
    }

    // 8. Seed Roadmaps
    if ('roadmaps' in mockData && mockData.roadmaps && Array.isArray(mockData.roadmaps)) {
      for (const roadmap of mockData.roadmaps) {
        const docRef = doc(db, 'roadmaps', roadmap.ideaId);
        await setDoc(docRef, roadmap);
        stats.roadmaps++;
      }
    }

    // 9. Seed Clickups
    if ('clickups' in mockData && mockData.clickups && Array.isArray(mockData.clickups)) {
      for (const clickup of mockData.clickups) {
        const docRef = doc(db, 'clickups', clickup.ideaId);
        await setDoc(docRef, clickup);
        stats.clickups++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Firestore seeding completed successfully!',
      stats,
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error seeding Firestore:', err);
    return NextResponse.json(
      { error: 'Failed to seed Firestore', details: err.message },
      { status: 500 }
    );
  }
}
