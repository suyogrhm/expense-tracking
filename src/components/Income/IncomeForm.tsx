import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Income, UserDefinedCategory } from '../../types'; 
import { format, parse } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectUI from '../ui/Select'; 
import { useToast } from '../../hooks/useToast';
import { Calendar, Briefcase, X } from 'lucide-react';

interface IncomeFormProps {
  existingIncome: Income | null;
  onIncomeSaved: (income: Income) => void;
  onFormCancel?: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ existingIncome, onIncomeSaved, onFormCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const [selectedSourceName, setSelectedSourceName] = useState<string>('');
  const [customSourceInput, setCustomSourceInput] = useState<string>('');
  const [isCustomSourceMode, setIsCustomSourceMode] = useState(false);
  const [amount, setAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(() => format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userDefinedIncomeCategories, setUserDefinedIncomeCategories] = useState<UserDefinedCategory[]>([]);

  useEffect(() => {
    const fetchUserIncomeCategories = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_defined_categories')
        .select('*') 
        .eq('user_id', user.id)
        .eq('type', 'income')
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching user income categories:", error);
        showToast("Could not load your custom income sources.", "error");
      } else {
        setUserDefinedIncomeCategories(data || []);
      }
    };
    fetchUserIncomeCategories();
  }, [user, showToast]);
  
  const allIncomeSourceOptions = useMemo(() => {
    const options = userDefinedIncomeCategories.map(udc => ({ value: udc.name, label: udc.name }));
    const presets = [
        { value: 'Rent', label: 'Rent' },
        { value: 'Salary', label: 'Salary' },
        { value: 'Freelance', label: 'Freelance' },
        { value: 'Investment', label: 'Investment' },
        { value: 'Gift', label: 'Gift' },
    ];
    presets.forEach(p => {
        if (!options.find(opt => opt.value === p.value)) options.push(p);
    });
    options.push({ value: '---OTHER---', label: 'Other (Type a new source)' });
    return options.sort((a,b) => a.label.localeCompare(b.label));
  }, [userDefinedIncomeCategories]);


  useEffect(() => {
    if (existingIncome) {
      const isUserDefined = userDefinedIncomeCategories.some(udc => udc.name === existingIncome.source);
      const isPreset = allIncomeSourceOptions.some(opt => opt.value === existingIncome.source && opt.value !== '---OTHER---');

      if (isUserDefined || isPreset) {
        setSelectedSourceName(existingIncome.source);
        setIsCustomSourceMode(false);
        setCustomSourceInput('');
      } else {
        setSelectedSourceName('---OTHER---');
        setIsCustomSourceMode(true);
        setCustomSourceInput(existingIncome.source);
      }
      setAmount(existingIncome.amount.toString());
      setIncomeDate(formatInTimeZone(new Date(existingIncome.income_date), timeZone, "yyyy-MM-dd'T'HH:mm"));
      setDescription(existingIncome.description || '');
    } else {
      setSelectedSourceName('');
      setCustomSourceInput('');
      setIsCustomSourceMode(false);
      setAmount('');
      setIncomeDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
      setDescription('');
    }
  }, [existingIncome, timeZone, userDefinedIncomeCategories, allIncomeSourceOptions]);


  const handleSourceChange = (value: string) => {
    if (value === '---OTHER---') {
      setIsCustomSourceMode(true);
      setSelectedSourceName(value);
      setCustomSourceInput('');
    } else {
      setIsCustomSourceMode(false);
      setSelectedSourceName(value);
      setCustomSourceInput('');
    }
  };

  const deselectSource = () => {
    setSelectedSourceName('');
    setCustomSourceInput('');
    setIsCustomSourceMode(false);
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let finalSourceName = selectedSourceName;
    if (isCustomSourceMode) {
        if (!customSourceInput.trim()) {
            showToast("Please enter your custom income source name.", "error");
            return;
        }
        finalSourceName = customSourceInput.trim();
    } else if (!selectedSourceName) {
        showToast("Please select or enter an income source.", "error");
        return;
    }

    if (!user || !amount || !incomeDate) {
      showToast("Please fill source, amount, and date.", "error");
      return;
    }
    setIsLoading(true);

    const localDate = parse(incomeDate, "yyyy-MM-dd'T'HH:mm", new Date());
    const utcDateString = localDate.toISOString();

    const incomeData = {
      user_id: user.id,
      source: finalSourceName,
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
        if (!existingIncome) { 
            setSelectedSourceName('');
            setCustomSourceInput('');
            setIsCustomSourceMode(false);
            setAmount('');
            setIncomeDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
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
      <div className="relative">
        <SelectUI
          id="incomeSourceSelect"
          label="Income Source"
          value={selectedSourceName}
          onChange={(e) => handleSourceChange(e.target.value)}
          options={allIncomeSourceOptions}
          prompt="Select or type source"
          icon={<Briefcase size={18} className="text-gray-400 dark:text-gray-500" />}
          required={!isCustomSourceMode}
        />
        {selectedSourceName && (
             <Button 
                type="button" 
                onClick={deselectSource} 
                variant="ghost" 
                size="icon" 
                className="absolute top-7 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Deselect source"
            >
                <X size={16} />
            </Button>
        )}
      </div>
       {isCustomSourceMode && (
        <Input
          id="customIncomeSource"
          type="text"
          label="New Income Source Name"
          value={customSourceInput}
          onChange={(e) => setCustomSourceInput(e.target.value)}
          placeholder="Type your new income source"
          required
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          id="incomeAmount"
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          icon={<span className="text-gray-400 dark:text-gray-500 font-semibold">₹</span>}
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
          icon={<Calendar size={18} className="text-gray-400 dark:text-gray-500" />}
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