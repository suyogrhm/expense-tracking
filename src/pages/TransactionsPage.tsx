import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path
import { useAuth } from '../contexts/AuthContext';   // Adjust path
import type {
  Expense,
  Income,
  ExpenseFilterState,
  ExpenseSortState,
  IncomeFilterState,
  IncomeSortState,
  Category as PresetCategoryType
} from '../types'; // Adjust path
import { useToast } from '../hooks/useToast'; // Adjust path
import { useDebounce } from '../hooks/useDebounce'; // Adjust path
import { format, getYear, getMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Download, Loader2, Search as SearchIcon, Eye } from 'lucide-react';
import Input from '../components/ui/Input'; // Adjust path
import Button from '../components/ui/Button'; // Adjust path
import Select from '../components/ui/Select'; // Assuming you have a Select component for view mode
import { exportToPdf } from '../utils/exportUtils'; // Adjust path
import AdvancedFilter from '../components/Filters/AdvancedFilter'; // Adjust path

interface Transaction extends Expense {
  type: 'expense';
}

interface IncomeTransaction extends Income {
  type: 'income';
}

type CombinedTransaction = Transaction | IncomeTransaction;

// Define preset categories for expenses if AdvancedFilter needs them when in 'expense' mode
const presetExpenseCategories: PresetCategoryType[] = [
  { id: 'bills', name: 'Bills' },
  { id: 'petrol', name: 'Petrol' },
  { id: 'food', name: 'Food' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'online_shopping', name: 'Online Shopping' },
];

