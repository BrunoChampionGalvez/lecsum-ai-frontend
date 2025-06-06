import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService, User } from '../api/auth.service';

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login...');
      const response = await AuthService.login({ email, password });
      
      // Log login response to debug
      console.log('Login response:', response);
      
      if (!response || !response.user) {
        console.error('Login response missing user data');
        throw new Error('Invalid login response');
      }
      
      // Set the user in context
      setUser(response.user);
      
      console.log('Login successful, navigating to dashboard...');
      
      // Add a small delay to ensure state updates before navigation
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting registration...');
      const response = await AuthService.register({ email, password, firstName, lastName });
      
      // Log registration response to debug
      console.log('Registration response:', response);
      
      if (!response || !response.user) {
        console.error('Registration response missing user data');
        throw new Error('Invalid registration response');
      }
      
      // Set the user in context
      setUser(response.user);
      
      console.log('Registration successful, navigating to dashboard...');
      
      // Add a small delay to ensure state updates before navigation
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Re-throw so the form can handle it
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
    // Add a small delay to ensure state updates before navigation
    setTimeout(() => {
      router.push('/');
    }, 100);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
