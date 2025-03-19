
import { createContext, useContext, useState, ReactNode } from 'react';
import { User, InsertUser } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  registerUser: (data: InsertUser) => Promise<User>;
  loginUser: (data: { username: string; password: string }) => Promise<User>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const registerUser = async (data: InsertUser) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    const newUser = await response.json();
    setUser(newUser);
    return newUser;
  };

  const loginUser = async (data: { username: string; password: string }) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Login failed');
    }
    const loggedInUser = await response.json();
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logoutUser = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    registerUser,
    loginUser,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  const registerMutation = useMutation({
    mutationFn: context.registerUser
  });

  const loginMutation = useMutation({
    mutationFn: context.loginUser
  });

  const logoutMutation = useMutation({
    mutationFn: context.logoutUser
  });

  return {
    ...context,
    registerMutation,
    loginMutation,
    logoutMutation
  };
}
