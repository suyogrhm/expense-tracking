import React from 'react';
import type { Budget, Expense } from '../../types';
import { Edit3, Trash2 } from 'lucide-react'; 
import Button from '../ui/Button';

interface BudgetListProps {
  budgets: Budget[];
  expenses: Expense[]; 
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

const BudgetList: React.FC<BudgetListProps> = ({ budgets, expenses, onEdit, onDelete }) => {

  const getSpentAmountForBudget = (budget: Budget): number => {
    let relevantExpenses = expenses;
    if (budget.category) { 
      relevantExpenses = expenses.filter(exp => exp.category === budget.category);
    }
    return relevantExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  if (!budgets || budgets.length === 0) {
    return <p className="text-center text-gray-500 dark:text-dark-text-secondary py-10">No budgets set for this period. Click "Set New Budget" to start.</p>;
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => {
        const spentAmount = getSpentAmountForBudget(budget);
        const remainingAmount = budget.amount - spentAmount;
        const progressPercentage = budget.amount > 0 ? Math.min((spentAmount / budget.amount) * 100, 100) : 0;
        const isOverBudget = spentAmount > budget.amount;

        return (
          <div key={budget.id} className="content-card border"> {/* Applied .content-card and .border for consistency */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
              <h3 className="text-lg font-semibold text-primary-700 dark:text-dark-primary">
                {budget.category || 'Overall Budget'}
              </h3>
              <div className="flex space-x-2 mt-2 sm:mt-0">
                <Button variant="icon" size="sm" onClick={() => onEdit(budget)} aria-label="Edit Budget">
                  <Edit3 size={16} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" />
                </Button>
                <Button variant="icon" size="sm" onClick={() => onDelete(budget.id)} aria-label="Delete Budget">
                  <Trash2 size={16} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" />
                </Button>
              </div>
            </div>
            {budget.description && <p className="text-xs text-gray-500 dark:text-dark-text-secondary mb-2">{budget.description}</p>}
            
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
                <span>Spent: ₹{spentAmount.toLocaleString('en-IN')}</span>
                <span>Budget: ₹{budget.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${isOverBudget ? 'bg-red-500 dark:bg-red-400' : 'bg-green-500 dark:bg-green-400'}`}
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            <p className={`text-sm font-medium ${remainingAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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