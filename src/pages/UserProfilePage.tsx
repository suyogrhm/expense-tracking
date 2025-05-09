import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Mail, KeyRound, User, Edit } from 'lucide-react';

const UserProfilePage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  // For future: state for other editable profile fields

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long.", "error");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast("Password updated successfully! You might be logged out.", "success");
      setNewPassword('');
      setConfirmNewPassword('');
      // Supabase might sign the user out or require re-authentication after password change.
      // The AuthContext listener should handle navigation if the session becomes invalid.
    } catch (error: any) {
      console.error("Error updating password:", error);
      showToast(error.message || "Failed to update password.", "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (authLoading) {
    return <div className="text-center p-10">Loading profile...</div>;
  }

  if (!user) {
    return <div className="text-center p-10 text-red-500">User not found. Please log in.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="p-6 sm:p-8 bg-white dark:bg-dark-card shadow-lg rounded-xl card-bg border-color">
        <div className="flex items-center space-x-4 mb-6 pb-4 border-b border-color">
          <User size={40} className="text-primary-500 dark:text-dark-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-dark-text">User Profile</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account settings.</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center">
            <Mail size={20} className="text-gray-500 dark:text-gray-400 mr-3" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-md font-medium text-gray-700 dark:text-dark-text">{user.email}</p>
            </div>
          </div>
          {/* Add more profile fields here if needed in the future, e.g., Name, Phone */}
        </div>

        {/* Update Password Section */}
        <div className="border-t border-color pt-6">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4">Change Password</h2>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <Input
              id="newPassword"
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<KeyRound size={18} className="text-gray-400" />}
              placeholder="Enter new password (min. 6 chars)"
              required
              autoComplete="new-password"
            />
            <Input
              id="confirmNewPassword"
              type="password"
              label="Confirm New Password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              icon={<KeyRound size={18} className="text-gray-400" />}
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
            />
            <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={isUpdatingPassword} isLoading={isUpdatingPassword}>
              <Edit size={16} className="mr-2"/>
              Update Password
            </Button>
          </form>
        </div>
        
        {/* Placeholder for Account Deletion - to be implemented later */}
        {/* <div className="border-t border-color pt-6 mt-8">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Danger Zone</h2>
          <Button variant="danger" onClick={() => showToast("Account deletion not yet implemented.", "info")}>
            Delete My Account
          </Button>
          <p className="text-xs text-gray-500 mt-2">This action is irreversible.</p>
        </div> */}

      </div>
    </div>
  );
};

export default UserProfilePage;