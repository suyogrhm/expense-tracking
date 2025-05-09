import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import type { UserDefinedCategory, UserDefinedSubCategory } from '../../types';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import CategoryForm from './CategoryForm';
import SubCategoryForm from './SubCategoryForm';
import { PlusCircle, Edit3, Trash2, ChevronDown, ChevronRight, Loader2, Tag } from 'lucide-react';

const UserCategoryManager: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<UserDefinedCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<UserDefinedCategory | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<UserDefinedSubCategory | null>(null);
  const [parentCategoryForSub, setParentCategoryForSub] = useState<UserDefinedCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const fetchCategoriesAndSubCategories = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Use the explicit foreign key name as hinted by Supabase error
      const { data: cats, error: catError } = await supabase
        .from('user_defined_categories')
        .select('*, user_defined_sub_categories!main_category_id_fk(*)') 
        .eq('user_id', user.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (catError) {
        console.error("Detailed Supabase error:", JSON.stringify(catError, null, 2));
        throw catError;
      }
      
      const processedCats = (cats || []).map(cat => {
        // Ensure user_defined_sub_categories is always an array
        const subCategoriesArray = Array.isArray(cat.user_defined_sub_categories)
          ? cat.user_defined_sub_categories
          : [];
        return {
          ...cat,
          user_defined_sub_categories: subCategoriesArray
        };
      });
      setCategories(processedCats);

    } catch (error: any) {
      showToast("Failed to load categories. " + error.message, "error");
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchCategoriesAndSubCategories();
  }, [fetchCategoriesAndSubCategories]);

  const handleOpenCategoryModal = (category: UserDefinedCategory | null = null) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleOpenSubCategoryModal = (parentCat: UserDefinedCategory, subCategory: UserDefinedSubCategory | null = null) => {
    setParentCategoryForSub(parentCat);
    setEditingSubCategory(subCategory);
    setIsSubCategoryModalOpen(true);
  };

  const handleCategorySaved = () => {
    fetchCategoriesAndSubCategories();
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };
  
  const handleSubCategorySaved = () => {
    fetchCategoriesAndSubCategories(); 
    setIsSubCategoryModalOpen(false);
    setEditingSubCategory(null);
    setParentCategoryForSub(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Are you sure you want to delete this category and all its sub-categories? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.from('user_defined_categories').delete().eq('id', categoryId);
      if (error) throw error;
      showToast("Category deleted successfully.", "success");
      fetchCategoriesAndSubCategories();
    } catch (error: any) {
      showToast("Failed to delete category. " + error.message, "error");
    }
  };
  
  const handleDeleteSubCategory = async (subCategoryId: string) => {
     if (!window.confirm("Are you sure you want to delete this sub-category?")) return;
    try {
      const { error } = await supabase.from('user_defined_sub_categories').delete().eq('id', subCategoryId);
      if (error) throw error;
      showToast("Sub-category deleted successfully.", "success");
      fetchCategoriesAndSubCategories();
    } catch (error: any) {
      showToast("Failed to delete sub-category. " + error.message, "error");
    }
  };

  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const renderCategoryList = (type: 'expense' | 'income') => {
    const filteredCategories = categories.filter(cat => cat.type === type);
    if (filteredCategories.length === 0 && !isLoading) { 
      return <p className="text-gray-500 dark:text-dark-text-secondary italic py-4">No custom {type} categories yet.</p>;
    }
    return filteredCategories.map(cat => (
      <div key={cat.id} className="mb-3 p-3 border border-color rounded-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Button variant="icon" size="sm" onClick={() => toggleExpandCategory(cat.id)} aria-label={expandedCategories[cat.id] ? "Collapse" : "Expand"}>
              {expandedCategories[cat.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </Button>
            <Tag size={18} className="mr-2 text-primary-500 dark:text-dark-primary" />
            <span className="font-medium">{cat.name}</span>
          </div>
          <div className="space-x-2">
            <Button variant="icon" size="sm" onClick={() => handleOpenCategoryModal(cat)}><Edit3 size={16} className="text-blue-600 dark:text-blue-400" /></Button>
            <Button variant="icon" size="sm" onClick={() => handleDeleteCategory(cat.id)}><Trash2 size={16} className="text-red-500 dark:text-red-400" /></Button>
          </div>
        </div>
        {expandedCategories[cat.id] && (
          <div className="ml-8 mt-2 pl-4 border-l border-color">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Sub-categories:</h4>
              <Button size="sm" variant="outline" onClick={() => handleOpenSubCategoryModal(cat)}>
                <PlusCircle size={14} className="mr-1"/> Add Sub
              </Button>
            </div>
            {(Array.isArray(cat.user_defined_sub_categories) && cat.user_defined_sub_categories.length > 0) ? (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {cat.user_defined_sub_categories.map((sub: UserDefinedSubCategory) => ( 
                  <li key={sub.id} className="flex justify-between items-center hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded">
                    <span>{sub.name}</span>
                    <div className="space-x-1">
                       <Button variant="icon" size="icon" onClick={() => handleOpenSubCategoryModal(cat, sub)}><Edit3 size={14} className="text-blue-500 dark:text-blue-400" /></Button>
                       <Button variant="icon" size="icon" onClick={() => handleDeleteSubCategory(sub.id)}><Trash2 size={14} className="text-red-500 dark:text-red-400" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">No sub-categories defined.</p>
            )}
          </div>
        )}
      </div>
    ));
  };


  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary-500 dark:text-dark-primary" /><p className="ml-3">Loading categories...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="content-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-dark-text">Expense Categories</h2>
          <Button onClick={() => handleOpenCategoryModal()} variant="primary">
            <PlusCircle size={18} className="mr-2" /> Add Expense Category
          </Button>
        </div>
        {renderCategoryList('expense')}
      </div>

      <div className="content-card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-dark-text">Income Categories</h2>
           <Button onClick={() => handleOpenCategoryModal()} variant="secondary"> 
            <PlusCircle size={18} className="mr-2" /> Add Income Category
          </Button>
        </div>
         {renderCategoryList('income')}
      </div>

      {isCategoryModalOpen && (
        <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={editingCategory ? "Edit Category" : "Add New Category"}>
          <CategoryForm existingCategory={editingCategory} onCategorySaved={handleCategorySaved} onFormCancel={() => setIsCategoryModalOpen(false)} />
        </Modal>
      )}
      {isSubCategoryModalOpen && parentCategoryForSub && (
         <Modal isOpen={isSubCategoryModalOpen} onClose={() => setIsSubCategoryModalOpen(false)} title={editingSubCategory ? `Edit Sub-category for ${parentCategoryForSub.name}` : `Add Sub-category to ${parentCategoryForSub.name}`}>
            <SubCategoryForm 
                parentCategory={parentCategoryForSub} 
                existingSubCategory={editingSubCategory} 
                onSubCategorySaved={handleSubCategorySaved}
                onFormCancel={() => setIsSubCategoryModalOpen(false)}
            />
        </Modal>
      )}
    </div>
  );
};

export default UserCategoryManager;