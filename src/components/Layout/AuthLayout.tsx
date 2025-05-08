import React from 'react';
import { Outlet } from 'react-router-dom';
import { Wallet } from 'lucide-react'; // Example icon

const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="mb-8 flex flex-col items-center">
        <Wallet className="h-16 w-16 text-white mb-3" />
        <h1 className="text-4xl font-bold text-white">Expense Tracker</h1>
      </div>
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <Outlet />
      </div>
       <p className="mt-8 text-center text-sm text-primary-200">
        Track your expenses efficiently.
      </p>
    </div>
  );
};

export default AuthLayout;