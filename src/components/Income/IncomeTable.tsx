import React, { useState } from 'react'; // Added useState for modal handling
import type { Income } from '../../types';
import { formatInTimeZone } from 'date-fns-tz';
import { Edit3, Trash2, AlertTriangle, Calendar, Briefcase, FileText } from 'lucide-react'; // Added icons
import Button from '../ui/Button';
import Modal from '../ui/Modal'; // For delete confirmation

import { useToast } from '../../hooks/useToast';

interface IncomeTableProps {
  incomes: Income[];
  onEdit: (income: Income) => void; // Changed to pass full income object for modal
  onDelete: (incomeId: string) => void;
}

const IncomeTable: React.FC<IncomeTableProps> = ({ incomes, onEdit, onDelete }) => {
  const timeZone = 'Asia/Kolkata';
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { showToast } = useToast(); // Assuming useToast is available
  const [isDeleting, setIsDeleting] = useState(false);


  const handleOpenDeleteConfirm = (incomeId: string) => {
    setDeletingIncomeId(incomeId);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeletingIncomeId(null);
    setIsDeleteConfirmOpen(false);
  };

  const confirmDelete = async () => {
    if (!deletingIncomeId) return;
    setIsDeleting(true);
    try {
      // onDelete prop will handle the actual Supabase call and state update
      onDelete(deletingIncomeId); 
    } catch (error: any) { // Should be handled by parent, but good to have a catch here
      showToast(error.message || "Failed to initiate delete.", "error");
    } finally {
      setIsDeleting(false);
      handleCloseDeleteConfirm();
    }
  };


  if (!incomes || incomes.length === 0) {
    return <p className="text-center text-gray-500 dark:text-dark-text-secondary py-4">No income records to display.</p>;
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-dark-card rounded-lg shadow">
        <table className="w-full min-w-max text-sm text-left text-gray-700 dark:text-dark-text">
          <thead className="text-xs text-gray-700 dark:text-dark-text-secondary uppercase table-header-bg border-b border-color">
            <tr>
              <th scope="col" className="px-4 sm:px-6 py-3">Date</th>
              <th scope="col" className="px-4 sm:px-6 py-3">Source</th>
              <th scope="col" className="px-4 sm:px-6 py-3 text-right">Amount (₹)</th>
              <th scope="col" className="px-4 sm:px-6 py-3">Description</th>
              <th scope="col" className="px-4 sm:px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {incomes.map((income) => (
              <tr key={income.id} className="bg-white dark:bg-dark-card border-b border-color table-row-hover transition-colors">
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  {formatInTimeZone(new Date(income.income_date), timeZone, 'dd MMM yy, hh:mm a')}
                </td>
                <td className="px-4 sm:px-6 py-4">{income.source}</td>
                <td className="px-4 sm:px-6 py-4 text-right font-medium text-green-600 dark:text-green-400">
                  {income.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 sm:px-6 py-4 max-w-xs truncate" title={income.description || undefined}>
                  {income.description || 'N/A'}
                </td>
                <td className="px-4 sm:px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <Button variant="icon" size="sm" onClick={() => onEdit(income)} aria-label="Edit Income">
                      <Edit3 size={16} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" />
                    </Button>
                    <Button variant="icon" size="sm" onClick={() => handleOpenDeleteConfirm(income.id)} aria-label="Delete Income">
                      <Trash2 size={16} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {incomes.map((income) => (
          <div key={income.id} className="bg-white dark:bg-dark-card shadow rounded-lg p-4 border border-color">
            <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-primary-600 dark:text-dark-primary flex items-center">
                    <Briefcase size={16} className="mr-2 flex-shrink-0" /> {income.source}
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    ₹{income.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-dark-text-secondary mb-2 flex items-center">
                <Calendar size={14} className="mr-1 flex-shrink-0" />
                {formatInTimeZone(new Date(income.income_date), timeZone, 'dd MMM yy, hh:mm a')}
            </div>
            {income.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 break-words">
                <FileText size={14} className="inline mr-1 mb-0.5 flex-shrink-0" /> {income.description}
              </p>
            )}
            <div className="flex justify-end space-x-2 mt-2 border-t border-color pt-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(income)}>
                <Edit3 size={14} className="mr-1" /> Edit
              </Button>
              <Button variant="dangerOutline" size="sm" onClick={() => handleOpenDeleteConfirm(income.id)}>
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isDeleteConfirmOpen && (
        <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Confirm Deletion" size="sm">
          <div className="text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500 dark:text-red-400" />
            <p className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">Are you sure?</p>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6">
              This action will permanently delete this income record. This cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting} disabled={isDeleting}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default IncomeTable;