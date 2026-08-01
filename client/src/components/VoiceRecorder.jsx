import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Send, Trash2, Volume2 } from 'lucide-react';

const VoiceRecorder = ({ onSendVoiceNote, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.warn('Microphone permission denied or not supported:', err);
      // Create mock audio fallback if mic is unavailable
      setIsRecording(false);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSend = () => {
    if (audioBlob) {
      const file = new File([audioBlob], `Voice_Note_${Date.now()}.webm`, { type: 'audio/webm' });
      onSendVoiceNote(file);
    } else {
      // Mock voice note file fallback
      const mockBlob = new Blob(['mock audio content'], { type: 'audio/webm' });
      const file = new File([mockBlob], `Voice_Note_${Date.now()}.webm`, { type: 'audio/webm' });
      onSendVoiceNote(file);
    }
  };

  return (
    <div className="flex items-center justify-between w-full p-2.5 px-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 animate-pulse">
      {/* Timer & Pulsing Dot */}
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        <Mic className="w-5 h-5 text-rose-500" />
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
          {formatTime(recordingTime)}
        </span>

        {/* Live Audio Waveform Bars Simulation */}
        <div className="hidden sm:flex items-center gap-1 h-5 ml-2">
          {[12, 20, 8, 16, 24, 10, 18, 14, 22, 9].map((height, idx) => (
            <span
              key={idx}
              className="w-1 bg-rose-500/80 rounded-full animate-waveform-bar"
              style={{
                height: `${height}px`,
                animationDelay: `${idx * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-rose-500 rounded-xl hover:bg-rose-500/20 transition-colors"
          title="Cancel Recording"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {isRecording ? (
          <button
            type="button"
            onClick={handleStopRecording}
            className="p-2 bg-rose-500 text-white rounded-xl shadow hover:bg-rose-600 transition-colors"
            title="Stop Recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="p-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-xl shadow hover:scale-105 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Send Voice Note"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
