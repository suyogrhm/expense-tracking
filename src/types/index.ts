export interface Expense {
  id: string; 
  user_id: string;
  created_at: string; 
  expense_date: string; 
  amount: number;
  category: string; // This can now be a preset name or a UserDefinedCategory name
  sub_category?: string | null; // This can now be a preset name or a UserDefinedSubCategory name
  description?: string | null;
}

export interface Category { // Represents a preset category
  id: string; 
  name: string; 
}

export interface SubCategory { // Represents a preset sub-category
  id: string; 
  name: string; 
}

export interface Income {
  id: string; 
  user_id: string;
  created_at: string; 
  income_date: string; 
  source: string; // This can now be a preset name or a UserDefinedCategory name (type 'income')
  amount: number;
  description?: string | null;
}

export interface Budget {
  id: string; 
  user_id: string;
  created_at: string; 
  month: number; 
  year: number;
  category?: string | null; // This can now be a preset name or a UserDefinedCategory name
  amount: number;
  description?: string | null;
}

// New Types for User-Defined Categories
export interface UserDefinedCategory {
  user_defined_sub_categories: boolean;
  id: string; // UUID from Supabase
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  created_at: string;
  sub_categories?: UserDefinedSubCategory[]; // Optional: for easier frontend handling
}

export interface UserDefinedSubCategory {
  id: string; // UUID from Supabase
  user_id: string;
  main_category_id: string; // FK to UserDefinedCategory.id
  name: string;
  created_at: string;
}