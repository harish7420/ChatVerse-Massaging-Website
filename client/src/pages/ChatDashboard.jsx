import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import UserInfoSidebar from '../components/UserInfoSidebar';
import CallModal from '../components/CallModal';
import Toast from '../components/Toast';
import FeedbackModal from '../components/FeedbackModal';
import ImageLightbox from '../components/ImageLightbox';
import StatusStoriesModal from '../components/StatusStoriesModal';
import CreateGroupModal from '../components/CreateGroupModal';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useSocket } from '../hooks/useSocket';

const ChatDashboard = () => {
  const { toast } = useAuth();
  const { selectedChat } = useChat();
  const { activeCall } = useSocket();

  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [lightboxData, setLightboxData] = useState(null); // { url, name }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden transition-colors">
      <Navbar onOpenFeedback={() => setShowFeedbackModal(true)} />
      <Toast toast={toast} />

      {/* Main Workspace Layout Grid with WhatsApp Responsive Single-Pane Mobile Logic */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Panel: On mobile, hide if a chat is selected */}
        <div className={`h-full ${selectedChat ? 'hidden md:block' : 'w-full md:w-80 lg:w-96'}`}>
          <Sidebar
            onOpenCreateGroup={() => setShowCreateGroupModal(true)}
            onOpenStories={() => setShowStoriesModal(true)}
          />
        </div>

        {/* Chat Area Panel: On mobile, hide if no chat selected */}
        <div className={`h-full flex-1 ${!selectedChat ? 'hidden md:flex' : 'w-full flex'}`}>
          <ChatArea
            onToggleUserInfo={() => setShowUserInfo((prev) => !prev)}
            onOpenImageLightbox={(url, name) => setLightboxData({ url, name })}
          />
        </div>

        {/* User Info Drawer Overlay */}
        {showUserInfo && <UserInfoSidebar onClose={() => setShowUserInfo(false)} />}
      </div>

      {/* Modals & Overlays */}
      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}

      {showStoriesModal && (
        <StatusStoriesModal
          isOpen={showStoriesModal}
          onClose={() => setShowStoriesModal(false)}
        />
      )}

      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}

      {lightboxData && (
        <ImageLightbox
          imageUrl={lightboxData.url}
          fileName={lightboxData.name}
          onClose={() => setLightboxData(null)}
        />
      )}

      {/* WebRTC Call Modal Overlay */}
      {activeCall && <CallModal />}
    </div>
  );
};

export default ChatDashboard;
