import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Expense, Category as PresetCategory, SubCategory as PresetSubCategory, UserDefinedCategory, UserDefinedSubCategory as UserDefinedSubCategoryType } from '../../types'; // Added UserDefinedSubCategoryType
 // Added UserDefinedSubCategoryType
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

const presetMainCategories: PresetCategory[] = [
  { id: 'bills', name: 'Bills' },
  { id: 'petrol', name: 'Petrol' },
  { id: 'food', name: 'Food' },
  { id: 'groceries', name: 'Groceries' },
  { id: 'online_shopping', name: 'Online Shopping' },
];

const presetSubCategories: Record<string, PresetSubCategory[]> = {
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

  const [amount, setAmount] = useState<string>('');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(''); 
  const [subCategoryName, setSubCategoryName] = useState<string>(''); 
  const [customCategoryInput, setCustomCategoryInput] = useState<string>(''); 
  const [expenseDate, setExpenseDate] = useState<string>(() => format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [userDefinedExpenseCategories, setUserDefinedExpenseCategories] = useState<UserDefinedCategory[]>([]);
  const [availableSubCategories, setAvailableSubCategories] = useState<{id: string, name: string}[]>([]);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  useEffect(() => {
    const fetchUserCategories = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_defined_categories')
        .select('*, user_defined_sub_categories!main_category_id_fk(*)')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .order('name', { ascending: true });

      if (error) {
        console.error("Error fetching user expense categories:", error);
        showToast("Could not load your custom categories.", "error");
      } else {
        setUserDefinedExpenseCategories((data || []).map(cat => ({
            ...cat,
            // Ensure user_defined_sub_categories is always an array
            user_defined_sub_categories: Array.isArray(cat.user_defined_sub_categories) 
                                          ? cat.user_defined_sub_categories 
                                          : [] 
        })));
      }
    };
    fetchUserCategories();
  }, [user, showToast]);

  const allCategoryOptions = useMemo(() => {
    const options = presetMainCategories.map(c => ({ value: c.name, label: c.name }));
    userDefinedExpenseCategories.forEach(udc => {
      if (!options.find(opt => opt.value === udc.name)) { 
        options.push({ value: udc.name, label: udc.name });
      }
    });
    options.push({ value: '---OTHER---', label: 'Other (Type a new one)' }); 
    return options.sort((a,b) => a.label.localeCompare(b.label));
  }, [userDefinedExpenseCategories]);

  useEffect(() => {
    if (existingExpense) {
      setAmount(existingExpense.amount.toString());
      setExpenseDate(formatInTimeZone(new Date(existingExpense.expense_date), timeZone, "yyyy-MM-dd'T'HH:mm"));
      
      const isPreset = presetMainCategories.some(pc => pc.name === existingExpense.category);
      const isUserDefined = userDefinedExpenseCategories.some(udc => udc.name === existingExpense.category);

      if (isPreset || isUserDefined) {
        setSelectedCategoryName(existingExpense.category);
        setIsCustomCategoryMode(false);
        setCustomCategoryInput('');
      } else { 
        setSelectedCategoryName('---OTHER---');
        setIsCustomCategoryMode(true);
        setCustomCategoryInput(existingExpense.category);
      }
      setSubCategoryName(existingExpense.sub_category || '');
      setDescription(existingExpense.description || '');
    } else {
      setAmount('');
      setSelectedCategoryName('');
      setSubCategoryName('');
      setCustomCategoryInput('');
      setIsCustomCategoryMode(false);
      setExpenseDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
      setDescription('');
    }
  }, [existingExpense, timeZone, userDefinedExpenseCategories]);

  useEffect(() => {
    if (!selectedCategoryName || selectedCategoryName === '---OTHER---') {
      setAvailableSubCategories([]);
      return;
    }

    const presetMatch = presetMainCategories.find(c => c.name === selectedCategoryName);
    if (presetMatch && presetSubCategories[presetMatch.id]) {
      setAvailableSubCategories(presetSubCategories[presetMatch.id]);
      return;
    }

    const userDefinedMatch = userDefinedExpenseCategories.find(udc => udc.name === selectedCategoryName);
    // Ensure user_defined_sub_categories is an array before mapping
    if (userDefinedMatch && Array.isArray(userDefinedMatch.user_defined_sub_categories)) {
      setAvailableSubCategories(userDefinedMatch.user_defined_sub_categories.map((sub: UserDefinedSubCategoryType) => ({id: sub.id, name: sub.name})));
      return;
    }
    
    setAvailableSubCategories([]); 
  }, [selectedCategoryName, userDefinedExpenseCategories]);


  const handleCategoryChange = (value: string) => {
    if (value === '---OTHER---') {
      setIsCustomCategoryMode(true);
      setSelectedCategoryName(value); 
      setCustomCategoryInput(''); 
    } else {
      setIsCustomCategoryMode(false);
      setSelectedCategoryName(value);
      setCustomCategoryInput(''); 
    }
    setSubCategoryName(''); 
  };
  
  const deselectCategory = () => {
    setSelectedCategoryName('');
    setSubCategoryName('');
    setCustomCategoryInput('');
    setIsCustomCategoryMode(false);
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
    
    let finalCategoryToSave = selectedCategoryName;
    if (isCustomCategoryMode) {
        if (!customCategoryInput.trim()) {
            showToast("Please enter your custom category name.", "error");
            return;
        }
        finalCategoryToSave = customCategoryInput.trim();
    } else if (!selectedCategoryName) {
        showToast("Please select a category or choose 'Other'.", "error");
        return;
    }

    setIsLoading(true);
    
    const localDate = parse(expenseDate, "yyyy-MM-dd'T'HH:mm", new Date());
    const utcDateString = localDate.toISOString(); 
    
    const expenseData: Omit<Expense, 'id' | 'created_at'> = { 
      user_id: user.id,
      amount: parseFloat(amount),
      category: finalCategoryToSave,
      sub_category: subCategoryName || null, 
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
            setSelectedCategoryName('');
            setSubCategoryName('');
            setCustomCategoryInput('');
            setIsCustomCategoryMode(false);
            setDescription('');
            setExpenseDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
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
      <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4 border-b border-color pb-2">
        {existingExpense ? 'Edit Expense' : 'Add New Expense'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          id="expenseDate"
          type="datetime-local"
          label="Date & Time"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          icon={<Calendar size={18} className="text-gray-400 dark:text-gray-500" />}
          required
        />
        <Input
          id="amount"
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          icon={<span className="text-gray-400 dark:text-gray-500 font-semibold">₹</span>}
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
          value={selectedCategoryName}
          onChange={(e) => handleCategoryChange(e.target.value)}
          options={allCategoryOptions}
          prompt="Select a category"
          icon={<Tag size={18} className="text-gray-400 dark:text-gray-500" />}
          required={!isCustomCategoryMode}
        />
        {selectedCategoryName && (
            <Button 
                type="button" 
                onClick={deselectCategory} 
                variant="ghost" 
                size="icon" 
                className="absolute top-7 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Deselect category"
            >
                <X size={16} />
            </Button>
        )}
      </div>

      {isCustomCategoryMode && (
        <Input
          id="customCategoryInput"
          type="text"
          label="New Category Name"
          value={customCategoryInput}
          onChange={(e) => setCustomCategoryInput(e.target.value)}
          placeholder="Type your new category name"
          required
        />
      )}
      
      {selectedCategoryName && selectedCategoryName !== '---OTHER---' && availableSubCategories.length > 0 && (
        <SelectUI
          id="subCategory"
          label="Sub-category (Optional)"
          value={subCategoryName}
          onChange={(e) => setSubCategoryName(e.target.value)}
          options={availableSubCategories.map(sc => ({ value: sc.name, label: sc.name }))}
          prompt="Select a sub-category"
          icon={<ChevronDown size={18} className="text-gray-400 dark:text-gray-500 opacity-50" />}
        />
      )}
      { (selectedCategoryName === 'Groceries' || (isCustomCategoryMode && customCategoryInput)) && (
         <Input
            id="subCategoryCustomInput"
            type="text"
            label="Sub-category / Item Detail (Optional)"
            value={subCategoryName} 
            onChange={(e) => setSubCategoryName(e.target.value)}
            placeholder="e.g., DMart, Milk & Bread, Specific item"
        />
      )}


      <Input
        id="description"
        type="text"
        label="Notes / Description (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={isCustomCategoryMode ? "Additional notes for your custom category" : "e.g., Lunch with colleagues, specific bill details"}
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