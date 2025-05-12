import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
// Ensure type-only imports for Supabase types if verbatimModuleSyntax is enabled
import type { Session, User as SupabaseUser, AuthError, SignUpWithPasswordCredentials } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import type { UserMetadata } from '../types'; // UserMetadata might still contain username

// Define an AppUser type that extends SupabaseUser to include our specific user_metadata structure
export interface AppUser extends SupabaseUser {
  user_metadata: UserMetadata; // UserMetadata will not have default_currency
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  isLoading: boolean;
  // login function now throws error on failure, returns user/session on success
  login: (email: string, pass: string) => Promise<{ user: AppUser; session: Session }>;
  register: (credentials: SignUpWithPasswordCredentials & { options?: { data?: Record<string, any> } }) => Promise<{ user: SupabaseUser; session: Session | null; error: null; } | { user: null; session: null; error: AuthError; }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      const currentUser = currentSession?.user as AppUser ?? null;
      setUser(currentUser);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        const currentUser = currentSession?.user as AppUser ?? null;
        setUser(currentUser);
        setIsLoading(false);
        if (!currentSession && _event !== 'INITIAL_SESSION') {
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
      console.error("Login error in AuthContext:", error);
      throw error; // Throw the error to be caught by the LoginPage
    }
    if (!data.user || !data.session) {
      throw new Error("Login failed: No user or session data returned despite no explicit error.");
    }
    return { user: data.user as AppUser, session: data.session };
  };

  const register = async (credentials: SignUpWithPasswordCredentials & { options?: { data?: Record<string, any> } }) => {
    setIsLoading(true);
    // No default_currency logic needed here anymore if reverting
    const { data, error } = await supabase.auth.signUp(credentials);
    setIsLoading(false);
    if (error) {
      console.error("Registration error:", error);
      return { user: null, session: null, error };
    }
    return { user: data.user as SupabaseUser, session: data.session, error: null };
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
    if (error) throw error;
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
