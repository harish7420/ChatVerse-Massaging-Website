import React, { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, PhoneCall, X } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { getMediaUrl, handleImageError, DEFAULT_AVATAR } from '../utils/imageUtils';

const CallModal = () => {
  const {
    activeCall,
    acceptCall,
    rejectCall,
    endCall,
    localStream,
    remoteStream,
    remoteVideoActive,
    isMuted,
    isCamOff,
    toggleMute,
    toggleCamera,
  } = useSocket();

  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  useEffect(() => {
    let timer;
    if (activeCall?.status === 'connected') {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCall?.status]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!activeCall) return null;

  const targetUser = activeCall.status === 'incoming' ? activeCall.from : activeCall.to || activeCall.from;
  const isVideo = activeCall.callType === 'video';

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (activeCall.status) {
      case 'incoming':
        return `Incoming ${isVideo ? 'Video' : 'Voice'} Call...`;
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connected':
        return `Connected (${formatDuration(callDuration)})`;
      case 'declined':
        return 'Call Declined';
      case 'unavailable':
        return 'User Unavailable';
      default:
        return 'Calling...';
    }
  };

  // Video Call Modal Layout
  if (isVideo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-2 sm:p-4 select-none animate-fade-in">
        {/* Remote Audio Output for Video Call */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div className="w-full max-w-5xl h-[90vh] sm:h-[85vh] bg-gray-950 border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col justify-between">
          {/* Main Remote Video Container */}
          <div className="relative w-full h-full flex items-center justify-center bg-gray-900 overflow-hidden">
            {/* Always mounted so the ref is attached before the stream
                arrives — otherwise the srcObject assignment effect (keyed
                only on remoteStream) can fire while this element doesn't
                exist yet, and never gets a chance to run again. */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {!(activeCall.status === 'connected' && remoteStream && remoteVideoActive) && (
              /* Fallback / Connecting State Remote View */
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 p-6 text-center z-10 bg-gray-900">
                <div className="relative">
                  <img
                    src={getMediaUrl(targetUser?.avatar, DEFAULT_AVATAR)}
                    alt={targetUser?.username || 'User'}
                    onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-4 border-brand-500 shadow-2xl"
                  />
                  {(activeCall.status === 'calling' || activeCall.status === 'ringing') && (
                    <span className="w-8 h-8 rounded-full bg-amber-500 absolute bottom-1 right-1 border-4 border-gray-900 animate-ping" />
                  )}
                  {activeCall.status === 'connected' && (
                    <span className="w-8 h-8 rounded-full bg-emerald-500 absolute bottom-1 right-1 border-4 border-gray-900 animate-pulse" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                    {targetUser?.username || 'Contact User'}
                  </h3>
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-brand-400 mt-2 animate-pulse">
                    {activeCall.status === 'connected' && remoteStream && !remoteVideoActive
                      ? `Camera is off (${formatDuration(callDuration)})`
                      : getStatusText()}
                  </p>
                </div>
              </div>
            )}

            {/* Floating Picture-in-Picture Local Video Preview */}
            {localStream && (
              <div className="absolute top-4 right-4 z-20 w-32 h-44 sm:w-44 sm:h-60 rounded-2xl overflow-hidden border-2 border-brand-500/80 shadow-2xl bg-gray-900/90 backdrop-blur-md">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                {isCamOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 p-2 text-center">
                    <VideoOff className="w-8 h-8 text-rose-500 mb-1" />
                    <span className="text-[10px] text-gray-400 font-medium">Camera Off</span>
                  </div>
                )}
              </div>
            )}

            {/* Header Overlay Info (when connected) */}
            {activeCall.status === 'connected' && (
              <div className="absolute top-4 left-4 z-20 bg-black/50 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
                <img
                  src={getMediaUrl(targetUser?.avatar, DEFAULT_AVATAR)}
                  alt={targetUser?.username || 'User'}
                  onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-white">{targetUser?.username}</h4>
                  <p className="text-[10px] font-semibold text-emerald-400">{formatDuration(callDuration)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Controls Bar */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 bg-black/60 backdrop-blur-xl border border-white/15 px-6 py-3 rounded-3xl flex items-center gap-6 shadow-2xl">
            {activeCall.status === 'incoming' ? (
              <>
                <button
                  onClick={rejectCall}
                  className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 hover:scale-110 transition-all"
                  title="Decline Call"
                >
                  <X className="w-7 h-7" />
                </button>
                <button
                  onClick={acceptCall}
                  className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 hover:scale-110 transition-all animate-bounce"
                  title="Accept Call"
                >
                  <PhoneCall className="w-7 h-7" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleMute}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all ${
                    isMuted ? 'bg-rose-500 text-white shadow-lg' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700'
                  }`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={toggleCamera}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all ${
                    isCamOff ? 'bg-rose-500 text-white shadow-lg' : 'bg-gray-800/80 text-gray-200 hover:bg-gray-700'
                  }`}
                  title={isCamOff ? 'Turn On Camera' : 'Turn Off Camera'}
                >
                  {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                <button
                  onClick={endCall}
                  className="p-3.5 sm:p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 hover:scale-105 transition-all"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6 fill-current" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Audio Call Modal Layout
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 select-none animate-fade-in">
      {/* Remote Audio Output for Voice Call */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-6 flex flex-col justify-between min-h-[460px]">
        {/* Call Header info */}
        <div className="space-y-4 pt-2">
          <div className="relative w-28 h-28 mx-auto">
            <img
              src={getMediaUrl(targetUser?.avatar, DEFAULT_AVATAR)}
              alt={targetUser?.username || 'User'}
              onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
              className="w-28 h-28 rounded-full object-cover border-4 border-brand-500 shadow-2xl"
            />
            {(activeCall.status === 'calling' || activeCall.status === 'ringing') && (
              <span className="w-6 h-6 rounded-full bg-amber-500 absolute bottom-1 right-1 border-2 border-gray-900 animate-ping" />
            )}
            {activeCall.status === 'connected' && (
              <span className="w-6 h-6 rounded-full bg-emerald-500 absolute bottom-1 right-1 border-2 border-gray-900 animate-pulse" />
            )}
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white tracking-wide">
              {targetUser?.username || 'Contact User'}
            </h3>
            <p
              className={`text-xs font-bold uppercase tracking-widest mt-1.5 ${
                activeCall.status === 'connected'
                  ? 'text-emerald-400'
                  : activeCall.status === 'declined' || activeCall.status === 'unavailable'
                  ? 'text-rose-400'
                  : 'text-brand-400 animate-pulse'
              }`}
            >
              ChatVerse Voice Call • {getStatusText()}
            </p>
          </div>
        </div>

        {/* Live Audio Visualizer Animation */}
        <div className="h-36 rounded-2xl bg-gray-800/90 border border-gray-700/80 flex items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-2">
            {[40, 70, 30, 90, 50, 80, 40, 60, 30, 85].map((h, i) => (
              <div
                key={i}
                style={{
                  height:
                    activeCall.status === 'connected'
                      ? `${isMuted ? 15 : h}%`
                      : activeCall.status === 'calling' || activeCall.status === 'ringing'
                      ? `${Math.min(h, 45)}%`
                      : '15%',
                }}
                className={`w-2 rounded-full transition-all duration-300 ${
                  activeCall.status === 'connected'
                    ? isMuted
                      ? 'bg-gray-600'
                      : 'bg-emerald-500 animate-pulse'
                    : activeCall.status === 'calling' || activeCall.status === 'ringing'
                    ? 'bg-brand-500 animate-pulse'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Call Controls */}
        {activeCall.status === 'incoming' ? (
          /* Incoming Call Accept / Decline Controls */
          <div className="flex items-center justify-center gap-8 pb-2">
            <button
              onClick={rejectCall}
              className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 hover:scale-110 transition-all"
              title="Decline Call"
            >
              <X className="w-7 h-7" />
            </button>
            <button
              onClick={acceptCall}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 hover:scale-110 transition-all animate-bounce"
              title="Accept Call"
            >
              <PhoneCall className="w-7 h-7" />
            </button>
          </div>
        ) : (
          /* Calling / Ringing / Connected Actions */
          <div className="flex items-center justify-center gap-6 pb-2">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-2xl transition-all ${
                isMuted ? 'bg-rose-500 text-white shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={endCall}
              className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/40 hover:scale-105 transition-all"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6 fill-current" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;

