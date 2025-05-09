import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { Expense, Category as PresetCategory, SubCategory as PresetSubCategory, UserDefinedCategory, UserDefinedSubCategory as UserDefinedSubCategoryType, Tag, ExpenseSplitDetail } from '../../types';
import { format, parse } from 'date-fns'; 
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'; 
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectUI from '../ui/Select'; 
import TagInput from '../ui/TagInput'; 
import { useToast } from '../../hooks/useToast';
import { Calendar, Tag as CategoryIconLucide, ChevronDown, X, Plus, Trash2 } from 'lucide-react'; 
import Textarea from '../ui/Textarea'; 

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

interface SplitPerson {
  tempId: string; // For local list key
  person_name: string;
  amount: string; // Keep as string for input, parse on submit
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onExpenseAdded, existingExpense, onFormCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const [totalAmount, setTotalAmount] = useState<string>(''); // This is the total expense amount
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

  // State for detailed expense splitting
  const [isSplit, setIsSplit] = useState(false);
  const [splitDetails, setSplitDetails] = useState<SplitPerson[]>([]);
  const [splitNote, setSplitNote] = useState('');

  // Calculated sum of split amounts
  const sumOfSplitAmounts = useMemo(() => {
    return splitDetails.reduce((sum, detail) => sum + (parseFloat(detail.amount) || 0), 0);
  }, [splitDetails]);

  // Remaining amount to be split or covered by the user
  const remainingToSplit = useMemo(() => {
    const total = parseFloat(totalAmount) || 0;
    return total - sumOfSplitAmounts;
  }, [totalAmount, sumOfSplitAmounts]);


