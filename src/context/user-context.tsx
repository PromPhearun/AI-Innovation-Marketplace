'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types';
import { usersService } from '@/services/users.service';

interface UserContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  signup: (user: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  logout: () => void;
  allUsers: User[];
  setCurrentUserById: (id: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    async function initAuth() {
      try {
        const users = await usersService.getAllUsers();
        setAllUsers(users);

        const storedUserId = localStorage.getItem('dim_current_user_id');
        if (storedUserId) {
          const user = await usersService.getUser(storedUserId);
          if (user) {
            setCurrentUser(user);
          } else {
            // default fallback to Alex Rivera (employee)
            const defaultUser = users.find(u => u.id === 'user_3') || null;
            setCurrentUser(defaultUser);
            if (defaultUser) {
              localStorage.setItem('dim_current_user_id', defaultUser.id);
            }
          }
        } else {
          // default to Alex Rivera (employee)
          const defaultUser = users.find(u => u.id === 'user_3') || null;
          setCurrentUser(defaultUser);
          if (defaultUser) {
            localStorage.setItem('dim_current_user_id', defaultUser.id);
          }
        }
      } catch (err) {
        console.error('Error initializing authentication:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const users = await usersService.getAllUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        setCurrentUser(user);
        localStorage.setItem('dim_current_user_id', user.id);
        setIsLoading(false);
        return true;
      }
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error logging in:', error);
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    setIsLoading(true);
    const newId = 'user_' + Date.now().toString();
    const newUser: User = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    try {
      const created = await usersService.createUser(newUser);
      setCurrentUser(created);
      localStorage.setItem('dim_current_user_id', created.id);
      
      // refresh all users list
      const users = await usersService.getAllUsers();
      setAllUsers(users);
      
      return created;
    } catch (error) {
      console.error('Error in signup:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dim_current_user_id');
  };

  const setCurrentUserById = async (id: string) => {
    setIsLoading(true);
    const user = await usersService.getUser(id);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('dim_current_user_id', user.id);
    }
    setIsLoading(false);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        signup,
        logout,
        allUsers,
        setCurrentUserById,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
