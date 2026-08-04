import React, { createContext, useEffect, useState, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

/**
 * Production-Grade STUN + TURN Server Configuration
 * Guarantees P2P & Relayed Audio/Video Connection across Carrier NATs (Jio, Airtel),
 * Mobile Data, Office Wi-Fi, and Restrictive Firewalls.
 */
const getRTCConfig = () => {
  const customTurnUrl = import.meta.env.VITE_TURN_SERVER_URL;
  const customTurnUser = import.meta.env.VITE_TURN_USERNAME;
  const customTurnPass = import.meta.env.VITE_TURN_PASSWORD;

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
<<<<<<< HEAD
    // TURN relay fallback — needed when STUN alone can't traverse a NAT
    // (symmetric NAT, many mobile/corporate networks). Without this,
    // signaling can still succeed while media never actually flows.
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
=======
    { urls: 'stun:global.stun.twilio.com:3478' },
    // Public TURN Relay Fallbacks (Metered OpenRelay)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
    {
      urls: 'turns:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelay',
      credential: 'openrelay',
    },
  ];

  if (customTurnUrl) {
    iceServers.push({
      urls: customTurnUrl,
      username: customTurnUser || '',
      credential: customTurnPass || '',
    });
  }

  return {
    iceServers,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceCandidatePoolSize: 10,
  };
>>>>>>> 8190a49 (Update Network Connection and Chat delete Feature)
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

  const clearCallTimer = () => {
    if (callTimerRef.current) {
      clearTimeout(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const cleanupCall = () => {
    clearCallTimer();
    console.log('[WebRTC Cleanup] Releasing tracks and closing peer connection');

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`[WebRTC Track Stopped] ${track.kind}`);
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

      // Stop senders
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

    // Real-Time WebRTC Call Listeners
    newSocket.on('incoming_call', (callData) => {
      console.log('[WebRTC Signaling] Incoming call received:', callData);
      if (activeCallRef.current) {
        // Automatically reject if user is busy in another call
        newSocket.emit('reject_call', { to: callData.from?._id || callData.from });
        return;
      }
      setActiveCall({
        ...callData,
        status: 'incoming',
      });
    });

    newSocket.on('call_ringing', () => {
      console.log('[WebRTC Signaling] Call is ringing on target user device');
      setActiveCall((prev) => (prev && prev.status === 'calling' ? { ...prev, status: 'ringing' } : prev));
    });

    newSocket.on('call_accepted', async (signal) => {
      console.log('[WebRTC Signaling] Offer accepted by callee with answer SDP:', signal);
      clearCallTimer();
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'closed') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          console.log('[WebRTC Caller] Remote SDP Answer set successfully. Signaling state:', pc.signalingState);

          // Flush pending ICE candidates gathered before remote description was set
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
              console.log('[WebRTC Caller] Flushed pending ICE candidate:', cand.candidate);
            } catch (e) {
              console.error('[WebRTC Caller] Error adding candidate:', e);
            }
          }

          setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
          showToast('Call connected', 'success');
        } catch (err) {
          console.error('[WebRTC Caller] Error setting remote description:', err);
        }
      }
    });

    newSocket.on('ice_candidate', async (candidate) => {
      console.log('[WebRTC Signaling] Remote ICE Candidate received:', candidate?.candidate);
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] Added ICE candidate successfully');
        } catch (err) {
          console.error('[WebRTC Error] Failed to add ICE candidate:', err);
        }
      } else {
        console.log('[WebRTC Buffer] Buffering candidate until remote description is set');
        pendingCandidatesRef.current.push(candidate);
      }
    });

    newSocket.on('call_rejected', () => {
      console.log('[WebRTC Signaling] Call declined by target user');
      showToast('Call declined', 'info');
      cleanupCall();
    });

    newSocket.on('call_ended', () => {
      console.log('[WebRTC Signaling] Call ended by partner');
      showToast('Call ended', 'info');
      cleanupCall();
    });

    newSocket.on('remote_media_toggled', ({ mediaType, isEnabled }) => {
      console.log(`[WebRTC Partner Media Sync] ${mediaType} changed to ${isEnabled}`);
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
    console.log(`[WebRTC] Initiating ${callType} call to user:`, targetId);

    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC getUserMedia] Local stream acquired successfully with tracks:', stream.getTracks().map(t => t.kind));
    } catch (err) {
      console.error('[WebRTC Media Error] Access denied or device unavailable:', err);
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

    const rtcConfig = getRTCConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;
    pendingCandidatesRef.current = [];

    // Add local tracks to PeerConnection
    stream.getTracks().forEach((track) => {
      console.log(`[WebRTC Track Added] Kind: ${track.kind}, ID: ${track.id}`);
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('[WebRTC Candidate Gathered]:', event.candidate.candidate);
        socket.emit('ice_candidate', {
          to: targetId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC Remote Track Received]:', event.track.kind, 'State:', event.track.readyState);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prevStream) => {
          if (prevStream) {
            prevStream.addTrack(event.track);
            return new MediaStream(prevStream.getTracks());
          }
          return new MediaStream([event.track]);
        });
      }

      // Detect the remote peer's camera going off (disabled track, tab
      // backgrounded, etc.) so the UI can show a clear placeholder
      // instead of a blank black video frame.
      if (event.track.kind === 'video') {
        setRemoteVideoActive(!event.track.muted);
        event.track.onmute = () => setRemoteVideoActive(false);
        event.track.onunmute = () => setRemoteVideoActive(true);
      }
    };

    pc.oniceconnectionstatechange = async () => {
      console.log('[WebRTC ICE Connection State]:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn('[WebRTC Warning] Connection state failed/disconnected. Attempting ICE restart...');
        if (pc.restartIce) {
          try {
            pc.restartIce();
          } catch (e) {}
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC Connection State]:', pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[WebRTC Signaling State]:', pc.signalingState);
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      console.log('[WebRTC Offer Created]:', offer.sdp?.substring(0, 100) + '...');
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
      console.error('[WebRTC Error] Failed to create WebRTC offer:', err);
      showToast('Failed to create call offer', 'error');
      cleanupCall();
      return;
    }

    // Ringing timeout (35 seconds)
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
    console.log('[WebRTC] Accepting incoming call from:', callerId);

    const constraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
    };

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC getUserMedia Accept] Local stream acquired with tracks:', stream.getTracks().map(t => t.kind));
    } catch (err) {
      console.error('[WebRTC Error] Permission denied or media device error:', err);
      showToast('Microphone or Camera access was denied or is unavailable', 'error');
      rejectCall();
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const rtcConfig = getRTCConfig();
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;
    pendingCandidatesRef.current = [];

    stream.getTracks().forEach((track) => {
      console.log(`[WebRTC Track Added on Accept] Kind: ${track.kind}`);
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('[WebRTC Callee Candidate Gathered]:', event.candidate.candidate);
        socket.emit('ice_candidate', {
          to: callerId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC Callee Remote Track Received]:', event.track.kind);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prevStream) => {
          if (prevStream) {
            prevStream.addTrack(event.track);
            return new MediaStream(prevStream.getTracks());
          }
          return new MediaStream([event.track]);
        });
      }

      // Detect the remote peer's camera going off (disabled track, tab
      // backgrounded, etc.) so the UI can show a clear placeholder
      // instead of a blank black video frame.
      if (event.track.kind === 'video') {
        setRemoteVideoActive(!event.track.muted);
        event.track.onmute = () => setRemoteVideoActive(false);
        event.track.onunmute = () => setRemoteVideoActive(true);
      }
    };

    pc.oniceconnectionstatechange = async () => {
      console.log('[WebRTC Callee ICE Connection State]:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn('[WebRTC Callee Warning] Connection failed/disconnected. Attempting ICE restart...');
        if (pc.restartIce) {
          try {
            pc.restartIce();
          } catch (e) {}
        }
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(currentCall.signal));
      console.log('[WebRTC Callee] Remote offer description set');

      while (pendingCandidatesRef.current.length > 0) {
        const cand = pendingCandidatesRef.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
          console.log('[WebRTC Callee] Flushed buffered candidate:', cand.candidate);
        } catch (e) {
          console.error('[WebRTC Callee Error] Adding buffered candidate:', e);
        }
      }

      const answer = await pc.createAnswer();
      console.log('[WebRTC Callee Answer Created]:', answer.sdp?.substring(0, 100) + '...');
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', {
        to: callerId,
        signal: answer,
      });

      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      showToast('Call connected', 'success');
    } catch (err) {
      console.error('[WebRTC Error] Answering call failed:', err);
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

      const targetId =
        activeCallRef.current?.to?._id ||
        activeCallRef.current?.to ||
        activeCallRef.current?.from?._id ||
        activeCallRef.current?.from;

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

      const targetId =
        activeCallRef.current?.to?._id ||
        activeCallRef.current?.to ||
        activeCallRef.current?.from?._id ||
        activeCallRef.current?.from;

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