const TransactionsPage: React.FC = () => {
  const [allCombinedTransactions, setAllCombinedTransactions] = useState<CombinedTransaction[]>([]);
  const [filteredAndSortedTransactions, setFilteredAndSortedTransactions] = useState<CombinedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  // View mode: 'all', 'expense', 'income'
  const [viewMode, setViewMode] = useState<'all' | 'expense' | 'income'>('all');

  // Global search for 'all' view mode
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const debouncedGlobalSearchTerm = useDebounce(globalSearchTerm, 500);

  // States for Expense Filters and Sort
  const initialExpenseFilters: ExpenseFilterState = {
    searchTerm: '', selectedYear: 0, selectedMonth: 0, startDate: '', endDate: '',
    category: '', tag: '', minAmount: '', maxAmount: '',
  };
  const initialExpenseSort: ExpenseSortState = { sortBy: 'expense_date', sortOrder: 'desc' };
  const [activeExpenseFilters, setActiveExpenseFilters] = useState<Partial<ExpenseFilterState>>(initialExpenseFilters);
  const [activeExpenseSort, setActiveExpenseSort] = useState<ExpenseSortState>(initialExpenseSort);

  // States for Income Filters and Sort
  const initialIncomeFilters: IncomeFilterState = {
    searchTerm: '', selectedYear: 0, selectedMonth: 0, startDate: '', endDate: '',
    source: '', tag: '', minAmount: '', maxAmount: '',
  };
  const initialIncomeSort: IncomeSortState = { sortBy: 'income_date', sortOrder: 'desc' };
  const [activeIncomeFilters, setActiveIncomeFilters] = useState<Partial<IncomeFilterState>>(initialIncomeFilters);
  const [activeIncomeSort, setActiveIncomeSort] = useState<IncomeSortState>(initialIncomeSort);

  // Debounced values from AdvancedFilter (specific to the current mode)
  const debouncedAdvancedSearchTerm = useDebounce(
    viewMode === 'expense' ? activeExpenseFilters.searchTerm || '' : activeIncomeFilters.searchTerm || '', 500
  );
  const debouncedAdvancedMinAmount = useDebounce(
    viewMode === 'expense' ? activeExpenseFilters.minAmount || '' : activeIncomeFilters.minAmount || '', 500
  );
  const debouncedAdvancedMaxAmount = useDebounce(
    viewMode === 'expense' ? activeExpenseFilters.maxAmount || '' : activeIncomeFilters.maxAmount || '', 500
  );


  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses').select('*, tags(id, name), expense_split_details(*)').eq('user_id', user.id);
      if (expenseError) throw expenseError;

      const { data: incomeData, error: incomeError } = await supabase
        .from('incomes').select('*, tags(id, name)').eq('user_id', user.id);
      if (incomeError) throw incomeError;

      const formattedExpenses: Transaction[] = (expenseData || []).map(exp => ({
        ...exp, type: 'expense', tags: exp.tags || [], expense_split_details: exp.expense_split_details || []
      }));
      const formattedIncomes: IncomeTransaction[] = (incomeData || []).map(inc => ({
        ...inc, type: 'income', tags: inc.tags || []
      }));

      const combined = [...formattedExpenses, ...formattedIncomes].sort((a, b) => {
        const dateA = new Date(a.type === 'expense' ? a.expense_date : a.income_date);
        const dateB = new Date(b.type === 'expense' ? b.expense_date : b.income_date);
        return dateB.getTime() - dateA.getTime(); // Default sort: newest first
      });
      setAllCombinedTransactions(combined);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      showToast("Failed to load transactions.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Combined filtering and sorting logic
  useEffect(() => {
    let processedTransactions = [...allCombinedTransactions];

    // 1. Filter by viewMode
    if (viewMode === 'expense') {
      processedTransactions = processedTransactions.filter(t => t.type === 'expense');
    } else if (viewMode === 'income') {
      processedTransactions = processedTransactions.filter(t => t.type === 'income');
    }
    // For 'all' mode, no type filtering here, show both

    // 2. Apply filters based on viewMode
    if (viewMode === 'all') {
      // Apply global search term for 'all' mode
      if (debouncedGlobalSearchTerm.trim() !== '') {
        const lowerSearchTerm = debouncedGlobalSearchTerm.toLowerCase();
        processedTransactions = processedTransactions.filter(trans => {
          if (trans.type === 'expense') {
            return trans.category.toLowerCase().includes(lowerSearchTerm) ||
              (trans.sub_category && trans.sub_category.toLowerCase().includes(lowerSearchTerm)) ||
              (trans.description && trans.description.toLowerCase().includes(lowerSearchTerm)) ||
              trans.amount.toString().includes(lowerSearchTerm) ||
              (trans.tags && trans.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)));
          } else { // Income
            return trans.source.toLowerCase().includes(lowerSearchTerm) ||
              (trans.description && trans.description.toLowerCase().includes(lowerSearchTerm)) ||
              trans.amount.toString().includes(lowerSearchTerm) ||
              (trans.tags && trans.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)));
          }
        });
      }
      // For 'all' mode, default sort is by date (applied during fetch). Advanced sort is not applied here.
    } else if (viewMode === 'expense') {
      const currentFilters = activeExpenseFilters as Partial<ExpenseFilterState>; // Type assertion
      // Apply expense-specific filters from AdvancedFilter
      if (currentFilters.startDate) {
        const localStartDate = parseISO(currentFilters.startDate);
        const startUTC = startOfDay(localStartDate).toISOString();
        processedTransactions = processedTransactions.filter(t => t.type === 'expense' && t.expense_date >= startUTC);
      }
      if (currentFilters.endDate) {
        const localEndDate = parseISO(currentFilters.endDate);
        const endUTC = endOfDay(localEndDate).toISOString();
        processedTransactions = processedTransactions.filter(t => t.type === 'expense' && t.expense_date <= endUTC);
      }
      if (!currentFilters.startDate && !currentFilters.endDate) {
        if (currentFilters.selectedYear && currentFilters.selectedYear !== 0) {
          processedTransactions = processedTransactions.filter(t => t.type === 'expense' && getYear(toZonedTime(new Date(t.expense_date), timeZone)) === currentFilters.selectedYear);
        }
        if (currentFilters.selectedMonth && currentFilters.selectedMonth !== 0) {
          processedTransactions = processedTransactions.filter(t => t.type === 'expense' && getMonth(toZonedTime(new Date(t.expense_date), timeZone)) + 1 === currentFilters.selectedMonth);
        }
      }
      if (currentFilters.category) {
        processedTransactions = processedTransactions.filter(t => t.type === 'expense' && t.category === currentFilters.category);
      }
      if (currentFilters.tag) {
        processedTransactions = processedTransactions.filter(t => t.tags?.some(tag => tag.name === currentFilters.tag));
      }
      if (debouncedAdvancedMinAmount) {
        const min = parseFloat(debouncedAdvancedMinAmount);
        if (!isNaN(min)) processedTransactions = processedTransactions.filter(t => t.amount >= min);
      }
      if (debouncedAdvancedMaxAmount) {
        const max = parseFloat(debouncedAdvancedMaxAmount);
        if (!isNaN(max)) processedTransactions = processedTransactions.filter(t => t.amount <= max);
      }
      if (debouncedAdvancedSearchTerm.trim() !== '') {
        const lowerSearch = debouncedAdvancedSearchTerm.toLowerCase();
        processedTransactions = processedTransactions.filter(t =>
          t.type === 'expense' && (
            t.category.toLowerCase().includes(lowerSearch) ||
            (t.sub_category && t.sub_category.toLowerCase().includes(lowerSearch)) ||
            (t.description && t.description.toLowerCase().includes(lowerSearch)) ||
            t.amount.toString().includes(lowerSearch) ||
            (t.tags && t.tags.some(tag => tag.name.toLowerCase().includes(lowerSearch)))
          )
        );
      }
      // Apply expense-specific sorting
      if (activeExpenseSort.sortBy) {
        processedTransactions.sort((a, b) => {
          if (a.type === 'income' || b.type === 'income') return 0; // Should not happen if filtered correctly
          const expA = a as Transaction;
          const expB = b as Transaction;
          let valA: any, valB: any;
          switch (activeExpenseSort.sortBy) {
            case 'expense_date': valA = new Date(expA.expense_date).getTime(); valB = new Date(expB.expense_date).getTime(); break;
            case 'amount': valA = expA.amount; valB = expB.amount; break;
            case 'category': valA = expA.category.toLowerCase(); valB = expB.category.toLowerCase(); break;
            default: return 0;
          }
          if (valA < valB) return activeExpenseSort.sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return activeExpenseSort.sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
    } else { // viewMode === 'income'
      const currentFilters = activeIncomeFilters as Partial<IncomeFilterState>; // Type assertion
      // Apply income-specific filters from AdvancedFilter
      if (currentFilters.startDate) {
        const localStartDate = parseISO(currentFilters.startDate);
        const startUTC = startOfDay(localStartDate).toISOString();
        processedTransactions = processedTransactions.filter(t => t.type === 'income' && t.income_date >= startUTC);
      }
      if (currentFilters.endDate) {
        const localEndDate = parseISO(currentFilters.endDate);
        const endUTC = endOfDay(localEndDate).toISOString();
        processedTransactions = processedTransactions.filter(t => t.type === 'income' && t.income_date <= endUTC);
      }
      if (!currentFilters.startDate && !currentFilters.endDate) {
        if (currentFilters.selectedYear && currentFilters.selectedYear !== 0) {
          processedTransactions = processedTransactions.filter(t => t.type === 'income' && getYear(toZonedTime(new Date(t.income_date), timeZone)) === currentFilters.selectedYear);
        }
        if (currentFilters.selectedMonth && currentFilters.selectedMonth !== 0) {
          processedTransactions = processedTransactions.filter(t => t.type === 'income' && getMonth(toZonedTime(new Date(t.income_date), timeZone)) + 1 === currentFilters.selectedMonth);
        }
      }
      if (currentFilters.source) {
        processedTransactions = processedTransactions.filter(t => t.type === 'income' && t.source === currentFilters.source);
      }
      if (currentFilters.tag) {
        processedTransactions = processedTransactions.filter(t => t.tags?.some(tag => tag.name === currentFilters.tag));
      }
      if (debouncedAdvancedMinAmount) {
        const min = parseFloat(debouncedAdvancedMinAmount);
        if (!isNaN(min)) processedTransactions = processedTransactions.filter(t => t.amount >= min);
      }
      if (debouncedAdvancedMaxAmount) {
        const max = parseFloat(debouncedAdvancedMaxAmount);
        if (!isNaN(max)) processedTransactions = processedTransactions.filter(t => t.amount <= max);
      }
      if (debouncedAdvancedSearchTerm.trim() !== '') {
        const lowerSearch = debouncedAdvancedSearchTerm.toLowerCase();
        processedTransactions = processedTransactions.filter(t =>
          t.type === 'income' && (
            t.source.toLowerCase().includes(lowerSearch) ||
            (t.description && t.description.toLowerCase().includes(lowerSearch)) ||
            t.amount.toString().includes(lowerSearch) ||
            (t.tags && t.tags.some(tag => tag.name.toLowerCase().includes(lowerSearch)))
          )
        );
      }
      // Apply income-specific sorting
      if (activeIncomeSort.sortBy) {
        processedTransactions.sort((a, b) => {
          if (a.type === 'expense' || b.type === 'expense') return 0; // Should not happen
          const incA = a as IncomeTransaction;
          const incB = b as IncomeTransaction;
          let valA: any, valB: any;
          switch (activeIncomeSort.sortBy) {
            case 'income_date': valA = new Date(incA.income_date).getTime(); valB = new Date(incB.income_date).getTime(); break;
            case 'amount': valA = incA.amount; valB = incB.amount; break;
            case 'source': valA = incA.source.toLowerCase(); valB = incB.source.toLowerCase(); break;
            default: return 0;
          }
          if (valA < valB) return activeIncomeSort.sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return activeIncomeSort.sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }
    setFilteredAndSortedTransactions(processedTransactions);
  }, [
    allCombinedTransactions, viewMode, debouncedGlobalSearchTerm,
    activeExpenseFilters, activeExpenseSort,
    activeIncomeFilters, activeIncomeSort,
    timeZone, debouncedAdvancedSearchTerm, debouncedAdvancedMinAmount, debouncedAdvancedMaxAmount // Added advanced debounced values
  ]);

  const handleExpenseFilterChange = useCallback((newFilters: Partial<ExpenseFilterState>) => {
    setActiveExpenseFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  const handleExpenseSortChange = useCallback((newSort: ExpenseSortState) => {
    setActiveExpenseSort(newSort);
  }, []);
  const handleIncomeFilterChange = useCallback((newFilters: Partial<IncomeFilterState>) => {
    setActiveIncomeFilters(prev => ({ ...prev, ...newFilters }));
  }, []);
  const handleIncomeSortChange = useCallback((newSort: IncomeSortState) => {
    setActiveIncomeSort(newSort);
  }, []);

  const totalIncome = filteredAndSortedTransactions
    .filter((t): t is IncomeTransaction => t.type === 'income')
    .reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = filteredAndSortedTransactions
    .filter((t): t is Transaction => t.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const handleExportPdf = () => {
    if (filteredAndSortedTransactions.length === 0) {
      showToast("No transactions to export.", "info");
      return;
    }
    // Adapt data for exportToPdf if its structure is specific (e.g. expects 'category' not 'source')
    const dataToExport = filteredAndSortedTransactions.map(t => ({
      ...t,
      date: t.type === 'expense' ? t.expense_date : t.income_date,
      categoryOrSource: t.type === 'expense' ? t.category : t.source,
    }));

    const fileName = `Transactions_Report_${viewMode}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Transactions Report (${viewMode}) as of ${format(new Date(), 'dd MMM yyyy')}`;
    exportToPdf(dataToExport as any, fileName, title, timeZone); // Cast if needed
    showToast("PDF export started.", "success");
  };

  const viewModeOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'expense', label: 'Expenses Only' },
    { value: 'income', label: 'Income Only' },
  ];

  const getSelectionPeriodText = useCallback(() => {
    let currentFilters: Partial<ExpenseFilterState> | Partial<IncomeFilterState> | null = null;
    if (viewMode === 'expense') currentFilters = activeExpenseFilters;
    else if (viewMode === 'income') currentFilters = activeIncomeFilters;

    if (currentFilters) {
      if (currentFilters.startDate && currentFilters.endDate) {
        return `${format(parseISO(currentFilters.startDate), 'dd MMM yy')} - ${format(parseISO(currentFilters.endDate), 'dd MMM yy')}`;
      }
      if (currentFilters.startDate) return `From ${format(parseISO(currentFilters.startDate), 'dd MMM yy')}`;
      if (currentFilters.endDate) return `Until ${format(parseISO(currentFilters.endDate), 'dd MMM yy')}`;

      const yearForMonthFormatting = (currentFilters.selectedYear && currentFilters.selectedYear !== 0)
        ? currentFilters.selectedYear
        : getYear(new Date());

      const selectedMonthNumber = currentFilters.selectedMonth || 0;
      const selectedYearNumber = currentFilters.selectedYear || 0;

      let monthLabel = '';
      if (selectedMonthNumber !== 0) {
        monthLabel = format(new Date(yearForMonthFormatting, selectedMonthNumber - 1, 1), 'MMM');
      }

      if (selectedYearNumber !== 0) {
        if (monthLabel) return `${monthLabel} ${selectedYearNumber}`;
        return `Year ${selectedYearNumber}`;
      } else {
        if (monthLabel) return `${monthLabel} (All Years)`;
        // For 'all' view mode, or if no specific date/year/month filter is active for expense/income mode
        return viewMode === 'all' ? "All Time (default sort by date)" : "All Time";
      }
    }
    return "All Time (default sort by date)"; // Default for 'all' viewMode or if filters are not applicable
  }, [viewMode, activeExpenseFilters, activeIncomeFilters]);

  const selectionPeriod = getSelectionPeriodText();


  return (
    <div className="space-y-8">
      <div className="content-card">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-4">Transactions History</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Summary Cards */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-1">Total Income</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-1">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-1">Net Balance</h3>
            <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              ₹{(totalIncome - totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* View Mode Selector and Global Search for 'all' mode */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 p-4 bg-gray-50 dark:bg-dark-card rounded-lg shadow">
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-gray-600 dark:text-dark-text-secondary" />
            <Select
              id="viewMode"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'all' | 'expense' | 'income')}
              options={viewModeOptions}
              className="w-48 bg-white dark:bg-dark-input"
            />
          </div>
          {viewMode === 'all' && (
            <Input
              id="transactionSearchGlobal"
              type="search"
              placeholder="Search all transactions..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
              icon={<SearchIcon size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
              containerClassName="w-full sm:w-auto flex-grow sm:flex-grow-0"
              className="bg-white dark:bg-dark-input"
            />
          )}
        </div>

        {/* Conditionally render AdvancedFilter */}
        {viewMode === 'expense' && (
          <AdvancedFilter
            key="expense-filter" // Add key to ensure re-mount when mode changes
            mode="expense"
            initialFilters={activeExpenseFilters} // Pass the current active expense filters
            onFilterChange={handleExpenseFilterChange as any} // Cast to any if types are complex for AdvancedFilter's union
            initialSort={activeExpenseSort}
            onSortChange={handleExpenseSortChange as any}
            presetCategories={presetExpenseCategories}
          />
        )}
        {viewMode === 'income' && (
          <AdvancedFilter
            key="income-filter" // Add key
            mode="income"
            initialFilters={activeIncomeFilters}
            onFilterChange={handleIncomeFilterChange as any}
            initialSort={activeIncomeSort}
            onSortChange={handleIncomeSortChange as any}
          />
        )}

        {/* Display Area for transactions and export button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center my-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            Displaying {filteredAndSortedTransactions.length} of {allCombinedTransactions.length} records.
            {selectionPeriod !== "All Time (default sort by date)" && <><br />Filtered period: <span className="font-semibold">{selectionPeriod}</span></>}
          </p>
          {filteredAndSortedTransactions.length > 0 && (
            <Button onClick={handleExportPdf} variant="outline" size="sm">
              <Download size={16} className="mr-2" /> Export PDF
            </Button>
          )}
        </div>


        {/* Transaction List/Table */}
        {isLoading ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" /><p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading transactions...</p></div>
        ) : filteredAndSortedTransactions.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-dark-card rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category/Source</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount (₹)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tags</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredAndSortedTransactions.map((transaction) => (
                    <tr key={`${transaction.type}-${transaction.id}-${transaction.created_at}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">
                        {format(new Date(transaction.type === 'expense' ? transaction.expense_date : transaction.income_date), 'dd MMM yy, hh:mm a')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text truncate max-w-xs">
                        {transaction.type === 'expense' ? transaction.category : transaction.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-dark-text">
                        {transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text truncate max-w-xs">
                        {transaction.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text">
                        {transaction.tags && transaction.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {transaction.tags.slice(0, 2).map(tag => ( // Show max 2 tags, add "..." if more
                              <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                {tag.name}
                              </span>
                            ))}
                            {transaction.tags.length > 2 && <span className="text-xs">...</span>}
                          </div>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredAndSortedTransactions.map((transaction) => (
                <div key={`${transaction.type}-${transaction.id}-mobile`} className="bg-white dark:bg-dark-card rounded-lg shadow p-4 border-l-4 ${transaction.type === 'income' ? 'border-green-500' : 'border-red-500'}">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'income' ? `+ ₹${transaction.amount.toLocaleString('en-IN')}` : `- ₹${transaction.amount.toLocaleString('en-IN')}`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-dark-text-secondary">
                      {format(new Date(transaction.type === 'expense' ? transaction.expense_date : transaction.income_date), 'dd MMM, yy')}
                    </span>
                  </div>
                  <p className="text-md font-medium text-gray-800 dark:text-dark-text mb-1">
                    {transaction.type === 'expense' ? transaction.category : transaction.source}
                  </p>
                  {transaction.description && <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2 truncate">{transaction.description}</p>}
                  {transaction.tags && transaction.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {transaction.tags.map(tag => (
                        <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10">
            <p>No transactions found {
              viewMode === 'all' && debouncedGlobalSearchTerm ? `matching "${debouncedGlobalSearchTerm}"` :
                (viewMode !== 'all' && debouncedAdvancedSearchTerm ? `matching "${debouncedAdvancedSearchTerm}" for ${viewMode}s` :
                  (selectionPeriod !== "All Time (default sort by date)" ? `for ${selectionPeriod}` : 'for the selected criteria'))
            }.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;