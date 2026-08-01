import React, { useContext, useState } from 'react';
import { Sun, Moon, Bell, Shield, Lock, Eye, MessageSquareHeart } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import FeedbackModal from '../components/FeedbackModal';

const SettingsPage = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      <Navbar onOpenFeedback={() => setShowFeedbackModal(true)} />

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Application Settings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Configure layout themes, push alerts, and privacy rules</p>
        </div>

        <div className="space-y-4">
          {/* Appearance Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-200 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" /> Theme Preference
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Dark / Light Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Current Theme: <span className="capitalize font-bold text-brand-600 dark:text-brand-300">{theme}</span>
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center gap-2 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                Toggle Theme
              </button>
            </div>
          </div>

          {/* Feedback Card Trigger */}
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-200 flex items-center gap-2">
              <MessageSquareHeart className="w-4 h-4 text-pink-500" /> User Feedback & Ratings
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Submit Suggestions or Report Bugs</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Help us improve ChatVerse features</p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-600 text-white hover:bg-brand-500 text-xs font-bold shadow-md flex items-center gap-2 transition-colors"
              >
                <MessageSquareHeart className="w-4 h-4" />
                Give Feedback
              </button>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-200 flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-500" /> Notifications & Sound
            </h3>

            <div className="space-y-3 divide-y divide-gray-200 dark:divide-gray-800">
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Desktop Browser Notifications</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive alert popups for new messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Audio Chime Alerts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Play sound effects when receiving messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Privacy Rules */}
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-500" /> Privacy & Read Receipts
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Read Receipts (Blue Checkmarks)</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Let contacts know when you have read their messages</p>
              </div>
              <input
                type="checkbox"
                checked={readReceipts}
                onChange={(e) => setReadReceipts(e.target.checked)}
                className="w-5 h-5 accent-brand-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {showFeedbackModal && (
        <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
};

export default SettingsPage;
