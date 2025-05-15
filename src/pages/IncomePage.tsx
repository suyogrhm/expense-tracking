import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type {
  Income,
  IncomeFilterState,
  IncomeSortState,
  PdfExportRow
} from '../types';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { format, getYear, getMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { PlusCircle, Loader2, Download, Landmark, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import IncomeForm from '../components/Income/IncomeForm';
import IncomeTable from '../components/Income/IncomeTable';
import AdvancedFilter from '../components/Filters/AdvancedFilter';
import { exportToPdf } from '../utils/exportUtils';
import DateRangeModal from '../components/ui/DateRangeModal'; // Import the new modal

const ITEMS_PER_PAGE = 15;
const TIME_ZONE = 'Asia/Kolkata'; // Defined for consistency

const IncomePage: React.FC = () => {
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [filteredAndSortedIncomes, setFilteredAndSortedIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const defaultDisplayYear = 0;
  const defaultDisplayMonth = 0;

  const initialIncomeFilters: IncomeFilterState = {
    searchTerm: '',
    selectedYear: defaultDisplayYear,
    selectedMonth: defaultDisplayMonth,
    startDate: '',
    endDate: '',
    source: '',
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

  const [currentPage, setCurrentPage] = useState(1);
  const [isDateRangeModalOpen, setIsDateRangeModalOpen] = useState(false); // State for modal

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
      const fetchedIncomes = (data || []).map(inc => ({ ...inc, tags: inc.tags || [] })) as Income[];
      setAllIncomes(fetchedIncomes);
      setCurrentPage(1);
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

    if (activeFilters.startDate) { processedIncomes = processedIncomes.filter(inc => inc.income_date >= startOfDay(parseISO(activeFilters.startDate!)).toISOString()); }
    if (activeFilters.endDate) { processedIncomes = processedIncomes.filter(inc => inc.income_date <= endOfDay(parseISO(activeFilters.endDate!)).toISOString()); }
    if (!activeFilters.startDate && !activeFilters.endDate) {
      if (activeFilters.selectedYear && activeFilters.selectedYear !== 0) { processedIncomes = processedIncomes.filter(inc => getYear(toZonedTime(new Date(inc.income_date), TIME_ZONE)) === activeFilters.selectedYear); }
      if (activeFilters.selectedMonth && activeFilters.selectedMonth !== 0) { processedIncomes = processedIncomes.filter(inc => getMonth(toZonedTime(new Date(inc.income_date), TIME_ZONE)) + 1 === activeFilters.selectedMonth); }
    }
    if (activeFilters.source) { processedIncomes = processedIncomes.filter(inc => inc.source === activeFilters.source); }
    if (activeFilters.tag) { processedIncomes = processedIncomes.filter(inc => inc.tags?.some(t => t.name === activeFilters.tag)); }
    if (debouncedMinAmount) { const min = parseFloat(debouncedMinAmount); if (!isNaN(min)) processedIncomes = processedIncomes.filter(inc => inc.amount >= min); }
    if (debouncedMaxAmount) { const max = parseFloat(debouncedMaxAmount); if (!isNaN(max)) processedIncomes = processedIncomes.filter(inc => inc.amount <= max); }
    if (debouncedSearchTerm.trim() !== '') {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      processedIncomes = processedIncomes.filter(inc =>
        inc.source.toLowerCase().includes(lowerSearchTerm) ||
        (inc.description && inc.description.toLowerCase().includes(lowerSearchTerm)) ||
        inc.amount.toString().includes(lowerSearchTerm) ||
        (inc.tags && inc.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)))
      );
    }
    if (activeSort.sortBy) {
      processedIncomes.sort((a, b) => {
        let valA: any, valB: any;
        switch (activeSort.sortBy) {
          case 'income_date': valA = new Date(a.income_date).getTime(); valB = new Date(b.income_date).getTime(); break;
          case 'amount': valA = a.amount; valB = b.amount; break;
          case 'source': valA = a.source.toLowerCase(); valB = b.source.toLowerCase(); break;
          default: return 0;
        }
        if (valA < valB) return activeSort.sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return activeSort.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredAndSortedIncomes(processedIncomes);
    if (processedIncomes.length > 0 && Math.ceil(processedIncomes.length / ITEMS_PER_PAGE) < currentPage) {
      setCurrentPage(Math.ceil(processedIncomes.length / ITEMS_PER_PAGE));
    } else if (processedIncomes.length === 0) {
      setCurrentPage(1);
    }
  }, [allIncomes, activeFilters, activeSort, debouncedSearchTerm, debouncedMinAmount, debouncedMaxAmount, currentPage]);


  const handleFilterChange = useCallback((newFilters: Partial<IncomeFilterState>) => {
    setActiveFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((newSort: IncomeSortState) => {
    setActiveSort(newSort);
    setCurrentPage(1);
  }, []);

  const paginatedIncomes = filteredAndSortedIncomes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredAndSortedIncomes.length / ITEMS_PER_PAGE);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const getSelectionPeriodText = useCallback(() => {
    if (activeFilters.startDate && activeFilters.endDate) { return `${format(parseISO(activeFilters.startDate), 'dd MMM yy')} - ${format(parseISO(activeFilters.endDate), 'dd MMM yy')}`; }
    if (activeFilters.startDate) return `From ${format(parseISO(activeFilters.startDate), 'dd MMM yy')}`;
    if (activeFilters.endDate) return `Until ${format(parseISO(activeFilters.endDate), 'dd MMM yy')}`;
    const yearForMonthFormatting = (activeFilters.selectedYear && activeFilters.selectedYear !== 0) ? activeFilters.selectedYear : getYear(new Date());
    const selectedMonthNumber = activeFilters.selectedMonth || defaultDisplayMonth;
    const selectedYearNumber = activeFilters.selectedYear || defaultDisplayYear;
    let monthLabel = '';
    if (selectedMonthNumber !== 0) monthLabel = format(new Date(yearForMonthFormatting, selectedMonthNumber - 1, 1), 'MMM');
    if (selectedYearNumber !== 0) { if (monthLabel) return `${monthLabel} ${selectedYearNumber}`; return `Year ${selectedYearNumber}`; }
    else { if (monthLabel) return `${monthLabel} (All Years)`; return "All Time"; }
  }, [activeFilters, defaultDisplayMonth, defaultDisplayYear]);

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
      const { error: deleteTagsError } = await supabase.from('income_tags').delete().eq('income_id', incomeId);
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

  const handleExportPdfForDateRange = async (pdfStartDate: string, pdfEndDate: string) => {
    if (!user) {
      showToast("User not found. Cannot export.", "error");
      return;
    }
    showToast("Fetching income data for PDF...", "info");
    setIsLoading(true);

    try {
      const { data: incomeInRange, error } = await supabase
        .from('incomes')
        .select('*, tags(id, name)')
        .eq('user_id', user.id)
        .gte('income_date', format(parseISO(pdfStartDate), "yyyy-MM-dd'T'00:00:00XXX"))
        .lte('income_date', format(parseISO(pdfEndDate), "yyyy-MM-dd'T'23:59:59XXX"))
        .order('income_date', { ascending: false });

      if (error) throw error;

      const incomeToExport = (incomeInRange || []).map(inc => ({
        ...inc,
        tags: inc.tags || []
      })) as Income[];

      if (incomeToExport.length === 0) {
        showToast("No income found for the selected date range.", "info");
        setIsLoading(false);
        return;
      }

      const dataToExport: PdfExportRow[] = incomeToExport.map(inc => {
        const formattedDate = format(parseISO(inc.income_date), 'dd/MM/yy HH:mm');
        const tagsString = inc.tags && inc.tags.length > 0 ? inc.tags.map(tag => tag.name).join(', ') : 'N/A';
        const amountString = `+${inc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        return {
          'Type': 'Income',
          'Date': formattedDate,
          'Category/Source': inc.source,
          'Description': inc.description || 'N/A',
          'Amount': amountString,
          'Tags': tagsString,
        };
      });

      const rangeStartFormatted = format(parseISO(pdfStartDate), 'dd MMM yy');
      const rangeEndFormatted = format(parseISO(pdfEndDate), 'dd MMM yy');
      const titleDateRange = pdfStartDate === pdfEndDate ? rangeStartFormatted : `${rangeStartFormatted} to ${rangeEndFormatted}`;

      const fileName = `Income_Report_${rangeStartFormatted.replace(/\s/g, '')}_to_${rangeEndFormatted.replace(/\s/g, '')}.pdf`;
      const title = `Income Report for ${titleDateRange}`;

      const totalForPdfRange = incomeToExport.reduce((sum, inc) => sum + inc.amount, 0);
      const summaryData = {
        totalIncome: totalForPdfRange,
        totalExpenses: 0,
        netFlow: totalForPdfRange
      };

      exportToPdf(dataToExport, fileName, title, TIME_ZONE, summaryData, 'income');
      showToast("PDF export started.", "success");

    } catch (error: any) {
      console.error("Error fetching income for PDF:", error);
      showToast("Failed to generate PDF. " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
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
          <PlusCircle size={20} className="mr-2" /> Add New Income
        </Button>
      </div>

      <AdvancedFilter
        mode="income"
        initialFilters={initialIncomeFilters}
        onFilterChange={handleFilterChange as any}
        initialSort={initialIncomeSort}
        onSortChange={handleSortChange as any}
      />

      <div className="content-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
            Displaying {paginatedIncomes.length} of {filteredAndSortedIncomes.length} records
            {selectionPeriod !== "All Time" && ` for: `}
            <span className="font-semibold text-gray-700 dark:text-dark-text">
              {selectionPeriod !== "All Time" ? selectionPeriod : ''}
            </span>.
            <br />
            Total Displayed Income: <span className="font-bold text-green-600 dark:text-green-400">₹{totalFilteredIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
          {/* Update button to open modal */}
          <Button onClick={() => setIsDateRangeModalOpen(true)} variant="outline" size="sm">
            <Download size={16} className="mr-2" /> Export PDF by Date Range
          </Button>
        </div>

        {isLoading && !isDateRangeModalOpen ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" /><p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading income records...</p></div>
        ) : paginatedIncomes.length > 0 ? (
          <>
            <IncomeTable incomes={paginatedIncomes} onEdit={handleOpenModal} onDelete={handleIncomeDeleted} />
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
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10 space-y-2">
            <Landmark size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
            <p>No income records found {activeFilters.searchTerm ? `matching "${activeFilters.searchTerm}"` : (selectionPeriod !== "All Time" ? `for ${selectionPeriod}` : 'for the selected criteria')}.</p>
            {allIncomes.length === 0 && !isLoading && <p className="text-sm">You haven't recorded any income yet.</p>}
          </div>
        )}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingIncome ? "Edit Income" : "Add New Income"}>
          <IncomeForm existingIncome={editingIncome} onIncomeSaved={handleIncomeSaved} onFormCancel={handleCloseModal} />
        </Modal>
      )}
      <DateRangeModal
        isOpen={isDateRangeModalOpen}
        onClose={() => setIsDateRangeModalOpen(false)}
        onExport={handleExportPdfForDateRange}
        title="Export Income Report by Date Range"
      />
    </div>
  );
};

export default IncomePage;