import React from 'react';
import { Link, NavLink } from 'react-router-dom'; 
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, LayoutDashboard, History, UserCircle, Wallet } from 'lucide-react';
import Button from '../ui/Button'; 

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-primary-700 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-2 text-xl font-semibold hover:text-primary-200 transition-colors">
            <Wallet className="h-7 w-7" />
            <span>ExpenseTracker</span>
          </Link>

          <div className="flex items-center space-x-1 md:space-x-2"> 
            <NavLinkItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
            <NavLinkItem to="/history" icon={<History size={20} />} label="History" />
            
            {user && (
              <div className="relative group">
                <button className="flex items-center space-x-2 px-2 py-2 md:px-3 rounded-md hover:bg-primary-600 transition-colors">
                  <UserCircle size={24} />
                  <span className="hidden md:inline text-sm">{user.email?.split('@')[0]}</span>
                </button>
                {/* Changed mt-2 to top-full to eliminate the gap */}
                <div className="absolute right-0 top-full w-48 bg-white rounded-md shadow-xl z-20 hidden group-hover:block py-1"> 
                  <span className="block px-4 py-2 text-xs text-gray-500 truncate" title={user.email || undefined}>{user.email}</span>
                  <div className="border-t border-gray-200 my-1"></div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full text-left text-gray-700 hover:bg-gray-100 flex items-center space-x-2 px-4 py-2"
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
       ${isActive ? 'bg-primary-800 text-white' : 'text-primary-100 hover:bg-primary-600 hover:text-white'}`
    }
  >
    {icon}
    <span className="hidden md:inline">{label}</span>
  </NavLink>
);


export default Navbar;