  useEffect(() => {
    // ... (fetchUserCategories logic remains the same) ...
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
    // ... (allCategoryOptions logic remains the same) ...
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
      setTotalAmount(existingExpense.amount.toString());
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
      
      setIsSplit(existingExpense.is_split || false);
      setSplitNote(existingExpense.split_note || '');
      // Populate splitDetails from existingExpense.expense_split_details
      setSplitDetails(
        existingExpense.expense_split_details?.map(detail => ({
          tempId: detail.id || Math.random().toString(36).substring(2), // Use existing id or generate temp
          person_name: detail.person_name,
          amount: detail.amount.toString(),
        })) || []
      );

    } else {
      // Reset form for new entry
      setTotalAmount('');
      setSelectedCategoryName('');
      setSubCategoryName('');
      setCustomCategoryInput('');
      setIsCustomCategoryMode(false);
      setExpenseDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
      setDescription('');
      setSelectedTags([]); 
      setIsSplit(false);
      setSplitDetails([]);
      setSplitNote('');
    }
  }, [existingExpense, timeZone, userDefinedExpenseCategories]);

  useEffect(() => {
    // ... (availableSubCategories logic remains the same) ...
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
    // ... (handleCategoryChange logic remains the same) ...
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
    // ... (deselectCategory logic remains the same) ...
    setSelectedCategoryName('');
    setSubCategoryName('');
    setCustomCategoryInput('');
    setIsCustomCategoryMode(false);
    setAvailableSubCategories([]);
  };

  const handleAddSplitDetailRow = () => {
    setSplitDetails([...splitDetails, { tempId: Math.random().toString(36).substring(2), person_name: '', amount: '' }]);
  };

  const handleSplitDetailChange = (index: number, field: keyof SplitPerson, value: string) => {
    const newDetails = [...splitDetails];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setSplitDetails(newDetails);
  };

  const handleRemoveSplitDetailRow = (tempId: string) => {
    setSplitDetails(splitDetails.filter(detail => detail.tempId !== tempId));
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { showToast("User not authenticated.", "error"); return; }
    if (!totalAmount || !expenseDate) { showToast("Please fill total amount and date.", "error"); return; }
    
    let finalCategoryToSave = selectedCategoryName;
    if (isCustomCategoryMode) {
        if (!customCategoryInput.trim()) { showToast("Please enter your custom category name.", "error"); return; }
        finalCategoryToSave = customCategoryInput.trim();
    } else if (!selectedCategoryName) { showToast("Please select a category or choose 'Other'.", "error"); return; }

    if (isSplit && parseFloat(totalAmount) !== sumOfSplitAmounts) {
        showToast(`Total split amount (₹${sumOfSplitAmounts.toFixed(2)}) does not match the total expense amount (₹${parseFloat(totalAmount).toFixed(2)}).`, "error");
        return;
    }
    if (isSplit && splitDetails.some(d => !d.person_name.trim() || !d.amount.trim() || isNaN(parseFloat(d.amount)))) {
        showToast("Please ensure all split entries have a name and a valid amount.", "error");
        return;
    }


    setIsLoading(true);
    
    const localDate = parse(expenseDate, "yyyy-MM-dd'T'HH:mm", new Date());
    const utcDateString = localDate.toISOString(); 
    
    const expensePayload: Omit<Expense, 'id' | 'created_at' | 'tags' | 'expense_split_details'> & { is_split?: boolean; split_note?: string | null; } = { 
      user_id: user.id,
      amount: parseFloat(totalAmount), // Save the total amount here
      category: finalCategoryToSave,
      sub_category: subCategoryName || null, 
      description: description.trim() || null,
      expense_date: utcDateString, 
      is_split: isSplit,
      split_note: isSplit ? (splitNote.trim() || null) : null,
    };

    try {
      let savedExpenseData: Expense | null = null; // Use a different name to avoid conflict
      let error;

      // Step 1: Save/Update Main Expense Record
      if (existingExpense && existingExpense.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('expenses')
          .update(expensePayload)
          .eq('id', existingExpense.id)
          .select()
          .single();
        savedExpenseData = updateData;
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('expenses')
          .insert(expensePayload)
          .select()
          .single();
        savedExpenseData = insertData;
        error = insertError;
      }

      if (error) throw error;
      if (!savedExpenseData) throw new Error("Failed to save expense details.");

      const currentExpenseId = savedExpenseData.id;

      // Step 2: Handle Tags (logic remains similar)
      // ... (tag handling logic from previous version) ...
      const tagIdsToLink: string[] = [];
      for (const tagName of selectedTags) {
        let { data: existingTag, error: tagFetchError } = await supabase
          .from('tags').select('id').eq('user_id', user.id).eq('name', tagName).single();
        if (tagFetchError && tagFetchError.code !== 'PGRST116') throw tagFetchError;
        if (existingTag) tagIdsToLink.push(existingTag.id);
        else {
          const { data: newTag, error: newTagError } = await supabase
            .from('tags').insert({ user_id: user.id, name: tagName }).select('id').single();
          if (newTagError) throw newTagError;
          if (newTag) tagIdsToLink.push(newTag.id);
        }
      }
      if (existingExpense && existingExpense.id) { 
          await supabase.from('expense_tags').delete().eq('expense_id', existingExpense.id);
      }
      if (tagIdsToLink.length > 0) {
        const expenseTagLinks = tagIdsToLink.map(tagId => ({ expense_id: currentExpenseId, tag_id: tagId, user_id: user.id }));
        const { error: linkError } = await supabase.from('expense_tags').insert(expenseTagLinks);
        if (linkError) throw linkError;
      }
      let tagsForCallback: Tag[] = [];
      if (tagIdsToLink.length > 0) {
        const { data: fetchedTags } = await supabase.from('tags').select('*').in('id', tagIdsToLink);
        tagsForCallback = fetchedTags || [];
      }
      // End of Tag Handling


      // Step 3: Handle Expense Split Details
      // Delete existing split details if updating an expense
      if (existingExpense && existingExpense.id) {
        const { error: deleteSplitError } = await supabase
          .from('expense_split_details')
          .delete()
          .eq('expense_id', existingExpense.id);
        if (deleteSplitError) {
          console.error("Error deleting old split details:", deleteSplitError);
          // Decide if this is a critical error to stop the process
        }
      }

      let savedSplitDetails: ExpenseSplitDetail[] = [];
      if (isSplit && splitDetails.length > 0) {
        const newSplitDetailsData = splitDetails.map(detail => ({
          expense_id: currentExpenseId,
          user_id: user.id,
          person_name: detail.person_name,
          amount: parseFloat(detail.amount) || 0,
        }));
        const { data: insertedSplits, error: splitInsertError } = await supabase
          .from('expense_split_details')
          .insert(newSplitDetailsData)
          .select();
        
        if (splitInsertError) throw splitInsertError;
        savedSplitDetails = insertedSplits || [];
      }
      
      const finalSavedExpenseWithDetails: Expense = {
        ...savedExpenseData,
        tags: tagsForCallback,
        is_split: expensePayload.is_split,
        split_note: expensePayload.split_note,
        expense_split_details: savedSplitDetails,
      };

      onExpenseAdded(finalSavedExpenseWithDetails); 
      if (!existingExpense) { 
          // Reset form fields
          setTotalAmount('');
          setSelectedCategoryName('');
          setSubCategoryName('');
          setCustomCategoryInput('');
          setIsCustomCategoryMode(false);
          setDescription('');
          setSelectedTags([]);
          setExpenseDate(format(toZonedTime(new Date(), timeZone), "yyyy-MM-dd'T'HH:mm"));
          setIsSplit(false);
          setSplitDetails([]);
          setSplitNote('');
      }
    } catch (error: any) {
      console.error("Error saving expense:", error);
      showToast(error.message || "Failed to save expense.", "error");
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
          id="totalAmount" // Changed from amount to totalAmount
          type="number"
          label="Total Amount" // Changed label
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
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
          hasExternalButton={true} 
        />
        {selectedCategoryName && (
            <Button 
                type="button" 
                onClick={deselectCategory} 
                variant="ghost" 
                size="icon" 
                className="absolute top-1/2 -translate-y-1/2 right-10 p-1 text-gray-400 dark:text-dark-text-secondary hover:text-gray-600 dark:hover:text-gray-300 z-20"
                style={{ marginTop: '0.125rem' }} 
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

      {/* Expense Splitting Section */}
      <div className="space-y-3 pt-3 border-t border-color">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isSplit"
            checked={isSplit}
            onChange={(e) => setIsSplit(e.target.checked)}
            className="h-4 w-4 text-primary-600 border-gray-300 dark:border-dark-border rounded focus:ring-primary-500 dark:focus:ring-dark-primary dark:bg-dark-input dark:checked:bg-dark-primary"
          />
          <label htmlFor="isSplit" className="ml-2 text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
            Split this expense? (Total amount above should be the grand total)
          </label>
        </div>

        {isSplit && (
          <div className="space-y-4 pl-2 border-l-2 border-primary-200 dark:border-primary-700 ml-2 py-2">
            {splitDetails.map((detail, index) => (
              <div key={detail.tempId} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
                <Input
                  id={`splitPersonName-${index}`}
                  type="text"
                  label={index === 0 ? "Person Name" : ""}
                  value={detail.person_name}
                  onChange={(e) => handleSplitDetailChange(index, 'person_name', e.target.value)}
                  placeholder="Name"
                  containerClassName="sm:col-span-1"
                />
                <Input
                  id={`splitAmount-${index}`}
                  type="number"
                  label={index === 0 ? "Their Share (₹)" : ""}
                  value={detail.amount}
                  onChange={(e) => handleSplitDetailChange(index, 'amount', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  containerClassName="sm:col-span-1"
                />
                <Button 
                  type="button" 
                  variant="dangerOutline" 
                  size="sm" 
                  onClick={() => handleRemoveSplitDetailRow(detail.tempId)}
                  className="sm:mt-4" // Adjust margin for alignment with label
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleAddSplitDetailRow} className="mt-2">
              <Plus size={16} className="mr-1" /> Add Person to Split
            </Button>
            
            {splitDetails.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Sum of split amounts: ₹{sumOfSplitAmounts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {parseFloat(totalAmount) > 0 && remainingToSplit !== 0 && (
                        <span className={remainingToSplit > 0 ? "text-green-600 dark:text-green-400 ml-2" : "text-red-500 dark:text-red-400 ml-2"}>
                            (Remaining: ₹{remainingToSplit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                    )}
                </div>
            )}

            <Textarea 
              id="splitNote"
              label="Split Notes (Optional)"
              value={splitNote}
              onChange={(e) => setSplitNote(e.target.value)}
              placeholder="e.g., John owes 50%, Sarah paid for her part, I paid full amount"
              rows={2}
            />
          </div>
        )}
      </div>


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