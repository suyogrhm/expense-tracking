import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar'; 

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-dark-background text-gray-900 dark:text-dark-text transition-colors duration-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-white dark:bg-gray-800 shadow-sm py-4 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">
        © {new Date().getFullYear()} Expense Tracker App. All rights reserved.
      </footer>
    </div>
  );
};

export default MainLayout;