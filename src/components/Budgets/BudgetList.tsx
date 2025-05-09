import React from 'react';
import type { Budget, Expense } from '../../types';
import { Edit3, Trash2, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { formatInTimeZone } from 'date-fns-tz'; // For displaying budget period if needed

interface BudgetListProps {
  budgets: Budget[];
  expenses: Expense[]; // Pass all expenses for the selected period to calculate spent amount
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

const BudgetList: React.FC<BudgetListProps> = ({ budgets, expenses, onEdit, onDelete }) => {
  const timeZone = 'Asia/Kolkata';

  const getSpentAmountForBudget = (budget: Budget): number => {
    let relevantExpenses = expenses;
    if (budget.category) { // If it's a category-specific budget
      relevantExpenses = expenses.filter(exp => exp.category === budget.category);
    }
    // If budget.category is null, it's an overall budget, so sum all expenses
    return relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  if (!budgets || budgets.length === 0) {
    return <p className="text-center text-gray-500 py-10">No budgets set for this period. Click "Set New Budget" to start.</p>;
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const spentAmount = getSpentAmountForBudget(budget);
        const remainingAmount = budget.amount - spentAmount;
        const progressPercentage = budget.amount > 0 ? Math.min((spentAmount / budget.amount) * 100, 100) : 0;
        const isOverBudget = spentAmount > budget.amount;

        return (
          <div key={budget.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
              <h3 className="text-lg font-semibold text-primary-700">
                {budget.category || 'Overall Budget'}
              </h3>
              <div className="flex space-x-2 mt-2 sm:mt-0">
                <Button variant="icon" size="sm" onClick={() => onEdit(budget)} aria-label="Edit Budget">
                  <Edit3 size={16} className="text-blue-600 hover:text-blue-800" />
                </Button>
                <Button variant="icon" size="sm" onClick={() => onDelete(budget.id)} aria-label="Delete Budget">
                  <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                </Button>
              </div>
            </div>
            {budget.description && <p className="text-xs text-gray-500 mb-2">{budget.description}</p>}
            
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Spent: ₹{spentAmount.toLocaleString('en-IN')}</span>
                <span>Budget: ₹{budget.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            <p className={`text-sm font-medium ${remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {remainingAmount >= 0 
                ? `Remaining: ₹${remainingAmount.toLocaleString('en-IN')}` 
                : `Overspent by: ₹${Math.abs(remainingAmount).toLocaleString('en-IN')}`}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default BudgetList;