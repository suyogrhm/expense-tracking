import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { UserDefinedCategory } from '../../types';
import { useToast } from '../../hooks/useToast';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SelectUI from '../ui/Select'; // Assuming you have this component

interface CategoryFormProps {
  existingCategory: UserDefinedCategory | null;
  onCategorySaved: (category: UserDefinedCategory) => void;
  onFormCancel: () => void;
}

const CategoryForm: React.FC<CategoryFormProps> = ({ existingCategory, onCategorySaved, onFormCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingCategory) {
      setName(existingCategory.name);
      setType(existingCategory.type);
    } else {
        setName('');
        setType('expense'); // Default for new
    }
  }, [existingCategory]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !name.trim()) {
      showToast("Category name is required.", "error");
      return;
    }
    setIsLoading(true);

    const categoryData = {
      user_id: user.id,
      name: name.trim(),
      type: type,
    };

    try {
      let data: UserDefinedCategory | null = null;
      let error;

      if (existingCategory && existingCategory.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('user_defined_categories')
          .update(categoryData)
          .eq('id', existingCategory.id)
          .select()
          .single();
        data = updateData;
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('user_defined_categories')
          .insert(categoryData)
          .select()
          .single();
        data = insertData;
        error = insertError;
      }

      if (error) {
        if (error.code === '23505') { // unique_user_category_name_type constraint
            showToast(`A category named "${categoryData.name}" of type "${categoryData.type}" already exists.`, "error");
        } else {
            throw error;
        }
      } else if (data) {
        showToast(`Category ${existingCategory ? 'updated' : 'added'} successfully!`, "success");
        onCategorySaved(data as UserDefinedCategory);
      }
    } catch (err: any) {
      console.error("Error saving category:", err);
      showToast(err.message || "Failed to save category.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="categoryName"
        type="text"
        label="Category Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Travel, Utilities"
        required
      />
      <SelectUI
        id="categoryType"
        label="Category Type"
        value={type}
        onChange={(e) => setType(e.target.value as 'expense' | 'income')}
        options={[
          { value: 'expense', label: 'Expense' },
          { value: 'income', label: 'Income' },
        ]}
        required
      />
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="outline" onClick={onFormCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading}>
          {isLoading ? (existingCategory ? 'Saving...' : 'Adding...') : (existingCategory ? 'Save Changes' : 'Add Category')}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;