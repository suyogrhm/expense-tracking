import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Income } from '../types';
import { useToast } from '../hooks/useToast';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import IncomeForm from '../components/Income/IncomeForm';
import IncomeTable from '../components/Income/IncomeTable';
import { PlusCircle, Loader2, Download, Landmark, Search as SearchIcon } from 'lucide-react'; // Added SearchIcon
import Input from '../components/ui/Input'; // New Import
import { format } from 'date-fns';
import { exportToPdf } from '../utils/exportUtils';
import { useDebounce } from '../hooks/useDebounce'; // New Import

const IncomePage: React.FC = () => {
  const [allIncomes, setAllIncomes] = useState<Income[]>([]); // Renamed from incomes to allIncomes
  const [filteredIncomes, setFilteredIncomes] = useState<Income[]>([]); // For displaying
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchIncomes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select('*, tags(id, name)') // Fetch related tags
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
    let newFilteredIncomes = allIncomes;
    if (debouncedSearchTerm.trim() !== '') {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      newFilteredIncomes = newFilteredIncomes.filter(inc =>
        inc.source.toLowerCase().includes(lowerSearchTerm) ||
        (inc.description && inc.description.toLowerCase().includes(lowerSearchTerm)) ||
        (inc.amount.toString().includes(lowerSearchTerm)) ||
        (inc.tags && inc.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)))
      );
    }
    setFilteredIncomes(newFilteredIncomes);
  }, [allIncomes, debouncedSearchTerm]);


  const handleOpenModal = (income: Income | null = null) => {
    setEditingIncome(income);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingIncome(null);
    setIsModalOpen(false);
  };

  const handleIncomeSaved = (_savedIncome: Income) => { // Parameter is not used directly
    fetchIncomes();
    showToast(editingIncome ? "Income updated successfully!" : "Income added successfully!", "success");
    handleCloseModal();
  };

  const handleIncomeDeleted = async (incomeId: string) => {
    try {
      // First delete associated tags from income_tags
      const { error: deleteTagsError } = await supabase
        .from('income_tags')
        .delete()
        .eq('income_id', incomeId);

      if (deleteTagsError) {
        console.error("Error deleting associated income tags:", deleteTagsError);
        // Decide if you want to proceed or throw
      }

      const { error } = await supabase.from('incomes').delete().eq('id', incomeId);
      if (error) throw error;
      fetchIncomes(); // Refetch after deletion
      showToast("Income deleted successfully!", "success");
    } catch (error: any) {
      showToast("Failed to delete income.", "error");
      console.error("Error deleting income:", error);
    }
  };

  const totalFilteredIncome = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);

  const handleExportPdf = () => {
    if (filteredIncomes.length === 0) {
      showToast("No income data to export.", "info");
      return;
    }
    const fileName = `Income_Report_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Income Report as of ${format(new Date(), 'dd MMM yyyy')}`;

    exportToPdf(filteredIncomes, fileName, title, timeZone);
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

      <div className="content-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-dark-text">All Income</h2>
          <Input
            id="incomeSearch"
            type="search"
            placeholder="Search income..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<SearchIcon size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
            containerClassName="w-full sm:w-64"
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
            Total Displayed Income: <span className="font-bold text-green-600 dark:text-green-400">₹{totalFilteredIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
          {filteredIncomes.length > 0 && (
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
        ) : filteredIncomes.length > 0 ? (
          <IncomeTable incomes={filteredIncomes} onEdit={handleOpenModal} onDelete={handleIncomeDeleted} />
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10 space-y-2">
            <Landmark size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
            <p>No income records found {debouncedSearchTerm ? `matching "${debouncedSearchTerm}"` : ''}.</p>
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