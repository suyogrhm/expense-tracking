import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Income } from '../../types';
import { format, parse } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { Calendar, IndianRupee, Briefcase } from 'lucide-react';

interface IncomeFormProps {
  existingIncome: Income | null;
  onIncomeSaved: (income: Income) => void;
  onFormCancel?: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ existingIncome, onIncomeSaved, onFormCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const getInitialDateTime = () => {
    const nowInIST = toZonedTime(new Date(), timeZone);
    return format(nowInIST, "yyyy-MM-dd'T'HH:mm");
  };

  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(getInitialDateTime());
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingIncome) {
      setSource(existingIncome.source);
      setAmount(existingIncome.amount.toString());
      setIncomeDate(formatInTimeZone(new Date(existingIncome.income_date), timeZone, "yyyy-MM-dd'T'HH:mm"));
      setDescription(existingIncome.description || '');
    } else {
      // Reset for new form
      setSource('');
      setAmount('');
      setIncomeDate(getInitialDateTime());
      setDescription('');
    }
  }, [existingIncome, timeZone]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !source.trim() || !amount || !incomeDate) {
      showToast("Please fill source, amount, and date.", "error");
      return;
    }
    setIsLoading(true);

    const localDate = parse(incomeDate, "yyyy-MM-dd'T'HH:mm", new Date());
    const utcDateString = localDate.toISOString();

    const incomeData = {
      user_id: user.id,
      source: source.trim(),
      amount: parseFloat(amount),
      income_date: utcDateString,
      description: description.trim() || null,
    };

    try {
      let data: Income | null = null;
      let error;

      if (existingIncome && existingIncome.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('incomes')
          .update(incomeData)
          .eq('id', existingIncome.id)
          .select()
          .single();
        data = updateData;
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('incomes')
          .insert(incomeData)
          .select()
          .single();
        data = insertData;
        error = insertError;
      }

      if (error) throw error;

      if (data) {
        onIncomeSaved(data as Income);
        if (!existingIncome) { // Reset only if it was a new entry
            setSource('');
            setAmount('');
            setIncomeDate(getInitialDateTime());
            setDescription('');
        }
      }
    } catch (err: any) {
      console.error("Error saving income:", err);
      showToast(err.message || "Failed to save income.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        id="incomeSource"
        type="text"
        label="Income Source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
        icon={<Briefcase size={18} className="text-gray-400" />}
        placeholder="e.g., Salary, Freelance Project"
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          id="incomeAmount"
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          icon={<span className="text-gray-400 font-semibold">₹</span>}
          placeholder="0.00"
          step="0.01"
          min="0.01"
          required
        />
        <Input
          id="incomeDate"
          type="datetime-local"
          label="Date & Time Received"
          value={incomeDate}
          onChange={(e) => setIncomeDate(e.target.value)}
          icon={<Calendar size={18} className="text-gray-400" />}
          required
        />
      </div>
      <Input
        id="incomeDescription"
        type="text"
        label="Description (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="e.g., Monthly salary, Payment for X project"
      />
      <div className="flex items-center justify-end space-x-3 pt-4">
        {onFormCancel && (
          <Button type="button" variant="outline" onClick={onFormCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading}>
          {isLoading ? (existingIncome ? 'Saving...' : 'Adding...') : (existingIncome ? 'Save Changes' : 'Add Income')}
        </Button>
      </div>
    </form>
  );
};

export default IncomeForm;