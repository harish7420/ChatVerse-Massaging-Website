import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, PhoneCall, X } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

const CallModal = () => {
  const { activeCall, acceptCall, rejectCall, endCall } = useSocket();
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer;
    if (activeCall?.status === 'connected') {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [activeCall?.status]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-center space-y-6 flex flex-col justify-between min-h-[460px]">
        {/* Call Header info */}
        <div className="space-y-4 pt-2">
          <div className="relative w-28 h-28 mx-auto">
            <img
              src={targetUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
              alt={targetUser?.username || 'User'}
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
              ChatVerse {isVideo ? 'Video' : 'Voice'} Call • {getStatusText()}
            </p>
          </div>
        </div>

        {/* Video / Waveform Canvas Stream representation */}
        <div className="h-44 rounded-2xl bg-gray-800/90 border border-gray-700/80 flex items-center justify-center relative overflow-hidden">
          {isVideo && !isCamOff && activeCall.status === 'connected' ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-950 text-xs text-gray-400">
              <div className="text-center space-y-2">
                <Video className="w-8 h-8 text-brand-500 mx-auto animate-pulse" />
                <p className="font-semibold text-gray-300">HD Video Stream Active</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {[40, 70, 30, 90, 50, 80, 40, 60, 30, 85].map((h, i) => (
                <div
                  key={i}
                  style={{
                    height:
                      activeCall.status === 'connected'
                        ? `${h}%`
                        : activeCall.status === 'calling' || activeCall.status === 'ringing'
                        ? `${Math.min(h, 45)}%`
                        : '15%',
                  }}
                  className={`w-2 rounded-full transition-all duration-300 ${
                    activeCall.status === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : activeCall.status === 'calling' || activeCall.status === 'ringing'
                      ? 'bg-brand-500 animate-pulse'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
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
          <div className="flex items-center justify-center gap-4 pb-2">
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className={`p-4 rounded-2xl transition-all ${
                isMuted ? 'bg-rose-500 text-white shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {isVideo && (
              <button
                onClick={() => setIsCamOff((prev) => !prev)}
                className={`p-4 rounded-2xl transition-all ${
                  isCamOff ? 'bg-rose-500 text-white shadow-lg' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                }`}
                title={isCamOff ? 'Turn On Camera' : 'Turn Off Camera'}
              >
                {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

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
