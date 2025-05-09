import React from 'react';
import { Outlet } from 'react-router-dom';
import { Wallet } from 'lucide-react'; 

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 dark:from-gray-800 dark:to-gray-900 p-4 transition-colors duration-300">
      <div className="mb-8 flex flex-col items-center">
        <Wallet className="h-16 w-16 text-white mb-3" />
        <h1 className="text-4xl font-bold text-white">Expense Tracker</h1>
      </div>
      {/* Applied .content-card styling to the form container */}
      <div className="w-full max-w-md content-card p-8 sm:p-10"> 
        <Outlet />
      </div>
       <p className="mt-8 text-center text-sm text-primary-200 dark:text-gray-400 transition-colors duration-300">
        Track your expenses efficiently.
      </p>
    </div>
  );
};

export default AuthLayout;