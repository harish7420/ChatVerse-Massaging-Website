import React, { createContext, useEffect, useState, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, showToast } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [activeCall, setActiveCall] = useState(null); // { from, to, callType, status: 'calling'|'ringing'|'connected'|'incoming'|'declined'|'unavailable' }

  const callTimerRef = useRef(null);

  const clearCallTimer = () => {
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!user) {
      if (socket) socket.disconnect();
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'https://chatverse-massaging-website.onrender.com';

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket Connected ID:', newSocket.id);
      newSocket.emit('setup', user);
    });

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    newSocket.on('message_notification', (msg) => {
      showToast(`New message from ${msg.sender?.username || 'Contact'}`, 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`ChatVerse Message`, {
          body: msg.content || 'Sent an attachment',
          icon: msg.sender?.avatar || '/favicon.ico',
        });
      }
    });

    // Real-Time WebRTC Call Listeners (WhatsApp Style Flow)
    newSocket.on('incoming_call', (callData) => {
      setActiveCall({
        ...callData,
        status: 'incoming',
      });
    });

    newSocket.on('call_ringing', () => {
      setActiveCall((prev) => (prev && prev.status === 'calling' ? { ...prev, status: 'ringing' } : prev));
    });

    newSocket.on('call_accepted', (signal) => {
      clearCallTimer();
      setActiveCall((prev) => (prev ? { ...prev, signal, status: 'connected' } : null));
      showToast('Call connected', 'success');
    });

    newSocket.on('call_rejected', () => {
      clearCallTimer();
      setActiveCall((prev) => (prev ? { ...prev, status: 'declined' } : null));
      showToast('Call declined', 'info');
      setTimeout(() => setActiveCall(null), 2000);
    });

    newSocket.on('call_ended', () => {
      clearCallTimer();
      setActiveCall(null);
      showToast('Call ended', 'info');
    });

    setSocket(newSocket);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      clearCallTimer();
      newSocket.disconnect();
    };
  }, [user]);

  const initiateCall = (userToCall, callType = 'audio') => {
    if (!socket || !userToCall) return;

    clearCallTimer();

    // Set calling state immediately regardless of whether target is online/offline (WhatsApp style)
    setActiveCall({
      to: userToCall,
      from: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
      callType,
      status: 'calling',
    });

    socket.emit('call_user', {
      from: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
      userToCall: userToCall._id || userToCall,
      callType,
      signalData: null,
    });

    // Ringing timeout (20 seconds) - if recipient doesn't answer or is offline
    callTimerRef.current = setTimeout(() => {
      setActiveCall((prev) => {
        if (prev && (prev.status === 'calling' || prev.status === 'ringing')) {
          showToast(`${userToCall.username || 'User'} is unavailable`, 'info');
          setTimeout(() => setActiveCall(null), 2500);
          return { ...prev, status: 'unavailable' };
        }
        return prev;
      });
    }, 20000);
  };

  const acceptCall = () => {
    if (!socket || !activeCall) return;
    socket.emit('answer_call', {
      to: activeCall.from?._id || activeCall.from,
      signal: 'accepted_signal',
    });
    setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
  };

  const rejectCall = () => {
    if (!socket || !activeCall) return;
    const targetId = activeCall.from?._id || activeCall.from;
    socket.emit('reject_call', { to: targetId });
    setActiveCall(null);
  };

  const endCall = () => {
    clearCallTimer();
    if (socket && activeCall) {
      const targetId = activeCall.to?._id || activeCall.to || activeCall.from?._id || activeCall.from;
      socket.emit('end_call', { to: targetId });
    }
    setActiveCall(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        activeCall,
        setActiveCall,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
