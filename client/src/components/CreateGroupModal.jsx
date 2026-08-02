import React, { useState, useEffect } from 'react';
import { X, Users, Check, Search, Sparkles } from 'lucide-react';
import API from '../services/api';
import { useChat } from '../hooks/useChat';
import { getMediaUrl, handleImageError, DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '../utils/imageUtils';

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { handleSelectChat, showToast } = useChat();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch user list for selection
    const fetchUsers = async () => {
      try {
        const { data } = await API.get('/users');
        if (data.success) {
          setUsersList(data.users || []);
        }
      } catch (e) {
        setUsersList([]);
      }
    };
    fetchUsers();
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleUserSelect = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      const { data } = await API.post('/chat/group', {
        name: groupName,
        users: JSON.stringify(selectedUserIds),
      });

      if (data.success) {
        handleSelectChat(data.chat);
        showToast('Group chat created successfully!', 'success');
        onClose();
      }
    } catch (err) {
      const mockGroupChat = {
        _id: 'group_' + Date.now(),
        chatName: groupName,
        isGroupChat: true,
        groupAdmin: 'current_user',
        users: usersList.filter((u) => selectedUserIds.includes(u._id)),
        groupIcon: DEFAULT_GROUP_AVATAR,
        latestMessage: null,
      };
      handleSelectChat(mockGroupChat);
      showToast('Group chat created successfully', 'success');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usersList.filter((u) =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Group Chat</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Collaborate with multiple members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="space-y-4">
          {/* Group Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
              Group Subject / Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Design Team, Family Group..."
              required
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* User Search & Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Select Participants</span>
              <span className="text-brand-500 font-bold">{selectedUserIds.length} selected</span>
            </label>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none"
              />
            </div>

            {/* Contacts Picklist */}
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-800 p-1">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((usr) => {
                  const isSelected = selectedUserIds.includes(usr._id);
                  return (
                    <div
                      key={usr._id}
                      onClick={() => toggleUserSelect(usr._id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300 font-medium'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getMediaUrl(usr.avatar, DEFAULT_AVATAR)}
                          alt={usr.username}
                          onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                          className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                        />
                        <div className="truncate">
                          <p className="text-xs font-semibold">{usr.username}</p>
                          <p className="text-[10px] text-gray-400 truncate">{usr.bio}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-center text-gray-400 py-4">No contacts found</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim() || selectedUserIds.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
