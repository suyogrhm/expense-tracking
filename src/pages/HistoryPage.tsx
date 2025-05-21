import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type {
  Expense,
  ExpenseFilterState,
  ExpenseSortState,
  Category as PresetCategoryType,
  PdfExportRow
} from '../types';
import { format, getYear, getMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import {
  Download,
  Loader2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PlusCircle, // Added
  ChevronUp    // Added
} from 'lucide-react';
import Button from '../components/ui/Button';
import ExpenseTable from '../components/Expenses/ExpenseTable';
import AdvancedFilter from '../components/Filters/AdvancedFilter';
import { exportToPdf } from '../utils/exportUtils';
import DateRangeModal from '../components/ui/DateRangeModal';
import ExpenseForm from '../components/Expenses/ExpenseForm'; // Added
import classNames from 'classnames'; // Added

const presetCategories: PresetCategoryType[] = [
  { id: 'bills', name: 'Bills' },
  { id: 'petrol', name: 'Petrol' },
  { id: 'food', name: 'Food' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'online_shopping', name: 'Online Shopping' },
];

const ITEMS_PER_PAGE = 15;
const TIME_ZONE = 'Asia/Kolkata';

const HistoryPage: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredAndSortedExpenses, setFilteredAndSortedExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  // State for Add New Expense Form
  const [isExpenseFormVisible, setIsExpenseFormVisible] = useState(false); // Added

  const defaultDisplayYear = 0;
  const defaultDisplayMonth = 0;

  const initialFilters: ExpenseFilterState = {
    searchTerm: '',
    selectedYear: defaultDisplayYear,
    selectedMonth: defaultDisplayMonth,
    startDate: '',
    endDate: '',
    category: '',
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

  const debouncedSearchTerm = useDebounce(activeFilters.searchTerm || '', 500);
  const debouncedMinAmount = useDebounce(activeFilters.minAmount || '', 500);
  const debouncedMaxAmount = useDebounce(activeFilters.maxAmount || '', 500);

  const [currentPage, setCurrentPage] = useState(1);
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false);

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
      const fetchedExpenses = (data || []).map(exp => ({
        ...exp,
        tags: exp.tags || [],
        expense_split_details: exp.expense_split_details || []
      })) as Expense[];
      setAllExpenses(fetchedExpenses);
      // setCurrentPage(1); // It's better to reset page in filter/sort handlers
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

    // Date Range Filters (priority)
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

    // Month/Year filters (only if no date range is active)
    if (!activeFilters.startDate && !activeFilters.endDate) {
      if (activeFilters.selectedYear && activeFilters.selectedYear !== 0) {
        processedExpenses = processedExpenses.filter(exp => getYear(toZonedTime(new Date(exp.expense_date), TIME_ZONE)) === activeFilters.selectedYear);
      }
      if (activeFilters.selectedMonth && activeFilters.selectedMonth !== 0) {
        processedExpenses = processedExpenses.filter(exp => getMonth(toZonedTime(new Date(exp.expense_date), TIME_ZONE)) + 1 === activeFilters.selectedMonth);
      }
    }

    if (activeFilters.category) {
      processedExpenses = processedExpenses.filter(exp => exp.category === activeFilters.category);
    }
    if (activeFilters.tag) {
      processedExpenses = processedExpenses.filter(exp => exp.tags?.some(t => t.name === activeFilters.tag));
    }
    if (debouncedMinAmount) {
      const min = parseFloat(debouncedMinAmount);
      if (!isNaN(min)) processedExpenses = processedExpenses.filter(exp => exp.amount >= min);
    }
    if (debouncedMaxAmount) {
      const max = parseFloat(debouncedMaxAmount);
      if (!isNaN(max)) processedExpenses = processedExpenses.filter(exp => exp.amount <= max);
    }
    if (debouncedSearchTerm.trim() !== '') {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      processedExpenses = processedExpenses.filter(exp =>
        exp.category.toLowerCase().includes(lowerSearchTerm) ||
        (exp.sub_category && exp.sub_category.toLowerCase().includes(lowerSearchTerm)) ||
        (exp.description && exp.description.toLowerCase().includes(lowerSearchTerm)) ||
        exp.amount.toString().includes(lowerSearchTerm) ||
        (exp.tags && exp.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)))
      );
    }
    if (activeSort.sortBy) {
      processedExpenses.sort((a, b) => {
        let valA: any, valB: any;
        switch (activeSort.sortBy) {
          case 'expense_date': valA = new Date(a.expense_date).getTime(); valB = new Date(b.expense_date).getTime(); break;
          case 'amount': valA = a.amount; valB = b.amount; break;
          case 'category': valA = a.category.toLowerCase(); valB = b.category.toLowerCase(); break;
          default: return 0;
        }
        if (valA < valB) return activeSort.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return activeSort.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredAndSortedExpenses(processedExpenses);
    // Reset to page 1 if filters change and current page becomes invalid
    if (Math.ceil(processedExpenses.length / ITEMS_PER_PAGE) < currentPage && processedExpenses.length > 0) {
      setCurrentPage(Math.ceil(processedExpenses.length / ITEMS_PER_PAGE));
    } else if (currentPage === 0 && processedExpenses.length > 0) {
        setCurrentPage(1);
    } else if (processedExpenses.length === 0) {
        setCurrentPage(1); // Or 0 depending on desired behavior for no items
    }

  }, [allExpenses, activeFilters, activeSort, debouncedSearchTerm, debouncedMinAmount, debouncedMaxAmount, currentPage]); // Added currentPage to dependencies


  const handleFilterChange = useCallback((newFilters: Partial<ExpenseFilterState>) => {
    setActiveFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset page on filter change
  }, []);

  const handleSortChange = useCallback((newSort: ExpenseSortState) => {
    setActiveSort(newSort);
    setCurrentPage(1); // Reset page on sort change
  }, []);

  // Handler for when a new expense is added via the form
  const handleExpenseAdded = (_newExpense: Expense) => { // Added
    fetchAllExpenses(); // Refresh the list
    showToast("Expense added successfully!", "success");
    setIsExpenseFormVisible(false); // Hide the form
  };

  const handleExpenseUpdated = (_updatedExpense: Expense) => {
    fetchAllExpenses();
    showToast("Expense updated successfully!", "success");
  };

  const handleExpenseDeleted = (_deletedExpenseId: string) => {
    fetchAllExpenses();
    showToast("Expense deleted successfully!", "success");
  };

  const paginatedExpenses = filteredAndSortedExpenses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedExpenses.length / ITEMS_PER_PAGE));


  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
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
      : getYear(toZonedTime(new Date(), TIME_ZONE)); // Use current year if not specified for month formatting

    const selectedMonthNumber = activeFilters.selectedMonth || defaultDisplayMonth;
    const selectedYearNumber = activeFilters.selectedYear || defaultDisplayYear;

    let monthLabel = '';
    if (selectedMonthNumber !== 0) {
      monthLabel = format(new Date(yearForMonthFormatting, selectedMonthNumber - 1, 1), 'MMMM'); // Full month name
    }

    if (selectedYearNumber !== 0) {
      if (monthLabel) return `${monthLabel} ${selectedYearNumber}`;
      return `Year ${selectedYearNumber}`;
    } else {
      if (monthLabel) return `${monthLabel} (All Years with this month)`; // Clarify if year is not set
      return "All Time";
    }
  }, [activeFilters.startDate, activeFilters.endDate, activeFilters.selectedYear, activeFilters.selectedMonth, defaultDisplayMonth, defaultDisplayYear]);

  const selectionPeriod = getSelectionPeriodText();

  const handleExportPdfForDateRange = async (pdfStartDate: string, pdfEndDate: string) => {
    if (!user) {
      showToast("User not found. Cannot export.", "error");
      return;
    }
    showToast("Fetching data for PDF...", "info");
    // setIsLoading(true); // This isLoading is for the main page, PDF export can have its own if needed or be quick

    try {
      const { data: expensesInRange, error } = await supabase
        .from('expenses')
        .select('*, tags(id, name), expense_split_details(*)')
        .eq('user_id', user.id)
        .gte('expense_date', format(parseISO(pdfStartDate), "yyyy-MM-dd'T'00:00:00XXX"))
        .lte('expense_date', format(parseISO(pdfEndDate), "yyyy-MM-dd'T'23:59:59XXX"))
        .order('expense_date', { ascending: false });

      if (error) throw error;

      const expensesToExport = (expensesInRange || []).map(exp => ({
        ...exp,
        tags: exp.tags || [],
        expense_split_details: exp.expense_split_details || []
      })) as Expense[];

      if (expensesToExport.length === 0) {
        showToast("No expenses found for the selected date range.", "info");
        // setIsLoading(false);
        return;
      }

      const dataToExport: PdfExportRow[] = expensesToExport.map(exp => {
        const formattedDate = format(parseISO(exp.expense_date), 'dd/MM/yy HH:mm');
        const tagsString = exp.tags && exp.tags.length > 0 ? exp.tags.map(tag => tag.name).join(', ') : 'N/A';
        const amountString = `-${exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const categorySource = exp.sub_category ? `${exp.category} (${exp.sub_category})` : exp.category;

        // Include split details in PDF if available
        let row: PdfExportRow = {
          'Type': 'Expense',
          'Date': formattedDate,
          'Category/Source': categorySource,
          'Description': exp.description || 'N/A',
          'Amount': amountString,
          'Tags': tagsString,
        };

        if (exp.split_note) {
          row['Split Note'] = exp.split_note;
        }
        if (exp.expense_split_details && exp.expense_split_details.length > 0) {
          const splitDetailsString = exp.expense_split_details.map(sd =>
            `${sd.person_name || 'Portion'}: ${Number(sd.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ).join('; ');
          row['Split Between'] = splitDetailsString;
        }
        return row;
      });

      const rangeStartFormatted = format(parseISO(pdfStartDate), 'dd MMM yy');
      const rangeEndFormatted = format(parseISO(pdfEndDate), 'dd MMM yy');
      const titleDateRange = pdfStartDate === pdfEndDate ? rangeStartFormatted : `${rangeStartFormatted} to ${rangeEndFormatted}`;

      const fileName = `Expense_History_${rangeStartFormatted.replace(/\s/g, '')}_to_${rangeEndFormatted.replace(/\s/g, '')}.pdf`;
      const title = `Expense History for ${titleDateRange}`;

      const totalForPdfRange = expensesToExport.reduce((sum, exp) => sum + exp.amount, 0);
      const summaryData = {
        totalIncome: 0, // Assuming only expenses are exported here
        totalExpenses: totalForPdfRange,
        netFlow: -totalForPdfRange
      };

      exportToPdf(dataToExport, fileName, title, TIME_ZONE, summaryData, 'expense');
      showToast("PDF export started.", "success");

    } catch (error: any) {
      console.error("Error fetching expenses for PDF:", error);
      showToast("Failed to generate PDF. " + error.message, "error");
    } finally {
      // setIsLoading(false);
    }
  };


  return (
    <div className="space-y-8">
      {/* Main Content Card for Filters and Adding New Expense */}
      <div className="content-card">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4"> {/* Increased mb */}
          <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Expense History</h1>
          {/* Button to toggle Add New Expense form */}
          <Button
            onClick={() => setIsExpenseFormVisible(!isExpenseFormVisible)}
            variant="primary"
            size="lg" // Consistent with Dashboard
            className="w-full md:w-auto"
          >
            {isExpenseFormVisible ? <ChevronUp size={20} className="mr-2" /> : <PlusCircle size={20} className="mr-2" />}
            {isExpenseFormVisible ? 'Close Expense Form' : 'Add New Expense'}
          </Button>
        </div>

        {/* Collapsible Add New Expense Form */}
        <div
          className={classNames(
            "overflow-hidden transition-all duration-500 ease-in-out",
            {
              "max-h-[1500px] opacity-100 mt-0 mb-6 border-t border-b border-gray-200 dark:border-gray-700 py-6": isExpenseFormVisible, // Adjusted styling
              "max-h-0 opacity-0": !isExpenseFormVisible,
            }
          )}
        >
          {isExpenseFormVisible && (
            <ExpenseForm
              onExpenseAdded={handleExpenseAdded}
              existingExpense={null} // For adding new
              onFormCancel={() => setIsExpenseFormVisible(false)} // To close the form
            />
          )}
        </div>

        <AdvancedFilter
          mode="expense"
          initialFilters={initialFilters}
          onFilterChange={handleFilterChange as any}
          initialSort={initialSort}
          onSortChange={handleSortChange as any}
          presetCategories={presetCategories}
        />
      </div>

      {/* Content Card for Displaying Expenses Table */}
      <div className="content-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pt-0"> {/* Removed pt-4 and border-t from here */}
          <div>
            <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
              Displaying {paginatedExpenses.length} of {filteredAndSortedExpenses.length} expenses
              {selectionPeriod !== "All Time" && ` for: `}
              <span className="font-semibold text-gray-700 dark:text-dark-text">
                {selectionPeriod !== "All Time" ? selectionPeriod : ''}
              </span>.
            </p>
            <p className="text-md text-gray-500 dark:text-dark-text-secondary">
              Total for selection:
              <span className="font-bold text-primary-600 dark:text-dark-primary ml-1">
                ₹{totalForSelection.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <Button onClick={() => setIsDateRangeModalOpen(true)} variant="outline" size="sm" className="mt-2 sm:mt-0">
            <Download size={16} className="mr-2" /> Export PDF by Date Range
          </Button>
        </div>

        {isLoading && !isDateRangeModalOpen && !isExpenseFormVisible ? ( // Ensure loader doesn't show if form is open and main content is already loaded
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" />
            <p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading history...</p>
          </div>
        ) : paginatedExpenses.length > 0 ? (
          <>
            <ExpenseTable
              expenses={paginatedExpenses}
              onEdit={handleExpenseUpdated} // This will be used by ExpenseTable for its edit modal
              onDelete={handleExpenseDeleted}
              refreshExpenses={fetchAllExpenses} // Pass fetchAllExpenses to ExpenseTable
            />
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6 py-2">
                <Button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft size={16} className="mr-1" /> Previous
                </Button>
                <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10 space-y-2">
            <CalendarDays size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
            <p>No expenses found {activeFilters.searchTerm ? `matching "${activeFilters.searchTerm}"` : (selectionPeriod !== "All Time" ? `for ${selectionPeriod}` : 'for the selected criteria')}.</p>
            {allExpenses.length === 0 && !isLoading && <p className="text-sm">You haven't recorded any expenses yet. Try adding one!</p>}
          </div>
        )}
      </div>
      <DateRangeModal
        isOpen={isDateRangeModalOpen}
        onClose={() => setIsDateRangeModalOpen(false)}
        onExport={handleExportPdfForDateRange}
        title="Export Expense History by Date Range"
      />
    </div>
  );
};

export default HistoryPage;