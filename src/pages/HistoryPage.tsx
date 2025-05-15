import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path as needed
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed
import type {
  Expense,
  ExpenseFilterState,
  ExpenseSortState, IncomeFilterState, IncomeSortState, // Ensure this is correctly named from types.ts
  Category as PresetCategoryType} from '../types'; // Adjust path as needed
import { format, getYear, getMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useToast } from '../hooks/useToast'; // Adjust path as needed
import ExpenseTable from '../components/Expenses/ExpenseTable'; // Adjust path as needed
import AdvancedFilter from '../components/Filters/AdvancedFilter'; // Updated import
import { Loader2, CalendarDays, Download } from 'lucide-react';
import Button from '../components/ui/Button'; // Adjust path as needed
import { exportToPdf } from '../utils/exportUtils'; // Adjust path as needed
import { useDebounce } from '../hooks/useDebounce'; // Adjust path as needed

const presetCategories: PresetCategoryType[] = [
  { id: 'bills', name: 'Bills' },
  { id: 'petrol', name: 'Petrol' },
  { id: 'food', name: 'Food' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'online_shopping', name: 'Online Shopping' },
];


const HistoryPage: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredAndSortedExpenses, setFilteredAndSortedExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  const timeZone = 'Asia/Kolkata';
  const defaultDisplayYear = 0;
  const defaultDisplayMonth = 0;

  const initialFilters: ExpenseFilterState = {
    searchTerm: '',
    selectedYear: defaultDisplayYear,
    selectedMonth: defaultDisplayMonth,
    startDate: '',
    endDate: '',
    category: '', // This corresponds to 'categoryOrSource' in AdvancedFilter when mode is 'expense'
    tag: '',
    minAmount: '',
    maxAmount: '',
  };

  const initialSort: ExpenseSortState = {
    sortBy: 'expense_date',
    sortOrder: 'desc',
  };

  const [activeFilters, setActiveFilters] = useState<Partial<ExpenseFilterState>>(initialFilters);
  const [activeSort, setActiveSort] = useState<ExpenseSortState>(initialSort);

  // Debounce text inputs. AdvancedFilter handles its own internal state for inputs,
  // but the parent (HistoryPage) applies these debounced values from activeFilters.
  const debouncedSearchTerm = useDebounce(activeFilters.searchTerm || '', 500);
  const debouncedMinAmount = useDebounce(activeFilters.minAmount || '', 500);
  const debouncedMaxAmount = useDebounce(activeFilters.maxAmount || '', 500);

  const fetchAllExpenses = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, tags(id, name), expense_split_details(*)')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setAllExpenses((data || []).map(exp => ({
        ...exp,
        tags: exp.tags || [],
        expense_split_details: exp.expense_split_details || []
      })) as Expense[]
      );
    } catch (error: any) {
      console.error("Error fetching all expenses:", error);
      showToast("Failed to load expense history.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]);

  useEffect(() => {
    let processedExpenses = [...allExpenses];

    // Apply Date Range Filter
    if (activeFilters.startDate) {
      const localStartDate = parseISO(activeFilters.startDate);
      const startUTC = startOfDay(localStartDate).toISOString();
      processedExpenses = processedExpenses.filter(exp => exp.expense_date >= startUTC);
    }
    if (activeFilters.endDate) {
      const localEndDate = parseISO(activeFilters.endDate);
      const endUTC = endOfDay(localEndDate).toISOString();
      processedExpenses = processedExpenses.filter(exp => exp.expense_date <= endUTC);
    }

    // Apply Year/Month Filter (only if no date range is selected)
    if (!activeFilters.startDate && !activeFilters.endDate) {
      if (activeFilters.selectedYear && activeFilters.selectedYear !== 0) {
        processedExpenses = processedExpenses.filter(exp => {
          const expenseDateInIST = toZonedTime(new Date(exp.expense_date), timeZone);
          return getYear(expenseDateInIST) === activeFilters.selectedYear;
        });
      }
      if (activeFilters.selectedMonth && activeFilters.selectedMonth !== 0) {
        processedExpenses = processedExpenses.filter(exp => {
          const expenseDateInIST = toZonedTime(new Date(exp.expense_date), timeZone);
          return getMonth(expenseDateInIST) + 1 === activeFilters.selectedMonth;
        });
      }
    }

    // Apply Category Filter (from activeFilters.category)
    if (activeFilters.category) {
      processedExpenses = processedExpenses.filter(exp => exp.category === activeFilters.category);
    }
    // Apply Tag Filter
    if (activeFilters.tag) {
      processedExpenses = processedExpenses.filter(exp => exp.tags?.some(t => t.name === activeFilters.tag));
    }

    // Apply Min/Max Amount Filters (using debounced values)
    if (debouncedMinAmount) {
      const min = parseFloat(debouncedMinAmount);
      if (!isNaN(min)) {
        processedExpenses = processedExpenses.filter(exp => exp.amount >= min);
      }
    }
    if (debouncedMaxAmount) {
      const max = parseFloat(debouncedMaxAmount);
      if (!isNaN(max)) {
        processedExpenses = processedExpenses.filter(exp => exp.amount <= max);
      }
    }
    // Apply Search Term Filter (using debounced value)
    if (debouncedSearchTerm.trim() !== '') {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      processedExpenses = processedExpenses.filter(exp =>
        exp.category.toLowerCase().includes(lowerSearchTerm) ||
        (exp.sub_category && exp.sub_category.toLowerCase().includes(lowerSearchTerm)) ||
        (exp.description && exp.description.toLowerCase().includes(lowerSearchTerm)) ||
        (exp.amount.toString().includes(lowerSearchTerm)) ||
        (exp.tags && exp.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    // Apply Sorting
    if (activeSort.sortBy) {
      processedExpenses.sort((a, b) => {
        let valA: any, valB: any;
        switch (activeSort.sortBy) {
          case 'expense_date':
            valA = new Date(a.expense_date).getTime();
            valB = new Date(b.expense_date).getTime();
            break;
          case 'amount':
            valA = a.amount;
            valB = b.amount;
            break;
          case 'category':
            valA = a.category.toLowerCase();
            valB = b.category.toLowerCase();
            break;
          default:
            // Optional: handle '' or unexpected sortBy values if your type allows for them
            // const _exhaustiveCheck: never = activeSort.sortBy; // For stricter type checking
            return 0;
        }

        if (valA < valB) return activeSort.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return activeSort.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredAndSortedExpenses(processedExpenses);
  }, [allExpenses, activeFilters, activeSort, timeZone, debouncedSearchTerm, debouncedMinAmount, debouncedMaxAmount]);


  const handleFilterChange = useCallback((newFilters: Partial<ExpenseFilterState>) => {
    // AdvancedFilter will pass the 'category' field for expenses.
    setActiveFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleSortChange = useCallback((newSort: ExpenseSortState) => {
    setActiveSort(newSort);
  }, []);

  const handleExpenseUpdated = (_updatedExpense: Expense) => {
    fetchAllExpenses();
    showToast("Expense updated successfully!", "success");
  };

  const handleExpenseDeleted = (_deletedExpenseId: string) => {
    fetchAllExpenses();
    showToast("Expense deleted successfully!", "success");
  };

  const totalForSelection = filteredAndSortedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const getSelectionPeriodText = useCallback(() => {
    if (activeFilters.startDate && activeFilters.endDate) {
      return `${format(parseISO(activeFilters.startDate), 'dd MMM yy')} - ${format(parseISO(activeFilters.endDate), 'dd MMM yy')}`;
    }
    if (activeFilters.startDate) return `From ${format(parseISO(activeFilters.startDate), 'dd MMM yy')}`;
    if (activeFilters.endDate) return `Until ${format(parseISO(activeFilters.endDate), 'dd MMM yy')}`;

    const yearForMonthFormatting = (activeFilters.selectedYear && activeFilters.selectedYear !== 0)
      ? activeFilters.selectedYear
      : getYear(new Date());

    const selectedMonthNumber = activeFilters.selectedMonth || defaultDisplayMonth;
    const selectedYearNumber = activeFilters.selectedYear || defaultDisplayYear;

    let monthLabel = '';
    if (selectedMonthNumber !== 0) {
      monthLabel = format(new Date(yearForMonthFormatting, selectedMonthNumber - 1, 1), 'MMM');
    }

    if (selectedYearNumber !== 0) {
      if (monthLabel) return `${monthLabel} ${selectedYearNumber}`;
      return `Year ${selectedYearNumber}`;
    } else {
      if (monthLabel) return `${monthLabel} (All Years)`;
      return "All Time";
    }
  }, [activeFilters.startDate, activeFilters.endDate, activeFilters.selectedYear, activeFilters.selectedMonth, defaultDisplayMonth, defaultDisplayYear]);

  const selectionPeriod = getSelectionPeriodText();

  const handleExportPdf = () => {
    if (filteredAndSortedExpenses.length === 0) {
      showToast("No data to export for the selected period.", "info");
      return;
    }
    const safeSelectionPeriod = selectionPeriod.replace(/[^a-zA-Z0-9_-\s]/g, '').replace(/\s+/g, '_');
    const fileName = `Expense_History_${safeSelectionPeriod}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Expense History for ${selectionPeriod === "All Time" ? "all records" : selectionPeriod}`;
    exportToPdf(filteredAndSortedExpenses, fileName, title, timeZone);
    showToast("PDF export started.", "success");
  };

  return (
    <div className="space-y-8">
      <div className="content-card">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Expense History</h1>
        </div>

        <AdvancedFilter
          mode="expense" // Specify mode for expenses
          initialFilters={initialFilters}
          onFilterChange={handleFilterChange as (filters: Partial<ExpenseFilterState | IncomeFilterState>) => void}
          initialSort={initialSort} // Already ExpenseSortState
          onSortChange={handleSortChange as (sort: ExpenseSortState | IncomeSortState) => void}
          presetCategories={presetCategories} // Pass preset categories for expenses
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
            Displaying {filteredAndSortedExpenses.length} of {allExpenses.length} expenses
            {selectionPeriod !== "All Time" && ` for: `}
            <span className="font-semibold text-gray-700 dark:text-dark-text">
              {selectionPeriod !== "All Time" ? selectionPeriod : ''}
            </span>.
            <br />
            Total for selection:
            <span className="font-bold text-primary-600 dark:text-dark-primary"> ₹{totalForSelection.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
          {filteredAndSortedExpenses.length > 0 && (
            <div className="flex space-x-2 mt-2 sm:mt-0">
              <Button onClick={handleExportPdf} variant="outline" size="sm">
                <Download size={16} className="mr-2" /> PDF
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" />
            <p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading history...</p>
          </div>
        ) : filteredAndSortedExpenses.length > 0 ? (
          <ExpenseTable
            expenses={filteredAndSortedExpenses}
            onEdit={handleExpenseUpdated}
            onDelete={handleExpenseDeleted}
          />
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10 space-y-2">
            <CalendarDays size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
            <p>No expenses found {activeFilters.searchTerm ? `matching "${activeFilters.searchTerm}"` : (selectionPeriod !== "All Time" ? `for ${selectionPeriod}` : 'for the selected criteria')}.</p>
            {allExpenses.length === 0 && !isLoading && <p className="text-sm">You haven't recorded any expenses yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;