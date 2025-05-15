import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import type { Expense, Income, Budget, PdfExportRow } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, getYear, getMonth, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useToast } from '../hooks/useToast';
import { PlusCircle, Loader2, Download, TrendingUp, TrendingDown, PiggyBank, ChevronUp, ListChecks } from 'lucide-react';
import Button from '../components/ui/Button';
import { exportToPdf } from '../utils/exportUtils';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

const TIME_ZONE = 'Asia/Kolkata';
const MAX_RECENT_TRANSACTIONS = 15;

interface CombinedTransactionForDashboard extends Partial<Expense>, Partial<Income> {
  transaction_type: 'expense' | 'income';
  transaction_date: string;
  display_category_or_source: string;
}

const DashboardPage: React.FC = () => {
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Expense[]>([]);
  const [currentMonthIncome, setCurrentMonthIncome] = useState<Income[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CombinedTransactionForDashboard[]>([]);
  const [currentBudgets, setCurrentBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseFormVisible, setIsExpenseFormVisible] = useState(false);

  const { user } = useAuth();
  const { showToast } = useToast();

  const { currentMonth, currentYearVal, monthStartISO, monthEndISO, currentMonthNameFormatted } = useMemo(() => {
    const n = toZonedTime(new Date(), TIME_ZONE);
    const cMonth = getMonth(n) + 1;
    const cYear = getYear(n);
    const mStart = format(startOfMonth(n), "yyyy-MM-dd'T'00:00:00XXX");
    const mEnd = format(endOfMonth(n), "yyyy-MM-dd'T'23:59:59XXX");
    const cMonthName = format(n, 'MMMM yyyy');
    return { currentMonth: cMonth, currentYearVal: cYear, monthStartISO: mStart, monthEndISO: mEnd, currentMonthNameFormatted: cMonthName };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const [expensesRes, incomeRes, budgetsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select('*, tags(id, name), expense_split_details(*)')
          .eq('user_id', user.id)
          .gte('expense_date', monthStartISO)
          .lte('expense_date', monthEndISO)
          .order('expense_date', { ascending: false }),
        supabase
          .from('incomes')
          .select('*, tags(id, name)')
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

      if (expensesRes.error) {
        console.error("Error fetching expenses:", expensesRes.error);
        throw expensesRes.error;
      }
      const fetchedExpenses = (expensesRes.data || []).map(exp => ({
        ...exp,
        tags: exp.tags || [],
        expense_split_details: exp.expense_split_details || []
      })) as Expense[];
      setCurrentMonthExpenses(fetchedExpenses);
      console.log(`Fetched ${fetchedExpenses.length} expenses for the current month.`);

      if (incomeRes.error) {
        console.error("Error fetching income:", incomeRes.error);
        throw incomeRes.error;
      }
      const fetchedIncome = (incomeRes.data || []).map(inc => ({ ...inc, tags: inc.tags || [] })) as Income[];
      setCurrentMonthIncome(fetchedIncome);
      console.log(`Fetched ${fetchedIncome.length} income records for the current month.`);

      const combinedForRecentDisplay: CombinedTransactionForDashboard[] = [
        ...fetchedExpenses.map(exp => ({
          ...exp,
          transaction_type: 'expense' as const,
          transaction_date: exp.expense_date,
          display_category_or_source: exp.sub_category ? `${exp.category} (${exp.sub_category})` : exp.category,
        })),
        ...fetchedIncome.map(inc => ({
          ...inc,
          transaction_type: 'income' as const,
          transaction_date: inc.income_date,
          display_category_or_source: inc.source,
        }))
      ];

      combinedForRecentDisplay.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      setRecentTransactions(combinedForRecentDisplay.slice(0, MAX_RECENT_TRANSACTIONS));

      if (budgetsRes.error) {
        console.error("Error fetching budgets:", budgetsRes.error);
        throw budgetsRes.error;
      }
      setCurrentBudgets(budgetsRes.data as Budget[] || []);

    } catch (error: any) {
      console.error("Error fetching dashboard data (overall):", error);
      showToast("Failed to load dashboard data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast, monthStartISO, monthEndISO, currentMonth, currentYearVal]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExpenseAdded = (_newExpense: Expense) => {
    fetchData();
    showToast("Expense added successfully!", "success");
  };

  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = currentMonthIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const netFlow = totalIncome - totalExpenses;

  const overallBudget = currentBudgets.find(b => b.category === null);
  const spentAgainstOverall = totalExpenses;

  const handleExportCurrentMonthTransactionsPdf = () => {
    console.log("Initiating PDF export...");
    console.log("Current month expenses for PDF:", currentMonthExpenses.length);
    console.log("Current month income for PDF:", currentMonthIncome.length);

    const allMonthTransactions: CombinedTransactionForDashboard[] = [
      ...currentMonthExpenses.map(exp => ({
        ...exp,
        transaction_type: 'expense' as const,
        transaction_date: exp.expense_date,
        display_category_or_source: exp.sub_category ? `${exp.category} (${exp.sub_category})` : exp.category,
      })),
      ...currentMonthIncome.map(inc => ({
        ...inc,
        transaction_type: 'income' as const,
        transaction_date: inc.income_date,
        display_category_or_source: inc.source,
      }))
    ];
    console.log("Total combined transactions for PDF:", allMonthTransactions.length);

    allMonthTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    if (allMonthTransactions.length === 0) {
      showToast("No transactions for the current month to export.", "info");
      console.log("No transactions to export.");
      return;
    }

    const dataToExport: PdfExportRow[] = allMonthTransactions.map(t => {
      // UPDATED Date and Time format to dd/MM/yy HH:mm
      const formattedDate = format(parseISO(t.transaction_date), 'dd/MM/yy HH:mm');
      const tagsString = t.tags && t.tags.length > 0 ? t.tags.map(tag => tag.name).join(', ') : 'N/A';
      const amount = t.amount || 0;
      const amountString = `${t.transaction_type === 'income' ? '+' : '-'}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      return {
        'Type': t.transaction_type === 'income' ? 'Income' : 'Expense',
        'Date': formattedDate,
        'Category/Source': t.display_category_or_source,
        'Description': t.description || 'N/A',
        'Amount': amountString,
        'Tags': tagsString,
      };
    });
    console.log("Data prepared for exportToPdf utility:", dataToExport.length);

    const fileName = `Monthly_Transactions_${currentMonthNameFormatted.replace(/ /g, '_')}.pdf`;
    const title = `All Transactions for ${currentMonthNameFormatted}`;

    const summaryData = {
      totalIncome: totalIncome,
      totalExpenses: totalExpenses,
      netFlow: netFlow
    };

    exportToPdf(dataToExport, fileName, title, TIME_ZONE, summaryData, 'all');
    showToast("PDF export of current month's transactions started.", "success");
  };

  return (
    <div className="space-y-8">
      <div className="content-card">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Dashboard</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">Overview for {currentMonthNameFormatted.split(' ')[0]}.</p>
          </div>
          <Button onClick={() => setIsExpenseFormVisible(!isExpenseFormVisible)} variant="primary" size="lg" className="w-full sm:w-auto">
            {isExpenseFormVisible ? <ChevronUp size={20} className="mr-2" /> : <PlusCircle size={20} className="mr-2" />}
            {isExpenseFormVisible ? 'Close Expense Form' : 'Add New Expense'}
          </Button>
        </div>
        <div
          className={classNames(
            "overflow-hidden transition-all duration-500 ease-in-out",
            {
              "max-h-[1500px] opacity-100 mt-6 border-t border-gray-200 dark:border-gray-700 pt-6": isExpenseFormVisible,
              "max-h-0 opacity-0": !isExpenseFormVisible,
            }
          )}
        >
          {isExpenseFormVisible && (
            <ExpenseForm
              onExpenseAdded={handleExpenseAdded}
              existingExpense={null}
              onFormCancel={() => setIsExpenseFormVisible(false)}
            />
          )}
        </div>
      </div>

      <div id="summary-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Income" amount={totalIncome} icon={<TrendingUp className="text-green-500" />} color="text-green-600 dark:text-green-400" />
        <SummaryCard title="Total Expenses" amount={totalExpenses} icon={<TrendingDown className="text-red-500" />} color="text-red-600 dark:text-red-400" />
        <SummaryCard title="Net Flow" amount={netFlow} icon={<PiggyBank className={netFlow >= 0 ? "text-blue-500 dark:text-blue-400" : "text-orange-500 dark:text-orange-400"} />} color={netFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"} />
      </div>

      {overallBudget && (
        <div className="content-card">
          <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-3">Overall Budget for {currentMonthNameFormatted}</h3>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600 dark:text-dark-text-secondary">Spent: ₹{spentAgainstOverall.toLocaleString('en-IN')}</span>
            <span className="text-gray-600 dark:text-dark-text-secondary">Budget: ₹{overallBudget.amount.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full ${spentAgainstOverall > overallBudget.amount ? 'bg-red-500' : 'bg-primary-500 dark:bg-dark-primary'}`}
              style={{ width: `${Math.min((spentAgainstOverall / overallBudget.amount) * 100, 100)}%` }}
            ></div>
          </div>
          {spentAgainstOverall > overallBudget.amount && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">You've exceeded your overall budget!</p>
          )}
          <Link to="/budgets" className="text-sm text-primary-600 dark:text-dark-primary hover:underline mt-2 inline-block">Manage Budgets</Link>
        </div>
      )}
      {!overallBudget && !isLoading && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 border border-blue-200 dark:border-blue-700 rounded-lg text-center">
          <p className="text-sm text-blue-700 dark:text-blue-300">No overall budget set for {currentMonthNameFormatted}.</p>
          <Link to="/budgets" className="text-sm text-primary-600 dark:text-dark-primary hover:underline font-medium mt-1 inline-block">Set a Budget</Link>
        </div>
      )}

      {/* Recent Transactions Section */}
      <div className="content-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-dark-text flex items-center">
              <ListChecks size={28} className="mr-3 text-primary-500 dark:text-dark-primary" />
              Recent Transactions
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary ml-10">
              Showing up to {MAX_RECENT_TRANSACTIONS} most recent entries for {currentMonthNameFormatted.split(' ')[0]}.
            </p>
          </div>
          {(currentMonthExpenses.length > 0 || currentMonthIncome.length > 0) && (
            <div className="flex space-x-2 mt-2 sm:mt-0">
              <Button onClick={handleExportCurrentMonthTransactionsPdf} variant="outline" size="sm">
                <Download size={16} className="mr-2" /> Export Month's Transactions
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" />
            <p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading transactions...</p>
          </div>
        ) : recentTransactions.length > 0 ? (
          <div className="overflow-x-auto bg-white dark:bg-dark-card rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category/Source</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((transaction) => (
                  <tr
                    key={`${transaction.transaction_type}-${transaction.id}-${transaction.created_at || transaction.transaction_date}`}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.transaction_type === 'income'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}>
                        {transaction.transaction_type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">
                      {/* UPDATED date format for on-screen table */}
                      {format(parseISO(transaction.transaction_date), 'dd/MM/yy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">
                      {/* UPDATED category/source for on-screen table */}
                      {transaction.display_category_or_source}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-dark-text-secondary truncate max-w-xs">{transaction.description || 'N/A'}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}{transaction.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-dark-text-secondary py-10">No transactions recorded for this month yet.</p>
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
  <div className="content-card flex items-center space-x-4 p-4">
    <div className={`p-3 rounded-full bg-opacity-10 dark:bg-opacity-20 ${color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-')}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{title}</p>
      <p className={`text-2xl font-semibold ${color}`}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    </div>
  </div>
);

export default DashboardPage;