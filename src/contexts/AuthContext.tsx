import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'; 
import type { Session, User, AuthError, SignUpWithPasswordCredentials } from '@supabase/supabase-js'; // Added AuthError, SignUpWithPasswordCredentials
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import type { UserMetadata } from '../types'; // Import UserMetadata
 // Import UserMetadata

interface AuthContextType {
  user: User & { user_metadata: UserMetadata } | null; // Adjusted User type
  session: Session | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ user: User; session: Session; error: null; } | { user: null; session: null; error: AuthError; }>; 
  register: (credentials: SignUpWithPasswordCredentials & {data?: Record<string,any>}) => Promise<{ user: User; session: Session; error: null; } | { user: null; session: null; error: AuthError; }>; // Updated register signature
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User & { user_metadata: UserMetadata } | null>(null); // Adjusted User type
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user as User & { user_metadata: UserMetadata } ?? null); // Cast user
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user as User & { user_metadata: UserMetadata } ?? null); // Cast user
        setIsLoading(false);
        if (!session && _event !== 'INITIAL_SESSION') { 
            navigate('/login', { replace: true });
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setIsLoading(false);
    if (error) {
        console.error("Login error:", error);
        return { user: null, session: null, error };
    }
    return { user: data.user as User, session: data.session as Session, error: null };
  };

  // Updated register function to accept options for metadata
  const register = async (credentials: SignUpWithPasswordCredentials & {options?: {data?: Record<string,any>}}) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp(credentials);
    setIsLoading(false);
    if (error) {
        console.error("Registration error:", error);
        return { user: null, session: null, error };
    }
    // Note: data.user might be null if email confirmation is required and not yet completed.
    // data.session might also be null.
    return { user: data.user as User, session: data.session as Session, error: null };
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsLoading(false);
    navigate('/login', { replace: true });
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password` 
    });
    setIsLoading(false);
    if(error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    isLoading,
    login,
    register,
    logout,
    forgotPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};