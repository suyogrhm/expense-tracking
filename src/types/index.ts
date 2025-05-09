export interface Expense {
  id: string; 
  user_id: string;
  created_at: string; 
  expense_date: string; 
  amount: number;
  category: string; 
  sub_category?: string | null; 
  description?: string | null;
  tags?: Tag[]; 
}

export interface Category { 
  id: string; 
  name: string; 
}

export interface SubCategory { 
  id: string; 
  name: string; 
}

export interface Income {
  id: string; 
  user_id: string;
  created_at: string; 
  income_date: string; 
  source: string; 
  amount: number;
  description?: string | null;
  tags?: Tag[]; 
}

export interface Budget {
  id: string; 
  user_id: string;
  created_at: string; 
  month: number; 
  year: number;
  category?: string | null; 
  amount: number;
  description?: string | null;
}

export interface UserDefinedCategory {
  id: string; 
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  created_at: string;
  user_defined_sub_categories?: UserDefinedSubCategory[]; 
}

export interface UserDefinedSubCategory {
  id: string; 
  user_id: string;
  main_category_id: string; 
  name: string;
  created_at: string;
}

export interface Tag {
    id: string; 
    user_id: string;
    name: string;
    created_at: string;
}
export interface UserMetadata {
  username?: string;
}
import type { User as SupabaseUser } from '@supabase/supabase-js';
export interface AppUser extends SupabaseUser {
  user_metadata: UserMetadata;
}