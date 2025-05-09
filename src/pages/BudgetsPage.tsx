import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Budget, Expense } from '../types'; // Assuming Expense type is needed for calculating spent
 // Assuming Expense type is needed for calculating spent
import { useToast } from '../hooks/useToast';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import BudgetForm from '../components/Budgets/BudgetForm'; // Create this
import BudgetList from '../components/Budgets/BudgetList'; // Create this
import { PlusCircle, Loader2, Target } from 'lucide-react';
import { getYear, getMonth, startOfMonth, endOfMonth, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import Select from '../components/ui/Select';


const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]); // To calculate spent against budget
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const nowInIST = toZonedTime(new Date(), timeZone);
  const [selectedYear, setSelectedYear] = useState<number>(getYear(nowInIST));
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(nowInIST) + 1);


  const fetchBudgetsAndExpenses = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const budgetMonthStart = format(new Date(selectedYear, selectedMonth - 1, 1), "yyyy-MM-dd'T'00:00:00XXX");
    const budgetMonthEnd = format(endOfMonth(new Date(selectedYear, selectedMonth - 1, 1)), "yyyy-MM-dd'T'23:59:59XXX");
    
    try {
      const [budgetsRes, expensesRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('year', selectedYear)
          .eq('month', selectedMonth),
        supabase
          .from('expenses')
          .select('category, amount, expense_date')
          .eq('user_id', user.id)
          .gte('expense_date', budgetMonthStart) 
          .lte('expense_date', budgetMonthEnd)
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      setBudgets(budgetsRes.data as Budget[] || []);

      if (expensesRes.error) throw expensesRes.error;
      setExpenses(expensesRes.data as Expense[] || []);

    } catch (error: any) {
      showToast("Failed to load budgets or expenses.", "error");
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedYear, selectedMonth, showToast]);

  useEffect(() => {
    fetchBudgetsAndExpenses();
  }, [fetchBudgetsAndExpenses]);

  const handleOpenModal = (budget: Budget | null = null) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingBudget(null);
    setIsModalOpen(false);
  };

  const handleBudgetSaved = (savedBudget: Budget) => {
    fetchBudgetsAndExpenses(); // Re-fetch to update list
    showToast(editingBudget ? "Budget updated successfully!" : "Budget added successfully!", "success");
    handleCloseModal();
  };

  const handleBudgetDeleted = async (budgetId: string) => {
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
      if (error) throw error;
      fetchBudgetsAndExpenses(); // Re-fetch
      showToast("Budget deleted successfully!", "success");
    } catch (error: any) {
      showToast("Failed to delete budget.", "error");
      console.error("Error deleting budget:", error);
    }
  };
  
  const years = Array.from({ length: 10 }, (_, i) => getYear(nowInIST) - 5 + i).sort((a,b) => b-a); // Last 5 and next 4 years
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2000, i, 1), 'MMMM') }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-white shadow rounded-lg">
        <div className="flex items-center space-x-3">
            <Target className="h-8 w-8 text-primary-600"/>
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Budgets</h1>
                <p className="text-gray-600">Manage your monthly and category-specific budgets.</p>
            </div>
        </div>
        <Button onClick={() => handleOpenModal()} variant="primary" size="lg">
          <PlusCircle size={20} className="mr-2" />
          Set New Budget
        </Button>
      </div>

      <div className="p-6 bg-white shadow rounded-lg">
        <div className="flex flex-wrap items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-700">View Budgets For:</h2>
            <Select
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                options={months}
                className="w-full sm:w-40"
            />
            <Select
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                options={years.map(y => ({ value: y.toString(), label: y.toString() }))}
                className="w-full sm:w-32"
            />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="ml-3 text-gray-500">Loading budgets...</p>
          </div>
        ) : (
          <BudgetList budgets={budgets} expenses={expenses} onDelete={handleBudgetDeleted} onEdit={handleOpenModal} />
        )}
      </div>

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingBudget ? "Edit Budget" : "Set New Budget"}>
          <BudgetForm 
            existingBudget={editingBudget} 
            onBudgetSaved={handleBudgetSaved} 
            onFormCancel={handleCloseModal}
            currentYear={selectedYear} // Pass current selection for defaults
            currentMonth={selectedMonth} // Pass current selection for defaults
          />
        </Modal>
      )}
    </div>
  );
};

export default BudgetsPage;