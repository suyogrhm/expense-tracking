import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Expense, Category, SubCategory } from '../../types';
import { format, parse } from 'date-fns'; 
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'; 
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectUI from '../ui/Select'; 
import { useToast } from '../../hooks/useToast';
import { Calendar, Tag, ChevronDown, X } from 'lucide-react'; 

interface ExpenseFormProps {
  onExpenseAdded: (expense: Expense) => void;
  existingExpense: Expense | null; 
  onFormCancel?: () => void; 
}

const mainCategories: Category[] = [
  { id: 'bills', name: 'Bills' },
  { id: 'petrol', name: 'Petrol' },
  { id: 'food', name: 'Food' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'online_shopping', name: 'Online Shopping' },
  { id: 'other', name: 'Other (Custom)' },
];

const subCategories: Record<string, SubCategory[]> = {
  bills: [
    { id: 'electricity', name: 'Electricity' },
    { id: 'water', name: 'Water' },
    { id: 'act_internet', name: 'ACT Internet' },
    { id: 'airtel', name: 'Airtel' },
    { id: 'other_bill', name: 'Other Bill'},
  ],
  petrol: [
    { id: 'splendor', name: 'Splendor' },
    { id: 'dominar', name: 'Dominar' },
    { id: 'santro', name: 'Santro' },
    { id: 'other_vehicle', name: 'Other Vehicle'},
  ],
  food: [
    { id: 'swiggy', name: 'Swiggy' },
    { id: 'zomato', name: 'Zomato' },
    { id: 'restaurant', name: 'Restaurant'},
    { id: 'street_food', name: 'Street Food'},
    { id: 'other_food', name: 'Other Food'},
  ],
  online_shopping: [
    { id: 'amazon', name: 'Amazon' },
    { id: 'flipkart', name: 'Flipkart' },
    { id: 'myntra', name: 'Myntra'},
    { id: 'other_online', name: 'Other Online Store'},
  ],
  groceries: [ 
    { id: 'store_purchase', name: 'Store Purchase'},
    { id: 'online_groceries', name: 'Online Groceries'},
  ],
};

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpenseAdded, existingExpense, onFormCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const getInitialDateTime = () => {
    const nowInIST = toZonedTime(new Date(), timeZone);
    return format(nowInIST, "yyyy-MM-dd'T'HH:mm");
  };

  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [subCategoryState, setSubCategoryState] = useState<string>(''); 
  const [customCategory, setCustomCategory] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(getInitialDateTime());
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableSubCategories, setAvailableSubCategories] = useState<SubCategory[]>([]);
  
  useEffect(() => {
    if (existingExpense) {
      setAmount(existingExpense.amount.toString());
      setExpenseDate(formatInTimeZone(new Date(existingExpense.expense_date), timeZone, "yyyy-MM-dd'T'HH:mm"));
      
      const mainCatMatch = mainCategories.find(mc => mc.name === existingExpense.category);
      if (mainCatMatch && mainCatMatch.id !== 'other') {
        setCategory(mainCatMatch.name);
        setCustomCategory('');
        const subs = subCategories[mainCatMatch.id] || [];
        setAvailableSubCategories(subs);
        const subCatMatch = subs.find(sc => sc.name === existingExpense.sub_category);
        setSubCategoryState(subCatMatch ? subCatMatch.name : (existingExpense.sub_category || ''));
      } else {
        setCategory('Other (Custom)');
        setCustomCategory(existingExpense.category); 
        setAvailableSubCategories([]);
        setSubCategoryState(existingExpense.sub_category || ''); 
      }
      setDescription(existingExpense.description || '');
    } else {
      setAmount('');
      setCategory('');
      setSubCategoryState('');
      setCustomCategory('');
      setExpenseDate(getInitialDateTime());
      setDescription('');
      setAvailableSubCategories([]);
    }
  }, [existingExpense, timeZone]);

  useEffect(() => {
    const selectedMainCategory = mainCategories.find(c => c.name === category);
    if (selectedMainCategory && selectedMainCategory.id !== 'other') {
      setAvailableSubCategories(subCategories[selectedMainCategory.id] || []);
      setCustomCategory(''); 
    } else if (selectedMainCategory && selectedMainCategory.id === 'other') {
      setAvailableSubCategories([]); 
    } else { 
      setAvailableSubCategories([]);
    }
  }, [category]);


  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setSubCategoryState(''); 
  };
  
  const deselectCategory = () => {
    setCategory('');
    setSubCategoryState('');
    setCustomCategory('');
    setAvailableSubCategories([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
        showToast("User not authenticated.", "error");
        return;
    }
    if (!amount || !expenseDate) {
      showToast("Please fill amount and date.", "error");
      return;
    }
    if (category !== 'Other (Custom)' && !category) {
         showToast("Please select a category.", "error");
         return;
    }
    if (category === 'Other (Custom)' && !customCategory.trim()) {
      showToast("Please enter your custom category name.", "error");
      return;
    }

    setIsLoading(true);

    const finalCategoryName = category === 'Other (Custom)' ? customCategory.trim() : category;
    
    const localDate = parse(expenseDate, "yyyy-MM-dd'T'HH:mm", new Date());
    const utcDateString = localDate.toISOString(); 
    
    const expenseData: Omit<Expense, 'id' | 'created_at'> = { 
      user_id: user.id,
      amount: parseFloat(amount),
      category: finalCategoryName,
      sub_category: subCategoryState || null, 
      description: description.trim() || null,
      expense_date: utcDateString, 
    };

    try {
      let data: Expense | null = null; 
      let error;
      if (existingExpense && existingExpense.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', existingExpense.id)
          .select()
          .single();
          data = updateData;
          error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('expenses')
          .insert(expenseData)
          .select()
          .single();
          data = insertData;
          error = insertError;
      }

      if (error) throw error;

      if (data) {
        onExpenseAdded(data as Expense); 
        if (!existingExpense) { 
            setAmount('');
            setCategory('');
            setSubCategoryState('');
            setCustomCategory('');
            setDescription('');
            setExpenseDate(getInitialDateTime());
        }
      }
    } catch (error: any) {
      console.error("Error saving expense:", error);
      showToast(error.message || "Failed to save expense.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
      <h3 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">
        {existingExpense ? 'Edit Expense' : 'Add New Expense'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          id="expenseDate"
          type="datetime-local"
          label="Date & Time"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          icon={<Calendar size={18} className="text-gray-400" />}
          required
        />
        <Input
          id="amount"
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          icon={<span className="text-gray-400 font-semibold">₹</span>}
          placeholder="0.00"
          step="0.01"
          required
          min="0.01" 
        />
      </div>

      <div className="relative">
        <SelectUI
          id="category"
          label="Category"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          options={mainCategories.map(c => ({ value: c.name, label: c.name }))}
          prompt="Select a category or type custom below"
          icon={<Tag size={18} className="text-gray-400" />}
        />
        {category && (
            <Button 
                type="button" 
                onClick={deselectCategory} 
                variant="ghost" 
                size="icon" 
                className="absolute top-7 right-2 p-1 text-gray-400 hover:text-gray-600"
                aria-label="Deselect category"
            >
                <X size={16} />
            </Button>
        )}
      </div>

      {category === 'Other (Custom)' && (
        <Input
          id="customCategory"
          type="text"
          label="Custom Category Name"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
          placeholder="e.g., Movie Tickets, Gifts"
          required={category === 'Other (Custom)'} 
        />
      )}
      
      {category && category !== 'Other (Custom)' && availableSubCategories.length > 0 && (
        <SelectUI
          id="subCategory"
          label="Sub-category (Optional)"
          value={subCategoryState}
          onChange={(e) => setSubCategoryState(e.target.value)}
          options={availableSubCategories.map(sc => ({ value: sc.name, label: sc.name }))}
          prompt="Select a sub-category"
          icon={<ChevronDown size={18} className="text-gray-400 opacity-50" />}
        />
      )}
      {category === 'Groceries' && (
         <Input
            id="subCategoryGroceries"
            type="text"
            label="Store / Item Detail (Optional)"
            value={subCategoryState} 
            onChange={(e) => setSubCategoryState(e.target.value)}
            placeholder="e.g., DMart, BigBasket, Milk & Bread"
        />
      )}


      <Input
        id="description"
        type="text"
        label="Notes / Description (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={category === 'Other (Custom)' ? "Additional notes for your custom category" : "e.g., Lunch with colleagues, specific bill details"}
      />


      <div className="flex items-center justify-end space-x-3 pt-4">
        {onFormCancel && (
            <Button type="button" variant="outline" onClick={onFormCancel} disabled={isLoading}>
                Cancel
            </Button>
        )}
        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading}>
          {existingExpense ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;