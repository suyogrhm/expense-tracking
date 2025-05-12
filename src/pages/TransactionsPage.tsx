import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import type { Expense, Income } from '../types';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { format } from 'date-fns';
import { Download, Loader2, Search as SearchIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category/Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tags</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((transaction, index) => (
                  <tr key={`${transaction.type}-${transaction.id}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.type === 'income' ? (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <ArrowUpCircle size={16} className="mr-1" /> Income
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 dark:text-red-400">
                          <ArrowDownCircle size={16} className="mr-1" /> Expense
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(transaction.type === 'expense' ? transaction.expense_date : transaction.income_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                      {transaction.type === 'expense' ? transaction.category : transaction.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        ₹{transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {transaction.tags && transaction.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {transaction.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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