import React, { useState, useEffect } from 'react';
import { X, Pin, VolumeX, FileText, UserX, Shield, ShieldAlert, Edit2, UserPlus, Trash2, Check } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import API from '../services/api';

const UserInfoSidebar = ({ onClose }) => {
  const { user } = useAuth();
  const {
    selectedChat,
    messages,
    togglePinChat,
    toggleMuteChat,
    toggleBlockUser,
    blockedUserIds,
    updateGroupInfo,
    addGroupMember,
    removeGroupMember,
    promoteGroupAdmin,
    demoteGroupAdmin,
  } = useChat();

  const [activeTab, setActiveTab] = useState('media'); // 'media', 'files'
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    if (selectedChat?.isGroupChat) {
      setNewGroupName(selectedChat.chatName || '');
    }
  }, [selectedChat]);

  if (!selectedChat) return null;

  const otherUser = selectedChat.isGroupChat
    ? null
    : selectedChat.users?.find((u) => u._id !== user?._id) || selectedChat.users?.[0];

  const isPinned = selectedChat.pinnedBy?.includes(user?._id) || selectedChat.isPinned;
  const isMuted = selectedChat.mutedBy?.includes(user?._id) || selectedChat.isMuted;
  const isBlocked = otherUser ? blockedUserIds.has(otherUser._id) : false;

  const groupAdminsList = selectedChat.groupAdmins || (selectedChat.groupAdmin ? [selectedChat.groupAdmin] : []);
  const isCurrentUserGroupAdmin = selectedChat.isGroupChat && (
    (typeof selectedChat.groupAdmin === 'object' ? selectedChat.groupAdmin?._id === user?._id : selectedChat.groupAdmin === user?._id) ||
    groupAdminsList.some((ga) => (typeof ga === 'object' ? ga._id === user?._id : ga === user?._id))
  );

  const sharedImages = messages.filter((m) => m.fileType === 'image' && m.fileUrl);
  const sharedDocs = messages.filter((m) => m.fileType === 'document' && m.fileUrl);

  const handleSaveGroupName = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await updateGroupInfo(selectedChat._id, newGroupName);
    setIsEditingGroupName(false);
  };

  const handleGroupIconChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await updateGroupInfo(selectedChat._id, null, file);
    }
  };

  const handleOpenAddMember = async () => {
    try {
      const { data } = await API.get('/users');
      if (data.success) {
        // Filter out users already in group
        const existingIds = new Set((selectedChat.users || []).map((u) => (typeof u === 'object' ? u._id : u)));
        const nonMembers = data.users.filter((u) => !existingIds.has(u._id));
        setAvailableUsers(nonMembers);
        setShowAddMemberModal(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full sm:w-80 lg:w-96 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col z-20 transition-colors shadow-2xl select-none">
      {/* Header */}
      <div className="h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
          {selectedChat.isGroupChat ? 'Group Information' : 'Contact Info'}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Profile / Group Card */}
        <div className="text-center space-y-3">
          <div className="relative w-24 h-24 mx-auto group">
            <img
              src={
                selectedChat.isGroupChat
                  ? selectedChat.groupIcon || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200'
                  : otherUser?.avatar
              }
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-2 border-brand-500 shadow-xl"
            />
            {selectedChat.isGroupChat && isCurrentUserGroupAdmin && (
              <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Edit2 className="w-5 h-5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleGroupIconChange} />
              </label>
            )}
          </div>

          <div>
            {isEditingGroupName ? (
              <form onSubmit={handleSaveGroupName} className="flex items-center justify-center gap-1">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="px-2 py-1 text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded border border-brand-500 focus:outline-none"
                  autoFocus
                />
                <button type="submit" className="p-1 text-emerald-500">
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                  {selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.username || 'Contact'}
                </h4>
                {selectedChat.isGroupChat && isCurrentUserGroupAdmin && (
                  <button onClick={() => setIsEditingGroupName(true)} className="text-gray-400 hover:text-brand-500">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {selectedChat.isGroupChat
                ? `${selectedChat.users?.length || 0} Group Members`
                : otherUser?.email}
            </p>
          </div>
        </div>

        {/* Quick Actions (Pin / Mute) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => togglePinChat(selectedChat._id)}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
              isPinned
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700'
            }`}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500' : ''}`} />
            {isPinned ? 'Unpin Chat' : 'Pin Chat'}
          </button>
          <button
            onClick={() => toggleMuteChat(selectedChat._id)}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all ${
              isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700'
            }`}
          >
            <VolumeX className="w-4 h-4" />
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        {/* Group Participants Management */}
        {selectedChat.isGroupChat && (
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Group Members ({selectedChat.users?.length || 0})
              </h4>
              {isCurrentUserGroupAdmin && (
                <button
                  onClick={handleOpenAddMember}
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Member
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-gray-100 dark:divide-gray-800/60 pr-1">
              {selectedChat.users?.map((usr) => {
                const memberObj = typeof usr === 'object' ? usr : { _id: usr, username: 'Member' };
                const isMemberAdmin = groupAdminsList.some(
                  (ga) => (typeof ga === 'object' ? ga._id === memberObj._id : ga === memberObj._id)
                );

                return (
                  <div key={memberObj._id} className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={memberObj.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={memberObj.username}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      />
                      <div className="truncate min-w-0">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {memberObj.username} {memberObj._id === user?._id && '(You)'}
                        </p>
                        {isMemberAdmin && (
                          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5" /> Group Admin
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin Management Actions */}
                    {isCurrentUserGroupAdmin && memberObj._id !== user?._id && (
                      <div className="flex items-center gap-1">
                        {isMemberAdmin ? (
                          <button
                            onClick={() => demoteGroupAdmin(selectedChat._id, memberObj._id)}
                            className="p-1 text-amber-500 hover:bg-amber-500/10 rounded"
                            title="Dismiss as Admin"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => promoteGroupAdmin(selectedChat._id, memberObj._id)}
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                            title="Make Group Admin"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => removeGroupMember(selectedChat._id, memberObj._id)}
                          className="p-1 text-rose-500 hover:bg-rose-500/10 rounded"
                          title="Remove from Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shared Media / Documents */}
        <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'media'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Media ({sharedImages.length})
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'files'
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Docs ({sharedDocs.length})
            </button>
          </div>

          {activeTab === 'media' ? (
            sharedImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedImages.map((m) => (
                  <img
                    key={m._id}
                    src={m.fileUrl}
                    alt="Media"
                    className="w-full h-20 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border border-gray-200 dark:border-gray-800"
                    onClick={() => window.open(m.fileUrl, '_blank')}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-center text-gray-400 py-4">No shared images</p>
            )
          ) : sharedDocs.length > 0 ? (
            <div className="space-y-2">
              {sharedDocs.map((m) => (
                <a
                  key={m._id}
                  href={m.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 text-xs text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700/50"
                >
                  <FileText className="w-4 h-4 text-brand-500" />
                  <span className="truncate flex-1">{m.fileName || 'Attachment.pdf'}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center text-gray-400 py-4">No shared documents</p>
          )}
        </div>

        {/* Security & Danger Zone (Block User) */}
        {!selectedChat.isGroupChat && otherUser && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <button
              onClick={() => toggleBlockUser(otherUser._id)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                isBlocked
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20'
              }`}
            >
              <UserX className="w-4 h-4" />
              {isBlocked ? `Unblock ${otherUser.username}` : `Block ${otherUser.username}`}
            </button>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Add Participant</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2">
              {availableUsers.length > 0 ? (
                availableUsers.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{u.username}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await addGroupMember(selectedChat._id, u._id);
                        setShowAddMemberModal(false);
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-500"
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center text-gray-400 py-4">No contacts available to add</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInfoSidebar;
