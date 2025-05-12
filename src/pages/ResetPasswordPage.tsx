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
  const [canSetPassword, setCanSetPassword] = useState(false); // To enable form after event
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    // Supabase client automatically handles the hash and triggers onAuthStateChange
    // for PASSWORD_RECOVERY event. This sets up the session for password update.
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setCanSetPassword(true); // Enable the form
        showToast("You can now set your new password.", "info");
      } else if (event === 'USER_UPDATED') {
        // This event fires after a successful password update via supabase.auth.updateUser()
        // Handled in handleSubmit, but good to be aware of.
      }
    });

    // Check if tokens are already in the URL on mount (in case event fires before listener attaches)
    // Or if user navigates directly with hash.
    // A more robust check might be needed if issues arise, but onAuthStateChange is generally reliable.
    if (window.location.hash.includes('access_token') && window.location.hash.includes('type=recovery')) {
        // This suggests that a password recovery flow is in progress.
        // The onAuthStateChange listener should pick this up.
        // If not, manually triggering a session refresh or similar might be an advanced option.
        // For now, we rely on onAuthStateChange.
    } else if (!window.location.hash) {
        // If there's no hash, the user probably navigated here directly without a token.
        setError("Invalid or expired password reset link. Please request a new one.");
        showToast("Invalid or expired link.", "error");
        setCanSetPassword(false);
    }


    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [showToast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!canSetPassword) {
        setError("Cannot set password. The recovery link might be invalid or not yet processed.");
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
      // The access token from the URL hash is used by updateUser implicitly
      // once the Supabase client has processed the PASSWORD_RECOVERY event.
      const { error: updateError } = await supabase.auth.updateUser({ password: password });

      if (updateError) {
        throw updateError;
      }

      // The USER_UPDATED event will fire, but we can also give immediate feedback.
      setMessage("Your password has been updated successfully! Redirecting to login...");
      showToast("Password updated successfully!", "success");
      setPassword(''); // Clear fields
      setConfirmPassword(''); // Clear fields
      setTimeout(() => navigate('/login', { replace: true }), 3000);

    } catch (err: any) {
      console.error('Error updating password:', err);
      let displayError = "Failed to update password.";
      if (err.message.includes(" Аутентификациялық деректер жарамсыз") || err.message.toLowerCase().includes("invalid authentication credentials")) {
        displayError = "Invalid or expired session. Please try resetting your password again.";
      } else if (err.message.toLowerCase().includes("token has expired") || err.message.toLowerCase().includes("invalid token")) {
        displayError = "Password reset token has expired or is invalid. Please request a new one.";
      } else if (err.message.toLowerCase().includes("same password")) {
        displayError = "New password must be different from the old password.";
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
      {message && !error && ( // Only show general message if no specific error
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

      {!canSetPassword && !error && !message && (
         <div className="text-center text-gray-600 p-4 border rounded-md">
            <p>Verifying password reset link...</p>
            <p className="text-sm mt-2">If this message persists, the link might be invalid or expired.</p>
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