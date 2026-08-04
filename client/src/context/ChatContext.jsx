import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import API from '../services/api';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';
import { fileToBase64 } from '../utils/imageUtils';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, showToast } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [blockedUserIds, setBlockedUserIds] = useState(new Set());
  const [blockedByIds, setBlockedByIds] = useState(new Set());

  // Helper to deduplicate array of objects by _id
  const deduplicateById = (items = []) => {
    const map = new Map();
    items.forEach((item) => {
      if (item && item._id) map.set(item._id.toString(), item);
    });
    return Array.from(map.values());
  };

  // Fetch all chats for logged in user
  const fetchChats = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/chat');
      if (data.success) {
        setChats(deduplicateById(data.chats || []));
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    }
  }, [user]);

  // Fetch blocked users list for logged in user
  const fetchBlockedUsers = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/users/blocked');
      if (data.success) {
        setBlockedUserIds(new Set(data.blockedUserIds || []));
        setBlockedByIds(new Set(data.blockedByIds || []));
      }
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    }
  }, [user]);

  // Fetch messages for selected chat
  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    setLoadingMessages(true);
    try {
      const { data } = await API.get(`/message/${chatId}`);
      if (data.success) {
        setMessages(deduplicateById(data.messages || []));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Select active chat room and auto-add to sidebar if missing
  const handleSelectChat = (chat) => {
    if (!chat) {
      setSelectedChat(null);
      return;
    }

    setSelectedChat(chat);
    setReplyToMessage(null);

    // Add chat to sidebar if not present
    setChats((prev) => {
      const exists = prev.some((c) => c._id === chat._id);
      if (!exists) {
        return deduplicateById([chat, ...prev]);
      }
      return prev;
    });

    if (socket) {
      socket.emit('join_room', chat._id);
    }
    fetchMessages(chat._id);
  };

  // Send message API & real-time emit
  const sendMessage = async (content, file = null) => {
    if (!selectedChat) return;

    // Check block status before sending
    const otherUser = selectedChat.isGroupChat
      ? null
      : selectedChat.users?.find((u) => u._id !== user?._id) || selectedChat.users?.[0];

    if (otherUser && (blockedUserIds.has(otherUser._id) || blockedByIds.has(otherUser._id))) {
      showToast('Cannot send message due to block restrictions', 'error');
      return;
    }

    let fileUrl = '';
    let fileName = '';
    let fileType = 'text';

    if (file) {
      fileName = file.name;
      const mime = file.type || '';
      if (mime.startsWith('image/')) fileType = 'image';
      else if (mime.startsWith('video/')) fileType = 'video';
      else if (mime.startsWith('audio/')) fileType = 'audio';
      else fileType = 'document';

      fileUrl = await fileToBase64(file);
    }

    const payload = {
      chatId: selectedChat._id,
      content: content || '',
      replyToId: replyToMessage ? replyToMessage._id : null,
      fileUrl,
      fileName,
      fileType,
    };

    try {
      const { data } = await API.post('/message', payload);

      if (data.success) {
        setMessages((prev) => deduplicateById([...prev, data.message]));
        setReplyToMessage(null);

        if (socket) {
          socket.emit('send_message', data.message);
        }

        // Update latest message in chat list
        setChats((prev) =>
          prev.map((c) => (c._id === selectedChat._id ? { ...c, latestMessage: data.message } : c))
        );
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send message', 'error');
    }
  };

  // WhatsApp-like Delete Chat
  const deleteChat = async (chatId) => {
    if (!chatId) return;

    // Find recipient to inform via socket if direct chat
    const chatToDelete = chats.find((c) => c._id === chatId);
    const recipientUser = chatToDelete?.isGroupChat
      ? null
      : chatToDelete?.users?.find((u) => u._id !== user?._id);

    // Instant local UI state update
    setChats((prev) => prev.filter((c) => c._id !== chatId));
    if (selectedChat?._id === chatId) {
      setSelectedChat(null);
      setMessages([]);
    }

    if (socket) {
      socket.emit('delete_chat', { chatId, recipientId: recipientUser?._id });
    }

    try {
      const { data } = await API.delete(`/conversation/${chatId}`);
      if (data.success) {
        showToast('Chat deleted successfully', 'success');
      }
    } catch (error) {
      try {
        await API.delete(`/chat/${chatId}`);
        showToast('Chat deleted successfully', 'success');
      } catch (e) {
        showToast('Failed to delete conversation from server', 'error');
        fetchChats();
      }
    }
  };

  // WhatsApp-like Clear Chat
  const clearChat = async (chatId) => {
    if (!chatId) return;

    const chatToClear = chats.find((c) => c._id === chatId);
    const recipientUser = chatToClear?.isGroupChat
      ? null
      : chatToClear?.users?.find((u) => u._id !== user?._id);

    // Instant local UI state update
    if (selectedChat?._id === chatId) {
      setMessages([]);
    }
    setChats((prev) =>
      prev.map((c) => (c._id === chatId ? { ...c, latestMessage: null } : c))
    );

    if (socket) {
      socket.emit('clear_chat', { chatId, recipientId: recipientUser?._id });
    }

    try {
      const { data } = await API.delete(`/conversation/${chatId}/messages`);
      if (data.success) {
        showToast('Chat history cleared', 'info');
      }
    } catch (error) {
      try {
        await API.delete(`/chat/${chatId}/messages`);
        showToast('Chat history cleared', 'info');
      } catch (e) {
        showToast('Failed to clear messages from server', 'error');
        if (selectedChat?._id === chatId) fetchMessages(chatId);
      }
    }
  };

  // Toggle Pin Chat
  const togglePinChat = async (chatId) => {
    try {
      const { data } = await API.patch(`/chat/${chatId}/pin`, { chatId });
      if (data.success || data.chat) {
        const updated = data.chat;
        setChats((prev) =>
          prev.map((c) => {
            if (c._id === chatId) {
              const pinnedBy = updated ? updated.pinnedBy : c.pinnedBy || [];
              const isPinned = pinnedBy.includes(user._id);
              return { ...c, pinnedBy, isPinned };
            }
            return c;
          })
        );
        showToast('Chat pin status updated', 'success');
      }
    } catch (error) {
      try {
        const { data } = await API.put(`/chat/${chatId}/action`, { action: 'pin' });
        if (data.success) {
          setChats((prev) =>
            prev.map((c) => {
              if (c._id === chatId) {
                const pinnedBy = c.pinnedBy || [];
                const isPinned = pinnedBy.includes(user._id);
                const updatedPinnedBy = isPinned
                  ? pinnedBy.filter((id) => id !== user._id)
                  : [...pinnedBy, user._id];
                return { ...c, pinnedBy: updatedPinnedBy, isPinned: !isPinned };
              }
              return c;
            })
          );
          showToast('Chat pin status updated', 'success');
        }
      } catch (err) {
        showToast('Failed to toggle pin state', 'error');
      }
    }
  };

  // Toggle Mute Chat
  const toggleMuteChat = async (chatId) => {
    try {
      const { data } = await API.patch(`/chat/${chatId}/mute`, { chatId });
      if (data.success || data.chat) {
        const updated = data.chat;
        setChats((prev) =>
          prev.map((c) => {
            if (c._id === chatId) {
              const mutedBy = updated ? updated.mutedBy : c.mutedBy || [];
              const isMuted = mutedBy.includes(user._id);
              return { ...c, mutedBy, isMuted };
            }
            return c;
          })
        );
        showToast('Chat mute status updated', 'success');
      }
    } catch (error) {
      try {
        const { data } = await API.put(`/chat/${chatId}/action`, { action: 'mute' });
        if (data.success) {
          setChats((prev) =>
            prev.map((c) => {
              if (c._id === chatId) {
                const mutedBy = c.mutedBy || [];
                const isMuted = mutedBy.includes(user._id);
                const updatedMutedBy = isMuted
                  ? mutedBy.filter((id) => id !== user._id)
                  : [...mutedBy, user._id];
                return { ...c, mutedBy: updatedMutedBy, isMuted: !isMuted };
              }
              return c;
            })
          );
          showToast('Chat mute status updated', 'success');
        }
      } catch (err) {
        showToast('Failed to toggle mute state', 'error');
      }
    }
  };

  // Block User
  const toggleBlockUser = async (targetUserId) => {
    const isCurrentlyBlocked = blockedUserIds.has(targetUserId);
    const endpoint = isCurrentlyBlocked ? `/users/unblock/${targetUserId}` : `/users/block/${targetUserId}`;

    try {
      const { data } = await API.post(endpoint);
      if (data.success) {
        setBlockedUserIds((prev) => {
          const next = new Set(prev);
          if (isCurrentlyBlocked) next.delete(targetUserId);
          else next.add(targetUserId);
          return next;
        });
        showToast(
          isCurrentlyBlocked ? 'User unblocked successfully' : 'User blocked successfully',
          'info'
        );
      }
    } catch (error) {
      showToast('Failed to change block status', 'error');
    }
  };

  // Group Management Functions
  const updateGroupInfo = async (chatId, chatName, groupIconBase64 = null) => {
    try {
      const { data } = await API.put('/chat/group/info', {
        chatId,
        chatName,
        groupIcon: groupIconBase64,
      });
      if (data.success && data.chat) {
        setChats((prev) => prev.map((c) => (c._id === chatId ? data.chat : c)));
        if (selectedChat?._id === chatId) setSelectedChat(data.chat);
        if (socket) socket.emit('group_updated', data.chat);
        showToast('Group information updated', 'success');
      }
    } catch (error) {
      showToast('Failed to update group info', 'error');
    }
  };

  const addGroupMember = async (chatId, targetUserId) => {
    try {
      const { data } = await API.put('/chat/group/add', { chatId, userId: targetUserId });
      if (data.success && data.chat) {
        setChats((prev) => prev.map((c) => (c._id === chatId ? data.chat : c)));
        if (selectedChat?._id === chatId) setSelectedChat(data.chat);
        if (socket) socket.emit('group_updated', data.chat);
        showToast('Member added to group', 'success');
      }
    } catch (error) {
      showToast('Failed to add group member', 'error');
    }
  };

  const removeGroupMember = async (chatId, targetUserId) => {
    try {
      const { data } = await API.put('/chat/group/remove', { chatId, userId: targetUserId });
      if (data.success && data.chat) {
        setChats((prev) => prev.map((c) => (c._id === chatId ? data.chat : c)));
        if (selectedChat?._id === chatId) setSelectedChat(data.chat);
        if (socket) socket.emit('group_updated', data.chat);
        showToast('Member removed from group', 'success');
      }
    } catch (error) {
      showToast('Failed to remove group member', 'error');
    }
  };

  const promoteGroupAdmin = async (chatId, targetUserId) => {
    try {
      const { data } = await API.put('/chat/group/promote', { chatId, userId: targetUserId });
      if (data.success && data.chat) {
        setChats((prev) => prev.map((c) => (c._id === chatId ? data.chat : c)));
        if (selectedChat?._id === chatId) setSelectedChat(data.chat);
        if (socket) socket.emit('group_updated', data.chat);
        showToast('Member promoted to admin', 'success');
      }
    } catch (error) {
      showToast('Failed to promote member', 'error');
    }
  };

  const demoteGroupAdmin = async (chatId, targetUserId) => {
    try {
      const { data } = await API.put('/chat/group/demote', { chatId, userId: targetUserId });
      if (data.success && data.chat) {
        setChats((prev) => prev.map((c) => (c._id === chatId ? data.chat : c)));
        if (selectedChat?._id === chatId) setSelectedChat(data.chat);
        if (socket) socket.emit('group_updated', data.chat);
        showToast('Admin role removed', 'success');
      }
    } catch (error) {
      showToast('Failed to demote admin', 'error');
    }
  };

  // Delete Message API & real-time socket emit
  const deleteMessage = async (messageId) => {
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

    if (socket && selectedChat) {
      socket.emit('delete_message', { messageId, chatId: selectedChat._id });
    }

    try {
      const { data } = await API.delete(`/messages/${messageId}`);
      if (data.success) {
        showToast('Message deleted', 'info');
      }
    } catch (error) {
      try {
        await API.delete(`/message/${messageId}`);
      } catch (err) {}
      showToast('Message deleted', 'info');
    }
  };

  // Socket event listeners for real-time chat updates
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      const targetChatId = newMessage.chat._id || newMessage.chat;
      if (selectedChat && selectedChat._id === targetChatId) {
        setMessages((prev) => deduplicateById([...prev, newMessage]));
      }
      setChats((prev) =>
        prev.map((c) => (c._id === targetChatId ? { ...c, latestMessage: newMessage } : c))
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    const handleChatDeleted = ({ chatId }) => {
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      if (selectedChat && selectedChat._id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    };

    const handleChatCleared = ({ chatId }) => {
      if (selectedChat && selectedChat._id === chatId) {
        setMessages([]);
      }
      setChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, latestMessage: null } : c))
      );
    };

    const handleGroupUpdated = (updatedChat) => {
      if (!updatedChat) return;
      setChats((prev) => prev.map((c) => (c._id === updatedChat._id ? updatedChat : c)));
      if (selectedChat && selectedChat._id === updatedChat._id) {
        setSelectedChat(updatedChat);
      }
    };

    const handleTyping = ({ room, username }) => {
      if (selectedChat && selectedChat._id === room) {
        setTypingUsers((prev) => new Set(prev).add(username));
      }
    };

    const handleStopTyping = ({ room }) => {
      if (selectedChat && selectedChat._id === room) {
        setTypingUsers(new Set());
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('chat_deleted', handleChatDeleted);
    socket.on('chat_cleared', handleChatCleared);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('chat_deleted', handleChatDeleted);
      socket.off('chat_cleared', handleChatCleared);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, selectedChat]);

  useEffect(() => {
    fetchChats();
    fetchBlockedUsers();
  }, [fetchChats, fetchBlockedUsers]);

  return (
    <ChatContext.Provider
      value={{
        chats,
        selectedChat,
        messages,
        loadingMessages,
        typingUsers,
        searchQuery,
        setSearchQuery,
        replyToMessage,
        setReplyToMessage,
        blockedUserIds,
        blockedByIds,
        handleSelectChat,
        sendMessage,
        deleteMessage,
        deleteChat,
        clearChat,
        fetchChats,
        togglePinChat,
        toggleMuteChat,
        toggleBlockUser,
        updateGroupInfo,
        addGroupMember,
        removeGroupMember,
        promoteGroupAdmin,
        demoteGroupAdmin,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
