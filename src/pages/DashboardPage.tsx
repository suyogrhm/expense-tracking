import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ExpenseForm from '../components/Expenses/ExpenseForm';
import IncomeForm from '../components/Income/IncomeForm';
// Assuming ExpenseSplitDetail is correctly exported from your types file
import type { Expense, Income, Budget, Tag, PdfExportRow, ExpenseSplitDetail } from '../types';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, getYear, getMonth, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useToast } from '../hooks/useToast';
import {
  PlusCircle, Loader2, Download, TrendingUp, TrendingDown, PiggyBank,
  ChevronUp, ListChecks, Tag as TagIconLucide, Edit3, Trash2,
  CalendarDays, FileText, Users, StickyNote // Added Users and StickyNote
} from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { exportToPdf } from '../utils/exportUtils';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

const TIME_ZONE = 'Asia/Kolkata';
const MAX_RECENT_TRANSACTIONS = 15;

interface CombinedTransactionForDashboard extends Partial<Expense>, Partial<Income> {
  transaction_type: 'expense' | 'income';
  transaction_date: string;
  display_category_or_source: string;
  tags?: Tag[];
  id: string; // Ensure id is always present for keying and operations
  created_at?: string;
  amount: number;
  description?: string | null;
  category?: string;
  sub_category?: string | null;
  source?: string;
  expense_date?: string;
  income_date?: string;
  // Properties from Expense
  is_split?: boolean;
  split_note?: string | null;
  expense_split_details?: ExpenseSplitDetail[] | null;
}

const DashboardPage: React.FC = () => {
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Expense[]>([]);
  const [currentMonthIncome, setCurrentMonthIncome] = useState<Income[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CombinedTransactionForDashboard[]>([]);
  const [currentBudgets, setCurrentBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseFormVisible, setIsExpenseFormVisible] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CombinedTransactionForDashboard | null>(null);

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

      if (expensesRes.error) throw expensesRes.error;
      const fetchedExpenses = (expensesRes.data || []).map(exp => ({
        ...exp,
        tags: exp.tags || [],
        expense_split_details: exp.expense_split_details || []
      })) as Expense[];
      setCurrentMonthExpenses(fetchedExpenses);

      if (incomeRes.error) throw incomeRes.error;
      const fetchedIncome = (incomeRes.data || []).map(inc => ({ ...inc, tags: inc.tags || [] })) as Income[];
      setCurrentMonthIncome(fetchedIncome);

      const combinedForRecentDisplay: CombinedTransactionForDashboard[] = [
        ...fetchedExpenses.map(exp => ({
          ...exp,
          transaction_type: 'expense' as const,
          transaction_date: exp.expense_date,
          display_category_or_source: exp.sub_category ? `${exp.category} (${exp.sub_category})` : exp.category,
          // id is already part of exp
        })),
        ...fetchedIncome.map(inc => ({
          ...inc,
          transaction_type: 'income' as const,
          transaction_date: inc.income_date,
          display_category_or_source: inc.source,
          // id is already part of inc
        }))
      ];

      combinedForRecentDisplay.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      setRecentTransactions(combinedForRecentDisplay.slice(0, MAX_RECENT_TRANSACTIONS));

      if (budgetsRes.error) throw budgetsRes.error;
      setCurrentBudgets(budgetsRes.data as Budget[] || []);

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      showToast(`Failed to load dashboard data: ${error.message}`, "error");
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
    setIsExpenseFormVisible(false);
  };

  const handleOpenEditModal = (transaction: CombinedTransactionForDashboard) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
    setIsEditModalOpen(false);
  };

  const handleTransactionSaved = () => {
    fetchData();
    showToast("Transaction updated successfully!", "success");
    handleCloseEditModal();
  };

  const handleDeleteTransaction = async (transactionId: string, type: 'expense' | 'income') => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) {
      return;
    }
    try {
      if (type === 'expense') {
        await supabase.from('expense_tags').delete().eq('expense_id', transactionId);
        await supabase.from('expense_split_details').delete().eq('expense_id', transactionId);
        const { error } = await supabase.from('expenses').delete().eq('id', transactionId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        await supabase.from('income_tags').delete().eq('income_id', transactionId);
        const { error } = await supabase.from('incomes').delete().eq('id', transactionId).eq('user_id', user.id);
        if (error) throw error;
      }
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`, "success");
      fetchData();
    } catch (error: any) {
      console.error(`Error deleting ${type}:`, error);
      showToast(`Failed to delete ${type}. ${error.message}`, "error");
    }
  };

  const totalExpenses = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncome = currentMonthIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const netFlow = totalIncome - totalExpenses;

  const overallBudget = currentBudgets.find(b => b.category === null);
  const spentAgainstOverall = totalExpenses;

  const handleExportCurrentMonthTransactionsPdf = () => {
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
    allMonthTransactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    if (allMonthTransactions.length === 0) {
      showToast("No transactions for the current month to export.", "info");
      return;
    }

    const dataToExport: PdfExportRow[] = allMonthTransactions.map(t => {
      const formattedDate = format(parseISO(t.transaction_date), 'dd/MM/yy HH:mm');
      const tagsString = t.tags && t.tags.length > 0 ? t.tags.map(tag => tag.name).join(', ') : 'N/A';
      const amount = t.amount || 0;
      const amountString = `${t.transaction_type === 'income' ? '+' : '-'}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      let row: PdfExportRow = {
        'Type': t.transaction_type === 'income' ? 'Income' : 'Expense',
        'Date': formattedDate,
        'Category/Source': t.display_category_or_source,
        'Description': t.description || 'N/A',
        'Amount': amountString,
        'Tags': tagsString,
      };

      if (t.transaction_type === 'expense') {
        if (t.split_note) {
          row['Split Note'] = t.split_note;
        }
        if (t.expense_split_details && t.expense_split_details.length > 0) {
          const splitDetailsString = t.expense_split_details.map(sd =>
            `${sd.person_name || 'Portion'}: ${Number(sd.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ).join('; ');
          row['Split Between'] = splitDetailsString;
        }
      }
      return row;
    });

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
      {/* Add New Expense Form Section */}
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

      {/* Summary Cards */}
      <div id="summary-cards-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Income" amount={totalIncome} icon={<TrendingUp className="text-green-500" />} color="text-green-600 dark:text-green-400" />
        <SummaryCard title="Total Expenses" amount={totalExpenses} icon={<TrendingDown className="text-red-500" />} color="text-red-600 dark:text-red-400" />
        <SummaryCard title="Net Flow" amount={netFlow} icon={<PiggyBank className={netFlow >= 0 ? "text-blue-500 dark:text-blue-400" : "text-orange-500 dark:text-orange-400"} />} color={netFlow >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"} />
      </div>

      {/* Budget Section */}
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
          <>
            {/* Desktop Table View (remains unchanged) */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-dark-card rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category/Source</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount (₹)</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
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
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                          {transaction.transaction_type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">
                        {format(parseISO(transaction.transaction_date), 'dd/MM/yy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">{transaction.display_category_or_source}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-dark-text-secondary truncate max-w-xs">{transaction.description || 'N/A'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <Button variant="icon" size="sm" onClick={() => handleOpenEditModal(transaction)} className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 mr-2">
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="icon" size="sm" onClick={() => handleDeleteTransaction(transaction.id!, transaction.transaction_type)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200">
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View - UPDATED SECTION */}
            <div className="md:hidden space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={`${transaction.transaction_type}-${transaction.id}-mobile-dashboard`}
                  className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-4"
                >
                  {/* Top Section: Category/Source (Left) and Amount (Right) */}
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-primary-600 dark:text-primary-400 truncate pr-2">
                      {transaction.display_category_or_source}
                    </h3>
                    <span className={`text-lg font-bold whitespace-nowrap ${transaction.transaction_type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                      {transaction.transaction_type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Middle Section: Details with Icons */}
                  <div className="space-y-1.5 mb-3 text-sm">
                    {/* Date */}
                    <div className="flex items-center text-gray-600 dark:text-dark-text-secondary">
                      <CalendarDays size={15} className="mr-2 flex-shrink-0 opacity-80" />
                      <span>
                        {format(parseISO(transaction.transaction_date), 'dd MMM yy, hh:mm a')}
                      </span>
                    </div>

                    {/* Description */}
                    {transaction.description && (
                      <div className="flex items-start text-gray-600 dark:text-dark-text-secondary">
                        <FileText size={15} className="mr-2 flex-shrink-0 opacity-80 mt-[3px]" />
                        <span className="break-words">{transaction.description}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div className="flex items-start text-gray-600 dark:text-dark-text-secondary">
                        <TagIconLucide size={15} className="mr-2 flex-shrink-0 opacity-80 mt-[3px]" />
                        <span className="break-words">
                          {transaction.tags.map(tag => tag.name).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Overall Split Note - Only for expenses and if split_note exists */}
                    {transaction.transaction_type === 'expense' && transaction.split_note && (
                      <div className="flex items-start text-gray-600 dark:text-dark-text-secondary pt-1.5">
                        <StickyNote size={15} className="mr-2 flex-shrink-0 opacity-80 mt-[3px]" />
                        <div className="w-full">
                          <span className="font-medium text-gray-700 dark:text-dark-text">Split Note:</span>
                          <p className="text-xs text-gray-600 dark:text-dark-text-secondary italic break-words mt-0.5">
                            {transaction.split_note}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Split Details Section - Only for expenses and if split details exist */}
                    {transaction.transaction_type === 'expense' && transaction.expense_split_details && transaction.expense_split_details.length > 0 && (
                      <div className={`pt-2 ${transaction.split_note ? 'mt-1.5' : 'mt-2'} border-t border-gray-200 dark:border-gray-700/60`}>
                        <div className="flex items-start text-sm mt-1.5">
                          <Users size={16} className="mr-2 flex-shrink-0 text-gray-500 dark:text-gray-400 mt-0.5" />
                          <div className="w-full">
                            <h4 className="font-medium text-gray-700 dark:text-dark-text mb-1">Split Between:</h4>
                            <ul className="space-y-1 text-xs">
                              {transaction.expense_split_details.map((detail, index) => (
                                <li key={detail.id || `split-detail-${index}`} className="bg-gray-50 dark:bg-gray-700/40 p-1.5 rounded-md shadow-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-700 dark:text-dark-text-secondary font-medium break-all pr-1">
                                      {detail.person_name || 'Unspecified Person'}
                                    </span>
                                    <span className="text-gray-800 dark:text-dark-text font-semibold whitespace-nowrap">
                                      ₹{Number(detail.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {/* Individual notes per split detail are not in ExpenseSplitDetail type, so removed */}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(transaction)}
                      className="text-primary-600 border-primary-300 hover:bg-primary-50 dark:text-primary-300 dark:border-primary-500 dark:hover:bg-gray-700 px-3 py-1.5"
                    >
                      <Edit3 size={14} className="mr-1.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTransaction(transaction.id!, transaction.transaction_type)}
                      className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-500 dark:hover:bg-gray-700 px-3 py-1.5"
                    >
                      <Trash2 size={14} className="mr-1.5" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* END OF UPDATED MOBILE VIEW SECTION */}
          </>
        ) : (
          <p className="text-center text-gray-500 dark:text-dark-text-secondary py-10">No transactions recorded for this month yet.</p>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && editingTransaction && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          title={`Edit ${editingTransaction.transaction_type.charAt(0).toUpperCase() + editingTransaction.transaction_type.slice(1)}`}
        >
          {editingTransaction.transaction_type === 'expense' ? (
            <ExpenseForm
              existingExpense={editingTransaction as Expense}
              onExpenseAdded={handleTransactionSaved}
              onFormCancel={handleCloseEditModal}
            />
          ) : (
            <IncomeForm
              existingIncome={editingTransaction as Income}
              onIncomeSaved={handleTransactionSaved}
              onFormCancel={handleCloseEditModal}
            />
          )}
        </Modal>
      )}
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