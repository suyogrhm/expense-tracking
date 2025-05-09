import React from 'react';
import { Link, NavLink } from 'react-router-dom'; 
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext'; // New Import
import { LogOut, LayoutDashboard, History, UserCircle, Wallet, Landmark, Target, Sun, Moon, Settings } from 'lucide-react'; // Added Sun, Moon, Settings
import Button from '../ui/Button'; 

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme(); // Use theme context

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-primary-700 text-white shadow-lg dark:bg-gray-800"> {/* Dark mode for navbar */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-2 text-xl font-semibold hover:text-primary-200 dark:hover:text-primary-300 transition-colors">
            <Wallet className="h-7 w-7" />
            <span>ExpenseTracker</span>
          </Link>

          <div className="flex items-center space-x-1 md:space-x-2"> 
            <NavLinkItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavLinkItem to="/income" icon={<Landmark size={18} />} label="Income" /> 
            <NavLinkItem to="/history" icon={<History size={18} />} label="Expenses" /> 
            <NavLinkItem to="/budgets" icon={<Target size={18} />} label="Budgets" /> 
            
            <Button onClick={toggleTheme} variant="ghost" size="icon" className="text-primary-100 hover:bg-primary-600 dark:hover:bg-gray-700" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </Button>
            
            {user && (
              <div className="relative group">
                <button className="flex items-center space-x-2 px-2 py-2 md:px-3 rounded-md hover:bg-primary-600 dark:hover:bg-gray-700 transition-colors">
                  <UserCircle size={24} />
                  <span className="hidden md:inline text-sm">{user.email?.split('@')[0]}</span>
                </button>
                {/* Removed mt-1 from here to fix the hover issue */}
                <div className="absolute right-0 top-full w-48 bg-white dark:bg-gray-700 rounded-md shadow-xl z-20 hidden group-hover:block py-1"> 
                  <span className="block px-4 py-2 text-xs text-gray-500 dark:text-gray-400 truncate" title={user.email || undefined}>{user.email}</span>
                  <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                  <Link to="/profile" className="w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 px-4 py-2 text-sm">
                    <Settings size={16} />
                    <span>Profile & Settings</span>
                  </Link>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 px-4 py-2"
                    size="md" 
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

interface NavLinkItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavLinkItem: React.FC<NavLinkItemProps> = ({ to, icon, label }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center space-x-1 md:space-x-2 px-2 py-2 md:px-3 rounded-md text-sm font-medium transition-colors
       ${isActive ? 'bg-primary-800 dark:bg-primary-600 text-white' : 'text-primary-100 dark:text-gray-300 hover:bg-primary-600 dark:hover:bg-gray-700 hover:text-white dark:hover:text-white'}`
    }
  >
    {icon}
    <span className="hidden lg:inline">{label}</span> 
  </NavLink>
);

export default Navbar;