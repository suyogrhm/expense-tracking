import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type {
  Expense,
  Income,
  ExpenseFilterState,
  ExpenseSortState,
  IncomeFilterState,
  IncomeSortState,
  Category as PresetCategoryType,
  PdfExportRow
} from '../types';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { format, getYear, getMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Download, Loader2, Search as SearchIcon, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { exportToPdf } from '../utils/exportUtils';
import AdvancedFilter from '../components/Filters/AdvancedFilter';
import DateRangeModal from '../components/ui/DateRangeModal'; // Import the new modal

interface Transaction extends Expense {
  type: 'expense';
}

interface IncomeTransaction extends Income {
  type: 'income';
}

type CombinedTransaction = Transaction | IncomeTransaction;

const presetExpenseCategories: PresetCategoryType[] = [
  { id: 'bills', name: 'Bills' },
  { id: 'petrol', name: 'Petrol' },
  { id: 'food', name: 'Food' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'online_shopping', name: 'Online Shopping' },
];

const ITEMS_PER_PAGE = 15;
const TIME_ZONE = 'Asia/Kolkata';

const TransactionsPage: React.FC = () => {
  const [allCombinedTransactions, setAllCombinedTransactions] = useState<CombinedTransaction[]>([]);
  const [filteredAndSortedTransactions, setFilteredAndSortedTransactions] = useState<CombinedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'all' | 'expense' | 'income'>('all');
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const debouncedGlobalSearchTerm = useDebounce(globalSearchTerm, 500);

  const initialExpenseFilters: ExpenseFilterState = {
    searchTerm: '', selectedYear: 0, selectedMonth: 0, startDate: '', endDate: '',
    category: '', tag: '', minAmount: '', maxAmount: '',
  };
  const initialExpenseSort: ExpenseSortState = { sortBy: 'expense_date', sortOrder: 'desc' };
  const [activeExpenseFilters, setActiveExpenseFilters] = useState<Partial<ExpenseFilterState>>(initialExpenseFilters);
  const [activeExpenseSort, setActiveExpenseSort] = useState<ExpenseSortState>(initialExpenseSort);

  const initialIncomeFilters: IncomeFilterState = {
    searchTerm: '', selectedYear: 0, selectedMonth: 0, startDate: '', endDate: '',
    source: '', tag: '', minAmount: '', maxAmount: '',
  };
  const initialIncomeSort: IncomeSortState = { sortBy: 'income_date', sortOrder: 'desc' };
  const [activeIncomeFilters, setActiveIncomeFilters] = useState<Partial<IncomeFilterState>>(initialIncomeFilters);
  const [activeIncomeSort, setActiveIncomeSort] = useState<IncomeSortState>(initialIncomeSort);

  const debouncedAdvancedSearchTerm = useDebounce(
    viewMode === 'expense' ? activeExpenseFilters.searchTerm || '' : activeIncomeFilters.searchTerm || '', 500
  );
  const debouncedAdvancedMinAmount = useDebounce(
    viewMode === 'expense' ? activeExpenseFilters.minAmount || '' : activeIncomeFilters.minAmount || '', 500
  );
  const debouncedAdvancedMaxAmount = useDebounce(
    viewMode === 'expense' ? activeExpenseFilters.maxAmount || '' : activeIncomeFilters.maxAmount || '', 500
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false); // State for modal

  const fetchTransactionsForDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!user) return { expenses: [], income: [] };
    setIsLoading(true); // Indicate loading for this specific fetch
    try {
      const formattedStartDate = format(parseISO(startDate), "yyyy-MM-dd'T'00:00:00XXX");
      const formattedEndDate = format(parseISO(endDate), "yyyy-MM-dd'T'23:59:59XXX");

      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses').select('*, tags(id, name), expense_split_details(*)')
        .eq('user_id', user.id)
        .gte('expense_date', formattedStartDate)
        .lte('expense_date', formattedEndDate);
      if (expenseError) throw expenseError;

      const { data: incomeData, error: incomeError } = await supabase
        .from('incomes').select('*, tags(id, name)')
        .eq('user_id', user.id)
        .gte('income_date', formattedStartDate)
        .lte('income_date', formattedEndDate);
      if (incomeError) throw incomeError;

      const expenses = (expenseData || []).map(exp => ({ ...exp, tags: exp.tags || [], expense_split_details: exp.expense_split_details || [] })) as Expense[];
      const income = (incomeData || []).map(inc => ({ ...inc, tags: inc.tags || [] })) as Income[];
      return { expenses, income };
    } catch (error: any) {
      console.error("Error fetching transactions for date range:", error);
      showToast("Failed to load transactions for the selected range.", "error");
      return { expenses: [], income: [] };
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);


  const fetchTransactions = useCallback(async () => { // This fetches ALL transactions for the page display
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
        return dateB.getTime() - dateA.getTime();
      });
      setAllCombinedTransactions(combined);
      setCurrentPage(1);
    } catch (error: any) {
      console.error("Error fetching all transactions:", error);
      showToast("Failed to load transactions.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    let processedTransactions = [...allCombinedTransactions];
    if (viewMode === 'expense') {
      processedTransactions = processedTransactions.filter(t => t.type === 'expense');
    } else if (viewMode === 'income') {
      processedTransactions = processedTransactions.filter(t => t.type === 'income');
    }

    if (viewMode === 'all') {
      if (debouncedGlobalSearchTerm.trim() !== '') {
        const lowerSearchTerm = debouncedGlobalSearchTerm.toLowerCase();
        processedTransactions = processedTransactions.filter(trans => {
          if (trans.type === 'expense') {
            return trans.category.toLowerCase().includes(lowerSearchTerm) ||
              (trans.sub_category && trans.sub_category.toLowerCase().includes(lowerSearchTerm)) ||
              (trans.description && trans.description.toLowerCase().includes(lowerSearchTerm)) ||
              trans.amount.toString().includes(lowerSearchTerm) ||
              (trans.tags && trans.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)));
          } else {
            return trans.source.toLowerCase().includes(lowerSearchTerm) ||
              (trans.description && trans.description.toLowerCase().includes(lowerSearchTerm)) ||
              trans.amount.toString().includes(lowerSearchTerm) ||
              (trans.tags && trans.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)));
          }
        });
      }
    } else if (viewMode === 'expense') {
      const currentFilters = activeExpenseFilters;
      if (currentFilters.startDate) { processedTransactions = processedTransactions.filter(t => t.type === 'expense' && t.expense_date >= startOfDay(parseISO(currentFilters.startDate!)).toISOString()); }
      if (currentFilters.endDate) { processedTransactions = processedTransactions.filter(t => t.type === 'expense' && t.expense_date <= endOfDay(parseISO(currentFilters.endDate!)).toISOString()); }
      if (!currentFilters.startDate && !currentFilters.endDate) {
        if (currentFilters.selectedYear && currentFilters.selectedYear !== 0) { processedTransactions = processedTransactions.filter(t => t.type === 'expense' && getYear(toZonedTime(new Date(t.expense_date), TIME_ZONE)) === currentFilters.selectedYear); }
        if (currentFilters.selectedMonth && currentFilters.selectedMonth !== 0) { processedTransactions = processedTransactions.filter(t => t.type === 'expense' && getMonth(toZonedTime(new Date(t.expense_date), TIME_ZONE)) + 1 === currentFilters.selectedMonth); }
      }
      if (currentFilters.category) { processedTransactions = processedTransactions.filter(t => t.type === 'expense' && t.category === currentFilters.category); }
      if (currentFilters.tag) { processedTransactions = processedTransactions.filter(t => t.tags?.some(tag => tag.name === currentFilters.tag)); }
      if (debouncedAdvancedMinAmount) { const min = parseFloat(debouncedAdvancedMinAmount); if (!isNaN(min)) processedTransactions = processedTransactions.filter(t => t.amount >= min); }
      if (debouncedAdvancedMaxAmount) { const max = parseFloat(debouncedAdvancedMaxAmount); if (!isNaN(max)) processedTransactions = processedTransactions.filter(t => t.amount <= max); }
      if (debouncedAdvancedSearchTerm.trim() !== '') {
        const lowerSearch = debouncedAdvancedSearchTerm.toLowerCase();
        processedTransactions = processedTransactions.filter(t =>
          t.type === 'expense' && (
            t.category.toLowerCase().includes(lowerSearch) ||
            (t.sub_category && t.sub_category.toLowerCase().includes(lowerSearch)) ||
            (t.description && t.description.toLowerCase().includes(lowerSearch)) ||
            t.amount.toString().includes(lowerSearch) ||
            (t.tags && t.tags.some(tag => tag.name.toLowerCase().includes(lowerSearch)))
          ));
      }
      if (activeExpenseSort.sortBy) {
        processedTransactions.sort((a, b) => {
          if (a.type === 'income' || b.type === 'income') return 0;
          const expA = a as Transaction; const expB = b as Transaction;
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
      const currentFilters = activeIncomeFilters;
      if (currentFilters.startDate) { processedTransactions = processedTransactions.filter(t => t.type === 'income' && t.income_date >= startOfDay(parseISO(currentFilters.startDate!)).toISOString()); }
      if (currentFilters.endDate) { processedTransactions = processedTransactions.filter(t => t.type === 'income' && t.income_date <= endOfDay(parseISO(currentFilters.endDate!)).toISOString()); }
      if (!currentFilters.startDate && !currentFilters.endDate) {
        if (currentFilters.selectedYear && currentFilters.selectedYear !== 0) { processedTransactions = processedTransactions.filter(t => t.type === 'income' && getYear(toZonedTime(new Date(t.income_date), TIME_ZONE)) === currentFilters.selectedYear); }
        if (currentFilters.selectedMonth && currentFilters.selectedMonth !== 0) { processedTransactions = processedTransactions.filter(t => t.type === 'income' && getMonth(toZonedTime(new Date(t.income_date), TIME_ZONE)) + 1 === currentFilters.selectedMonth); }
      }
      if (currentFilters.source) { processedTransactions = processedTransactions.filter(t => t.type === 'income' && t.source === currentFilters.source); }
      if (currentFilters.tag) { processedTransactions = processedTransactions.filter(t => t.tags?.some(tag => tag.name === currentFilters.tag)); }
      if (debouncedAdvancedMinAmount) { const min = parseFloat(debouncedAdvancedMinAmount); if (!isNaN(min)) processedTransactions = processedTransactions.filter(t => t.amount >= min); }
      if (debouncedAdvancedMaxAmount) { const max = parseFloat(debouncedAdvancedMaxAmount); if (!isNaN(max)) processedTransactions = processedTransactions.filter(t => t.amount <= max); }
      if (debouncedAdvancedSearchTerm.trim() !== '') {
        const lowerSearch = debouncedAdvancedSearchTerm.toLowerCase();
        processedTransactions = processedTransactions.filter(t =>
          t.type === 'income' && (
            t.source.toLowerCase().includes(lowerSearch) ||
            (t.description && t.description.toLowerCase().includes(lowerSearch)) ||
            t.amount.toString().includes(lowerSearch) ||
            (t.tags && t.tags.some(tag => tag.name.toLowerCase().includes(lowerSearch)))
          ));
      }
      if (activeIncomeSort.sortBy) {
        processedTransactions.sort((a, b) => {
          if (a.type === 'expense' || b.type === 'expense') return 0;
          const incA = a as IncomeTransaction; const incB = b as IncomeTransaction;
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
    if (processedTransactions.length > 0 && Math.ceil(processedTransactions.length / ITEMS_PER_PAGE) < currentPage) {
      setCurrentPage(Math.ceil(processedTransactions.length / ITEMS_PER_PAGE));
    } else if (processedTransactions.length === 0) {
      setCurrentPage(1);
    }

  }, [
    allCombinedTransactions, viewMode, debouncedGlobalSearchTerm,
    activeExpenseFilters, activeExpenseSort,
    activeIncomeFilters, activeIncomeSort,
    TIME_ZONE, debouncedAdvancedSearchTerm, debouncedAdvancedMinAmount, debouncedAdvancedMaxAmount, currentPage
  ]);


  const handleExpenseFilterChange = useCallback((newFilters: Partial<ExpenseFilterState>) => {
    setActiveExpenseFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);
  const handleExpenseSortChange = useCallback((newSort: ExpenseSortState) => {
    setActiveExpenseSort(newSort);
    setCurrentPage(1);
  }, []);
  const handleIncomeFilterChange = useCallback((newFilters: Partial<IncomeFilterState>) => {
    setActiveIncomeFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);
  const handleIncomeSortChange = useCallback((newSort: IncomeSortState) => {
    setActiveIncomeSort(newSort);
    setCurrentPage(1);
  }, []);

  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const totalIncomeForFiltered = filteredAndSortedTransactions
    .filter((t): t is IncomeTransaction => t.type === 'income')
    .reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpensesForFiltered = filteredAndSortedTransactions
    .filter((t): t is Transaction => t.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);
  const netFlowForFiltered = totalIncomeForFiltered - totalExpensesForFiltered;


  const handleExportPdfForDateRange = async (pdfStartDate: string, pdfEndDate: string) => {
    showToast("Fetching data for PDF...", "info");
    const { expenses, income } = await fetchTransactionsForDateRange(pdfStartDate, pdfEndDate);

    if (expenses.length === 0 && income.length === 0) {
      showToast("No transactions found for the selected date range.", "info");
      return;
    }

    const transactionsToExport: CombinedTransaction[] = [
      ...(expenses.map(e => ({ ...e, type: 'expense' as const }))),
      ...(income.map(i => ({ ...i, type: 'income' as const })))
    ];
    transactionsToExport.sort((a, b) => {
      const dateA = new Date(a.type === 'expense' ? a.expense_date : a.income_date);
      const dateB = new Date(b.type === 'expense' ? b.expense_date : b.income_date);
      return dateB.getTime() - dateA.getTime();
    });


    const dataToExport: PdfExportRow[] = transactionsToExport.map(t => {
      const transactionDate = t.type === 'expense' ? t.expense_date : t.income_date;
      const categoryOrSource = t.type === 'expense'
        ? ((t as Expense).sub_category ? `${(t as Expense).category} (${(t as Expense).sub_category})` : (t as Expense).category)
        : (t as IncomeTransaction).source;
      const formattedDate = format(parseISO(transactionDate), 'dd/MM/yy HH:mm');
      const tagsString = t.tags && t.tags.length > 0 ? t.tags.map(tag => tag.name).join(', ') : 'N/A';
      const amount = t.amount || 0;
      const amountString = `${t.type === 'income' ? '+' : '-'}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      return {
        'Type': t.type === 'income' ? 'Income' : 'Expense',
        'Date': formattedDate,
        'Category/Source': categoryOrSource,
        'Description': t.description || 'N/A',
        'Amount': amountString,
        'Tags': tagsString,
      };
    });

    const formattedStartDate = format(parseISO(pdfStartDate), 'dd MMM yy');
    const formattedEndDate = format(parseISO(pdfEndDate), 'dd MMM yy');
    const dateRangeString = pdfStartDate === pdfEndDate ? formattedStartDate : `${formattedStartDate} to ${formattedEndDate}`;

    const fileName = `Transactions_Report_Range_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Transactions Report for ${dateRangeString}`;

    const pdfTotalIncome = income.reduce((sum, item) => sum + item.amount, 0);
    const pdfTotalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

    const summaryData = {
      totalIncome: pdfTotalIncome,
      totalExpenses: pdfTotalExpenses,
      netFlow: pdfTotalIncome - pdfTotalExpenses
    };

    exportToPdf(dataToExport, fileName, title, TIME_ZONE, summaryData, 'all');
    showToast("PDF export started.", "success");
  };

  const viewModeOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'expense', label: 'Expenses Only' },
    { value: 'income', label: 'Income Only' },
  ];

  const getSelectionPeriodText = useCallback(() => {
    let currentFilters: Partial<ExpenseFilterState> | Partial<IncomeFilterState> | null = null;
    let specificFilterActive = false;

    if (viewMode === 'expense') {
      currentFilters = activeExpenseFilters;
      const expenseFilters = currentFilters as Partial<ExpenseFilterState>;
      if (expenseFilters.tag || expenseFilters.minAmount || expenseFilters.maxAmount || expenseFilters.category || expenseFilters.searchTerm) {
        specificFilterActive = true;
      }
    } else if (viewMode === 'income') {
      currentFilters = activeIncomeFilters;
      const incomeFilters = currentFilters as Partial<IncomeFilterState>;
      if (incomeFilters.tag || incomeFilters.minAmount || incomeFilters.maxAmount || incomeFilters.source || incomeFilters.searchTerm) {
        specificFilterActive = true;
      }
    }

    if (currentFilters && viewMode !== 'all') {
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
        if (specificFilterActive) return "Current Filters Applied";
        return "All Time";
      }
    }
    return "All Time";
  }, [viewMode, activeExpenseFilters, activeIncomeFilters]);

  const selectionPeriod = getSelectionPeriodText();

  return (
    <div className="space-y-8">
      <div className="content-card">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-4">Transactions History</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-800/30 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text-secondary mb-1">Total Income (Filtered)</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{totalIncomeForFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-800/30 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text-secondary mb-1">Total Expenses (Filtered)</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              ₹{totalExpensesForFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-800/30 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text-secondary mb-1">Net Flow (Filtered)</h3>
            <p className={`text-2xl font-bold ${netFlowForFiltered >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
              ₹{(netFlowForFiltered).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 p-4 bg-gray-50 dark:bg-dark-card rounded-lg shadow">
          <div className="flex items-center gap-2">
            <Eye size={20} className="text-gray-600 dark:text-dark-text-secondary" />
            <Select
              id="viewMode"
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value as 'all' | 'expense' | 'income');
                setCurrentPage(1);
              }}
              options={viewModeOptions}
              className="w-48 bg-white dark:bg-dark-input border-gray-300 dark:border-gray-600 rounded-md"
            />
          </div>
          {viewMode === 'all' && (
            <Input
              id="transactionSearchGlobal"
              type="search"
              placeholder="Search all transactions..."
              value={globalSearchTerm}
              onChange={(e) => {
                setGlobalSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              icon={<SearchIcon size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
              containerClassName="w-full sm:w-auto flex-grow sm:flex-grow-0"
              className="bg-white dark:bg-dark-input rounded-md"
            />
          )}
        </div>

        {viewMode === 'expense' && (
          <AdvancedFilter
            key="expense-filter"
            mode="expense"
            initialFilters={activeExpenseFilters}
            onFilterChange={handleExpenseFilterChange as any}
            initialSort={activeExpenseSort}
            onSortChange={handleExpenseSortChange as any}
            presetCategories={presetExpenseCategories}
          />
        )}
        {viewMode === 'income' && (
          <AdvancedFilter
            key="income-filter"
            mode="income"
            initialFilters={activeIncomeFilters}
            onFilterChange={handleIncomeFilterChange as any}
            initialSort={activeIncomeSort}
            onSortChange={handleIncomeSortChange as any}
          />
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center my-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            Displaying {paginatedTransactions.length} of {filteredAndSortedTransactions.length} records.
            {selectionPeriod !== "All Time" && <><br />Filtered period: <span className="font-semibold">{selectionPeriod}</span></>}
          </p>
          <Button onClick={() => setIsDateRangeModalOpen(true)} variant="outline" size="sm">
            <Download size={16} className="mr-2" /> Export PDF by Date Range
          </Button>
        </div>

        {isLoading && !isDateRangeModalOpen ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" /><p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading transactions...</p></div>
        ) : paginatedTransactions.length > 0 ? (
          <>
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-dark-card rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category/Source</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedTransactions.map((transaction) => (
                    <tr key={`${transaction.type}-${transaction.id}-${transaction.created_at}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">
                        {format(parseISO(transaction.type === 'expense' ? transaction.expense_date! : transaction.income_date!), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text truncate max-w-xs">
                        {transaction.type === 'expense'
                          ? ((transaction as Expense).sub_category ? `${(transaction as Expense).category} (${(transaction as Expense).sub_category})` : (transaction as Expense).category)
                          : (transaction as IncomeTransaction).source}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text truncate max-w-xs">
                        {transaction.description || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* START OF UPDATED MOBILE VIEW SECTION */}
            <div className="md:hidden space-y-4">
              {paginatedTransactions.map((transaction) => (
                <div
                  key={`${transaction.type}-${transaction.id}-mobile`}
                  className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-4" // Removed left border, using shadow and rounded corners as per Image 2
                >
                  {/* Top Row: Type Badge (left) and Amount (right) */}
                  <div className="flex justify-between items-center mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold
                      ${transaction.type === 'income'
                        ? 'bg-green-100 dark:bg-green-700 text-green-700 dark:text-green-200' // Adjusted dark mode for badge text
                        : 'bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-200'      // Adjusted dark mode for badge text
                      }`}
                    >
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </span>
                    <span className={`text-xl font-bold ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {transaction.type === 'income'} ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Details Section - Grid Layout */}
                  <div className="grid grid-cols-[max-content,1fr] gap-x-3 gap-y-1.5 text-sm">
                    {/* Date */}
                    <span className="font-medium text-gray-500 dark:text-gray-400">Date:</span>
                    <span className="text-gray-700 dark:text-dark-text-secondary">
                      {format(parseISO(transaction.type === 'expense' ? transaction.expense_date! : transaction.income_date!), 'dd MMM yy, hh:mm a')}
                    </span>

                    {/* Category/Source */}
                    <span className="font-medium text-gray-500 dark:text-gray-400">
                      {transaction.type === 'expense' ? 'Category:' : 'Source:'}
                    </span>
                    <span className="text-gray-700 dark:text-dark-text-secondary break-words"> {/* Changed from truncate to break-words */}
                      {transaction.type === 'expense'
                        ? ((transaction as Expense).sub_category ? `${(transaction as Expense).category} (${(transaction as Expense).sub_category})` : (transaction as Expense).category)
                        : (transaction as IncomeTransaction).source}
                    </span>

                    {/* Description (conditionally rendered) */}
                    {transaction.description && (
                      <>
                        <span className="font-medium text-gray-500 dark:text-gray-400">Description:</span>
                        <span className="text-gray-700 dark:text-dark-text-secondary break-words">
                          {transaction.description}
                        </span>
                      </>
                    )}

                    {/* Tags (conditionally rendered) */}
                    {transaction.tags && transaction.tags.length > 0 && (
                      <>
                        <span className="font-medium text-gray-500 dark:text-gray-400 self-start">Tags:</span>
                        <span className="text-gray-700 dark:text-dark-text-secondary break-words"> {/* Display tags as comma-separated string */}
                          {transaction.tags.map(tag => tag.name).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* END OF UPDATED MOBILE VIEW SECTION */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6 py-2">
                <Button onClick={handlePreviousPage} disabled={currentPage === 1} variant="outline" size="sm">
                  <ChevronLeft size={16} className="mr-1" /> Previous
                </Button>
                <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Page {currentPage} of {totalPages}</span>
                <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline" size="sm">
                  Next <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10">
            <p>No transactions found {
              viewMode === 'all' && debouncedGlobalSearchTerm ? `matching "${debouncedGlobalSearchTerm}"` :
                (viewMode !== 'all' && debouncedAdvancedSearchTerm ? `matching "${debouncedAdvancedSearchTerm}" for ${viewMode}s` :
                  (selectionPeriod !== "All Time" ? `for ${selectionPeriod}` : 'for the selected criteria'))
            }.</p>
          </div>
        )}
      </div>
      <DateRangeModal
        isOpen={isDateRangeModalOpen}
        onClose={() => setIsDateRangeModalOpen(false)}
        onExport={handleExportPdfForDateRange}
        title="Export Transactions by Date Range"
      />
    </div>
  );
};

export default TransactionsPage;