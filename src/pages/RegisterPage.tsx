import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import { useToast } from '../hooks/useToast';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast("Username is required.", "error");
      return;
    }
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
      const { error } = await register({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          }
        }
      });

      if (error) throw error;

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
      <h2 className="text-2xl font-semibold text-center text-gray-700 dark:text-dark-text mb-6">Create your Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="usernameReg"
          type="text"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          icon={<UserIcon size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
          placeholder="Choose a username"
          required
        />
        <Input
          id="emailReg"
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
          placeholder="you@example.com"
          required
        />
        <Input
          id="passwordReg"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
          placeholder="Create a strong password (min. 6 chars)"
          required
        />
        <Input
          id="confirmPasswordReg"
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock size={18} className="text-gray-400 dark:text-dark-text-secondary" />}
          placeholder="Confirm your password"
          required
        />
        <Button type="submit" className="w-full" disabled={loading} isLoading={loading}>
          Sign Up
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600 dark:text-dark-text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-600 dark:text-dark-primary hover:text-primary-500 dark:hover:text-primary-400">
          Sign in
        </Link>
      </p>
    </>
  );
};

export default RegisterPage;