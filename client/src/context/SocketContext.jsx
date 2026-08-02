import React, { createContext, useEffect, useState, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export const SocketProvider = ({ children }) => {
  const { user, showToast } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [activeCall, setActiveCall] = useState(null); // { from, to, callType, status: 'calling'|'ringing'|'connected'|'incoming'|'declined'|'unavailable', signal }

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callTimerRef = useRef(null);
  const activeCallRef = useRef(null);

  activeCallRef.current = activeCall;

  const clearCallTimer = () => {
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const cleanupCall = () => {
    clearCallTimer();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    pendingCandidatesRef.current = [];
    setIsMuted(false);
    setIsCamOff(false);
    setActiveCall(null);
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

    // Real-Time WebRTC Call Listeners
    newSocket.on('incoming_call', (callData) => {
      setActiveCall({
        ...callData,
        status: 'incoming',
      });
    });

    newSocket.on('call_ringing', () => {
      setActiveCall((prev) => (prev && prev.status === 'calling' ? { ...prev, status: 'ringing' } : prev));
    });

    newSocket.on('call_accepted', async (signal) => {
      clearCallTimer();
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'closed') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.error('Error flushing pending candidate:', e);
            }
          }
          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
          showToast('Call connected', 'success');
        } catch (err) {
          console.error('Error setting remote description on caller:', err);
        }
      }
    });

    newSocket.on('ice_candidate', async (candidate) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    newSocket.on('call_rejected', () => {
      showToast('Call declined', 'info');
      cleanupCall();
    });

    newSocket.on('call_ended', () => {
      showToast('Call ended', 'info');
      cleanupCall();
    });

    setSocket(newSocket);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      cleanupCall();
      newSocket.off('incoming_call');
      newSocket.off('call_ringing');
      newSocket.off('call_accepted');
      newSocket.off('ice_candidate');
      newSocket.off('call_rejected');
      newSocket.off('call_ended');
      newSocket.disconnect();
    };
  }, [user]);

  const initiateCall = async (userToCall, callType = 'audio') => {
    if (!socket || !userToCall) return;
    cleanupCall();

    const targetId = userToCall._id || userToCall;

    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error('Camera/Mic permission error:', err);
      showToast('Microphone or Camera access was denied or is unavailable', 'error');
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const callInfo = {
      to: userToCall,
      from: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      },
      callType,
      status: 'calling',
    };
    setActiveCall(callInfo);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    pendingCandidatesRef.current = [];

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          to: targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const newStream = new MediaStream([event.track]);
        setRemoteStream(newStream);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn('ICE connection state:', pc.iceConnectionState);
      }
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        userToCall: targetId,
        signalData: offer,
        from: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
        },
        callType,
      });
    } catch (err) {
      console.error('Error creating WebRTC offer:', err);
      showToast('Failed to create call offer', 'error');
      cleanupCall();
      return;
    }

    // Ringing timeout (30 seconds)
    callTimerRef.current = setTimeout(() => {
      const curr = activeCallRef.current;
      if (curr && (curr.status === 'calling' || curr.status === 'ringing')) {
        showToast(`${userToCall.username || 'User'} is unavailable`, 'info');
        socket.emit('end_call', { to: targetId });
        cleanupCall();
      }
    }, 30000);
  };

  const acceptCall = async () => {
    const currentCall = activeCallRef.current;
    if (!socket || !currentCall || !currentCall.signal) return;
    clearCallTimer();

    const callerId = currentCall.from?._id || currentCall.from;
    const isVideo = currentCall.callType === 'video';

    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error('Camera/Mic permission error on accept:', err);
      showToast('Microphone or Camera access was denied or is unavailable', 'error');
      rejectCall();
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    pendingCandidatesRef.current = [];

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          to: callerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const newStream = new MediaStream([event.track]);
        setRemoteStream(newStream);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        console.warn('ICE connection state:', pc.iceConnectionState);
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(currentCall.signal));

      while (pendingCandidatesRef.current.length > 0) {
        const cand = pendingCandidatesRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.error('Error adding pending candidate:', e);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', {
        to: callerId,
        signal: answer,
      });

      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      showToast('Call connected', 'success');
    } catch (err) {
      console.error('Error answering call:', err);
      showToast('Failed to establish WebRTC connection', 'error');
      cleanupCall();
    }
  };

  const rejectCall = () => {
    const currentCall = activeCallRef.current;
    if (socket && currentCall) {
      const targetId = currentCall.from?._id || currentCall.from;
      socket.emit('reject_call', { to: targetId });
    }
    cleanupCall();
  };

  const endCall = () => {
    const currentCall = activeCallRef.current;
    if (socket && currentCall) {
      const targetId =
        currentCall.to?._id ||
        currentCall.to ||
        currentCall.from?._id ||
        currentCall.from;
      socket.emit('end_call', { to: targetId });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const newMutedState = !isMuted;
      audioTracks.forEach((track) => {
        track.enabled = !newMutedState;
      });
      setIsMuted(newMutedState);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const newCamState = !isCamOff;
      videoTracks.forEach((track) => {
        track.enabled = !newCamState;
      });
      setIsCamOff(newCamState);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        activeCall,
        setActiveCall,
        localStream,
        remoteStream,
        isMuted,
        isCamOff,
        toggleMute,
        toggleCamera,
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

