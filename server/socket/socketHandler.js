/**
 * Real-Time Socket.io Event Handler for ChatVerse
 * Handles 1-on-1 chats, group rooms, typing indicators, read receipts, statuses, group updates, and WebRTC calls.
 */

const onlineUsersMap = new Map(); // userId -> socketId

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket] New Client Connected: ${socket.id}`);

    // User Setup & Online Status Register
    socket.on('setup', (userData) => {
      if (!userData || !userData._id) return;
      socket.userId = userData._id.toString();
      socket.join(userData._id.toString());
      onlineUsersMap.set(userData._id.toString(), socket.id);

      io.emit('user_online', { userId: userData._id.toString() });
      console.log(`[Socket] User Registered Online: ${userData.username} (${userData._id})`);
    });

    // Room Joining (Chat Conversation Scope)
    socket.on('join_room', (room) => {
      if (!room) return;
      socket.join(room.toString());
      console.log(`[Socket] Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('leave_room', (room) => {
      if (!room) return;
      socket.leave(room.toString());
      console.log(`[Socket] Socket ${socket.id} left room: ${room}`);
    });

    // Typing Status Events
    socket.on('typing', ({ room, username }) => {
      if (!room) return;
      socket.in(room.toString()).emit('typing', { room: room.toString(), username });
    });

    socket.on('stop_typing', ({ room }) => {
      if (!room) return;
      socket.in(room.toString()).emit('stop_typing', { room: room.toString() });
    });

    // New Message Dispatch
    socket.on('send_message', (newMessageReceived) => {
      const chat = newMessageReceived.chat;
      if (!chat) return console.log('[Socket Error] Chat object missing on send_message');

      const roomID = typeof chat === 'string' ? chat : chat._id.toString();

      // Broadcast to room
      socket.in(roomID).emit('receive_message', newMessageReceived);

      // Notify direct recipients if in group or array of users
      if (chat.users && Array.isArray(chat.users)) {
        chat.users.forEach((user) => {
          const recipientId = typeof user === 'string' ? user : user._id.toString();
          if (recipientId === newMessageReceived.sender._id.toString()) return;
          socket.in(recipientId).emit('message_notification', newMessageReceived);
        });
      }
    });

    // Group Information & Member Updates Sync
    socket.on('group_updated', (updatedChat) => {
      if (!updatedChat || !updatedChat._id) return;
      const roomId = updatedChat._id.toString();
      io.in(roomId).emit('group_updated', updatedChat);
      if (updatedChat.users && Array.isArray(updatedChat.users)) {
        updatedChat.users.forEach((u) => {
          const uid = typeof u === 'string' ? u : u._id.toString();
          io.in(uid).emit('group_updated', updatedChat);
        });
      }
    });

    // Conversation Delete & Clear Sync Across Connected Clients
    socket.on('delete_chat', ({ chatId, recipientId }) => {
      console.log(`[Socket] Chat Deleted sync for chatId: ${chatId}`);
      if (chatId) {
        io.in(chatId.toString()).emit('chat_deleted', { chatId });
      }
      if (recipientId) {
        const targetSocketId = onlineUsersMap.get(recipientId.toString());
        if (targetSocketId) {
          io.to(targetSocketId).emit('chat_deleted', { chatId });
        }
      }
    });

    socket.on('clear_chat', ({ chatId, recipientId }) => {
      console.log(`[Socket] Chat Cleared sync for chatId: ${chatId}`);
      if (chatId) {
        io.in(chatId.toString()).emit('chat_cleared', { chatId });
      }
      if (recipientId) {
        const targetSocketId = onlineUsersMap.get(recipientId.toString());
        if (targetSocketId) {
          io.to(targetSocketId).emit('chat_cleared', { chatId });
        }
      }
    });

    // Status Updates Sync
    socket.on('status_posted', (newStatus) => {
      socket.broadcast.emit('status_posted', newStatus);
    });

    socket.on('status_viewed', ({ statusId, viewer }) => {
      socket.broadcast.emit('status_viewed', { statusId, viewer });
    });

    socket.on('status_deleted', ({ statusId }) => {
      socket.broadcast.emit('status_deleted', { statusId });
    });

    // Delete Message Sync
    socket.on('delete_message', ({ messageId, chatId }) => {
      if (chatId) {
        io.in(chatId.toString()).emit('message_deleted', { messageId, chatId });
      }
    });

    // Read Receipts
    socket.on('message_seen', ({ messageId, chatId, userId }) => {
      io.in(chatId).emit('message_seen', { messageId, chatId, userId });
    });

    socket.on('message_delivered', ({ messageId, chatId, userId }) => {
      io.in(chatId).emit('message_delivered', { messageId, chatId, userId });
    });

    // Message Emoji Reaction Sync
    socket.on('message_reaction', ({ messageId, chatId, reaction }) => {
      io.in(chatId).emit('message_reaction', { messageId, chatId, reaction });
    });

    // WebRTC Real-Time Calling Signals (WhatsApp & Zoom-grade cross-network signaling)
    socket.on('call_user', ({ userToCall, signalData, from, callType }) => {
      if (!userToCall) return;
      const targetUserId = typeof userToCall === 'string' ? userToCall : userToCall._id?.toString() || userToCall.toString();
      const targetSocketId = onlineUsersMap.get(targetUserId);

      console.log(`[WebRTC Socket] Call offer initiated from ${from?.username || socket.userId} to ${targetUserId} (${callType})`);

      const targetDest = targetSocketId || targetUserId;
      io.to(targetDest).emit('incoming_call', {
        signal: signalData,
        from,
        callType, // 'audio' or 'video'
      });
      socket.emit('call_ringing', { message: 'Ringing...' });
    });

    socket.on('answer_call', (data) => {
      if (!data || !data.to) return;
      const targetUserId = typeof data.to === 'string' ? data.to : data.to._id?.toString() || data.to.toString();
      const targetSocketId = onlineUsersMap.get(targetUserId);
      console.log(`[WebRTC Socket] Call answer emitted to user: ${targetUserId}`);

      const targetDest = targetSocketId || targetUserId;
      io.to(targetDest).emit('call_accepted', data.signal);
    });

    socket.on('reject_call', ({ to }) => {
      if (!to) return;
      const targetUserId = typeof to === 'string' ? to : to._id?.toString() || to.toString();
      const targetSocketId = onlineUsersMap.get(targetUserId);
      console.log(`[WebRTC Socket] Call rejected for user: ${targetUserId}`);

      const targetDest = targetSocketId || targetUserId;
      io.to(targetDest).emit('call_rejected');
    });

    socket.on('ice_candidate', ({ to, candidate }) => {
      if (!to || !candidate) return;
      const targetUserId = typeof to === 'string' ? to : to._id?.toString() || to.toString();
      const targetSocketId = onlineUsersMap.get(targetUserId);

      const targetDest = targetSocketId || targetUserId;
      io.to(targetDest).emit('ice_candidate', candidate);
    });

    socket.on('end_call', ({ to }) => {
      if (to) {
        const targetUserId = typeof to === 'string' ? to : to._id?.toString() || to.toString();
        const targetSocketId = onlineUsersMap.get(targetUserId);
        console.log(`[WebRTC Socket] Call ended signal sent to: ${targetUserId}`);

        const targetDest = targetSocketId || targetUserId;
        io.to(targetDest).emit('call_ended');
      }
    });

    // Real-Time Audio/Video Mute Toggle Signaling across WebRTC Participants
    socket.on('toggle_media_state', ({ to, mediaType, isEnabled }) => {
      if (!to) return;
      const targetUserId = typeof to === 'string' ? to : to._id?.toString() || to.toString();
      const targetSocketId = onlineUsersMap.get(targetUserId);

      const targetDest = targetSocketId || targetUserId;
      io.to(targetDest).emit('remote_media_toggled', { mediaType, isEnabled });
    });

    // Disconnection Cleanup
    socket.on('disconnect', () => {
      console.log(`[Socket] Client Disconnected: ${socket.id}`);
      if (socket.userId) {
        onlineUsersMap.delete(socket.userId);
        io.emit('user_offline', { userId: socket.userId });
      }
    });
  });
};

module.exports = socketHandler;
