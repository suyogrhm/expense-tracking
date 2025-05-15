import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path as needed
import { useAuth } from '../contexts/AuthContext'; // Adjust path as needed
import type {
  ExpenseFilterState,
  ExpenseSortState,
  Income,
  IncomeFilterState, // Ensure this is correctly named
  IncomeSortState} from '../types'; // Adjust path as needed
import { useToast } from '../hooks/useToast'; // Adjust path as needed
import Button from '../components/ui/Button'; // Adjust path as needed
import Modal from '../components/ui/Modal'; // Adjust path as needed
import IncomeForm from '../components/Income/IncomeForm'; // Adjust path as needed
import IncomeTable from '../components/Income/IncomeTable'; // Adjust path as needed
import AdvancedFilter from '../components/Filters/AdvancedFilter'; // Updated import
import { PlusCircle, Loader2, Download, Landmark } from 'lucide-react';
import { format, getYear, getMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { exportToPdf } from '../utils/exportUtils'; // Adjust path as needed
import { useDebounce } from '../hooks/useDebounce'; // Adjust path as needed

const IncomePage: React.FC = () => {
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [filteredAndSortedIncomes, setFilteredAndSortedIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';
  const defaultDisplayYear = 0;
  const defaultDisplayMonth = 0;

  const initialIncomeFilters: IncomeFilterState = {
    searchTerm: '',
    selectedYear: defaultDisplayYear,
    selectedMonth: defaultDisplayMonth,
    startDate: '',
    endDate: '',
    source: '', // This corresponds to 'categoryOrSource' in AdvancedFilter when mode is 'income'
    tag: '',
    minAmount: '',
    maxAmount: '',
  };

  const initialIncomeSort: IncomeSortState = {
    sortBy: 'income_date',
    sortOrder: 'desc',
  };

  const [activeFilters, setActiveFilters] = useState<Partial<IncomeFilterState>>(initialIncomeFilters);
  const [activeSort, setActiveSort] = useState<IncomeSortState>(initialIncomeSort);

  const debouncedSearchTerm = useDebounce(activeFilters.searchTerm || '', 500);
  const debouncedMinAmount = useDebounce(activeFilters.minAmount || '', 500);
  const debouncedMaxAmount = useDebounce(activeFilters.maxAmount || '', 500);

  const fetchIncomes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select('*, tags(id, name)')
        .eq('user_id', user.id)
        .order('income_date', { ascending: false });
      if (error) throw error;
      setAllIncomes((data || []).map(inc => ({ ...inc, tags: inc.tags || [] })) as Income[]);
    } catch (error: any) {
      showToast("Failed to load income records.", "error");
      console.error("Error fetching income:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  useEffect(() => {
    let processedIncomes = [...allIncomes];

    // Apply Date Range Filter
    if (activeFilters.startDate) {
      const localStartDate = parseISO(activeFilters.startDate);
      const startUTC = startOfDay(localStartDate).toISOString();
      processedIncomes = processedIncomes.filter(inc => inc.income_date >= startUTC);
    }
    if (activeFilters.endDate) {
      const localEndDate = parseISO(activeFilters.endDate);
      const endUTC = endOfDay(localEndDate).toISOString();
      processedIncomes = processedIncomes.filter(inc => inc.income_date <= endUTC);
    }

    // Apply Year/Month Filter (only if no date range is selected)
    if (!activeFilters.startDate && !activeFilters.endDate) {
      if (activeFilters.selectedYear && activeFilters.selectedYear !== 0) {
        processedIncomes = processedIncomes.filter(inc => {
          const incomeDateInIST = toZonedTime(new Date(inc.income_date), timeZone);
          return getYear(incomeDateInIST) === activeFilters.selectedYear;
        });
      }
      if (activeFilters.selectedMonth && activeFilters.selectedMonth !== 0) {
        processedIncomes = processedIncomes.filter(inc => {
          const incomeDateInIST = toZonedTime(new Date(inc.income_date), timeZone);
          return getMonth(incomeDateInIST) + 1 === activeFilters.selectedMonth;
        });
      }
    }

    // Apply Source Filter (from activeFilters.source)
    if (activeFilters.source) {
      processedIncomes = processedIncomes.filter(inc => inc.source === activeFilters.source);
    }
    // Apply Tag Filter
    if (activeFilters.tag) {
      processedIncomes = processedIncomes.filter(inc => inc.tags?.some(t => t.name === activeFilters.tag));
    }

    // Apply Min/Max Amount Filters (using debounced values)
    if (debouncedMinAmount) {
      const min = parseFloat(debouncedMinAmount);
      if (!isNaN(min)) {
        processedIncomes = processedIncomes.filter(inc => inc.amount >= min);
      }
    }
    if (debouncedMaxAmount) {
      const max = parseFloat(debouncedMaxAmount);
      if (!isNaN(max)) {
        processedIncomes = processedIncomes.filter(inc => inc.amount <= max);
      }
    }

    // Apply Search Term Filter (using debounced value)
    if (debouncedSearchTerm.trim() !== '') {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      processedIncomes = processedIncomes.filter(inc =>
        inc.source.toLowerCase().includes(lowerSearchTerm) ||
        (inc.description && inc.description.toLowerCase().includes(lowerSearchTerm)) ||
        (inc.amount.toString().includes(lowerSearchTerm)) ||
        (inc.tags && inc.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    // Apply Sorting
    if (activeSort.sortBy) {
      processedIncomes.sort((a, b) => {
        let valA: any, valB: any;
        switch (activeSort.sortBy) {
          case 'income_date':
            valA = new Date(a.income_date).getTime();
            valB = new Date(b.income_date).getTime();
            break;
          case 'amount':
            valA = a.amount;
            valB = b.amount;
            break;
          case 'source':
            valA = a.source.toLowerCase();
            valB = b.source.toLowerCase();
            break;
          default:
            // Optional: handle '' or unexpected sortBy values
            // const _exhaustiveCheck: never = activeSort.sortBy;
            return 0;
        }
        if (valA < valB) return activeSort.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return activeSort.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredAndSortedIncomes(processedIncomes);
  }, [allIncomes, activeFilters, activeSort, timeZone, debouncedSearchTerm, debouncedMinAmount, debouncedMaxAmount]);

  const handleFilterChange = useCallback((newFilters: Partial<IncomeFilterState>) => {
    // AdvancedFilter will pass the 'source' field for income.
    setActiveFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleSortChange = useCallback((newSort: IncomeSortState) => {
    setActiveSort(newSort);
  }, []);

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

  const handleOpenModal = (income: Income | null = null) => {
    setEditingIncome(income);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingIncome(null);
    setIsModalOpen(false);
  };

  const handleIncomeSaved = (_savedIncome: Income) => {
    fetchIncomes();
    showToast(editingIncome ? "Income updated successfully!" : "Income added successfully!", "success");
    handleCloseModal();
  };

  const handleIncomeDeleted = async (incomeId: string) => {
    try {
      const { error: deleteTagsError } = await supabase
        .from('income_tags')
        .delete()
        .eq('income_id', incomeId);
      if (deleteTagsError) console.error("Error deleting associated income tags:", deleteTagsError);

      const { error } = await supabase.from('incomes').delete().eq('id', incomeId);
      if (error) throw error;
      fetchIncomes();
      showToast("Income deleted successfully!", "success");
    } catch (error: any) {
      showToast("Failed to delete income.", "error");
      console.error("Error deleting income:", error);
    }
  };

  const totalFilteredIncome = filteredAndSortedIncomes.reduce((sum, inc) => sum + inc.amount, 0);

  const handleExportPdf = () => {
    if (filteredAndSortedIncomes.length === 0) {
      showToast("No income data to export.", "info");
      return;
    }
    const safeSelectionPeriod = selectionPeriod.replace(/[^a-zA-Z0-9_-\s]/g, '').replace(/\s+/g, '_');
    const fileName = `Income_Report_${safeSelectionPeriod}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Income Report for ${selectionPeriod === "All Time" ? "all records" : selectionPeriod}`;

    const dataToExport = filteredAndSortedIncomes.map(inc => ({
      ...inc,
      date: inc.income_date,
      category: inc.source, // Map 'source' to 'category' for exportToPdf if it expects 'category'
    }));

    exportToPdf(dataToExport as any, fileName, title, timeZone);
    showToast("PDF export started.", "success");
  };

  return (
    <div className="space-y-8">
      <div className="content-card flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <Landmark className="h-8 w-8 text-primary-600 dark:text-dark-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Income Records</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">Manage your income sources and amounts.</p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()} variant="primary" size="lg">
          <PlusCircle size={20} className="mr-2" />
          Add New Income
        </Button>
      </div>

      <AdvancedFilter
        mode="income" // Specify mode for income
        initialFilters={initialIncomeFilters}
        onFilterChange={handleFilterChange as (filters: Partial<ExpenseFilterState | IncomeFilterState>) => void}
        initialSort={initialIncomeSort} // Already IncomeSortState
        onSortChange={handleSortChange as (sort: ExpenseSortState | IncomeSortState) => void}
      // presetCategories is not passed as it's for expenses
      />

      <div className="content-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
            Displaying {filteredAndSortedIncomes.length} of {allIncomes.length} records
            {selectionPeriod !== "All Time" && ` for: `}
            <span className="font-semibold text-gray-700 dark:text-dark-text">
              {selectionPeriod !== "All Time" ? selectionPeriod : ''}
            </span>.
            <br />
            Total Displayed Income: <span className="font-bold text-green-600 dark:text-green-400">₹{totalFilteredIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
          {filteredAndSortedIncomes.length > 0 && (
            <Button onClick={handleExportPdf} variant="outline" size="sm">
              <Download size={16} className="mr-2" /> PDF
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" />
            <p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading income records...</p>
          </div>
        ) : filteredAndSortedIncomes.length > 0 ? (
          <IncomeTable incomes={filteredAndSortedIncomes} onEdit={handleOpenModal} onDelete={handleIncomeDeleted} />
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10 space-y-2">
            <Landmark size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
            <p>No income records found {debouncedSearchTerm ? `matching "${debouncedSearchTerm}"` : (selectionPeriod !== "All Time" ? `for ${selectionPeriod}` : 'for the selected criteria')}.</p>
            {allIncomes.length === 0 && !isLoading && <p className="text-sm">You haven't recorded any income yet.</p>}
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingIncome ? "Edit Income" : "Add New Income"}>
          <IncomeForm existingIncome={editingIncome} onIncomeSaved={handleIncomeSaved} onFormCancel={handleCloseModal} />
        </Modal>
      )}
    </div>
  );
};

export default IncomePage;