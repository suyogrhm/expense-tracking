import React from 'react';
import UserCategoryManager from '../components/Categories/UserCategoryManager';
import { ListChecks } from 'lucide-react';

const ManageCategoriesPage: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="content-card flex items-center space-x-3">
        <ListChecks className="h-8 w-8 text-primary-600 dark:text-dark-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-dark-text">Manage Categories</h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">Add, edit, or delete your custom expense and income categories.</p>
        </div>
      </div>
      <UserCategoryManager />
    </div>
  );
};

export default ManageCategoriesPage;