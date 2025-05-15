import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path as needed
import { useAuth } from '../../contexts/AuthContext'; // Adjust path as needed
import type {
  UserDefinedCategory,
  Tag as TagType,
  Category as PresetCategoryType, // Used for expense presets
  ExpenseFilterState,
  ExpenseSortState,
  IncomeFilterState,
  IncomeSortState
} from '../../types'; // Adjust path as needed
import Input from '../ui/Input'; // Adjust path as needed
import Select from '../ui/Select'; // Adjust path as needed
import Button from '../ui/Button'; // Adjust path as needed
import { Search, CalendarDays, Tag as TagIconLucide, ChevronDown, ChevronUp, X, Briefcase } from 'lucide-react'; // Added Briefcase for Source

// Define a union type for the filter and sort states this component can handle
type FilterState = ExpenseFilterState | IncomeFilterState;
type SortState = ExpenseSortState | IncomeSortState;

// Define a union type for the 'sortBy' field, which differs most significantly
type SortByOption = ExpenseSortState['sortBy'] | IncomeSortState['sortBy'];

interface AdvancedFilterProps {
  mode: 'expense' | 'income';
  initialFilters: Partial<FilterState>;
  onFilterChange: (filters: Partial<FilterState>) => void;
  initialSort: SortState;
  onSortChange: (sort: SortState) => void;
  presetCategories?: PresetCategoryType[]; // Optional: only for expense mode
}

