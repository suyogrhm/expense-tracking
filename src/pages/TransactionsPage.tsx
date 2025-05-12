import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Expense, Income } from '../types';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { format } from 'date-fns';
import { Download, Loader2, Search as SearchIcon } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { exportToPdf } from '../utils/exportUtils';

interface Transaction extends Expense {
  type: 'expense';
}

interface IncomeTransaction extends Income {
  type: 'income';
}

type CombinedTransaction = Transaction | IncomeTransaction;

const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<CombinedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CombinedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const [searchTerm, setSearchTerm] = useState<string>('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*, tags(id, name), expense_split_details(*)')
        .eq('user_id', user.id);

      if (expenseError) throw expenseError;

      // Fetch incomes
      const { data: incomeData, error: incomeError } = await supabase
        .from('incomes')
        .select('*, tags(id, name)')
        .eq('user_id', user.id);

      if (incomeError) throw incomeError;

      // Combine and format the data
      const formattedExpenses: Transaction[] = (expenseData || []).map(exp => ({
        ...exp,
        type: 'expense',
        tags: exp.tags || [],
        expense_split_details: exp.expense_split_details || []
      }));

      const formattedIncomes: IncomeTransaction[] = (incomeData || []).map(inc => ({
        ...inc,
        type: 'income',
        tags: inc.tags || []
      }));

      // Combine and sort by date
      const combined = [...formattedExpenses, ...formattedIncomes].sort((a, b) => {
        const dateA = new Date(a.type === 'expense' ? a.expense_date : a.income_date);
        const dateB = new Date(b.type === 'expense' ? b.expense_date : b.income_date);
        return dateB.getTime() - dateA.getTime();
      });

      setTransactions(combined);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      showToast("Failed to load transactions.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    let filtered = transactions;
    if (debouncedSearchTerm.trim() !== '') {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
      filtered = transactions.filter(trans => {
        if (trans.type === 'expense') {
          return (
            trans.category.toLowerCase().includes(lowerSearchTerm) ||
            (trans.sub_category && trans.sub_category.toLowerCase().includes(lowerSearchTerm)) ||
            (trans.description && trans.description.toLowerCase().includes(lowerSearchTerm)) ||
            trans.amount.toString().includes(lowerSearchTerm) ||
            (trans.tags && trans.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)))
          );
        } else {
          return (
            trans.source.toLowerCase().includes(lowerSearchTerm) ||
            (trans.description && trans.description.toLowerCase().includes(lowerSearchTerm)) ||
            trans.amount.toString().includes(lowerSearchTerm) ||
            (trans.tags && trans.tags.some(tag => tag.name.toLowerCase().includes(lowerSearchTerm)))
          );
        }
      });
    }
    setFilteredTransactions(filtered);
  }, [transactions, debouncedSearchTerm]);

  const totalIncome = filteredTransactions
    .filter((t): t is IncomeTransaction => t.type === 'income')
    .reduce((sum, inc) => sum + inc.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t): t is Transaction => t.type === 'expense')
    .reduce((sum, exp) => sum + exp.amount, 0);

  const handleExportPdf = () => {
    if (filteredTransactions.length === 0) {
      showToast("No transactions to export.", "info");
      return;
    }
    const fileName = `Transactions_Report_${format(new Date(), 'yyyyMMdd')}.pdf`;
    const title = `Transactions Report as of ${format(new Date(), 'dd MMM yyyy')}`;

    exportToPdf(filteredTransactions, fileName, title, timeZone);
    showToast("PDF export started.", "success");
  };

  return (
    <div className="space-y-8">
      <div className="content-card">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text mb-4">Transactions History</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-2">Total Income</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-2">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-dark-text mb-2">Net Balance</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₹{(totalIncome - totalExpenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <Input
            id="transactionSearch"
            type="search"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<SearchIcon size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
            containerClassName="w-full sm:w-64"
          />
          {filteredTransactions.length > 0 && (
            <Button onClick={handleExportPdf} variant="outline" size="sm">
              <Download size={16} className="mr-2" /> Export PDF
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" />
            <p className="ml-3 text-gray-500 dark:text-dark-text-secondary">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto bg-white dark:bg-dark-card rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-emerald-500 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider">Category/Source</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wider">Amount (₹)</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider">Tags</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTransactions.map((transaction, index) => (
                    <tr key={`${transaction.type}-${transaction.id}-${index}`} 
                        className={`${index % 2 === 0 ? 'bg-white dark:bg-dark-card' : 'bg-gray-50 dark:bg-dark-card'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.type === 'income' ? 'Income' : 'Expense'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text">
                        {format(new Date(transaction.type === 'expense' ? transaction.expense_date : transaction.income_date), 'dd MMM yy, hh:mm a')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text">
                        {transaction.type === 'expense' ? transaction.category : transaction.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-dark-text">
                        {transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text">
                        {transaction.description || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-dark-text">
                        {transaction.tags && transaction.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {transaction.tags.map(tag => (
                              <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredTransactions.map((transaction, index) => (
                <div key={`${transaction.type}-${transaction.id}-${index}`} 
                     className="bg-white dark:bg-dark-card rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'income' 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                    <span className={`text-lg font-semibold ${
                      transaction.type === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-dark-text-secondary">Date:</span>
                      <span className="text-gray-700 dark:text-dark-text">
                        {format(new Date(transaction.type === 'expense' ? transaction.expense_date : transaction.income_date), 'dd MMM yy, hh:mm a')}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-dark-text-secondary">
                        {transaction.type === 'income' ? 'Source:' : 'Category:'}
                      </span>
                      <span className="text-gray-700 dark:text-dark-text">
                        {transaction.type === 'expense' ? transaction.category : transaction.source}
                      </span>
                    </div>
                    
                    {transaction.description && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-dark-text-secondary">Description:</span>
                        <p className="text-gray-700 dark:text-dark-text mt-1">{transaction.description}</p>
                      </div>
                    )}
                    
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-dark-text-secondary block mb-1">Tags:</span>
                        <div className="flex flex-wrap gap-1">
                          {transaction.tags.map(tag => (
                            <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-dark-text-secondary py-10">
            <p>No transactions found {debouncedSearchTerm ? `matching "${debouncedSearchTerm}"` : ''}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage; 