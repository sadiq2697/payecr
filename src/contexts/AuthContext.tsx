import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User, LoginResponse, SessionInfo } from '../services/ApiService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  store: any | null;
  outlet: any | null;
  isOnShift: boolean;
  login: (storeCode: string, outletCode: string, employeeId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  startShift: (terminalId?: string) => Promise<{ success: boolean; error?: string }>;
  endShift: () => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<any | null>(null);
  const [outlet, setOutlet] = useState<any | null>(null);
  const [isOnShift, setIsOnShift] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const hasToken = await apiService.isAuthenticated();

      if (hasToken) {
        // Load stored data
        const storedUser = await apiService.getStoredUser();
        const storedStore = await apiService.getStoredStore();
        const storedOutlet = await apiService.getStoredOutlet();

        if (storedUser) {
          setUser(storedUser);
          setStore(storedStore);
          setOutlet(storedOutlet);
          setIsAuthenticated(true);

          // Try to refresh session info
          try {
            const sessionResult = await apiService.getSession();
            if (sessionResult.success && sessionResult.data) {
              setIsOnShift(sessionResult.data.isOnShift);
            }
          } catch (error) {
            console.log('[AuthContext] Could not refresh session:', error);
          }
        } else {
          // Token exists but no user data - clear everything
          await apiService.clearToken();
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AuthContext] Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    storeCode: string,
    outletCode: string,
    employeeId: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await apiService.login(storeCode, outletCode, employeeId, pin);

      if (result.success && result.data) {
        setUser(result.data.user);
        setStore(result.data.store);
        setOutlet(result.data.outlet);
        setIsAuthenticated(true);
        setIsOnShift(false);
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Login failed',
      };
    } catch (error: any) {
      console.error('[AuthContext] Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
    } finally {
      setUser(null);
      setStore(null);
      setOutlet(null);
      setIsAuthenticated(false);
      setIsOnShift(false);
    }
  };

  const startShift = async (terminalId?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await apiService.startShift(terminalId);

      if (result.success) {
        setIsOnShift(true);
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Failed to start shift',
      };
    } catch (error: any) {
      console.error('[AuthContext] Start shift error:', error);
      return {
        success: false,
        error: error.message || 'Failed to start shift',
      };
    }
  };

  const endShift = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await apiService.endShift();

      if (result.success) {
        setIsOnShift(false);
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Failed to end shift',
      };
    } catch (error: any) {
      console.error('[AuthContext] End shift error:', error);
      return {
        success: false,
        error: error.message || 'Failed to end shift',
      };
    }
  };

  const refreshSession = async () => {
    try {
      const result = await apiService.getSession();

      if (result.success && result.data) {
        setUser(result.data.user);
        setStore(result.data.store);
        setOutlet(result.data.outlet);
        setIsOnShift(result.data.isOnShift);
      }
    } catch (error) {
      console.error('[AuthContext] Refresh session error:', error);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    store,
    outlet,
    isOnShift,
    login,
    logout,
    startShift,
    endShift,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
