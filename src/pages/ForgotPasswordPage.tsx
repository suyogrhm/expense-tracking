import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Mail, ArrowLeft } from 'lucide-react'; // Removed Loader2
import { useToast } from '../hooks/useToast';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false); // Changed state to boolean
  const { forgotPassword } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setMessageSent(true); // Set to true on successful attempt
      showToast("Password reset instructions sent (if account exists).", "success");
    } catch (error: any) {
      console.error('Forgot password failed:', error);
      // Supabase handles not revealing if email exists.
      // We still show a generic success message to the user.
      setMessageSent(true); 
      showToast("Could not send reset instructions. Please try again or contact support.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Reset Password</h2>
      {messageSent ? (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-300 text-green-700 text-sm">
            If an account exists for <span className="font-medium">{email}</span>, a password reset link has been sent. Please check your inbox (and spam folder).
        </div>
      ) : (
        <p className="text-sm text-gray-600 mb-4 text-center">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      )}
      {!messageSent && ( // Only show form if message hasn't been "sent"
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="emailForgot" // Changed ID
            type="email"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} className="text-gray-400" />}
            placeholder="you@example.com"
            required
          />
          <Button type="submit" className="w-full" disabled={loading} isLoading={loading}>
            Send Reset Link
          </Button>
        </form>
      )}
      <p className="mt-8 text-center text-sm">
        <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 flex items-center justify-center">
          <ArrowLeft size={16} className="mr-1" /> Back to Sign In
        </Link>
      </p>
    </>
  );
};

export default ForgotPasswordPage;