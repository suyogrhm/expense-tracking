import type { Expense } from '../types';
import { parse, isValid } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const TIME_ZONE = 'Asia/Kolkata';

export interface CSVExpense {
  expense_date: string;
  amount: string;
  category: string;
  sub_category?: string;
  description?: string;
  tags?: string;
  is_split?: string;
  split_note?: string;
}

const headerMappings: Record<string, string> = {
  // Date variations
  'date': 'expense_date',
  'transaction_date': 'expense_date',
  'trans_date': 'expense_date',
  'expense_date': 'expense_date',
  // Amount variations
  'amount': 'amount',
  'cost': 'amount',
  'price': 'amount',
  'value': 'amount',
  // Category variations
  'category': 'category',
  'type': 'category',
  'expense_type': 'category',
  'transaction_type': 'category',
  // Description variations
  'description': 'description',
  'desc': 'description',
  'notes': 'description',
  'memo': 'description',
  // Sub-category variations
  'sub_category': 'sub_category',
  'subcategory': 'sub_category',
  'sub-category': 'sub_category',
  // Tags variations
  'tags': 'tags',
  'labels': 'tags',
  // Split variations
  'is_split': 'is_split',
  'split': 'is_split',
  'split_note': 'split_note',
  'split_details': 'split_note'
};

const parseDate = (dateStr: string): string => {
  // Try common date formats
  const formats = [
    'yyyy-MM-dd',
    'dd/MM/yyyy',
    'MM/dd/yyyy',
    'dd-MM-yyyy',
    'MM-dd-yyyy',
    'dd.MM.yyyy',
    'MM.dd.yyyy'
  ];

  for (const fmt of formats) {
    const parsed = parse(dateStr, fmt, new Date());
    if (isValid(parsed)) {
      // Convert to IST and format with time
      const zonedDate = toZonedTime(parsed, TIME_ZONE);
      return formatInTimeZone(zonedDate, TIME_ZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
    }
  }

  // If no format matches, throw error
  throw new Error(`Invalid date format: ${dateStr}. Please use YYYY-MM-DD format.`);
};

export const normalizeHeader = (header: string): string => {
  const normalized = header.toLowerCase().trim();
  return headerMappings[normalized] || normalized;
};

export const validateCSVHeaders = (headers: string[]): boolean => {
  const normalizedHeaders = headers.map(normalizeHeader);
  const requiredHeaders = ['expense_date', 'amount', 'category'];
  return requiredHeaders.every(required => 
    normalizedHeaders.includes(required)
  );
};

export const parseCSVRow = (row: CSVExpense): Partial<Expense> => {
  // Try to parse the date first
  const parsedDate = parseDate(row.expense_date);
  
  return {
    expense_date: parsedDate,
    amount: parseFloat(row.amount),
    category: row.category,
    sub_category: row.sub_category || null,
    description: row.description || null,
    is_split: row.is_split ? row.is_split.toLowerCase() === 'true' : false,
    split_note: row.split_note || null,
  };
};

export const parseCSVFile = (file: File): Promise<CSVExpense[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const lines = csvText.split('\n');
        const originalHeaders = lines[0].split(',').map(header => header.trim());
        const normalizedHeaders = originalHeaders.map(normalizeHeader);
        
        if (!validateCSVHeaders(normalizedHeaders)) {
          throw new Error('Required headers missing. Need: date/expense_date, amount, category');
        }

        const results: CSVExpense[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(value => value.trim());
          const row = normalizedHeaders.reduce((obj: Record<string, string>, header, index) => {
            const mappedHeader = headerMappings[header] || header;
            if (mappedHeader in headerMappings || ['expense_date', 'amount', 'category', 'sub_category', 'description', 'tags', 'is_split', 'split_note'].includes(mappedHeader)) {
              obj[mappedHeader] = values[index] || '';
            }
            return obj;
          }, {} as Record<string, string>);

          // Ensure required fields exist
          if (!row.expense_date || !row.amount || !row.category) {
            console.warn(`Skipping row ${i + 1}: Missing required fields`);
            continue;
          }

          try {
            // Validate date format before adding to results
            parseDate(row.expense_date);
            
            // Cast to CSVExpense after ensuring required fields exist
            results.push({
              expense_date: row.expense_date,
              amount: row.amount,
              category: row.category,
              sub_category: row.sub_category,
              description: row.description,
              tags: row.tags,
              is_split: row.is_split,
              split_note: row.split_note
            });
          } catch (error) {
            console.warn(`Skipping row ${i + 1}: ${error instanceof Error ? error.message : 'Invalid date'}`);
            continue;
          }
        }
        
        resolve(results);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading CSV file'));
    };
    
    reader.readAsText(file);
  });
}; 