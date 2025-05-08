import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar'; // We'll create this

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-white shadow-sm py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Expense Tracker App. All rights reserved.
      </footer>
    </div>
  );
};

export default MainLayout;