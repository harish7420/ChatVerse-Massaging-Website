import React, { useState, useRef } from 'react';
import { Check, CheckCheck, Smile, Reply, Trash2, Copy, FileText, Download, Play, Pause, Volume2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';
import API from '../services/api';

const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '😂', '😮', '🎉'];

const MessageBubble = ({ message, onOpenImageLightbox }) => {
  const { user } = useAuth();
  const { setReplyToMessage, showToast, selectedChat } = useChat();
  const { socket } = useSocket();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [reactionsList, setReactionsList] = useState(message.reactions || []);
  const audioRef = useRef(null);

  const isOutgoing = message.sender?._id === user?._id || message.sender === user?._id;

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      showToast('Copied to clipboard', 'info');
    }
  };

  const handleAddReaction = async (emoji) => {
    const newReaction = { emoji, user: user?._id };
    setReactionsList((prev) => [...prev.filter((r) => r.user !== user?._id), newReaction]);

    try {
      await API.put(`/message/${message._id}/react`, { emoji });
      if (socket && selectedChat) {
        socket.emit('message_reaction', {
          messageId: message._id,
          chatId: selectedChat._id,
          reaction: newReaction,
        });
      }
    } catch (e) {}
  };

  const toggleAudioPlay = () => {
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  return (
    <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'} group my-1.5 select-text`}>
      {/* Sender Name in Group Chat */}
      {!isOutgoing && (
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 ml-1">
          {message.sender?.username || 'Contact'}
        </span>
      )}

      {/* Bubble Wrapper */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Quick Hover Reaction Bar */}
        <div
          className={`absolute -top-9 ${
            isOutgoing ? 'right-0' : 'left-0'
          } hidden group-hover:flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg z-10 transition-all`}
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddReaction(emoji)}
              className="hover:scale-125 transition-transform text-xs p-0.5"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={handleCopyText}
            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Copy Text"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => setReplyToMessage(message)}
            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Reply"
          >
            <Reply className="w-3 h-3" />
          </button>
        </div>

        {/* Message Content Bubble Container */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-colors ${
            isOutgoing
              ? 'bubble-outgoing rounded-br-xs'
              : 'bubble-incoming rounded-bl-xs'
          }`}
        >
          {/* Reply Quote Block */}
          {message.replyTo && (
            <div className="mb-2 p-2 rounded-xl bg-black/10 dark:bg-black/20 border-l-3 border-brand-400 text-xs">
              <span className="font-semibold block text-brand-500 dark:text-brand-300">Replying to message</span>
              <p className="truncate opacity-80">{message.replyTo.content || '[Attachment]'}</p>
            </div>
          )}

          {/* Image Attachment */}
          {message.fileType === 'image' && message.fileUrl && (
            <div className="mb-2 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 group/img relative">
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Attachment'}
                className="max-h-64 w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onOpenImageLightbox && onOpenImageLightbox(message.fileUrl, message.fileName)}
              />
            </div>
          )}

          {/* Voice Note / Audio Player Component */}
          {(message.fileType === 'audio' || message.fileType === 'voice') && message.fileUrl && (
            <div className="mb-2 flex items-center gap-3 p-2 px-3 bg-black/10 dark:bg-black/25 rounded-2xl border border-black/10 dark:border-white/10 min-w-[220px]">
              <audio
                ref={audioRef}
                src={message.fileUrl}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />
              <button
                onClick={toggleAudioPlay}
                className="p-2.5 rounded-full bg-brand-600 text-white shadow-md hover:scale-105 transition-transform flex-shrink-0"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Audio Waveform Bars Simulation */}
              <div className="flex-1 flex items-center gap-1 h-6">
                {[10, 18, 8, 22, 14, 26, 12, 20, 16, 10, 24, 15, 8].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      isPlayingAudio ? 'bg-brand-400 animate-pulse' : 'bg-gray-400 dark:bg-gray-600'
                    }`}
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>

              <Volume2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          )}

          {/* Document Attachment */}
          {message.fileType === 'document' && message.fileUrl && (
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-2.5 mb-2 bg-black/10 dark:bg-black/25 rounded-xl hover:bg-black/20 dark:hover:bg-black/40 transition-colors border border-black/10 dark:border-white/10"
            >
              <FileText className="w-6 h-6 text-brand-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{message.fileName || 'Document.pdf'}</p>
                <span className="text-[10px] opacity-70 uppercase">PDF / Document</span>
              </div>
              <Download className="w-4 h-4 opacity-80" />
            </a>
          )}

          {/* Message Text Content */}
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

          {/* Timestamp & Read Receipts */}
          <div
            className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
              isOutgoing ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span>
              {new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>

            {isOutgoing && (
              <span className="flex-shrink-0" title="Read Status">
                {message.readBy?.length > 1 ? (
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300" />
                ) : message.deliveredTo?.length > 0 ? (
                  <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-indigo-200" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reaction Badges */}
        {reactionsList && reactionsList.length > 0 && (
          <div
            className={`flex items-center gap-1 mt-0.5 ${
              isOutgoing ? 'justify-end' : 'justify-start'
            }`}
          >
            {reactionsList.map((r, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs shadow-sm"
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
