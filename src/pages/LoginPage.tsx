import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/useToast'; 

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast("Login successful!", "success");
      navigate('/dashboard', { replace: true }); // Ensure navigation happens after state update
    } catch (error: any) {
      console.error('Login failed:', error);
      showToast(error.message || "Login failed. Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Welcome Back!</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="email"
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={18} className="text-gray-400" />}
          placeholder="you@example.com"
          required
        />
        <Input
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={18} className="text-gray-400" />}
          placeholder="••••••••"
          required
        />
        <div className="flex items-center justify-end text-sm"> {/* Adjusted alignment */}
          <Link to="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={loading} isLoading={loading}>
          {/* Loader is now handled by isLoading prop in Button component */}
          Sign In
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
          Sign up
        </Link>
      </p>
    </>
  );
};

export default LoginPage;