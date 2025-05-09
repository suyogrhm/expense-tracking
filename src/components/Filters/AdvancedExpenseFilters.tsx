import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { UserDefinedCategory, Tag as TagType, Category as PresetCategoryType, ExpenseFilterState, SortState } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Filter as RotateCcw, Search, CalendarDays, Tag as TagIconLucide, ListFilter, ChevronDown, ChevronUp } from 'lucide-react';

interface AdvancedExpenseFiltersProps {
  initialFilters: Partial<ExpenseFilterState>; 
  onFilterChange: (filters: Partial<ExpenseFilterState>) => void;
  initialSort: SortState;
  onSortChange: (sort: SortState) => void;
  presetCategories: PresetCategoryType[]; 
}

const AdvancedExpenseFilters: React.FC<AdvancedExpenseFiltersProps> = ({ 
    initialFilters, 
    onFilterChange,
    initialSort,
    onSortChange,
    presetCategories
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false); 

  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');
  const [category, setCategory] = useState(initialFilters.category || '');
  const [tag, setTag] = useState(initialFilters.tag || '');
  const [minAmount, setMinAmount] = useState(initialFilters.minAmount || '');
  const [maxAmount, setMaxAmount] = useState(initialFilters.maxAmount || '');

  const [sortBy, setSortBy] = useState<SortState['sortBy']>(initialSort.sortBy || 'expense_date');
  const [sortOrder, setSortOrder] = useState<SortState['sortOrder']>(initialSort.sortOrder || 'desc');
  
  const [userCategories, setUserCategories] = useState<UserDefinedCategory[]>([]);
  const [userTags, setUserTags] = useState<TagType[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchDropdownData = async () => {
      const { data: catData, error: catError } = await supabase
        .from('user_defined_categories')
        .select('*') // Fetch all fields to match UserDefinedCategory type
        .eq('user_id', user.id)
        .eq('type', 'expense');
      if (catError) console.error("Error fetching user categories for filter:", catError);
      else setUserCategories(catData || []);

      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('*') // Fetch all fields to match TagType
        .eq('user_id', user.id);
      if (tagError) console.error("Error fetching user tags for filter:", tagError);
      else setUserTags(tagData || []);
    };
    fetchDropdownData();
  }, [user]);

  const combinedCategoryOptions = useMemo(() => {
    const options = presetCategories.map(pc => ({ value: pc.name, label: pc.name }));
    userCategories.forEach(uc => {
      if (!options.find(opt => opt.value === uc.name)) {
        options.push({ value: uc.name, label: uc.name });
      }
    });
    return options.sort((a,b) => a.label.localeCompare(b.label));
  }, [presetCategories, userCategories]);

  const tagOptions = useMemo(() => {
    return userTags.map(t => ({ value: t.name, label: t.name })).sort((a,b) => a.label.localeCompare(b.label));
  }, [userTags]);

  const applyFiltersAndSort = useCallback(() => {
    onFilterChange({
      searchTerm, 
      startDate,
      endDate,
      category,
      tag,
      minAmount, 
      maxAmount, 
    });
    onSortChange({ sortBy, sortOrder });
  }, [searchTerm, startDate, endDate, category, tag, minAmount, maxAmount, sortBy, sortOrder, onFilterChange, onSortChange]);

  // Call applyFiltersAndSort whenever a filter or sort option changes
  // The parent component (HistoryPage) will use useDebounce for text inputs like searchTerm, minAmount, maxAmount
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);


  const handleClearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setCategory('');
    setTag('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('expense_date');
    setSortOrder('desc');
    // Trigger parent update with cleared filters
    onFilterChange({ 
        searchTerm: '', startDate: '', endDate: '', category: '', tag: '', minAmount: '', maxAmount: ''
    });
    onSortChange({ sortBy: 'expense_date', sortOrder: 'desc' });
  };

  const sortOptionsList = [
    { value: 'expense_date', label: 'Date' },
    { value: 'amount', label: 'Amount' },
    { value: 'category', label: 'Category' },
  ];

  const sortOrderOptionsList = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  return (
    <div className="mb-6 p-4 border border-color rounded-lg bg-gray-50 dark:bg-dark-card dark:bg-opacity-50">
      <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
            <ListFilter size={20} className="mr-2 text-primary-600 dark:text-dark-primary" />
            <h3 className="text-lg font-semibold">Advanced Filters & Sort</h3>
        </div>
        <Button variant="ghost" size="icon" aria-label={isExpanded ? "Hide filters" : "Show filters"}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </Button>
      </div>
      
      <div className="mb-4">
        <Input
            id="globalSearch"
            type="search"
            placeholder="Search description, category, tags, amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
        />
      </div>

      {isExpanded && (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                    id="startDate"
                    type="date"
                    label="Start Date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    icon={<CalendarDays size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
                />
                <Input
                    id="endDate"
                    type="date"
                    label="End Date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    icon={<CalendarDays size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
                />
                <Select
                    id="filterCategory"
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={combinedCategoryOptions}
                    prompt="All Categories"
                    icon={<TagIconLucide size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
                />
                <Select
                    id="filterTag"
                    label="Tag"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    options={tagOptions}
                    prompt="All Tags"
                    icon={<TagIconLucide size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
                />
                <Input
                    id="minAmount"
                    type="number"
                    label="Min Amount"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="e.g., 100"
                    min="0"
                />
                <Input
                    id="maxAmount"
                    type="number"
                    label="Max Amount"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="e.g., 5000"
                    min="0"
                />
                <Select
                    id="sortBy"
                    label="Sort By"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortState['sortBy'])}
                    options={sortOptionsList}
                />
                <Select
                    id="sortOrder"
                    label="Order"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as SortState['sortOrder'])}
                    options={sortOrderOptionsList}
                />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <Button onClick={handleClearFilters} variant="outline" size="sm">
                    <RotateCcw size={16} className="mr-2" /> Clear All
                </Button>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedExpenseFilters;