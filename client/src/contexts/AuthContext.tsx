import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { setOnAuthFailure } from '../api/client';
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
    // Register a callback so the API client can clear user state when a token
    // refresh fails (e.g. session expired overnight). The API client is a plain
    // module without access to React state — this callback bridges the gap.
    setOnAuthFailure(() => setUser(null));

    authApi.refresh().then((data) => {
      if (data) {
        setUser(data.user);
      }
      setIsLoading(false);
    });

    return () => setOnAuthFailure(null);
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
