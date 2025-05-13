import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Adjust path if necessary
import Input from '../components/ui/Input';    // Adjust path if necessary
import Button from '../components/ui/Button';  // Adjust path if necessary
import { useToast } from '../hooks/useToast';  // Adjust path if necessary
import { KeyRound, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react'; // Icons

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canSetPassword, setCanSetPassword] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true; // Handle component unmounting

    // Log the hash as soon as the component mounts for debugging
    if (mounted) {
      console.log("ResetPasswordPage mounted. Full URL:", window.location.href);
      console.log("ResetPasswordPage hash:", window.location.hash);
    }

    // Explicitly check for necessary tokens in the hash first
    if (!window.location.hash.includes('access_token') || !window.location.hash.includes('type=recovery')) {
      if (mounted) {
        setError("Invalid or expired password reset link. URL does not appear to contain the necessary recovery tokens. Please request a new one.");
        showToast("Invalid link: Missing recovery tokens in URL.", "error");
        setCanSetPassword(false);
      }
      return; // Stop further processing if tokens are clearly missing from the hash
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("Supabase Auth Event:", event, session); // Log all auth events

      if (event === 'PASSWORD_RECOVERY') {
        showToast("Recovery tokens recognized. You can now set your new password.", "info");
        setCanSetPassword(true);
        setError(null); // Clear previous errors like "missing tokens"
      } else if (event === 'USER_UPDATED') {
        // This event fires after a successful password update via supabase.auth.updateUser()
        // Feedback for this is primarily handled in handleSubmit, but good to log.
        console.log("User password updated successfully via Supabase event.");
      }
      // Note: If there's an error during Supabase's internal processing of the token (e.g., token invalid from Supabase's perspective),
      // it might not always fire a specific error event here. The failure might become apparent when `updateUser` is called.
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [showToast]); // Dependencies for useEffect

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Clear previous submit errors
    setMessage(null);

    if (!canSetPassword) {
      setError("Cannot set password. The recovery link might be invalid, not yet processed, or tokens were not found in the URL.");
      showToast("Please wait or ensure the link is valid.", "warning");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters long.");
      showToast("Password too short (minimum 6 characters).", "error");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      showToast("Passwords do not match.", "error");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: password });

      if (updateError) {
        throw updateError; // Throw to be caught by catch block
      }

      setMessage("Your password has been updated successfully! Redirecting to login...");
      showToast("Password updated successfully!", "success");
      setPassword('');
      setConfirmPassword('');
      setCanSetPassword(false); // Prevent re-submission
      setTimeout(() => navigate('/login', { replace: true }), 3000);

    } catch (err: any) {
      console.error('Error updating password:', err);
      let displayError = "Failed to update password. Please try again.";
      // More specific error messages based on Supabase common errors
      if (err.message) {
        if (err.message.toLowerCase().includes("invalid authentication credentials") || err.message.includes(" Аутентификациялық деректер жарамсыз")) {
          displayError = "Invalid session or credentials. Please try requesting a new password reset link.";
        } else if (err.message.toLowerCase().includes("token has expired") || err.message.toLowerCase().includes("invalid token") || err.message.toLowerCase().includes("recovery token not found")) {
          displayError = "Password reset token has expired, is invalid, or was not found. Please request a new one.";
        } else if (err.message.toLowerCase().includes("same password")) {
          displayError = "New password must be different from the old password.";
        } else if (err.message.toLowerCase().includes("rate limit exceeded")) {
            displayError = "Too many attempts. Please try again later.";
        } else if (err.message.toLowerCase().includes("user not found")) {
            displayError = "User not found. The account may have been deleted or the link is incorrect.";
        }
      }
      setError(displayError);
      showToast(displayError, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Set New Password</h2>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-300 text-red-700 text-sm flex items-center">
          <ShieldAlert size={18} className="mr-2 shrink-0" />
          {error}
        </div>
      )}
      {message && !error && (
        <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-300 text-green-700 text-sm flex items-center">
          <ShieldCheck size={18} className="mr-2 shrink-0" />
          {message}
        </div>
      )}

      {canSetPassword && !message && ( // Only show form if allowed and no success message yet
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="newPassword"
            type="password"
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<KeyRound size={18} className="text-gray-400" />}
            placeholder="Enter your new password"
            required
            disabled={loading}
          />
          <Input
            id="confirmNewPassword"
            type="password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<KeyRound size={18} className="text-gray-400" />}
            placeholder="Confirm your new password"
            required
            disabled={loading}
          />
          <Button type="submit" className="w-full" disabled={loading || !password || !confirmPassword} isLoading={loading}>
            Set New Password
          </Button>
        </form>
      )}

      {!canSetPassword && !error && !message && ( // Shown if tokens missing or not yet processed
         <div className="text-center text-gray-600 p-4 border rounded-md">
            <p>Verifying password reset link...</p>
            <p className="text-sm mt-2">If this message persists, the link might be invalid, tokens missing, or an error occurred.</p>
         </div>
      )}

      <p className="mt-8 text-center text-sm">
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="font-medium text-primary-600 hover:text-primary-500 flex items-center justify-center"
          aria-label="Back to Sign In"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Sign In
        </button>
      </p>
    </>
  );
};

export default ResetPasswordPage;