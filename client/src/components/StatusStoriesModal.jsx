import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, Send, Eye, ChevronLeft, ChevronRight, Image as ImageIcon, Video as VideoIcon, Type, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import API from '../services/api';
import { getMediaUrl, handleImageError, DEFAULT_AVATAR, DEFAULT_IMAGE_FALLBACK } from '../utils/imageUtils';

const GRADIENT_PALETTES = [
  'from-brand-600 to-indigo-800',
  'from-purple-600 to-pink-600',
  'from-emerald-600 to-teal-800',
  'from-amber-500 to-rose-600',
  'from-cyan-600 to-blue-800',
];

const StatusStoriesModal = ({ isOpen, onClose }) => {
  const { user, showToast } = useAuth();
  const { socket } = useSocket();
  const [statusGroups, setStatusGroups] = useState([]);
  const [activeUserIndex, setActiveUserIndex] = useState(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);

  // New Status Form State
  const [statusType, setStatusType] = useState('text'); // 'text' | 'image' | 'video'
  const [newStatusText, setNewStatusText] = useState('');
  const [selectedBgColor, setSelectedBgColor] = useState(GRADIENT_PALETTES[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isPosting, setIsPosting] = useState(false);

  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  // Restrict Admin Users from Status Feature
  if (user?.isAdmin) {
    if (isOpen) onClose();
    return null;
  }

  // Fetch active statuses from backend
  const fetchStatuses = async () => {
    try {
      const { data } = await API.get('/status');
      if (data.success) {
        setStatusGroups(data.statuses || []);
      }
    } catch (error) {
      console.error('Failed to load statuses:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
    }
  }, [isOpen]);

  // Record status view when viewing a status
  useEffect(() => {
    if (!isOpen || statusGroups.length === 0) return;

    const currentGroup = statusGroups[activeUserIndex];
    const currentStory = currentGroup?.items[activeStoryIndex];

    if (currentStory && currentStory._id) {
      API.post(`/status/${currentStory._id}/view`).catch(() => {});
    }
  }, [isOpen, activeUserIndex, activeStoryIndex, statusGroups]);

  // Auto advance story timer
  useEffect(() => {
    if (!isOpen || showAddModal || statusGroups.length === 0) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, activeUserIndex, activeStoryIndex, showAddModal, statusGroups]);

  if (!isOpen) return null;

  const currentStatusGroup = statusGroups[activeUserIndex];
  const currentStory = currentStatusGroup?.items[activeStoryIndex];

  const handleNextStory = () => {
    if (!currentStatusGroup) return;
    if (activeStoryIndex < currentStatusGroup.items.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else if (activeUserIndex < statusGroups.length - 1) {
      setActiveUserIndex((prev) => prev + 1);
      setActiveStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrevStory = () => {
    if (!currentStatusGroup) return;
    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    } else if (activeUserIndex > 0) {
      setActiveUserIndex((prev) => prev - 1);
      setActiveStoryIndex(statusGroups[activeUserIndex - 1].items.length - 1);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));

    if (file.type.startsWith('video/')) {
      setStatusType('video');
    } else if (file.type.startsWith('image/')) {
      setStatusType('image');
    }
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    if (statusType === 'text' && !newStatusText.trim()) return;
    if ((statusType === 'image' || statusType === 'video') && !selectedFile) return;

    setIsPosting(true);
    const formData = new FormData();
    formData.append('type', statusType);
    if (newStatusText) formData.append('content', newStatusText);
    formData.append('bgColor', selectedBgColor);
    if (selectedFile) formData.append('media', selectedFile);

    try {
      const { data } = await API.post('/status', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        showToast('Status posted successfully!', 'success');
        if (socket) {
          socket.emit('status_posted', data.status);
        }
        setNewStatusText('');
        setSelectedFile(null);
        setFilePreview(null);
        setShowAddModal(false);
        fetchStatuses();
      }
    } catch (error) {
      showToast('Failed to post status update', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteStatus = async () => {
    if (!currentStory || !currentStory._id) return;
    try {
      const { data } = await API.delete(`/status/${currentStory._id}`);
      if (data.success) {
        showToast('Status deleted successfully', 'info');
        if (socket) {
          socket.emit('status_deleted', { statusId: currentStory._id });
        }
        fetchStatuses();
      }
    } catch (e) {
      showToast('Failed to delete status', 'error');
    }
  };

  const isMyStatus = currentStatusGroup?.user?._id === user?._id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4 select-none">
      {/* Overlay Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-lg" onClick={onClose} />

      {/* Main Story Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md h-[80vh] max-h-[700px] rounded-3xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl flex flex-col justify-between">
        {/* Story Progress Bar Header */}
        <div className="absolute top-0 inset-x-0 p-4 z-20 bg-gradient-to-b from-black/80 to-transparent space-y-3">
          <div className="flex gap-1.5">
            {currentStatusGroup?.items.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width:
                      idx < activeStoryIndex
                        ? '100%'
                        : idx === activeStoryIndex
                        ? `${progress}%`
                        : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* User Info Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={getMediaUrl(currentStatusGroup?.user?.avatar, DEFAULT_AVATAR)}
                alt={currentStatusGroup?.user?.username}
                onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                className="w-10 h-10 rounded-full object-cover border-2 border-brand-500"
              />
              <div>
                <h4 className="text-sm font-bold text-white leading-tight">
                  {currentStatusGroup?.user?.username || 'Contact'}
                </h4>
                <p className="text-[11px] text-gray-300">
                  {currentStory?.createdAt
                    ? new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-full bg-brand-600/80 hover:bg-brand-600 text-white text-xs font-semibold flex items-center gap-1 backdrop-blur-md transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Status
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Canvas Body */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          {/* Navigation Controls */}
          <button
            onClick={handlePrevStory}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white z-20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNextStory}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white z-20 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Render Active Story Content */}
          {currentStory ? (
            currentStory.type === 'image' ? (
              <div className="w-full h-full relative flex flex-col justify-center items-center">
                <img
                  src={getMediaUrl(currentStory.mediaUrl, DEFAULT_IMAGE_FALLBACK)}
                  alt="Status"
                  onError={(e) => handleImageError(e, DEFAULT_IMAGE_FALLBACK)}
                  className="w-full h-full object-cover"
                />
                {currentStory.content && (
                  <div className="absolute bottom-16 inset-x-4 p-3 rounded-2xl bg-black/60 backdrop-blur-md text-white text-center text-sm">
                    {currentStory.content}
                  </div>
                )}
              </div>
            ) : currentStory.type === 'video' ? (
              <div className="w-full h-full relative flex flex-col justify-center items-center bg-black">
                <video
                  ref={videoRef}
                  src={getMediaUrl(currentStory.mediaUrl)}
                  autoPlay
                  playsInline
                  controls
                  className="w-full h-full object-contain"
                />
                {currentStory.content && (
                  <div className="absolute bottom-16 inset-x-4 p-3 rounded-2xl bg-black/60 backdrop-blur-md text-white text-center text-sm z-10">
                    {currentStory.content}
                  </div>
                )}
              </div>
            ) : (
              /* Text Status */
              <div
                className={`w-full h-full p-8 bg-gradient-to-br ${
                  currentStory.bgColor || 'from-brand-600 to-indigo-800'
                } flex items-center justify-center text-center`}
              >
                <p className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed tracking-wide drop-shadow-lg">
                  {currentStory.content}
                </p>
              </div>
            )
          ) : (
            <div className="text-center text-gray-400 text-sm">No active status updates available</div>
          )}
        </div>

        {/* Creator Viewers Tray (Eye Icon & Delete for My Status) */}
        {isMyStatus && currentStory && (
          <div className="p-3 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-white text-xs z-20">
            <button
              onClick={() => setShowViewersDrawer(true)}
              className="flex items-center gap-1.5 hover:text-brand-300 transition-colors"
            >
              <Eye className="w-4 h-4 text-brand-400" />
              <span>{currentStory.viewers?.length || 0} Viewers</span>
            </button>

            <button
              onClick={handleDeleteStatus}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors px-2.5 py-1 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
              title="Delete Status"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Viewers Drawer Modal */}
      {showViewersDrawer && currentStory && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-400" />
                Status Viewers ({currentStory.viewers?.length || 0})
              </h3>
              <button onClick={() => setShowViewersDrawer(false)} className="p-1 text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-gray-800">
              {currentStory.viewers && currentStory.viewers.length > 0 ? (
                currentStory.viewers.map((vw, idx) => (
                  <div key={idx} className="flex items-center gap-3 pt-2">
                    <img
                      src={getMediaUrl(vw.user?.avatar, DEFAULT_AVATAR)}
                      alt={vw.user?.username}
                      onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                      className="w-8 h-8 rounded-full object-cover border border-gray-700"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{vw.user?.username || 'User'}</p>
                      <p className="text-[10px] text-gray-400">
                        {vw.viewedAt ? new Date(vw.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center text-gray-500 py-4">No viewers yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post New Status Form Overlay */}
      {showAddModal && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-400" />
                Post Status Update
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Selector (Text / Image / Video) */}
            <div className="flex items-center gap-2 p-1 bg-gray-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setStatusType('text');
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  statusType === 'text' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Type className="w-3.5 h-3.5" /> Text
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusType('image');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  statusType === 'image' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Image
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusType('video');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  statusType === 'video' ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5" /> Video
              </button>
            </div>

            {/* Text Input / Caption */}
            <textarea
              rows={3}
              value={newStatusText}
              onChange={(e) => setNewStatusText(e.target.value)}
              placeholder={statusType === 'text' ? "What's on your mind today?" : 'Add a caption...'}
              className="w-full p-3 rounded-xl bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:border-brand-500 text-sm resize-none"
            />

            {/* Color Palette Selector for Text Status */}
            {statusType === 'text' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400">Background Gradient</label>
                <div className="flex items-center gap-2">
                  {GRADIENT_PALETTES.map((pal) => (
                    <button
                      key={pal}
                      type="button"
                      onClick={() => setSelectedBgColor(pal)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${pal} border-2 ${
                        selectedBgColor === pal ? 'border-white scale-110' : 'border-transparent opacity-70'
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* File Upload Selector for Image/Video Status */}
            {(statusType === 'image' || statusType === 'video') && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept={statusType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileSelect}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600/20 file:text-brand-300 hover:file:bg-brand-600/30"
                />
                {filePreview && (
                  <div className="h-28 rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center bg-black">
                    {statusType === 'image' ? (
                      <img src={filePreview} alt="Preview" className="h-full object-cover" />
                    ) : (
                      <video src={filePreview} className="h-full object-contain" />
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateStatus}
                disabled={isPosting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isPosting ? 'Posting...' : 'Post Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusStoriesModal;
