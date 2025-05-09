// src/components/Budgets/BudgetForm.tsx 
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Budget } from '../../types';
import { format, getYear } from 'date-fns';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectUI from '../ui/Select';
import { useToast } from '../../hooks/useToast';
import { Tag, Calendar } from 'lucide-react';

const mainCategoriesForBudget = [
  // Removed the duplicate "Overall Budget" entry from here
  { value: 'Bills', label: 'Bills' },
  { value: 'Petrol', label: 'Petrol' },
  { value: 'Food', label: 'Food' },
  { value: 'Groceries', label: 'Groceries' },
  { value: 'Online Shopping', label: 'Online Shopping' },
  // Add other predefined categories you want to allow budgeting for
  // Or allow custom category input if desired (more complex)
];


interface BudgetFormProps {
  existingBudget: Budget | null;
  onBudgetSaved: (budget: Budget) => void;
  onFormCancel?: () => void;
  currentYear: number; 
  currentMonth: number; 
}

const BudgetForm: React.FC<BudgetFormProps> = ({ existingBudget, onBudgetSaved, onFormCancel, currentYear, currentMonth }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null); 
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(currentMonth);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingBudget) {
      setAmount(existingBudget.amount.toString());
      setCategory(existingBudget.category || null); 
      setYear(existingBudget.year);
      setMonth(existingBudget.month);
      setDescription(existingBudget.description || '');
    } else {
      setYear(currentYear);
      setMonth(currentMonth);
      setAmount('');
      setCategory(null); // Default to overall budget
      setDescription('');
    }
  }, [existingBudget, currentYear, currentMonth]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !amount || !year || !month) {
      showToast("Please fill amount, year, and month.", "error");
      return;
    }
    setIsLoading(true);

    const budgetData = {
      user_id: user.id,
      amount: parseFloat(amount),
      category: category || null, 
      year: parseInt(year.toString(), 10),
      month: parseInt(month.toString(), 10),
      description: description.trim() || null,
    };

    try {
      let data: Budget | null = null;
      let error;

      if (existingBudget && existingBudget.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', existingBudget.id)
          .select()
          .single();
        data = updateData;
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('budgets')
          .insert(budgetData)
          .select()
          .single();
        data = insertData;
        error = insertError;
      }

      if (error) {
        if (error.code === '23505') { 
            showToast("A budget for this category/period already exists.", "error");
        } else {
            throw error;
        }
      } else if (data) {
        onBudgetSaved(data as Budget);
         if (!existingBudget) { 
            setAmount('');
            setCategory(null);
            setDescription('');
        }
      }
    } catch (err: any) {
      console.error("Error saving budget:", err);
      showToast(err.message || "Failed to save budget.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  const yearOptions = Array.from({length: 5}, (_, i) => getYear(new Date()) - 2 + i)
    .map(y => ({value: y.toString(), label: y.toString()})).sort((a,b) => parseInt(b.label) - parseInt(a.label));
  const monthOptions = Array.from({length: 12}, (_, i) => ({value: (i+1).toString(), label: format(new Date(2000, i, 1), 'MMMM')}));


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectUI
            id="budgetMonth"
            label="Month"
            value={month.toString()}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            options={monthOptions}
            icon={<Calendar size={18} className="text-gray-400 dark:text-gray-500" />}
            required
        />
        <SelectUI
            id="budgetYear"
            label="Year"
            value={year.toString()}
            onChange={(e) => setYear(parseInt(e.target.value))}
            options={yearOptions}
            icon={<Calendar size={18} className="text-gray-400 dark:text-gray-500" />}
            required
        />
      </div>
       <Input
        id="budgetAmount"
        type="number"
        label="Budget Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        icon={<span className="text-gray-400 dark:text-gray-500 font-semibold">₹</span>}
        placeholder="0.00"
        step="0.01"
        min="0.01"
        required
      />
      <SelectUI
        id="budgetCategory"
        label="Category (Optional)"
        value={category || ''} 
        onChange={(e) => setCategory(e.target.value || null)} 
        options={mainCategoriesForBudget} // Use the corrected list
        prompt="Overall Budget (All Categories)" // This acts as the default "Overall" option
        icon={<Tag size={18} className="text-gray-400 dark:text-gray-500" />}
      />
      <Input
        id="budgetDescription"
        type="text"
        label="Description (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g., Monthly savings goal, Vacation fund"
      />
      <div className="flex items-center justify-end space-x-3 pt-4">
        {onFormCancel && (
          <Button type="button" variant="outline" onClick={onFormCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading}>
          {isLoading ? (existingBudget ? 'Saving...' : 'Setting...') : (existingBudget ? 'Save Changes' : 'Set Budget')}
        </Button>
      </div>
    </form>
  );
};

export default BudgetForm;
