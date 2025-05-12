import { useState, useCallback } from 'react';
import { parseCSVFile, parseCSVRow, type CSVExpense } from '../utils/csvUtils';
import type { Expense } from '../types';
import { useSupabase } from '../contexts/SupabaseContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ProcessedExpense extends Partial<Expense> {
  user_id: string;
  created_at: string;
}

export const CSVImport = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<{
    total: number;
    imported: number;
    skipped: number;
  } | null>(null);
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const processExpenses = async (expenses: CSVExpense[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let imported = 0;
    let skipped = 0;
    const total = expenses.length;

    const processedExpenses: ProcessedExpense[] = [];

    for (const expense of expenses) {
      try {
        const parsed = parseCSVRow(expense);
        processedExpenses.push({
          ...parsed,
          user_id: user.id,
          created_at: new Date().toISOString(),
        } as ProcessedExpense);
        imported++;
      } catch (error) {
        skipped++;
        console.warn('Failed to parse expense:', error);
      }
    }

    if (processedExpenses.length === 0) {
      throw new Error('No valid expenses to import');
    }

    const { error } = await supabase
      .from('expenses')
      .insert(processedExpenses);

    if (error) throw error;

    return { total, imported, skipped };
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setSuccess(null);
    setImportStats(null);
    setIsProcessing(true);

    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      setIsProcessing(false);
      return;
    }

    try {
      const expenses = await parseCSVFile(file);
      const stats = await processExpenses(expenses);
      setImportStats(stats);
      setSuccess(`Successfully imported ${stats.imported} expenses. Redirecting to history page...`);
      
      // Wait a moment before redirecting to show the success message
      setTimeout(() => {
        navigate('/history');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setIsProcessing(false);
    }
  }, [supabase, navigate]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setImportStats(null);
    setIsProcessing(true);

    try {
      const expenses = await parseCSVFile(file);
      const stats = await processExpenses(expenses);
      setImportStats(stats);
      setSuccess(`Successfully imported ${stats.imported} expenses. Redirecting to history page...`);
      
      // Wait a moment before redirecting to show the success message
      setTimeout(() => {
        navigate('/history');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV');
    } finally {
      setIsProcessing(false);
    }
  }, [supabase, navigate]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Import Expenses from CSV</h3>
          <p className="text-gray-600">
            Drag and drop your CSV file here, or click to select a file
          </p>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csvInput"
        />
        <label
          htmlFor="csvInput"
          className="inline-block px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
        >
          Select CSV File
        </label>

        {isProcessing && (
          <div className="mt-4 text-blue-600">Processing your file...</div>
        )}

        {error && (
          <div className="mt-4 text-red-600">{error}</div>
        )}

        {success && (
          <div className="mt-4 text-green-600">{success}</div>
        )}

        {importStats && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-semibold mb-2">Import Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Rows</p>
                <p className="font-medium">{importStats.total}</p>
              </div>
              <div>
                <p className="text-green-600">Imported</p>
                <p className="font-medium">{importStats.imported}</p>
              </div>
              <div>
                <p className="text-red-600">Skipped</p>
                <p className="font-medium">{importStats.skipped}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500">
          <p className="font-semibold mb-2">Required CSV Format:</p>
          <p>Headers: expense_date, amount, category</p>
          <p>Optional: sub_category, description, tags, is_split, split_note</p>
          <p className="mt-2">Supported Date Formats:</p>
          <code className="block bg-gray-100 p-2 rounded mt-1 text-left">
            YYYY-MM-DD (e.g., 2024-03-20)<br />
            DD/MM/YYYY (e.g., 20/03/2024)<br />
            MM/DD/YYYY (e.g., 03/20/2024)
          </code>
          <p className="mt-2">Example:</p>
          <code className="block bg-gray-100 p-2 rounded mt-1 text-left">
            expense_date,amount,category,description<br />
            {format(new Date(), 'yyyy-MM-dd')},50.00,Groceries,Weekly shopping
          </code>
        </div>
      </div>
    </div>
  );
}; 