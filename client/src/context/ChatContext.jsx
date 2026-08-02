import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import API from '../services/api';
import { AuthContext } from './AuthContext';
import { SocketContext } from './SocketContext';

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

  // Fetch all chats for logged in user
  const fetchChats = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/chat');
      if (data.success) {
        setChats(data.chats);
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
        setMessages(data.messages);
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
        return [chat, ...prev];
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

    const formData = new FormData();
    formData.append('chatId', selectedChat._id);
    if (content) formData.append('content', content);
    if (replyToMessage) formData.append('replyToId', replyToMessage._id);
    if (file) formData.append('file', file);

    try {
      const { data } = await API.post('/message', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
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

  // Toggle Pin Chat
  const togglePinChat = async (chatId) => {
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
    } catch (error) {
      showToast('Failed to toggle pin state', 'error');
    }
  };

  // Toggle Mute Chat
  const toggleMuteChat = async (chatId) => {
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
    } catch (error) {
      showToast('Failed to toggle mute state', 'error');
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
  const updateGroupInfo = async (chatId, chatName, groupIconFile = null) => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    if (chatName) formData.append('chatName', chatName);
    if (groupIconFile) formData.append('groupIcon', groupIconFile);

    try {
      const { data } = await API.put('/chat/group/info', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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
    // Optimistic local state update
    setMessages((prev) =>
      prev.map((msg) =>
        msg._id === messageId
          ? { ...msg, isDeleted: true, content: 'This message was deleted', fileUrl: '' }
          : msg
      )
    );

    if (socket && selectedChat) {
      socket.emit('delete_message', { messageId, chatId: selectedChat._id });
    }

    try {
      const { data } = await API.delete(`/messages/${messageId}`);
      if (data.success) {
        showToast('Message deleted', 'info');
      }
    } catch (error) {
      // Fallback try singular endpoint if plural endpoint fails
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
        setMessages((prev) => [...prev, newMessage]);
      }
      setChats((prev) =>
        prev.map((c) => (c._id === targetChatId ? { ...c, latestMessage: newMessage } : c))
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, content: 'This message was deleted', fileUrl: '' }
            : msg
        )
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
    socket.on('group_updated', handleGroupUpdated);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_deleted', handleMessageDeleted);
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
