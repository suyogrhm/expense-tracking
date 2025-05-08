import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Mail, Lock } from 'lucide-react'; // Removed Loader2 as Button handles it
import { useToast } from '../hooks/useToast';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password should be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    try {
      await register(email, password);
      showToast("Registration successful! Please check your email to verify.", "success");
      navigate('/login'); 
    } catch (error: any) {
      console.error('Registration failed:', error);
      showToast(error.message || "Registration failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Create your Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="emailReg" // Changed ID to avoid conflict with login page if rendered together in tests
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={18} className="text-gray-400" />}
          placeholder="you@example.com"
          required
        />
        <Input
          id="passwordReg" // Changed ID
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={18} className="text-gray-400" />}
          placeholder="Create a strong password (min. 6 chars)"
          required
        />
        <Input
          id="confirmPasswordReg" // Changed ID
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock size={18} className="text-gray-400" />}
          placeholder="Confirm your password"
          required
        />
        <Button type="submit" className="w-full" disabled={loading} isLoading={loading}>
          Sign Up
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
          Sign in
        </Link>
      </p>
    </>
  );
};

export default RegisterPage;