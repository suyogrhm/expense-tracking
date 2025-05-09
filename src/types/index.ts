// src/types/index.ts

export interface Expense {
  id: string; // UUID from Supabase
  user_id: string;
  created_at: string; // ISO timestamp
  expense_date: string; // ISO timestamp (stored as UTC, displayed in local time)
  amount: number;
  category: string;
  sub_category?: string | null;
  description?: string | null;
}

export interface Category {
  id: string; // e.g., 'bills', 'food'
  name: string; // e.g., 'Bills', 'Food'
}

export interface SubCategory {
  id: string; // e.g., 'electricity', 'swiggy'
  name: string; // e.g., 'Electricity', 'Swiggy'
}

// New Type for Income
export interface Income {
  id: string; // UUID from Supabase
  user_id: string;
  created_at: string; // ISO timestamp
  income_date: string; // ISO timestamp (stored as UTC)
  source: string; // e.g., Salary, Freelance, Gift
  amount: number;
  description?: string | null;
}

// New Type for Budget
export interface Budget {
  id: string; // UUID from Supabase
  user_id: string;
  created_at: string; // ISO timestamp
  month: number; // 1-12
  year: number;
  category?: string | null; // If null, it's an overall budget
  amount: number;
  description?: string | null;
}
