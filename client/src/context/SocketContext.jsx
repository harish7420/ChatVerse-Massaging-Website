import React, { createContext, useEffect, useState, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

/**
 * Production-Grade STUN + TURN Server Configuration
 * STUN default for same-WiFi & direct P2P connections.
 * TURN relay dynamically configured via VITE_TURN_URL / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL.
 */
const getRTCConfig = () => {
  const customTurnUrl = import.meta.env.VITE_TURN_URL || import.meta.env.VITE_TURN_SERVER_URL;
  const customTurnUser = import.meta.env.VITE_TURN_USERNAME;
  const customTurnPass = import.meta.env.VITE_TURN_CREDENTIAL || import.meta.env.VITE_TURN_PASSWORD;

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  if (customTurnUrl) {
    console.log('[CALL] Adding custom TURN relay server:', customTurnUrl);
    iceServers.push({
      urls: customTurnUrl,
      username: customTurnUser || '',
      credential: customTurnPass || '',
    });
  } else {
    console.log('[CALL] Standard STUN iceServers enabled for direct same-WiFi calling');
  }

  return {
    iceServers,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 10,
  };
};

export const SocketProvider = ({ children }) => {
  const { user, showToast } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [activeCall, setActiveCall] = useState(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [remoteMediaState, setRemoteMediaState] = useState({ isAudioOn: true, isVideoOn: true });

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callTimerRef = useRef(null);
  const activeCallRef = useRef(null);

  activeCallRef.current = activeCall;

  const getPeerUserId = () => {
    const call = activeCallRef.current;
    if (!call) return null;
    const myId = user?._id?.toString();
    const toId = typeof call.to === 'string' ? call.to : call.to?._id?.toString();
    const fromId = typeof call.from === 'string' ? call.from : call.from?._id?.toString();

    if (toId && toId !== myId) return toId;
    if (fromId && fromId !== myId) return fromId;
    return toId || fromId;
  };

  const clearCallTimer = () => {
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const cleanupCall = () => {
    clearCallTimer();
    console.log('[CALL] Cleanup: Releasing media tracks & tearing down PeerConnection');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`[CALL] Local track stopped: ${track.kind}`);
      });
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setRemoteVideoActive(false);

    if (peerConnectionRef.current) {
      const pc = peerConnectionRef.current;
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.onsignalingstatechange = null;

      try {
        pc.getSenders().forEach((sender) => {
          if (sender.track) sender.track.stop();
        });
      } catch (e) {}

      pc.close();
      peerConnectionRef.current = null;
    }

    pendingCandidatesRef.current = [];
    setIsMuted(false);
    setIsCamOff(false);
    setRemoteMediaState({ isAudioOn: true, isVideoOn: true });
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
      console.log('[Socket] Connected ID:', newSocket.id);
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

    // WebRTC Signaling Event Listeners
    newSocket.on('incoming_call', (callData) => {
      console.log('[CALL] incoming call received:', callData);
      if (activeCallRef.current) {
        console.log('[CALL] User is busy, rejecting incoming call');
        newSocket.emit('reject_call', { to: callData.from?._id || callData.from });
        return;
      }
      setActiveCall({
        ...callData,
        status: 'incoming',
      });
    });

    newSocket.on('call_ringing', () => {
      console.log('[CALL] Call ringing on recipient device');
      setActiveCall((prev) => (prev && prev.status === 'calling' ? { ...prev, status: 'ringing' } : prev));
    });

    newSocket.on('call_accepted', async (signal) => {
      console.log('[CALL] answer received from recipient:', signal);
      clearCallTimer();
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'closed') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log('[CALL] Remote SDP Answer set successfully. Signaling state:', pc.signalingState);

          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
              console.log('[CALL] Flushed pending ICE candidate:', cand.candidate);
            } catch (e) {
              console.error('[CALL] Error adding buffered candidate:', e);
            }
          }

          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
          showToast('Call connected', 'success');
        } catch (err) {
          console.error('[CALL] Error setting remote description:', err);
        }
      }
    });

    newSocket.on('ice_candidate', async (candidate) => {
      console.log('[CALL] ICE candidate received from remote:', candidate?.candidate);
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[CALL] addIceCandidate succeeded');
        } catch (err) {
          console.error('[CALL] addIceCandidate failed:', err);
        }
      } else {
        console.log('[CALL] Remote description not set yet. Buffering candidate');
        pendingCandidatesRef.current.push(candidate);
      }
    });

    newSocket.on('call_rejected', () => {
      console.log('[CALL] Call rejected by target user');
      showToast('Call declined', 'info');
      cleanupCall();
    });

    newSocket.on('call_ended', () => {
      console.log('[CALL] Call ended by remote user');
      showToast('Call ended', 'info');
      cleanupCall();
    });

    newSocket.on('remote_media_toggled', ({ mediaType, isEnabled }) => {
      console.log(`[CALL] Remote ${mediaType} toggled to ${isEnabled}`);
      setRemoteMediaState((prev) => ({
        ...prev,
        [mediaType === 'video' ? 'isVideoOn' : 'isAudioOn']: isEnabled,
      }));
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
      newSocket.off('remote_media_toggled');
      newSocket.disconnect();
    };
  }, [user]);

  // Initiate WebRTC Call
  const initiateCall = async (userToCall, callType = 'audio') => {
    if (!socket || !userToCall) return;
    cleanupCall();

    const targetId = typeof userToCall === 'string' ? userToCall : userToCall._id;
    console.log(`[CALL] outgoing call initiated (${callType}) to target user:`, targetId);

    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[CALL] local stream received:', stream.getTracks().map((t) => t.kind));
    } catch (err) {
      console.warn('[CALL] Preferred constraints failed:', err.name, err.message, 'Trying basic constraints');
      if (callType === 'video') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          console.log('[CALL] local stream received (fallback constraints)');
        } catch (fallbackErr) {
          console.error('[CALL] Fallback getUserMedia failed:', fallbackErr);
          showToast('Microphone or Camera access was denied or unavailable', 'error');
          return;
        }
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          console.log('[CALL] local audio stream received (fallback constraints)');
        } catch (fallbackErr) {
          console.error('[CALL] Audio getUserMedia failed:', fallbackErr);
          showToast('Microphone access was denied or unavailable', 'error');
          return;
        }
      }
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

    const rtcConfig = getRTCConfig();
    console.log('[CALL] creating peer connection');
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;
    pendingCandidatesRef.current = [];

    stream.getTracks().forEach((track) => {
      console.log(`[CALL] local ${track.kind} track added`);
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('[CALL] ICE candidate generated:', event.candidate.candidate);
        socket.emit('ice_candidate', {
          to: targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[CALL] remote track received:', event.track.kind, 'Ready state:', event.track.readyState);
      const stream = event.streams && event.streams[0] ? event.streams[0] : null;
      if (stream) {
        setRemoteStream(new MediaStream(stream.getTracks()));
      } else {
        setRemoteStream((prevStream) => {
          const tracks = prevStream ? [...prevStream.getTracks(), event.track] : [event.track];
          return new MediaStream(tracks);
        });
      }

      if (event.track.kind === 'video') {
        setRemoteVideoActive(!event.track.muted);
        event.track.onmute = () => {
          console.log('[CALL] Remote video track muted');
          setRemoteVideoActive(false);
        };
        event.track.onunmute = () => {
          console.log('[CALL] Remote video track unmuted');
          setRemoteVideoActive(true);
        };
      }
    };

    pc.oniceconnectionstatechange = async () => {
      console.log('[CALL] ICE state changed:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn('[CALL] ICE connection state failed/disconnected. Attempting restartIce');
        if (pc.restartIce) {
          try {
            pc.restartIce();
          } catch (e) {}
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[CALL] connection state changed:', pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[CALL] signaling state changed:', pc.signalingState);
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      console.log('[CALL] offer created');
      await pc.setLocalDescription(offer);

      console.log('[CALL] offer sent');
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
      console.error('[CALL] Failed to create WebRTC offer:', err);
      showToast('Failed to create call offer', 'error');
      cleanupCall();
      return;
    }

    callTimerRef.current = setTimeout(() => {
      const curr = activeCallRef.current;
      if (curr && (curr.status === 'calling' || curr.status === 'ringing')) {
        showToast(`${userToCall.username || 'User'} is unavailable`, 'info');
        socket.emit('end_call', { to: targetId });
        cleanupCall();
      }
    }, 35000);
  };

  // Accept Incoming WebRTC Call
  const acceptCall = async () => {
    const currentCall = activeCallRef.current;
    if (!socket || !currentCall || !currentCall.signal) return;
    clearCallTimer();

    const callerId = currentCall.from?._id || currentCall.from;
    const isVideo = currentCall.callType === 'video';
    console.log('[CALL] accepting call from:', callerId);

    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[CALL] local stream received (accept):', stream.getTracks().map((t) => t.kind));
    } catch (err) {
      console.warn('[CALL] Preferred accept constraints failed, trying basic constraints');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
        console.log('[CALL] local stream received (accept fallback)');
      } catch (fallbackErr) {
        console.error('[CALL] getUserMedia accept failed:', fallbackErr);
        showToast('Microphone or Camera access was denied or unavailable', 'error');
        rejectCall();
        return;
      }
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const rtcConfig = getRTCConfig();
    console.log('[CALL] creating peer connection (accept)');
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => {
      console.log(`[CALL] local ${track.kind} track added (accept)`);
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('[CALL] ICE candidate generated (callee):', event.candidate.candidate);
        socket.emit('ice_candidate', {
          to: callerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[CALL] remote track received (callee):', event.track.kind);
      const stream = event.streams && event.streams[0] ? event.streams[0] : null;
      if (stream) {
        setRemoteStream(new MediaStream(stream.getTracks()));
      } else {
        setRemoteStream((prevStream) => {
          const tracks = prevStream ? [...prevStream.getTracks(), event.track] : [event.track];
          return new MediaStream(tracks);
        });
      }

      if (event.track.kind === 'video') {
        setRemoteVideoActive(!event.track.muted);
        event.track.onmute = () => setRemoteVideoActive(false);
        event.track.onunmute = () => setRemoteVideoActive(true);
      }
    };

    pc.oniceconnectionstatechange = async () => {
      console.log('[CALL] ICE state changed (callee):', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn('[CALL] Callee ICE state failed/disconnected. Attempting restartIce');
        if (pc.restartIce) {
          try {
            pc.restartIce();
          } catch (e) {}
        }
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(currentCall.signal));
      console.log('[CALL] Remote offer description set by callee');

      while (pendingCandidatesRef.current.length > 0) {
        const cand = pendingCandidatesRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
          console.log('[CALL] Flushed buffered ICE candidate (callee):', cand.candidate);
        } catch (e) {
          console.error('[CALL] Error adding buffered candidate (callee):', e);
        }
      }

      const answer = await pc.createAnswer();
      console.log('[CALL] answer created');
      await pc.setLocalDescription(answer);

      console.log('[CALL] answer sent');
      socket.emit('answer_call', {
        to: callerId,
        signal: answer,
      });

      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      showToast('Call connected', 'success');
    } catch (err) {
      console.error('[CALL] Answering call failed:', err);
      showToast('Failed to establish WebRTC connection', 'error');
      cleanupCall();
    }
  };

  const rejectCall = () => {
    const targetId = getPeerUserId();
    console.log('[CALL] rejecting call for target user:', targetId);
    if (socket && targetId) {
      socket.emit('reject_call', { to: targetId });
    }
    cleanupCall();
  };

  const endCall = () => {
    const targetId = getPeerUserId();
    console.log('[CALL] ending call for target user:', targetId);
    if (socket && targetId) {
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

      const targetId = getPeerUserId();
      console.log(`[CALL] toggling local audio to ${!newMutedState} for target user ${targetId}`);
      if (socket && targetId) {
        socket.emit('toggle_media_state', { to: targetId, mediaType: 'audio', isEnabled: !newMutedState });
      }
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

      const targetId = getPeerUserId();
      console.log(`[CALL] toggling local camera to ${!newCamState} for target user ${targetId}`);
      if (socket && targetId) {
        socket.emit('toggle_media_state', { to: targetId, mediaType: 'video', isEnabled: !newCamState });
      }
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
        remoteVideoActive,
        isMuted,
        isCamOff,
        remoteMediaState,
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

