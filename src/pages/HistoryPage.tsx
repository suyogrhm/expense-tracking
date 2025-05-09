import React, { useState, useEffect, useMemo, useCallback } from 'react'; 
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Expense } from '../types';
import { format, getYear, getMonth } from 'date-fns'; 
import { toZonedTime } from 'date-fns-tz';
import { useToast } from '../hooks/useToast';
import ExpenseTable from '../components/Expenses/ExpenseTable'; 
import { Loader2, Filter, CalendarDays, Download } from 'lucide-react'; 
import Select from '../components/ui/Select'; 
import Button from '../components/ui/Button'; 
import { exportToPdf } from '../utils/exportUtils'; 

const HistoryPage: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();

  const timeZone = 'Asia/Kolkata';
  const nowInIST = toZonedTime(new Date(), timeZone);

  const currentYear = getYear(nowInIST);
  const currentMonth = getMonth(nowInIST) + 1; 

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth); 

  const fetchAllExpenses = useCallback(async () => { 
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, tags(id, name)') // Fetch related tags
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setAllExpenses((data || []).map(exp => ({...exp, tags: exp.tags || []})) as Expense[]);
    } catch (error: any) {
      console.error("Error fetching all expenses:", error);
      showToast("Failed to load expense history.", "error");
    } finally {
      setIsLoading(false);
    }
  },[user, showToast]); 

  useEffect(() => {
    fetchAllExpenses();
  }, [fetchAllExpenses]); 

  useEffect(() => {
    if (allExpenses.length > 0) {
      let newFilteredExpenses = allExpenses;
      if (selectedYear !== 0) { 
        newFilteredExpenses = newFilteredExpenses.filter(exp => {
          const expenseDateInIST = toZonedTime(new Date(exp.expense_date), timeZone);
          return getYear(expenseDateInIST) === selectedYear;
        });
      }
      if (selectedMonth !== 0) { 
        newFilteredExpenses = newFilteredExpenses.filter(exp => {
          const expenseDateInIST = toZonedTime(new Date(exp.expense_date), timeZone);
          return getMonth(expenseDateInIST) + 1 === selectedMonth;
        });
      }
      setFilteredExpenses(newFilteredExpenses);
    } else {
        setFilteredExpenses([]);
    }
  }, [allExpenses, selectedYear, selectedMonth, timeZone]);

  const years = useMemo(() => {
    if (allExpenses.length === 0 && !isLoading) return [currentYear]; 
    const expenseYears = new Set(allExpenses.map(exp => getYear(toZonedTime(new Date(exp.expense_date), timeZone))));
    if (!expenseYears.has(currentYear)) { 
        expenseYears.add(currentYear);
    }
    return Array.from(expenseYears).sort((a, b) => b - a);
  }, [allExpenses, currentYear, isLoading, timeZone]);

  const months = [
    { value: 0, label: 'All Months' },
    ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2000, i, 1), 'MMMM') }))
  ];
  
  const handleExpenseUpdated = (_updatedExpense: Expense) => {
    fetchAllExpenses(); 
    showToast("Expense updated successfully!", "success");
  };

  const handleExpenseDeleted = (_deletedExpenseId: string) => {
    fetchAllExpenses(); 
    showToast("Expense deleted successfully!", "success");
  };

  const totalForSelection = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const selectionPeriod = selectedMonth === 0 
    ? `Year ${selectedYear}` 
    : `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;

  const handleExportPdf = () => {
    if(filteredExpenses.length === 0) {
        showToast("No data to export for the selected period.", "info");
        return;
    }
    const fileName = `Expense_History_${selectionPeriod.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Expense History for ${selectionPeriod}`;
    exportToPdf(filteredExpenses, fileName, title, timeZone);
    showToast("PDF export started.", "success");
  };


  return (
    <div className="space-y-8">
      <div className="content-card"> 
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Expense History</h1>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto"> 
                <Filter size={20} className="text-gray-500 dark:text-dark-text-secondary hidden sm:block" /> 
                <Select
                    value={selectedYear.toString()}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
                    className="flex-grow sm:flex-grow-0 sm:w-32" 
                />
                <Select
                    value={selectedMonth.toString()}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    options={months}
                    className="flex-grow sm:flex-grow-0 sm:w-40" 
                />
            </div>
        </div>
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
                Total for {selectionPeriod}: <span className="font-bold text-primary-600 dark:text-dark-primary">₹{totalForSelection.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
            {filteredExpenses.length > 0 && (
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
        ) : filteredExpenses.length > 0 ? (
          <ExpenseTable
            expenses={filteredExpenses}
            onEdit={handleExpenseUpdated}
            onDelete={handleExpenseDeleted}
          />
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10 space-y-2">
            <CalendarDays size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
            <p>No expenses found for the selected period.</p>
            {allExpenses.length === 0 && !isLoading && <p className="text-sm">You haven't recorded any expenses yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;