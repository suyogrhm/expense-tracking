import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { UserDefinedCategory, Tag as TagType, Category as PresetCategoryType, ExpenseFilterState, SortState } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Search, CalendarDays, Tag as TagIconLucide, ChevronDown, ChevronUp, X } from 'lucide-react';

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
  const [selectedYear, setSelectedYear] = useState(initialFilters.selectedYear || 0);
  const [selectedMonth, setSelectedMonth] = useState(initialFilters.selectedMonth || 0);

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
      selectedYear,
      selectedMonth,
    });
    onSortChange({ sortBy, sortOrder });
  }, [searchTerm, startDate, endDate, category, tag, minAmount, maxAmount, selectedYear, selectedMonth, sortBy, sortOrder, onFilterChange, onSortChange]);

  // Call applyFiltersAndSort whenever a filter or sort option changes
  // The parent component (HistoryPage) will use useDebounce for text inputs like searchTerm, minAmount, maxAmount
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setCategory('');
    setTag('');
    setMinAmount('');
    setMaxAmount('');
    setSelectedYear(0);
    setSelectedMonth(0);
    setSortBy('expense_date');
    setSortOrder('desc');
    // Trigger parent update with cleared filters
    onFilterChange({ 
        searchTerm: '', startDate: '', endDate: '', category: '', tag: '', minAmount: '', maxAmount: '', selectedYear: 0, selectedMonth: 0
    });
    onSortChange({ sortBy: 'expense_date', sortOrder: 'desc' });
  };

  const hasActiveFilters = () => {
    return searchTerm !== '' ||
      startDate !== '' ||
      endDate !== '' ||
      category !== '' ||
      tag !== '' ||
      minAmount !== '' ||
      maxAmount !== '' ||
      selectedYear !== 0 ||
      selectedMonth !== 0;
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
    <div className="bg-white dark:bg-dark-card rounded-lg shadow p-4 mb-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-700 dark:text-dark-text hover:text-primary-600 dark:hover:text-primary-400 font-medium flex items-center"
          >
            Filters
            {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
          </button>
          {hasActiveFilters() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-500"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={sortBy}
            onChange={(e) => {
              const value = e.target.value as SortState['sortBy'];
              setSortBy(value);
              onSortChange({ sortBy: value, sortOrder });
            }}
            options={sortOptionsList}
            className="w-32"
          />
          <Select
            value={sortOrder}
            onChange={(e) => {
              const value = e.target.value as SortState['sortOrder'];
              setSortOrder(value);
              onSortChange({ sortBy, sortOrder: value });
            }}
            options={sortOrderOptionsList}
            className="w-32"
          />
        </div>
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
                    id="selectedYear"
                    label="Year"
                    value={selectedYear.toString()}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    options={Array.from({ length: 10 }, (_, i) => ({ 
                      value: (i + 2024).toString(), 
                      label: (i + 2024).toString() 
                    }))}
                />
                <Select
                    id="selectedMonth"
                    label="Month"
                    value={selectedMonth.toString()}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    options={Array.from({ length: 12 }, (_, i) => ({ 
                      value: (i + 1).toString(), 
                      label: (i + 1).toString() 
                    }))}
                />
            </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedExpenseFilters;