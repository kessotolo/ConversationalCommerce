import * as React from 'react';
import { AuthContext, AuthContextType, AuthUser } from '@/contexts/AuthContext';
import { TenantContext } from '@/contexts/TenantContext';import { React } from 'react';import { Check, Store, User } from 'lucide-react';
import { useTenant } from './TenantContext';

// Interface for auth with UUID tenant connection
interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string; // UUID format matching your database
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  signIn: async () => {},
  signOut: async () => {},
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { tenant } = useTenant();

  // Check for existing auth session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would verify the auth session
        // For now, check localStorage for demo purposes
        const storedUser = localStorage.getItem('auth_user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          
          // When properly integrated with Clerk, this would check
          // if the user has access to this specific tenant's UUID
          if (tenant && tenant.id) {
            // In production: verify user has access to this UUID tenant
            // For demo: just assume they do
            parsedUser.tenantId = tenant.id;
          }
          
          setUser(parsedUser);
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setError(err instanceof Error ? err : new Error('Unknown auth error'));
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [tenant]);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // This would be a real auth API call in production
      // For demo purposes, just simulate a successful login
      
      // In production, this would validate credentials against Clerk
      // and retrieve the user's UUID from your database
      
      // IMPORTANT: The UUID tenant system requires proper joining here
      const userWithTenant: AuthUser = {
        id: 'user_' + Math.random().toString(36).substring(2, 11),
        email,
        firstName: 'Demo',
        lastName: 'User',
        tenantId: tenant?.id, // Connect to UUID tenant
      };
      
      // Store user data (in production, this would be handled by Clerk)
      localStorage.setItem('auth_user', JSON.stringify(userWithTenant));
      
      setUser(userWithTenant);
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true);
      
      // In production, this would call Clerk's signOut method
      localStorage.removeItem('auth_user');
      
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signIn,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
