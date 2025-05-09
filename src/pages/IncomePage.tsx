import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Income } from '../types';
import { useToast } from '../hooks/useToast';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import IncomeForm from '../components/Income/IncomeForm'; 
import IncomeTable from '../components/Income/IncomeTable'; 
import { PlusCircle, Loader2, Download, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { exportToPdf } from '../utils/exportUtils'; 

const IncomePage: React.FC = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const fetchIncomes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .eq('user_id', user.id)
        .order('income_date', { ascending: false });
      if (error) throw error;
      setIncomes(data as Income[] || []);
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

  const handleOpenModal = (income: Income | null = null) => {
    setEditingIncome(income);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingIncome(null);
    setIsModalOpen(false);
  };

  const handleIncomeSaved = (savedIncome: Income) => {
    if (editingIncome) {
      setIncomes(prev => prev.map(inc => inc.id === savedIncome.id ? savedIncome : inc));
      showToast("Income updated successfully!", "success");
    } else {
      setIncomes(prev => [savedIncome, ...prev]); 
    }
    fetchIncomes(); 
    handleCloseModal();
  };

  const handleIncomeDeleted = async (incomeId: string) => {
    try {
      const { error } = await supabase.from('incomes').delete().eq('id', incomeId);
      if (error) throw error;
      setIncomes(prev => prev.filter(inc => inc.id !== incomeId));
      showToast("Income deleted successfully!", "success");
    } catch (error: any) {
      showToast("Failed to delete income.", "error");
      console.error("Error deleting income:", error);
    }
  };
  
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  const handleExportPdf = () => {
    if (incomes.length === 0) {
      showToast("No income data to export.", "info");
      return;
    }
    const fileName = `Income_Report_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Income Report as of ${format(new Date(), 'dd MMM yyyy')}`; // Corrected format
    
    exportToPdf(incomes, fileName, title, timeZone);
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
            <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
                Total Recorded Income: <span className="font-bold text-green-600 dark:text-green-400">₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            {incomes.length > 0 && (
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
        ) : incomes.length > 0 ? (
          <IncomeTable incomes={incomes} onEdit={handleOpenModal} onDelete={handleIncomeDeleted} />
        ) : (
          <p className="text-center text-gray-500 dark:text-dark-text-secondary py-10">No income recorded yet. Click "Add New Income" to start.</p>
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