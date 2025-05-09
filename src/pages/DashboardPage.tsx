import React, { useState, useEffect, useCallback } from 'react'; 
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ExpenseTable from '../components/Expenses/ExpenseTable';
import type { Expense } from '../types'; 
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz'; 
import { useToast } from '../hooks/useToast';
import { PlusCircle, Loader2, Download } from 'lucide-react'; 
import Button from '../components/ui/Button';
import { exportToPdf } from '../utils/exportUtils'; 

const DashboardPage: React.FC = () => {
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const timeZone = 'Asia/Kolkata';

  const fetchCurrentMonthExpenses = useCallback(async () => { 
    if (!user) return;
    setIsLoading(true);
    
    const nowInIST = toZonedTime(new Date(), timeZone);
    const monthStart = format(startOfMonth(nowInIST), "yyyy-MM-dd'T'00:00:00XXX"); 
    const monthEnd = format(endOfMonth(nowInIST), "yyyy-MM-dd'T'23:59:59XXX");   

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', monthStart)
        .lte('expense_date', monthEnd)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setCurrentMonthExpenses(data as Expense[] || []);
    } catch (error: any) {
      console.error("Error fetching current month expenses:", error);
      showToast("Failed to load expenses.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast, timeZone]); 

  useEffect(() => {
    fetchCurrentMonthExpenses();
  }, [fetchCurrentMonthExpenses]); 

  const handleExpenseAdded = (_newExpense: Expense) => {
    fetchCurrentMonthExpenses(); 
    setIsFormVisible(false); 
    showToast("Expense added successfully!", "success");
  };

  const handleExpenseUpdated = (_updatedExpense: Expense) => {
    fetchCurrentMonthExpenses();
    showToast("Expense updated successfully!", "success");
  };

  const handleExpenseDeleted = (_deletedExpenseId: string) => {
    fetchCurrentMonthExpenses();
    showToast("Expense deleted successfully!", "success");
  };

  const currentMonthName = format(toZonedTime(new Date(), timeZone), 'MMMM yyyy'); // Corrected format string
  const totalForMonth = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleExportPdf = () => {
     if(currentMonthExpenses.length === 0) {
        showToast("No data to export.", "info");
        return;
    }
    const fileName = `Expenses_${currentMonthName.replace(' ', '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Expenses for ${currentMonthName}`;
    exportToPdf(currentMonthExpenses, fileName, title, timeZone);
    showToast("PDF export started.", "success");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-white shadow rounded-lg">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">Overview of your expenses for {currentMonthName.split(' ')[0]}.</p>
        </div>
        <Button onClick={() => setIsFormVisible(!isFormVisible)} variant="primary" size="lg">
          <PlusCircle size={20} className="mr-2" />
          {isFormVisible ? 'Close Form' : 'Add New Expense'}
        </Button>
      </div>

      {isFormVisible && (
        <div className="p-6 bg-white shadow rounded-lg">
          <ExpenseForm 
            onExpenseAdded={handleExpenseAdded} 
            existingExpense={null} 
            onFormCancel={() => setIsFormVisible(false)}
          />
        </div>
      )}

      <div className="p-6 bg-white shadow rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div>
                <h2 className="text-2xl font-semibold text-gray-700">Current Month's Expenses</h2>
                <p className="text-lg text-gray-600">
                    Total: <span className="font-bold text-primary-600">₹{totalForMonth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
            </div>
            {currentMonthExpenses.length > 0 && (
                <div className="flex space-x-2 mt-2 sm:mt-0">
                    <Button onClick={handleExportPdf} variant="outline" size="sm">
                        <Download size={16} className="mr-2" /> PDF
                    </Button>
                </div>
            )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="ml-3 text-gray-500">Loading expenses...</p>
          </div>
        ) : currentMonthExpenses.length > 0 ? (
          <ExpenseTable
            expenses={currentMonthExpenses}
            onEdit={handleExpenseUpdated} 
            onDelete={handleExpenseDeleted} 
          />
        ) : (
          <p className="text-center text-gray-500 py-10">No expenses recorded for this month yet.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;