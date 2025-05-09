import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import HistoryPage from './pages/HistoryPage';
import IncomePage from './pages/IncomePage'; 
import BudgetsPage from './pages/BudgetsPage'; 
import UserProfilePage from './pages/UserProfilePage'; // New Import
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import AuthLayout from './components/Layout/AuthLayout';
import { Toaster } from './components/ui/Toaster'; 

function App() {
  return (
    <>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/income" element={<IncomePage />} /> 
          <Route path="/budgets" element={<BudgetsPage />} /> 
          <Route path="/profile" element={<UserProfilePage />} /> {/* New Route */}
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} /> 
      </Routes>
      <Toaster />
    </>
  );
}

export default App;