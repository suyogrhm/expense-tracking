import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Expense, Category as PresetCategory, SubCategory as PresetSubCategory, UserDefinedCategory, UserDefinedSubCategory as UserDefinedSubCategoryType, Tag } from '../../types';
import { format, parse } from 'date-fns'; 
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'; 
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectUI from '../ui/Select'; 
import TagInput from '../ui/TagInput'; 
import { useToast } from '../../hooks/useToast';
import { Calendar, Tag as CategoryIconLucide, ChevronDown, X } from 'lucide-react'; 

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
  bills: [ { id: 'electricity', name: 'Electricity' }, { id: 'water', name: 'Water' }, { id: 'act_internet', name: 'ACT Internet' }, { id: 'airtel', name: 'Airtel' }, { id: 'other_bill', name: 'Other Bill'},],
  petrol: [ { id: 'splendor', name: 'Splendor' }, { id: 'dominar', name: 'Dominar' }, { id: 'santro', name: 'Santro' }, { id: 'other_vehicle', name: 'Other Vehicle'},],
  food: [ { id: 'swiggy', name: 'Swiggy' }, { id: 'zomato', name: 'Zomato' }, { id: 'restaurant', name: 'Restaurant'}, { id: 'street_food', name: 'Street Food'}, { id: 'other_food', name: 'Other Food'},],
  online_shopping: [ { id: 'amazon', name: 'Amazon' }, { id: 'flipkart', name: 'Flipkart' }, { id: 'myntra', name: 'Myntra'}, { id: 'other_online', name: 'Other Online Store'},],
  groceries: [ { id: 'store_purchase', name: 'Store Purchase'}, { id: 'online_groceries', name: 'Online Groceries'},],
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]); 
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
      setSelectedTags(existingExpense.tags?.map(tag => tag.name) || []); 
    } else {
      setAmount('');
      setSelectedCategoryName('');
      setSubCategoryName('');
      setCustomCategoryInput('');
      setIsCustomCategoryMode(false);
      setExpenseDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
      setDescription('');
      setSelectedTags([]); 
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
    if (!user) { showToast("User not authenticated.", "error"); return; }
    if (!amount || !expenseDate) { showToast("Please fill amount and date.", "error"); return; }
    
    let finalCategoryToSave = selectedCategoryName;
    if (isCustomCategoryMode) {
        if (!customCategoryInput.trim()) { showToast("Please enter your custom category name.", "error"); return; }
        finalCategoryToSave = customCategoryInput.trim();
    } else if (!selectedCategoryName) { showToast("Please select a category or choose 'Other'.", "error"); return; }

    setIsLoading(true);
    
    const localDate = parse(expenseDate, "yyyy-MM-dd'T'HH:mm", new Date());
    const utcDateString = localDate.toISOString(); 
    
    const expensePayload: Omit<Expense, 'id' | 'created_at' | 'tags'> = { 
      user_id: user.id,
      amount: parseFloat(amount),
      category: finalCategoryToSave,
      sub_category: subCategoryName || null, 
      description: description.trim() || null,
      expense_date: utcDateString, 
    };

    try {
      let savedExpense: Expense | null = null;
      let error;

      if (existingExpense && existingExpense.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('expenses')
          .update(expensePayload)
          .eq('id', existingExpense.id)
          .select()
          .single();
        savedExpense = updateData;
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('expenses')
          .insert(expensePayload)
          .select()
          .single();
        savedExpense = insertData;
        error = insertError;
      }

      if (error) throw error;
      if (!savedExpense) throw new Error("Failed to save expense details.");

      const tagIdsToLink: string[] = [];
      for (const tagName of selectedTags) {
        let { data: existingTag, error: tagFetchError } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', tagName)
          .single();

        if (tagFetchError && tagFetchError.code !== 'PGRST116') { 
          throw tagFetchError;
        }

        if (existingTag) {
          tagIdsToLink.push(existingTag.id);
        } else {
          const { data: newTag, error: newTagError } = await supabase
            .from('tags')
            .insert({ user_id: user.id, name: tagName })
            .select('id')
            .single();
          if (newTagError) throw newTagError;
          if (newTag) tagIdsToLink.push(newTag.id);
        }
      }
      
      if (existingExpense && existingExpense.id) { 
          const { error: deleteLinksError } = await supabase
            .from('expense_tags')
            .delete()
            .eq('expense_id', existingExpense.id);
          if (deleteLinksError) console.error("Error deleting old tag links:", deleteLinksError); 
      }

      if (tagIdsToLink.length > 0) {
        const expenseTagLinks = tagIdsToLink.map(tagId => ({
          expense_id: savedExpense!.id,
          tag_id: tagId,
          user_id: user.id,
        }));
        const { error: linkError } = await supabase.from('expense_tags').insert(expenseTagLinks);
        if (linkError) throw linkError;
      }
      
      let tagsForCallback: Tag[] = [];
      if (tagIdsToLink.length > 0) {
        const { data: fetchedTags, error: fetchedTagsError } = await supabase
            .from('tags')
            .select('*')
            .in('id', tagIdsToLink);
        if (fetchedTagsError) console.error("Error fetching full tags for callback:", fetchedTagsError);
        else tagsForCallback = fetchedTags || [];
      }


      const finalSavedExpenseWithTags: Expense = {
        ...savedExpense,
        tags: tagsForCallback 
      };

      onExpenseAdded(finalSavedExpenseWithTags); 
      if (!existingExpense) { 
          setAmount('');
          setSelectedCategoryName('');
          setSubCategoryName('');
          setCustomCategoryInput('');
          setIsCustomCategoryMode(false);
          setDescription('');
          setSelectedTags([]);
          setExpenseDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
      }
    } catch (error: any) {
      console.error("Error saving expense with tags:", error);
      showToast(error.message || "Failed to save expense with tags.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6"> 
      <h3 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4 border-b border-color pb-3">
        {existingExpense ? 'Edit Expense' : 'Add New Expense'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"> 
        <Input
          id="expenseDate"
          type="datetime-local"
          label="Date & Time"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          icon={<Calendar size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
          required
        />
        <Input
          id="amount"
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          icon={<span className="text-gray-400 dark:text-dark-text-secondary font-semibold">₹</span>}
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
          icon={<CategoryIconLucide size={18} className="text-gray-400 dark:text-dark-text-secondary" />} 
          required={!isCustomCategoryMode}
        />
        {selectedCategoryName && (
            <Button 
                type="button" 
                onClick={deselectCategory} 
                variant="ghost" 
                size="icon" 
                className="absolute top-7 right-2 p-1 text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-gray-300"
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
          icon={<ChevronDown size={18} className="text-gray-400 dark:text-dark-text-secondary opacity-50" />}
        />
      )}
      { (selectedCategoryName === 'Groceries' || (isCustomCategoryMode && customCategoryInput)) && 
        !(selectedCategoryName !== '---OTHER---' && availableSubCategories.length > 0 && selectedCategoryName !== 'Groceries') && 
        (
         <Input
            id="subCategoryCustomInput"
            type="text"
            label="Sub-category / Item Detail (Optional)"
            value={subCategoryName} 
            onChange={(e) => setSubCategoryName(e.target.value)}
            placeholder="e.g., DMart, Milk & Bread, Specific item"
        />
      )}

      <TagInput 
        selectedTags={selectedTags}
        onChangeSelectedTags={setSelectedTags}
      />

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