import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar'; 
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const MainLayout: React.FC = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Set status bar style
      StatusBar.setStyle({ style: Style.Dark });
      // Set status bar background color to match navbar
      StatusBar.setBackgroundColor({ color: '#1d4ed8' }); // primary-700 color
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-dark-background text-gray-900 dark:text-dark-text transition-colors duration-300">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl safe-area-inset-bottom">
        <Outlet />
      </main>
      <footer className="bg-white dark:bg-gray-800 shadow-sm py-4 text-center text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300 safe-area-inset-bottom">
        © {new Date().getFullYear()} Expense Tracker App. All rights reserved.
      </footer>
    </div>
  );
};

export default MainLayout;