import React, { useState } from 'react';
import type { Expense } from '../../types';
import { formatInTimeZone } from 'date-fns-tz';
import { Edit3, Trash2, AlertTriangle, Calendar, FileText, Tags, Users, Info, Eye } from 'lucide-react'; // Added Eye icon
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
  const [viewingSplitExpense, setViewingSplitExpense] = useState<Expense | null>(null); // State for split details modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSplitDetailsModalOpen, setIsSplitDetailsModalOpen] = useState(false); // State for split details modal visibility
  const [isDeleting, setIsDeleting] = useState(false); 

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

  const handleOpenSplitDetailsModal = (expense: Expense) => {
    setViewingSplitExpense(expense);
    setIsSplitDetailsModalOpen(true);
  };

  const handleCloseSplitDetailsModal = () => {
    setViewingSplitExpense(null);
    setIsSplitDetailsModalOpen(false);
  };

  const confirmDelete = async () => {
    if (!deletingExpenseId) return;
    setIsDeleting(true);
    try {
      const { error: deleteSplitDetailsError } = await supabase
        .from('expense_split_details')
        .delete()
        .eq('expense_id', deletingExpenseId);

      if (deleteSplitDetailsError) {
        console.error("Error deleting split details:", deleteSplitDetailsError);
      }
      
      const { error: deleteTagsError } = await supabase
        .from('expense_tags')
        .delete()
        .eq('expense_id', deletingExpenseId);

      if (deleteTagsError) {
        console.error("Error deleting associated tags:", deleteTagsError);
      }
      
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
    return <p className="text-center text-gray-500 dark:text-dark-text-secondary py-4">No expenses to display.</p>;
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto bg-white dark:bg-dark-card rounded-lg shadow">
        <table className="w-full min-w-max text-sm text-left text-gray-700 dark:text-dark-text">
          <thead className="text-xs text-gray-700 dark:text-dark-text-secondary uppercase table-header-bg border-b border-color">
            <tr><th scope="col" className="px-4 sm:px-6 py-3">Date</th><th scope="col" className="px-4 sm:px-6 py-3">Category</th><th scope="col" className="px-4 sm:px-6 py-3 text-right">Amount (₹)</th><th scope="col" className="px-4 sm:px-6 py-3">Description</th><th scope="col" className="px-4 sm:px-6 py-3">Tags</th><th scope="col" className="px-4 sm:px-6 py-3">Split Details</th><th scope="col" className="px-4 sm:px-6 py-3 text-center">Actions</th></tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="bg-white dark:bg-dark-card border-b border-color table-row-hover transition-colors">
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  {formatInTimeZone(new Date(expense.expense_date), timeZone, 'dd MMM yy, hh:mm a')}
                </td>
                <td className="px-4 sm:px-6 py-4">
                    {expense.category}
                    {expense.sub_category && <span className="block text-xs text-gray-500 dark:text-dark-text-secondary">{expense.sub_category}</span>}
                </td>
                <td className="px-4 sm:px-6 py-4 text-right font-medium text-gray-800 dark:text-dark-text"> 
                  {expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                </td>
                <td className="px-4 sm:px-6 py-4 max-w-xs truncate" title={expense.description || undefined}>
                  {expense.description || 'N/A'}
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {expense.tags?.map(tag => (
                      <span key={tag.id || tag.name} className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 text-xs">
                  {expense.is_split ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600 dark:text-green-400">
                        Yes ({expense.expense_split_details?.length || 0} people)
                      </span>
                      <Button variant="link" size="sm" onClick={() => handleOpenSplitDetailsModal(expense)} className="p-0 text-xs">
                        <Eye size={14} className="mr-1"/> View
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">No</span>
                  )}
                </td>
                <td className="px-4 sm:px-6 py-4 text-center">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    <Button variant="icon" size="sm" onClick={() => handleOpenEditModal(expense)} aria-label="Edit">
                      <Edit3 size={16} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" />
                    </Button>
                    <Button variant="icon" size="sm" onClick={() => handleOpenDeleteConfirm(expense.id)} aria-label="Delete">
                      <Trash2 size={16} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (remains the same, already shows split details nicely) */}
      <div className="md:hidden space-y-3">
        {expenses.map((expense) => (
          <div key={expense.id} className="bg-white dark:bg-dark-card shadow rounded-lg p-4 border border-color">
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium text-primary-600 dark:text-dark-primary">{expense.category}{expense.sub_category ? ` (${expense.sub_category})` : ''}</div>
              <div className="text-lg font-bold text-gray-800 dark:text-dark-text">
                ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-dark-text-secondary mb-2 flex items-center">
                <Calendar size={14} className="mr-1 flex-shrink-0" />
                {formatInTimeZone(new Date(expense.expense_date), timeZone, 'dd MMM yy, hh:mm a')}
            </div>
            {expense.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 break-words">
                <FileText size={14} className="inline mr-1 mb-0.5 flex-shrink-0" /> {expense.description}
              </p>
            )}
            {expense.tags && expense.tags.length > 0 && (
                <div className="mb-2">
                    <div className="flex flex-wrap gap-1 items-center">
                        <Tags size={14} className="text-gray-500 dark:text-dark-text-secondary mr-1 flex-shrink-0"/>
                        {expense.tags.map(tag => (
                            <span key={tag.id || tag.name} className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                                {tag.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
             {expense.is_split && (
                <div className="mb-3 text-xs">
                    <div className="flex items-center text-green-600 dark:text-green-400 mb-1 font-semibold">
                        <Users size={14} className="mr-1 flex-shrink-0"/>
                        Split Expense:
                    </div>
                    {expense.expense_split_details && expense.expense_split_details.length > 0 && (
                        <ul className="list-none pl-1 space-y-0.5 text-gray-600 dark:text-dark-text-secondary">
                            {expense.expense_split_details.map((detail, idx) =>(
                                <li key={detail.id || idx} className="flex justify-between">
                                  <span>{detail.person_name}:</span>
                                  <span>₹{detail.amount.toLocaleString('en-IN')}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {expense.split_note && 
                        <div className="mt-1 flex items-start">
                            <Info size={12} className="mr-1 mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0"/> 
                            <p className="text-gray-500 dark:text-dark-text-secondary italic">{expense.split_note}</p>
                        </div>
                    }
                </div>
            )}
            <div className="flex justify-end space-x-2 mt-2 border-t border-color pt-2">
              <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(expense)}>
                <Edit3 size={14} className="mr-1" /> Edit
              </Button>
              <Button variant="dangerOutline" size="sm" onClick={() => handleOpenDeleteConfirm(expense.id)}> 
                <Trash2 size={14} className="mr-1" /> Delete
              </Button>
            </div>
          </div>
        ))}
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
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-500 dark:text-red-400" />
            <p className="text-lg font-medium text-gray-700 dark:text-dark-text mb-2">Are you sure?</p>
            <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6">
              This action will permanently delete the expense and its split details. This cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={handleCloseDeleteConfirm} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting} disabled={isDeleting}>Delete</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal for Viewing Split Details */}
      {isSplitDetailsModalOpen && viewingSplitExpense && (
        <Modal isOpen={isSplitDetailsModalOpen} onClose={handleCloseSplitDetailsModal} title={`Split Details for ${viewingSplitExpense.category}`}>
          <div className="space-y-3 text-sm">
            <p className="text-gray-700 dark:text-dark-text">
              <strong>Total Amount:</strong> ₹{viewingSplitExpense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {viewingSplitExpense.expense_split_details && viewingSplitExpense.expense_split_details.length > 0 ? (
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-dark-text mb-1">Split Among:</h4>
                <ul className="list-disc list-inside pl-4 space-y-1 text-gray-600 dark:text-dark-text-secondary">
                  {viewingSplitExpense.expense_split_details.map((detail, idx) => (
                    <li key={detail.id || idx}>
                      {detail.person_name}: ₹{detail.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-dark-text-secondary italic">No specific split amounts recorded.</p>
            )}
            {viewingSplitExpense.split_note && (
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-dark-text mt-2 mb-1">Note:</h4>
                <p className="text-gray-600 dark:text-dark-text-secondary italic">{viewingSplitExpense.split_note}</p>
              </div>
            )}
            <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={handleCloseSplitDetailsModal}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ExpenseTable;