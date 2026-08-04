import React, { useRef, useEffect, useState } from 'react';
import { Phone, Video, Info, Sparkles, ArrowLeft, Search, X, ShieldAlert, MoreVertical, Trash2, Eraser, Pin, VolumeX, AlertTriangle } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { getMediaUrl, handleImageError, DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '../utils/imageUtils';

const ChatArea = ({ onToggleUserInfo, onOpenImageLightbox }) => {
  const { user } = useAuth();
  const {
    selectedChat,
    messages,
    loadingMessages,
    typingUsers,
    handleSelectChat,
    blockedUserIds,
    blockedByIds,
    toggleBlockUser,
    deleteChat,
    clearChat,
    togglePinChat,
    toggleMuteChat,
  } = useChat();
  const { onlineUsers, initiateCall } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'delete'|'clear' }

  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const otherUser = selectedChat?.isGroupChat
    ? null
    : selectedChat?.users?.find((u) => u._id !== user?._id) || selectedChat?.users?.[0];

  const isOnline = otherUser ? onlineUsers.has(otherUser._id) || otherUser.isOnline : false;
  const isBlockedByMe = otherUser ? blockedUserIds.has(otherUser._id) : false;
  const isBlockedByOther = otherUser ? blockedByIds.has(otherUser._id) : false;
  const isBlockedEither = isBlockedByMe || isBlockedByOther;
  const isPinned = selectedChat?.pinnedBy?.includes(user?._id) || selectedChat?.isPinned;
  const isMuted = selectedChat?.mutedBy?.includes(user?._id) || selectedChat?.isMuted;

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!selectedChat) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/60 text-center select-none transition-colors w-full">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600/30 to-indigo-500/20 flex items-center justify-center text-brand-500 mb-6 border border-brand-500/30 shadow-2xl animate-float">
          <Sparkles className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome to ChatVerse</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
          Select a contact or group from the sidebar to launch an encrypted real-time conversation.
        </p>
      </div>
    );
  }

  // Filter messages by search query if in-chat search is active
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const headerAvatarSrc = selectedChat.isGroupChat
    ? getMediaUrl(selectedChat.groupIcon, DEFAULT_GROUP_AVATAR)
    : getMediaUrl(otherUser?.avatar, DEFAULT_AVATAR);

  const headerAvatarFallback = selectedChat.isGroupChat ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR;

  const handleExecuteConfirmedAction = () => {
    if (!confirmModal) return;
    if (confirmModal.type === 'delete') {
      deleteChat(selectedChat._id);
    } else if (confirmModal.type === 'clear') {
      clearChat(selectedChat._id);
    }
    setConfirmModal(null);
    setShowHeaderMenu(false);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-gray-50 dark:bg-gray-950 relative min-w-0 transition-colors w-full overflow-hidden select-none">
      {/* Top Chat Header */}
      <header className="h-16 px-3 sm:px-4 md:px-6 bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10 backdrop-blur-md transition-colors w-full relative">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Back button for mobile view */}
          <button
            onClick={() => handleSelectChat(null)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex-shrink-0"
            title="Back to Chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={onToggleUserInfo}>
            <img
              src={headerAvatarSrc}
              alt={selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.username || 'Avatar'}
              onError={(e) => handleImageError(e, headerAvatarFallback)}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
            />
            {!selectedChat.isGroupChat && isOnline && !isBlockedEither && (
              <span className="w-3 h-3 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-white dark:border-gray-900 online-dot" />
            )}
          </div>

          {/* Name & Online Status */}
          <div className="min-w-0 cursor-pointer flex-1" onClick={onToggleUserInfo}>
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate flex items-center gap-1.5">
              <span>{selectedChat.isGroupChat ? selectedChat.chatName : otherUser?.username || 'Contact'}</span>
              {isMuted && <span className="text-xs text-gray-400">🔇</span>}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {selectedChat.isGroupChat
                ? `${selectedChat.users?.length || 0} members`
                : isBlockedEither
                ? 'Unavailable'
                : isOnline
                ? 'Online'
                : 'Offline'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0 relative">
          {/* In-Chat Search Bar Toggle */}
          {showInChatSearch ? (
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                autoFocus
                className="w-28 sm:w-48 px-2.5 py-1 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none"
              />
              <button
                onClick={() => {
                  setShowInChatSearch(false);
                  setSearchQuery('');
                }}
                className="ml-1 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowInChatSearch(true)}
              className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Search Messages"
            >
              <Search className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => otherUser && !isBlockedEither && initiateCall(otherUser, 'audio')}
            disabled={isBlockedEither || selectedChat.isGroupChat}
            className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Start Audio Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => otherUser && !isBlockedEither && initiateCall(otherUser, 'video')}
            disabled={isBlockedEither || selectedChat.isGroupChat}
            className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Start Video Call"
          >
            <Video className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleUserInfo}
            className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="User Profile Info"
          >
            <Info className="w-5 h-5" />
          </button>

          {/* Three-Dot Menu Button */}
          <button
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="More Options"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Header Three-Dot Context Menu */}
          {showHeaderMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 top-12 z-30 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl py-1.5 text-xs text-gray-700 dark:text-gray-200 animate-fade-in"
            >
              <button
                onClick={() => {
                  togglePinChat(selectedChat._id);
                  setShowHeaderMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 font-medium"
              >
                <Pin className="w-4 h-4 text-amber-500" />
                <span>{isPinned ? 'Unpin Chat' : 'Pin Chat'}</span>
              </button>

              <button
                onClick={() => {
                  toggleMuteChat(selectedChat._id);
                  setShowHeaderMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 font-medium"
              >
                <VolumeX className="w-4 h-4 text-indigo-400" />
                <span>{isMuted ? 'Unmute Chat' : 'Mute Chat'}</span>
              </button>

              {!selectedChat.isGroupChat && otherUser && (
                <button
                  onClick={() => {
                    toggleBlockUser(otherUser._id);
                    setShowHeaderMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 font-medium text-amber-600 dark:text-amber-400"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>{isBlockedByMe ? 'Unblock User' : 'Block User'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setConfirmModal({ type: 'clear' });
                  setShowHeaderMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 font-medium text-rose-600 dark:text-rose-400 border-t border-gray-100 dark:border-gray-700/60"
              >
                <Eraser className="w-4 h-4" />
                <span>Clear Chat</span>
              </button>

              <button
                onClick={() => {
                  setConfirmModal({ type: 'delete' });
                  setShowHeaderMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2.5 font-semibold text-rose-600 dark:text-rose-500"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Chat</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages Timeline Canvas with Pattern Wallpaper */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-2 chat-pattern w-full">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            Loading messages history...
          </div>
        ) : displayedMessages.length > 0 ? (
          displayedMessages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              onOpenImageLightbox={onOpenImageLightbox}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No matching messages found' : 'No messages yet in this conversation'}
            </p>
            <p className="text-xs text-gray-400">Send a message below to break the ice!</p>
          </div>
        )}

        {/* Real-time Typing Status Banner */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-xs text-brand-600 dark:text-brand-300 font-medium italic animate-pulse py-1">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
            <span>{Array.from(typingUsers).join(', ')} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Block Restrictions Warning Banner or Message Input Bar */}
      {isBlockedEither ? (
        <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 text-center space-y-2 w-full">
          <div className="flex items-center justify-center gap-2 text-rose-500 font-semibold text-xs">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>
              {isBlockedByMe
                ? 'You have blocked this contact. Unblock to send messages or make calls.'
                : 'You cannot send messages to this user.'}
            </span>
          </div>
          {isBlockedByMe && otherUser && (
            <button
              onClick={() => toggleBlockUser(otherUser._id)}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow transition-all"
            >
              Unblock {otherUser.username}
            </button>
          )}
        </div>
      ) : (
        <MessageInput />
      )}

      {/* Confirmation Modal for Delete Chat & Clear Chat */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                {confirmModal.type === 'delete' ? 'Delete Conversation?' : 'Clear Chat History?'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {confirmModal.type === 'delete'
                  ? `Are you sure you want to delete this chat with "${selectedChat.chatName || 'this contact'}"? All messages will be permanently deleted.`
                  : `Are you sure you want to clear all messages in "${selectedChat.chatName || 'this chat'}"?`}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all"
              >
                {confirmModal.type === 'delete' ? 'Delete Chat' : 'Clear Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
