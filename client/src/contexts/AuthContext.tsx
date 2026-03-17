import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import * as authApi from '../api/auth';

interface User {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, try to restore session from refresh cookie
  useEffect(() => {
    authApi.refresh().then((data) => {
      if (data) {
        setUser(data.user);
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const data = await authApi.login(email, password);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<void> => {
      const data = await authApi.register(email, password, displayName);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
