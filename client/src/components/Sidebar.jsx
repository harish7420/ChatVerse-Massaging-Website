import React, { useState, useEffect } from 'react';
import { Search, Users, Pin, MessageCircle, Sparkles, UserPlus } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import API from '../services/api';
import { getMediaUrl, handleImageError, DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '../utils/imageUtils';

const Sidebar = ({ onOpenCreateGroup, onOpenStories }) => {
  const { user } = useAuth();
  const { chats, selectedChat, handleSelectChat, searchQuery, setSearchQuery, blockedUserIds } = useChat();
  const { onlineUsers, socket } = useSocket();

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pinned', 'groups'
  const [activeStatuses, setActiveStatuses] = useState([]);

  // Fetch active statuses for regular users
  useEffect(() => {
    if (user?.isAdmin) return;

    const fetchStatuses = async () => {
      try {
        const { data } = await API.get('/status');
        if (data.success) {
          setActiveStatuses(data.statuses || []);
        }
      } catch (e) {
        // Ignore fallback
      }
    };

    fetchStatuses();

    if (socket) {
      const handleStatusPosted = () => fetchStatuses();
      socket.on('status_posted', handleStatusPosted);
      socket.on('status_deleted', handleStatusPosted);
      return () => {
        socket.off('status_posted', handleStatusPosted);
        socket.off('status_deleted', handleStatusPosted);
      };
    }
  }, [user, socket]);

  // Search users API call
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await API.get(`/users?search=${encodeURIComponent(searchQuery)}`);
        if (data.success) {
          setSearchResults(data.users);
        }
      } catch (error) {
        console.error('User search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartDirectChat = async (targetUserId) => {
    try {
      const { data } = await API.post('/chat', { userId: targetUserId });
      if (data.success) {
        handleSelectChat(data.chat);
        setSearchQuery('');
      }
    } catch (e) {
      console.error('Failed to start chat:', e);
    }
  };

  // Sort chats: Pinned chats first, then by updatedAt / latestMessage date
  const sortedChats = [...chats].sort((a, b) => {
    const aPinned = a.pinnedBy?.includes(user?._id) || a.isPinned;
    const bPinned = b.pinnedBy?.includes(user?._id) || b.isPinned;

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    const dateA = a.latestMessage?.createdAt || a.updatedAt || 0;
    const dateB = b.latestMessage?.createdAt || b.updatedAt || 0;
    return new Date(dateB) - new Date(dateA);
  });

  const filteredChats = sortedChats.filter((chat) => {
    const isPinned = chat.pinnedBy?.includes(user?._id) || chat.isPinned;
    if (activeTab === 'pinned') return isPinned;
    if (activeTab === 'groups') return chat.isGroupChat;
    return true;
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800/80 transition-colors select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand-500" />
            Messages
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenCreateGroup}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20 hover:bg-brand-500/20 transition-all flex items-center gap-1.5"
              title="Create New Group Chat"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Group</span>
            </button>
          </div>
        </div>

        {/* WhatsApp Style Stories Reel Bar (ONLY FOR REGULAR USERS, HIDDEN FOR ADMINS) */}
        {!user?.isAdmin && (
          <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar">
            {/* Add My Status */}
            <div
              onClick={onOpenStories}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 group"
            >
              <div className="relative">
                <img
                  src={getMediaUrl(user?.avatar, DEFAULT_AVATAR)}
                  alt={user?.username || 'My Status'}
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  className="w-11 h-11 rounded-full object-cover border-2 border-gray-300 dark:border-gray-700 p-0.5 group-hover:scale-105 transition-transform"
                />
                <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold absolute bottom-0 right-0 border border-white dark:border-gray-900">
                  +
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">My Status</span>
            </div>

            {/* Contact Status Stories */}
            {activeStatuses.map((stGroup) => {
              if (stGroup.user?._id === user?._id) return null;
              return (
                <div
                  key={stGroup.user?._id || Math.random()}
                  onClick={onOpenStories}
                  className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 group"
                >
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-brand-500 via-indigo-500 to-pink-500 group-hover:scale-105 transition-transform">
                    <img
                      src={getMediaUrl(stGroup.user?.avatar, DEFAULT_AVATAR)}
                      alt={stGroup.user?.username || 'Status'}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-900"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate max-w-[50px]">
                    {stGroup.user?.username || 'Contact'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts or start chat..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 border border-gray-200 dark:border-gray-700/60 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Filter Navigation Tabs */}
        {!searchQuery && (
          <div className="flex items-center gap-1.5 pt-1">
            {['all', 'pinned', 'groups'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/40">
        {/* Search Mode */}
        {searchQuery ? (
          <div className="p-2 space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Search Results
            </div>
            {isSearching ? (
              <div className="p-4 text-center text-sm text-gray-400">Searching contacts directory...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((usr) => (
                <div
                  key={usr._id}
                  onClick={() => handleStartDirectChat(usr._id)}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer transition-colors group"
                >
                  <div className="relative">
                    <img
                      src={getMediaUrl(usr.avatar, DEFAULT_AVATAR)}
                      alt={usr.username}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                    {usr.isOnline && (
                      <span className="w-3 h-3 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-white dark:border-gray-900 online-dot" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-300 truncate">
                        {usr.username}
                      </h4>
                      <UserPlus className="w-4 h-4 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{usr.bio}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">No contacts found matching "{searchQuery}"</div>
            )}
          </div>
        ) : (
          /* Recent Conversations List */
          <div className="p-2 space-y-1">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat) => {
                const otherUser = chat.isGroupChat
                  ? null
                  : chat.users?.find((u) => u._id !== user?._id) || chat.users?.[0];

                const isOnline = otherUser ? onlineUsers.has(otherUser._id) || otherUser.isOnline : false;
                const isSelected = selectedChat?._id === chat._id;
                const isPinned = chat.pinnedBy?.includes(user?._id) || chat.isPinned;
                const isMuted = chat.mutedBy?.includes(user?._id) || chat.isMuted;
                const isBlocked = otherUser ? blockedUserIds.has(otherUser._id) : false;

                const avatarSrc = chat.isGroupChat
                  ? getMediaUrl(chat.groupIcon, DEFAULT_GROUP_AVATAR)
                  : getMediaUrl(otherUser?.avatar, DEFAULT_AVATAR);
                const avatarFallback = chat.isGroupChat ? DEFAULT_GROUP_AVATAR : DEFAULT_AVATAR;

                return (
                  <div
                    key={chat._id}
                    onClick={() => handleSelectChat(chat)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-500/10 dark:bg-brand-600/20 border border-brand-500/30 text-gray-900 dark:text-white shadow-sm'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {/* Avatar Badge */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={avatarSrc}
                        alt={chat.chatName || otherUser?.username || 'Avatar'}
                        onError={(e) => handleImageError(e, avatarFallback)}
                        className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      />
                      {!chat.isGroupChat && isOnline && !isBlocked && (
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-white dark:border-gray-900 online-dot" />
                      )}
                    </div>

                    {/* Chat Content Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <span>{chat.isGroupChat ? chat.chatName : otherUser?.username || 'Direct Contact'}</span>
                          {isMuted && <span className="text-xs text-gray-400">🔇</span>}
                        </h4>
                        <span className="text-[11px] text-gray-400">
                          {chat.latestMessage?.createdAt
                            ? new Date(chat.latestMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {isBlocked
                            ? 'Blocked Contact'
                            : chat.latestMessage?.content ||
                              (chat.latestMessage?.fileType
                                ? `[${chat.latestMessage.fileType.toUpperCase()}]`
                                : 'No messages yet')}
                        </p>
                        {isPinned && (
                          <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 ml-1 fill-amber-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty State when User has no previous conversations */
              <div className="p-8 text-center text-sm text-gray-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-200 text-base">No conversations found</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Search for a contact above to start a new chat!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
