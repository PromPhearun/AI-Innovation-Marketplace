import { isFirebaseConfigured, db } from '@/lib/firebase/config';
import { mockDB } from '@/lib/mock-db';
import { User } from '@/types';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';

export const usersService = {
  async getUser(id: string): Promise<User | null> {
    if (!isFirebaseConfigured) {
      return mockDB.getUser(id) || null;
    }

    try {
      const docRef = doc(db, 'users', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user from Firestore:', error);
      // fallback to mock
      return mockDB.getUser(id) || null;
    }
  },

  async createUser(user: User): Promise<User> {
    if (!isFirebaseConfigured) {
      return mockDB.createUser(user);
    }

    try {
      const docRef = doc(db, 'users', user.id);
      await setDoc(docRef, user);
      return user;
    } catch (error) {
      console.error('Error creating user in Firestore:', error);
      return mockDB.createUser(user);
    }
  },

  async getAllUsers(): Promise<User[]> {
    if (!isFirebaseConfigured) {
      return mockDB.getUsers();
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() } as User);
      });
      return users;
    } catch (error) {
      console.error('Error getting users from Firestore:', error);
      return mockDB.getUsers();
    }
  }
};
