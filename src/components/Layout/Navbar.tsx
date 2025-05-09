import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom'; 
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext'; 
import { LogOut, LayoutDashboard, History, UserCircle, Wallet, Landmark, Target, Sun, Moon, Settings, ListPlus, Menu, X as CloseIcon } from 'lucide-react';
import Button from '../ui/Button'; 
import classNames from 'classnames';

// Define interfaces first
interface NavLinkItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

interface MobileNavLinkItemProps extends NavLinkItemProps {
    onClick: () => void;
}

// Define helper components next
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

const MobileNavLinkItem: React.FC<MobileNavLinkItemProps> = ({ to, icon, label, onClick }) => (
  <NavLink 
    to={to} 
    onClick={onClick}
    className={({ isActive }) => 
      `flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors
       ${isActive ? 'bg-primary-100 dark:bg-primary-700 text-primary-700 dark:text-white' : 'text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700'}`
    }
  >
    {icon}
    <span>{label}</span> 
  </NavLink>
);

// Main Navbar component
const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme(); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);


  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false); 
      setIsProfileDropdownOpen(false); 
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (isProfileDropdownOpen) setIsProfileDropdownOpen(false); 
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false); 
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  return (
    <nav className="bg-primary-700 text-white shadow-lg dark:bg-gray-800 sticky top-0 z-50"> 
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-2 text-xl font-semibold hover:text-primary-200 dark:hover:text-primary-300 transition-colors">
            <Wallet className="h-7 w-7" />
            <span>ExpenseTracker</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1"> 
            <NavLinkItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            <NavLinkItem to="/income" icon={<Landmark size={18} />} label="Income" /> 
            <NavLinkItem to="/history" icon={<History size={18} />} label="Expenses" /> 
            <NavLinkItem to="/budgets" icon={<Target size={18} />} label="Budgets" /> 
            
            <Button onClick={toggleTheme} variant="ghost" size="icon" className="text-primary-100 hover:bg-primary-600 dark:text-gray-300 dark:hover:bg-gray-700" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </Button>
            
            {user && (
              <div className="relative" ref={profileDropdownRef}>
                <button 
                  onClick={toggleProfileDropdown}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-primary-600 dark:hover:bg-gray-700 transition-colors"
                >
                  <UserCircle size={24} />
                  <span className="text-sm">{user.email?.split('@')[0]}</span>
                </button>
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-dark-card rounded-md shadow-xl z-20 py-1 border border-gray-200 dark:border-dark-border"> 
                    <span className="block px-4 py-2 text-xs text-gray-500 dark:text-dark-text-secondary truncate" title={user.email || undefined}>{user.email}</span>
                    <div className="border-t border-color my-1"></div>
                    <Link to="/profile" onClick={() => setIsProfileDropdownOpen(false)} className="w-full text-left text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 px-4 py-2 text-sm">
                      <Settings size={16} />
                      <span>Profile</span>
                    </Link>
                    <Link to="/settings/categories" onClick={() => setIsProfileDropdownOpen(false)} className="w-full text-left text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 px-4 py-2 text-sm">
                      <ListPlus size={16} />
                      <span>Manage Categories</span>
                    </Link>
                    <div className="border-t border-color my-1"></div>
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      className="w-full text-left text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2 px-4 py-2"
                      size="md" 
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button onClick={toggleTheme} variant="ghost" size="icon" className="text-primary-100 hover:bg-primary-600 dark:text-gray-300 dark:hover:bg-gray-700 mr-2" aria-label="Toggle theme">
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </Button>
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-primary-100 hover:text-white hover:bg-primary-600 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? <CloseIcon className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div ref={mobileMenuRef} className={classNames("md:hidden absolute top-16 inset-x-0 p-2 transition transform origin-top-right shadow-lg", { "block": isMobileMenuOpen, "hidden": !isMobileMenuOpen })} id="mobile-menu">
        <div className="rounded-lg bg-white dark:bg-dark-card ring-1 ring-black ring-opacity-5 dark:ring-gray-700 overflow-hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <MobileNavLinkItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" onClick={() => setIsMobileMenuOpen(false)} />
            <MobileNavLinkItem to="/income" icon={<Landmark size={18} />} label="Income" onClick={() => setIsMobileMenuOpen(false)} />
            <MobileNavLinkItem to="/history" icon={<History size={18} />} label="Expenses" onClick={() => setIsMobileMenuOpen(false)} />
            <MobileNavLinkItem to="/budgets" icon={<Target size={18} />} label="Budgets" onClick={() => setIsMobileMenuOpen(false)} />
          </div>
          {user && (
            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-5">
                <UserCircle size={32} className="flex-shrink-0 text-gray-500 dark:text-gray-400"/>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800 dark:text-dark-text">{user.email?.split('@')[0]}</div>
                  <div className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary">{user.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <MobileNavLinkItem to="/profile" icon={<Settings size={18} />} label="Profile" onClick={() => setIsMobileMenuOpen(false)} />
                <MobileNavLinkItem to="/settings/categories" icon={<ListPlus size={18} />} label="Manage Categories" onClick={() => setIsMobileMenuOpen(false)} />
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;