const monthFilterOptions = [
  { value: '0', label: 'All Months' },
  { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
  { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
  { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }
];

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const options = [{ value: '0', label: 'All Years' }];
  for (let i = currentYear; i >= currentYear - 7; i--) { // More relevant range
    options.push({ value: i.toString(), label: i.toString() });
  }
  return options;
};

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({
  mode,
  initialFilters,
  onFilterChange,
  initialSort,
  onSortChange,
  presetCategories = [] // Default to empty array if not provided
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Common filter states
  const [searchTerm, setSearchTerm] = useState(initialFilters.searchTerm || '');
  const [startDate, setStartDate] = useState(initialFilters.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters.endDate || '');
  const [tag, setTag] = useState(initialFilters.tag || '');
  const [minAmount, setMinAmount] = useState(initialFilters.minAmount || '');
  const [maxAmount, setMaxAmount] = useState(initialFilters.maxAmount || '');
  const [selectedYear, setSelectedYear] = useState(initialFilters.selectedYear || 0);
  const [selectedMonth, setSelectedMonth] = useState(initialFilters.selectedMonth || 0);

  // Mode-specific filter state (category for expenses, source for income)
  const [categoryOrSource, setCategoryOrSource] = useState(
    mode === 'expense' ? (initialFilters as Partial<ExpenseFilterState>).category || '' : (initialFilters as Partial<IncomeFilterState>).source || ''
  );

  // Sort state - sortBy needs to be flexible
  const [sortBy, setSortBy] = useState<SortByOption>(initialSort.sortBy || (mode === 'expense' ? 'expense_date' : 'income_date'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSort.sortOrder || 'desc');

  // Data for dropdowns
  const [userDefinedItems, setUserDefinedItems] = useState<UserDefinedCategory[]>([]); // For user's expense categories or income sources
  const [userTags, setUserTags] = useState<TagType[]>([]);

  const yearFilterOptions = useMemo(() => generateYearOptions(), []);

  useEffect(() => {
    if (!user) return;
    const fetchDropdownData = async () => {
      // Fetch user-defined categories or sources based on mode
      const { data: itemData, error: itemError } = await supabase
        .from('user_defined_categories')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', mode); // 'expense' or 'income'
      if (itemError) console.error(`Error fetching user-defined ${mode} items:`, itemError);
      else setUserDefinedItems(itemData || []);

      // Fetch tags (common for both modes)
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id);
      if (tagError) console.error("Error fetching user tags for filter:", tagError);
      else setUserTags(tagData || []);
    };
    fetchDropdownData();
  }, [user, mode]);

  const mainFilterOptions = useMemo(() => {
    let options: { value: string, label: string }[] = [];
    if (mode === 'expense') {
      options = presetCategories.map(pc => ({ value: pc.name, label: pc.name }));
    }
    // Add user-defined items (categories for expense, sources for income)
    userDefinedItems.forEach(item => {
      if (!options.find(opt => opt.value === item.name)) {
        options.push({ value: item.name, label: item.name });
      }
    });
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [mode, presetCategories, userDefinedItems]);

  const tagOptions = useMemo(() => {
    return userTags.map(t => ({ value: t.name, label: t.name })).sort((a, b) => a.label.localeCompare(b.label));
  }, [userTags]);

  const currentSortOptionsList = useMemo(() => {
    if (mode === 'expense') {
      return [
        { value: 'expense_date', label: 'Date' },
        { value: 'amount', label: 'Amount' },
        { value: 'category', label: 'Category' },
      ] as { value: ExpenseSortState['sortBy'], label: string }[];
    } else { // mode === 'income'
      return [
        { value: 'income_date', label: 'Date' },
        { value: 'amount', label: 'Amount' },
        { value: 'source', label: 'Source' },
      ] as { value: IncomeSortState['sortBy'], label: string }[];
    }
  }, [mode]);

  // Effect to reset sortBy if mode changes and current sortBy is not valid for the new mode
  // This is more relevant if 'mode' could change dynamically within a single component instance,
  // but as a prop, it's fixed per instance. However, initialSort might not match the mode.
  useEffect(() => {
    const defaultSortForMode = mode === 'expense' ? 'expense_date' : 'income_date';
    const isValidSortByForMode = currentSortOptionsList.some(opt => opt.value === sortBy);

    if (!isValidSortByForMode) {
      setSortBy(defaultSortForMode as SortByOption);
    }
  }, [mode, sortBy, currentSortOptionsList]);


  const applyFiltersAndSort = useCallback(() => {
    let filtersToApply: Partial<FilterState> = {
      searchTerm,
      startDate,
      endDate,
      tag,
      minAmount,
      maxAmount,
      selectedYear,
      selectedMonth,
    };
    if (mode === 'expense') {
      (filtersToApply as Partial<ExpenseFilterState>).category = categoryOrSource;
    } else {
      (filtersToApply as Partial<IncomeFilterState>).source = categoryOrSource;
    }
    onFilterChange(filtersToApply);

    // Cast sortBy to the correct type for onSortChange
    if (mode === 'expense') {
      onSortChange({ sortBy: sortBy as ExpenseSortState['sortBy'], sortOrder } as ExpenseSortState);
    } else {
      onSortChange({ sortBy: sortBy as IncomeSortState['sortBy'], sortOrder } as IncomeSortState);
    }

  }, [
    searchTerm, startDate, endDate, categoryOrSource, tag, minAmount, maxAmount,
    selectedYear, selectedMonth, sortBy, sortOrder, mode, onFilterChange, onSortChange
  ]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setCategoryOrSource('');
    setTag('');
    setMinAmount('');
    setMaxAmount('');
    setSelectedYear(0);
    setSelectedMonth(0);

    const defaultSortByForMode = mode === 'expense' ? 'expense_date' : 'income_date';
    setSortBy(defaultSortByForMode as SortByOption);
    setSortOrder('desc');

    let clearedFilters: Partial<FilterState> = {
      searchTerm: '', startDate: '', endDate: '', tag: '', minAmount: '', maxAmount: '', selectedYear: 0, selectedMonth: 0
    };
    if (mode === 'expense') {
      (clearedFilters as Partial<ExpenseFilterState>).category = '';
      onFilterChange(clearedFilters);
      onSortChange({ sortBy: defaultSortByForMode as ExpenseSortState['sortBy'], sortOrder: 'desc' } as ExpenseSortState);
    } else {
      (clearedFilters as Partial<IncomeFilterState>).source = '';
      onFilterChange(clearedFilters);
      onSortChange({ sortBy: defaultSortByForMode as IncomeSortState['sortBy'], sortOrder: 'desc' } as IncomeSortState);
    }
  };

  const hasActiveFilters = () => {
    return searchTerm !== '' ||
      startDate !== '' ||
      endDate !== '' ||
      categoryOrSource !== '' ||
      tag !== '' ||
      minAmount !== '' ||
      maxAmount !== '' ||
      selectedYear !== 0 ||
      selectedMonth !== 0;
  };

  const sortOrderOptionsList: { value: 'asc' | 'desc', label: string }[] = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

  const mainFilterLabel = mode === 'expense' ? 'Category' : 'Source';
  const mainFilterIcon = mode === 'expense' ? <TagIconLucide size={18} className="text-gray-400 dark:text-dark-text-secondary" /> : <Briefcase size={18} className="text-gray-400 dark:text-dark-text-secondary" />;
  const searchPlaceholder = mode === 'expense'
    ? "Search description, category, tags, amount..."
    : "Search description, source, tags, amount...";


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
              setSortBy(e.target.value as SortByOption);
            }}
            options={currentSortOptionsList}
            className="w-32"
            prompt={!sortBy ? (mode === 'expense' ? "Sort Expenses By" : "Sort Income By") : undefined}
          />
          <Select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as 'asc' | 'desc');
            }}
            options={sortOrderOptionsList}
            className="w-36"
          />
        </div>
      </div>

      <div className="mb-4 mt-2">
        <Input
          id="globalSearch"
          type="search"
          placeholder={searchPlaceholder}
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
              id="filterMain" // Generic ID
              label={mainFilterLabel}
              value={categoryOrSource}
              onChange={(e) => setCategoryOrSource(e.target.value)}
              options={mainFilterOptions}
              prompt={mode === 'expense' ? "All Categories" : "All Sources"}
              icon={mainFilterIcon}
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
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              options={yearFilterOptions}
            />
            <Select
              id="selectedMonth"
              label="Month"
              value={selectedMonth.toString()}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              options={monthFilterOptions}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default AdvancedFilter;