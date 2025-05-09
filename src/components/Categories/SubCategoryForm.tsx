import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { UserDefinedSubCategory, UserDefinedCategory } from '../../types';
import { useToast } from '../../hooks/useToast';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface SubCategoryFormProps {
  parentCategory: UserDefinedCategory;
  existingSubCategory: UserDefinedSubCategory | null;
  onSubCategorySaved: (subCategory: UserDefinedSubCategory) => void;
  onFormCancel: () => void;
}

const SubCategoryForm: React.FC<SubCategoryFormProps> = ({ parentCategory, existingSubCategory, onSubCategorySaved, onFormCancel }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (existingSubCategory) {
      setName(existingSubCategory.name);
    } else {
        setName('');
    }
  }, [existingSubCategory]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !name.trim() || !parentCategory.id) {
      showToast("Sub-category name and parent category are required.", "error");
      return;
    }
    setIsLoading(true);

    const subCategoryData = {
      user_id: user.id,
      main_category_id: parentCategory.id,
      name: name.trim(),
    };

    try {
      let data: UserDefinedSubCategory | null = null;
      let error;

      if (existingSubCategory && existingSubCategory.id) {
        const { data: updateData, error: updateError } = await supabase
          .from('user_defined_sub_categories')
          .update(subCategoryData)
          .eq('id', existingSubCategory.id)
          .select()
          .single();
        data = updateData;
        error = updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('user_defined_sub_categories')
          .insert(subCategoryData)
          .select()
          .single();
        data = insertData;
        error = insertError;
      }
      
      if (error) {
         if (error.code === '23505') { // unique_user_sub_category_name_main constraint
            showToast(`A sub-category named "${subCategoryData.name}" already exists for ${parentCategory.name}.`, "error");
        } else {
            throw error;
        }
      } else if (data) {
        showToast(`Sub-category ${existingSubCategory ? 'updated' : 'added'} successfully!`, "success");
        onSubCategorySaved(data as UserDefinedSubCategory);
      }
    } catch (err: any) {
      console.error("Error saving sub-category:", err);
      showToast(err.message || "Failed to save sub-category.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="subCategoryName"
        type="text"
        label="Sub-category Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Groceries, Internet Bill"
        required
      />
      <div className="flex justify-end space-x-3 pt-2">
        <Button type="button" variant="outline" onClick={onFormCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isLoading} isLoading={isLoading}>
          {isLoading ? (existingSubCategory ? 'Saving...' : 'Adding...') : (existingSubCategory ? 'Save Changes' : 'Add Sub-category')}
        </Button>
      </div>
    </form>
  );
};

export default SubCategoryForm;