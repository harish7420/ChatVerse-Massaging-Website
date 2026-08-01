import React, { useState } from 'react';
import { Camera, User, Mail, FileText, Save, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import FeedbackModal from '../components/FeedbackModal';

const ProfilePage = () => {
  const { user, updateUserProfile, loading, toast } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatar || '');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('username', username);
    formData.append('bio', bio);
    if (selectedFile) formData.append('avatar', selectedFile);

    await updateUserProfile(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      <Navbar onOpenFeedback={() => setShowFeedbackModal(true)} />
      <Toast toast={toast} />

      <div className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Profile</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage your avatar, personal details, and bio</p>
        </div>

        <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-6 shadow-sm">
          {/* Avatar Uploader */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Avatar"
                className="w-28 h-28 rounded-full object-cover border-4 border-brand-500/50 shadow-xl"
              />
              <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" onChange={handleAvatarChange} accept="image/*" className="hidden" />
              </label>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Click avatar image to upload new photo</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Email Address (Read-only)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800/40 text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Bio Status</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <textarea
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={150}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>
              <p className="text-[10px] text-right text-gray-500">{bio.length}/150 characters</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      </div>

      {showFeedbackModal && (
        <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
};

export default ProfilePage;
