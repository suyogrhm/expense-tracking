import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Added useMemo
import ExpenseForm from '../components/Expenses/ExpenseForm';
import ExpenseTable from '../components/Expenses/ExpenseTable';
import type { Expense, Income, Budget } from '../types'; 
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, getYear, getMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz'; 
import { useToast } from '../hooks/useToast';
import { PlusCircle, Loader2, Download, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'; 
import Button from '../components/ui/Button';
import { exportToPdf } from '../utils/exportUtils'; 
import { Link } from 'react-router-dom';

const TIME_ZONE = 'Asia/Kolkata'; // Define as a constant

const DashboardPage: React.FC = () => {
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Expense[]>([]);
  const [currentMonthIncome, setCurrentMonthIncome] = useState<Income[]>([]); 
  const [currentBudgets, setCurrentBudgets] = useState<Budget[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseFormVisible, setIsExpenseFormVisible] = useState(false);
  
  const { user } = useAuth();
  const { showToast } = useToast();

  // Memoize date calculations to prevent them from changing on every render
  const { now, currentMonth, currentYearVal, monthStartISO, monthEndISO, currentMonthNameFormatted } = useMemo(() => {
    const n = toZonedTime(new Date(), TIME_ZONE);
    const cMonth = getMonth(n) + 1;
    const cYear = getYear(n);
    const mStart = format(startOfMonth(n), "yyyy-MM-dd'T'00:00:00XXX");
    const mEnd = format(endOfMonth(n), "yyyy-MM-dd'T'23:59:59XXX");
    const cMonthName = format(n, 'MMMM yyyy');
    return { now: n, currentMonth: cMonth, currentYearVal: cYear, monthStartISO: mStart, monthEndISO: mEnd, currentMonthNameFormatted: cMonthName };
  }, []); // Empty dependency array means these are calculated once per component mount (or until a hot reload)

  const fetchData = useCallback(async () => { 
    if (!user) return;
    setIsLoading(true);
    
    try {
      const [expensesRes, incomeRes, budgetsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', user.id)
          .gte('expense_date', monthStartISO)
          .lte('expense_date', monthEndISO)
          .order('expense_date', { ascending: false }),
        supabase 
          .from('incomes')
          .select('*')
          .eq('user_id', user.id)
          .gte('income_date', monthStartISO)
          .lte('income_date', monthEndISO)
          .order('income_date', { ascending: false }),
        supabase 
          .from('budgets')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .eq('year', currentYearVal)
      ]);

      if (expensesRes.error) throw expensesRes.error;
      setCurrentMonthExpenses(expensesRes.data as Expense[] || []);

      if (incomeRes.error) throw incomeRes.error;
      setCurrentMonthIncome(incomeRes.data as Income[] || []);
      
      if (budgetsRes.error) throw budgetsRes.error;
      setCurrentBudgets(budgetsRes.data as Budget[] || []);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      showToast("Failed to load dashboard data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast, monthStartISO, monthEndISO, currentMonth, currentYearVal]); // Dependencies for useCallback

  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  const handleExpenseAdded = (_newExpense: Expense) => {
    fetchData(); 
    setIsExpenseFormVisible(false); 
    showToast("Expense added successfully!", "success");
  };

  const handleExpenseUpdated = (_updatedExpense: Expense) => {
    fetchData();
    showToast("Expense updated successfully!", "success");
  };

  const handleExpenseDeleted = (_deletedExpenseId: string) => {
    fetchData();
    showToast("Expense deleted successfully!", "success");
  };
  
  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = currentMonthIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const netFlow = totalIncome - totalExpenses;

  const overallBudget = currentBudgets.find(b => b.category === null); 
  const spentAgainstOverall = totalExpenses;

  const handleExportPdf = () => {
     if(currentMonthExpenses.length === 0) {
        showToast("No expense data to export.", "info");
        return;
    }
    const fileName = `Expenses_${currentMonthNameFormatted.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Expenses for ${currentMonthNameFormatted}`;
    exportToPdf(currentMonthExpenses, fileName, title, TIME_ZONE); 
    showToast("PDF export started.", "success");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-white shadow rounded-lg">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-600">Overview for {currentMonthNameFormatted.split(' ')[0]}.</p>
        </div>
        <Button onClick={() => setIsExpenseFormVisible(!isExpenseFormVisible)} variant="primary" size="lg">
          <PlusCircle size={20} className="mr-2" />
          {isExpenseFormVisible ? 'Close Expense Form' : 'Add New Expense'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Income" amount={totalIncome} icon={<TrendingUp className="text-green-500"/>} color="text-green-600" />
        <SummaryCard title="Total Expenses" amount={totalExpenses} icon={<TrendingDown className="text-red-500"/>} color="text-red-600" />
        <SummaryCard title="Net Flow" amount={netFlow} icon={<PiggyBank className={netFlow >= 0 ? "text-blue-500" : "text-orange-500"}/>} color={netFlow >= 0 ? "text-blue-600" : "text-orange-600"} />
      </div>
      
      {overallBudget && (
        <div className="p-6 bg-white shadow rounded-lg">
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Overall Budget for {currentMonthNameFormatted}</h3>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600">Spent: ₹{spentAgainstOverall.toLocaleString('en-IN')}</span>
            <span className="text-gray-600">Budget: ₹{overallBudget.amount.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className={`h-4 rounded-full ${spentAgainstOverall > overallBudget.amount ? 'bg-red-500' : 'bg-primary-500'}`}
              style={{ width: `${Math.min((spentAgainstOverall / overallBudget.amount) * 100, 100)}%` }}
            ></div>
          </div>
          {spentAgainstOverall > overallBudget.amount && (
            <p className="text-xs text-red-500 mt-1">You've exceeded your overall budget!</p>
          )}
           <Link to="/budgets" className="text-sm text-primary-600 hover:underline mt-2 inline-block">Manage Budgets</Link>
        </div>
      )}
      {!overallBudget && !isLoading && (
         <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-700">No overall budget set for {currentMonthNameFormatted}.</p>
            <Link to="/budgets" className="text-sm text-primary-600 hover:underline font-medium mt-1 inline-block">Set a Budget</Link>
        </div>
      )}


      {isExpenseFormVisible && (
        <div className="p-6 bg-white shadow rounded-lg">
          <ExpenseForm 
            onExpenseAdded={handleExpenseAdded} 
            existingExpense={null} 
            onFormCancel={() => setIsExpenseFormVisible(false)}
          />
        </div>
      )}

      <div className="p-6 bg-white shadow rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div>
                <h2 className="text-2xl font-semibold text-gray-700">Recent Expenses</h2>
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
            <p className="ml-3 text-gray-500">Loading data...</p>
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

interface SummaryCardProps {
    title: string;
    amount: number;
    icon: React.ReactNode;
    color: string;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow flex items-center space-x-4">
        <div className={`p-3 rounded-full bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
             {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-semibold ${color}`}>₹{amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
    </div>
);

export default DashboardPage;