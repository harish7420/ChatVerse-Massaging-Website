import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, Mic, X, Image as ImageIcon, FileText } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import VoiceRecorder from './VoiceRecorder';

const POPULAR_EMOJIS = ['😊', '😂', '🔥', '👍', '❤️', '🎉', '🚀', '😍', '🙏', '😎', '✨', '💯', '🤔', '👋', '🙌'];

const MessageInput = () => {
  const { user } = useAuth();
  const { sendMessage, selectedChat, replyToMessage, setReplyToMessage } = useChat();
  const { socket } = useSocket();

  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (socket && selectedChat) {
      socket.emit('typing', { room: selectedChat._id, username: user?.username });
    }
  };

  const handleInputBlur = () => {
    if (socket && selectedChat) {
      socket.emit('stop_typing', { room: selectedChat._id });
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    sendMessage(text, selectedFile);
    setText('');
    setSelectedFile(null);
    setShowEmojiPicker(false);
    if (socket && selectedChat) {
      socket.emit('stop_typing', { room: selectedChat._id });
    }
  };

  const handleSendVoiceNote = (file) => {
    sendMessage('', file);
    setShowVoiceRecorder(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const addEmoji = (emoji) => {
    setText((prev) => prev + emoji);
  };

  return (
    <div className="p-3 md:p-4 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-800 relative z-20 transition-colors">
      {/* Reply Banner preview */}
      {replyToMessage && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 border-l-4 border-brand-500 text-xs">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-brand-600 dark:text-brand-300 block">Replying to Message</span>
            <p className="text-gray-700 dark:text-gray-300 truncate">{replyToMessage.content || '[Attachment]'}</p>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Attachment preview badge */}
      {selectedFile && (
        <div className="flex items-center justify-between p-2 mb-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Paperclip className="w-4 h-4 text-brand-500" />
            <span className="text-gray-900 dark:text-brand-200 font-medium truncate">{selectedFile.name}</span>
            <span className="text-gray-400 text-[10px]">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <button onClick={() => setSelectedFile(null)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 p-3 rounded-2xl glass-panel shadow-2xl border border-gray-200 dark:border-gray-700 grid grid-cols-5 gap-2 z-30">
          {POPULAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Voice Recorder Mode Overlay Bar */}
      {showVoiceRecorder ? (
        <VoiceRecorder
          onSendVoiceNote={handleSendVoiceNote}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      ) : (
        /* Standard Message Form Input Bar */
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          />

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Add Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Attach File"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Voice Note Trigger Button */}
          <button
            type="button"
            onClick={() => setShowVoiceRecorder(true)}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Record Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Text Input Field */}
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Type a message..."
            className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 border border-gray-200 dark:border-gray-700/60 focus:outline-none focus:border-brand-500 transition-colors"
          />

          {/* Send Action Button */}
          <button
            type="submit"
            disabled={!text.trim() && !selectedFile}
            className="p-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
            title="Send Message"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        </form>
      )}
    </div>
  );
};

export default MessageInput;
