import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../hooks/useToast';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Mail, KeyRound, User as UserIcon, Edit, Save, X as CloseIcon } from 'lucide-react'; // Added X as CloseIcon

const UserProfilePage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth(); 
  const { showToast } = useToast();
  
  const [currentUsername, setCurrentUsername] = useState(user?.user_metadata?.username || '');
  const [newUsername, setNewUsername] = useState(user?.user_metadata?.username || '');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUsernameUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newUsername.trim()) {
        showToast("Username cannot be empty.", "error");
        return;
    }
    if (newUsername.trim() === currentUsername) {
        setIsEditingUsername(false);
        return;
    }
    setIsUpdatingUsername(true);
    try {
        const { data, error } = await supabase.auth.updateUser({
            data: { username: newUsername.trim() }
        });
        if (error) throw error;
        if (data.user) {
            setCurrentUsername(data.user.user_metadata.username);
            await supabase.auth.refreshSession(); 
            showToast("Username updated successfully!", "success");
        }
        setIsEditingUsername(false);
    } catch (error: any) {
        console.error("Error updating username:", error);
        showToast(error.message || "Failed to update username.", "error");
    } finally {
        setIsUpdatingUsername(false);
    }
  };


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
      <div className="content-card"> 
        <div className="flex items-center space-x-4 mb-6 pb-4 border-b border-color">
          <UserIcon size={40} className="text-primary-500 dark:text-dark-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-dark-text">User Profile</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary">Manage your account settings.</p>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
                <UserIcon size={20} className="text-gray-500 dark:text-dark-text-secondary mr-3" />
                <div>
                    <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Username</p>
                    {!isEditingUsername ? (
                        <p className="text-md font-medium text-gray-700 dark:text-dark-text">{currentUsername || 'Not set'}</p>
                    ) : (
                        <form onSubmit={handleUsernameUpdate} className="flex items-center gap-2">
                            <Input
                                id="editUsername"
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="py-1 text-sm" 
                                autoFocus
                            />
                            <Button type="submit" size="sm" variant="primary" isLoading={isUpdatingUsername} disabled={isUpdatingUsername} className="p-1.5">
                                <Save size={16}/>
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setIsEditingUsername(false); setNewUsername(currentUsername);}} className="p-1.5">
                                <CloseIcon size={16}/>
                            </Button>
                        </form>
                    )}
                </div>
            </div>
            {!isEditingUsername && (
                <Button variant="ghost" size="icon" onClick={() => {setIsEditingUsername(true); setNewUsername(currentUsername); }}>
                    <Edit size={16} className="text-gray-500 hover:text-primary-500"/>
                </Button>
            )}
          </div>

          <div className="flex items-center">
            <Mail size={20} className="text-gray-500 dark:text-dark-text-secondary mr-3" />
            <div>
              <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Email</p>
              <p className="text-md font-medium text-gray-700 dark:text-dark-text">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-color pt-6">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-dark-text mb-4">Change Password</h2>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <Input
              id="newPassword"
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<KeyRound size={18} className="text-gray-400 dark:text-gray-500" />}
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
              icon={<KeyRound size={18} className="text-gray-400 dark:text-gray-500" />}
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
      </div>
    </div>
  );
};

export default UserProfilePage;