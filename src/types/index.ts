export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface UserDefinedCategory {
  id: string;
  user_id: string;
  name: string;
  type: 'expense' | 'income'; // Specifies if the category is for expenses or income
  created_at: string;
  user_defined_sub_categories?: UserDefinedSubCategory[]; // Optional array of sub-categories
}

export interface UserDefinedSubCategory {
  id: string;
  user_id: string;
  main_category_id: string; // Foreign key to UserDefinedCategory
  name: string;
  created_at: string;
}

// Expense Related Types
export interface Expense {
  id: string;
  user_id: string;
  created_at: string;
  expense_date: string; // Date of the expense
  amount: number; // Total amount of the expense
  category: string; // Main category of the expense
  sub_category?: string | null; // Optional sub-category
  description?: string | null; // Optional description
  tags?: Tag[]; // Optional array of tags associated with the expense
  is_split?: boolean; // Flag indicating if the expense is split
  split_note?: string | null; // Optional note for split expenses
  expense_split_details?: ExpenseSplitDetail[] | null; // Array of split details if is_split is true
}

export interface ExpenseSplitDetail {
  id?: string; // Optional: ID from the database (present if already saved)
  expense_id?: string; // Optional: Foreign key to Expense (set when saving)
  user_id: string; // User who this split part belongs to (could be different in shared contexts, but likely current user)
  person_name: string; // Name of the person involved in this part of the split
  amount: number; // Amount for this person's share
  created_at?: string; // Optional: Timestamp of creation
}

export interface ExpenseFilterState {
  searchTerm: string;
  selectedYear: number; // 0 for all years
  selectedMonth: number; // 0 for all months
  startDate: string; // Format: yyyy-MM-DD
  endDate: string;   // Format: yyyy-MM-DD
  category: string;  // Selected expense category
  tag: string;       // Selected tag name
  minAmount: string; // String for input, parsed to number
  maxAmount: string; // String for input, parsed to number
}

export interface ExpenseSortState {
  sortBy: 'expense_date' | 'amount' | 'category' | ''; // Fields to sort expenses by
  sortOrder: 'asc' | 'desc'; // Sort order
}


// Income Related Types
export interface Income {
  id: string;
  user_id: string;
  created_at: string;
  income_date: string; // Date of the income
  source: string; // Source of the income (e.g., Salary, Freelance)
  amount: number; // Amount of income
  description?: string | null; // Optional description
  tags?: Tag[]; // Optional array of tags associated with the income
}

export interface IncomeFilterState {
  searchTerm: string;
  selectedYear: number; // 0 for all years
  selectedMonth: number; // 0 for all months
  startDate: string; // Format: yyyy-MM-DD
  endDate: string;   // Format: yyyy-MM-DD
  source: string;    // Selected income source
  tag: string;       // Selected tag name
  minAmount: string; // String for input, parsed to number
  maxAmount: string; // String for input, parsed to number
}

export interface IncomeSortState {
  sortBy: 'income_date' | 'amount' | 'source' | ''; // Fields to sort income by
  sortOrder: 'asc' | 'desc'; // Sort order
}


// Budget Related Types
export interface Budget {
  id: string;
  user_id: string;
  created_at: string;
  month: number; // Numeric month (1-12)
  year: number;  // Numeric year (e.g., 2023)
  category?: string | null; // Category the budget applies to (can be null if overall budget)
  amount: number; // Budgeted amount
  description?: string | null; // Optional description
}


// User Related Types (Supabase Auth)
export interface UserMetadata {
  username?: string;
  // Add other custom user metadata fields here if any
}

// Extending Supabase's User type to include our custom user_metadata
import type { User as SupabaseUser } from '@supabase/supabase-js';
export interface AppUser extends SupabaseUser {
  user_metadata: UserMetadata;
}


// PDF Export Specific Type
export interface PdfExportRow {
  Type: string;
  Date: string;
  'Category/Source': string; // Matches the column header in the PDF
  Description: string;
  Amount: string; // Formatted string, e.g., "+1,000.00" or "-50.00"
  Tags: string;   // Comma-separated string of tags or "N/A"
}


// Legacy/Generic types (review if still needed or can be more specific)
export interface Category { // This seems like a generic category, distinct from UserDefinedCategory
  id: string;
  name: string;
}

export interface SubCategory { // This seems like a generic sub-category
  id: string;
  name: string;
}
export interface PdfExportRow {
  Type: string;
  Date: string;
  'Category/Source': string; // Matches the column header in the PDF
  Description: string;
  Amount: string; // Formatted string, e.g., "+1,000.00" or "-50.00"
  Tags: string;   // Comma-separated string of tags or "N/A"
  'Split Note'?: string; // Optional: For overall split note for an expense
  'Split Between'?: string; // Optional: For list of persons/amounts in a split expense
}