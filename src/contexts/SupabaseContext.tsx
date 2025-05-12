import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface SupabaseContextType {
  supabase: SupabaseClient;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}; 