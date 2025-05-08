export interface Expense {
    id: string; // UUID from Supabase
    user_id: string;
    created_at: string; // ISO timestamp
    expense_date: string; // ISO timestamp (will be stored as UTC)
    amount: number;
    category: string;
    sub_category?: string | null;
    description?: string | null;
  }
  
  export interface Category {
    id: string;
    name: string;
  }
  
  export interface SubCategory {
    id: string;
    name: string;
  }
  