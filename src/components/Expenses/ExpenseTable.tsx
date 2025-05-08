import React, { useState } from 'react';
import type { Expense } from '../../types';
import { formatInTimeZone } from 'date-fns-tz';
import { Edit3, Trash2, AlertTriangle } from 'lucide-react'; // Removed MoreVertical
import Button from '../ui/Button';
import ExpenseForm from './ExpenseForm'; 
import Modal from '../ui/Modal'; 
import { supabase } from '../../supabaseClient';
import { useToast } from '../../hooks/useToast';

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void; 
  onDelete: (expenseId: string) => void; 
}

const ExpenseTable: React.FC<ExpenseTableProps> = ({ expenses, onEdit, onDelete }) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete action

  const { showToast } = useToast();
  const timeZone = 'Asia/Kolkata';

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingExpense(null);
    setIsEditModalOpen(false);
  };

  const handleExpenseUpdatedInModal = (updatedExpense: Expense) => {
    onEdit(updatedExpense); 
    handleCloseEditModal();
  };

  const handleOpenDeleteConfirm = (expenseId: string) => {
    setDeletingExpenseId(expenseId);
    setIsDeleteConfirmOpen(true);
  };

  const handleCloseDeleteConfirm = () => {
    setDeletingExpenseId(null);
    setIsDeleteConfirmOpen(false);
  };

  const confirmDelete = async () => {
    if (!deletingExpenseId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', deletingExpenseId);
      
      if (error) throw error;
      
      onDelete(deletingExpenseId); 
      showToast("Expense deleted successfully.", "success");
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      showToast(error.message || "Failed to delete expense.", "error");
    } finally {
      setIsDeleting(false);
      handleCloseDeleteConfirm();
    }
  };
  
  if (!expenses || expenses.length === 0) {
    return <p className="text-center text-gray-500 py-4">No expenses to display.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full min-w-max text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
            <tr>
              <th scope="col" className="px-4 sm:px-6 py-3">Date</th>
              <th scope="col" className="px-4 sm:px-6 py-3">Category</th>
              <th scope="col" className="px-4 sm:px-6 py-3">Sub-Category</th>
              <th scope="col" className="px-4 sm:px-6 py-3 text-right">Amount (₹)</th>
              <th scope="col" className="px-4 sm:px-6 py-3 hidden md:table-cell">Description</th> {/* Hide on small screens */}
              <th scope="col" className="px-4 sm:px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  {formatInTimeZone(new Date(expense.expense_date), timeZone, 'dd MMM yy, hh:mm a')}
                </td>
                <td className="px-4 sm:px-6 py-4">{expense.category}</td>
                <td className="px-4 sm:px-6 py-4">{expense.sub_category || 'N/A'}</td>
                <td className="px-4 sm:px-6 py-4 text-right font-medium text-gray-800"> {/* Changed color from rupee */}
                  {expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                </td>
                <td className="px-4 sm:px-6 py-4 max-w-xs truncate hidden md:table-cell" title={expense.description || undefined}>
                  {expense.description || 'N/A'}
                </td>
                <td className="px-4 sm:px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <Button variant="icon" size="sm" onClick={() => handleOpenEditModal(expense)} aria-label="Edit">
                      <Edit3 size={16} className="text-blue-600 hover:text-blue-800" />
                    </Button>
                    <Button variant="icon" size="sm" onClick={() => handleOpenDeleteConfirm(expense.id)} aria-label="Delete">
                      <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditModalOpen && editingExpense && (
        <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Edit Expense">
          <ExpenseForm
            existingExpense={editingExpense}
            onExpenseAdded={handleExpenseUpdatedInModal} 
            onFormCancel={handleCloseEditModal}
          />
        </Modal>
      )}

      {isDeleteConfirmOpen && (
        <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Confirm Deletion" size="sm">
          <div className="text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium text-gray-700 mb-2">Are you sure?</p>
            <p className="text-sm text-gray-500 mb-6">
              This action will permanently delete the expense. This cannot be undone.
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

export default ExpenseTable;