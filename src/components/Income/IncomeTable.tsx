import React from 'react';
import type { Income } from '../../types';
import { formatInTimeZone } from 'date-fns-tz';
import { Edit3, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

interface IncomeTableProps {
  incomes: Income[];
  onEdit: (income: Income) => void;
  onDelete: (incomeId: string) => void;
}

const IncomeTable: React.FC<IncomeTableProps> = ({ incomes, onEdit, onDelete }) => {
  const timeZone = 'Asia/Kolkata';

  if (!incomes || incomes.length === 0) {
    return <p className="text-center text-gray-500 py-4">No income records to display.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <table className="w-full min-w-max text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
          <tr>
            <th scope="col" className="px-4 sm:px-6 py-3">Date</th>
            <th scope="col" className="px-4 sm:px-6 py-3">Source</th>
            <th scope="col" className="px-4 sm:px-6 py-3 text-right">Amount (₹)</th>
            <th scope="col" className="px-4 sm:px-6 py-3 hidden md:table-cell">Description</th>
            <th scope="col" className="px-4 sm:px-6 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {incomes.map((income) => (
            <tr key={income.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                {formatInTimeZone(new Date(income.income_date), timeZone, 'dd MMM yy, hh:mm a')}
              </td>
              <td className="px-4 sm:px-6 py-4">{income.source}</td>
              <td className="px-4 sm:px-6 py-4 text-right font-medium text-green-600">
                {income.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td className="px-4 sm:px-6 py-4 max-w-xs truncate hidden md:table-cell" title={income.description || undefined}>
                {income.description || 'N/A'}
              </td>
              <td className="px-4 sm:px-6 py-4 text-center">
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  <Button variant="icon" size="sm" onClick={() => onEdit(income)} aria-label="Edit Income">
                    <Edit3 size={16} className="text-blue-600 hover:text-blue-800" />
                  </Button>
                  <Button variant="icon" size="sm" onClick={() => onDelete(income.id)} aria-label="Delete Income">
                    <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IncomeTable;