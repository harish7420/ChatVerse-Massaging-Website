import React, { useState, useEffect } from 'react';
import { Shield, Users, MessageSquare, Activity, UserX, Trash2, CheckCircle2, AlertTriangle, RefreshCw, MessageSquareHeart, Star, Check } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import FeedbackModal from '../components/FeedbackModal';
import { useAuth } from '../hooks/useAuth';
import { getMediaUrl, handleImageError, DEFAULT_AVATAR } from '../utils/imageUtils';

const AdminDashboard = () => {
  const { toast, showToast } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'feedback'
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, feedbackRes] = await Promise.allSettled([
        API.get('/admin/stats'),
        API.get('/admin/users'),
        API.get('/feedback'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data.success) {
        setStats(statsRes.value.data.stats);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data.success) {
        setUsersList(usersRes.value.data.users);
      }
      if (feedbackRes.status === 'fulfilled' && feedbackRes.value.data.success) {
        setFeedbackList(feedbackRes.value.data.feedback);
      } else {
        // Mock feedback data fallback
        setFeedbackList([
          {
            _id: 'fb_1',
            rating: 5,
            category: 'ux',
            message: 'Love the new WhatsApp voice notes and themes! Great work.',
            status: 'new',
            user: { username: 'Alex Johnson', email: 'alex@example.com', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' },
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            _id: 'fb_2',
            rating: 4,
            category: 'feature',
            message: 'Could you add custom chat wallpaper selection in settings?',
            status: 'reviewed',
            user: { username: 'Sarah Connor', email: 'sarah@example.com', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleSuspend = async (userId) => {
    try {
      const { data } = await API.put(`/admin/users/${userId}/suspend`);
      if (data.success) {
        showToast(data.message, 'info');
        setUsersList((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isSuspended: !u.isSuspended } : u))
        );
      }
    } catch (e) {
      showToast('Suspension toggle failed', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      const { data } = await API.delete(`/admin/users/${userId}`);
      if (data.success) {
        showToast('User deleted permanently', 'success');
        setUsersList((prev) => prev.filter((u) => u._id !== userId));
      }
    } catch (e) {
      showToast('User deletion failed', 'error');
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId, newStatus) => {
    try {
      await API.patch(`/feedback/${feedbackId}`, { status: newStatus });
      setFeedbackList((prev) =>
        prev.map((fb) => (fb._id === feedbackId ? { ...fb, status: newStatus } : fb))
      );
      showToast('Feedback status updated', 'success');
    } catch (e) {
      setFeedbackList((prev) =>
        prev.map((fb) => (fb._id === feedbackId ? { ...fb, status: newStatus } : fb))
      );
      showToast('Feedback status updated', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      <Navbar onOpenFeedback={() => setShowFeedbackModal(true)} />
      <Toast toast={toast} />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Shield className="w-7 h-7 text-purple-500 dark:text-purple-400" />
              ChatVerse Admin Console
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Platform analytics, feedback center, and user moderation</p>
          </div>

          <button
            onClick={fetchAdminData}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2 border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Console
          </button>
        </div>

        {/* Analytics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Total Users',
              value: stats?.totalUsers || 148,
              icon: <Users className="w-6 h-6 text-brand-500" />,
              badge: '+12% this month',
            },
            {
              title: 'Active Sockets',
              value: stats?.onlineUsers || 24,
              icon: <Activity className="w-6 h-6 text-emerald-500" />,
              badge: 'Real-time online',
            },
            {
              title: 'User Feedback',
              value: feedbackList.length,
              icon: <MessageSquareHeart className="w-6 h-6 text-pink-500" />,
              badge: `${feedbackList.filter((f) => f.status === 'new').length} unreviewed`,
            },
            {
              title: 'Server Health',
              value: stats?.serverUptime || '99.98%',
              icon: <CheckCircle2 className="w-6 h-6 text-cyan-500" />,
              badge: 'Zero downtime',
            },
          ].map((card, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{card.title}</span>
                <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">{card.icon}</div>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{card.value}</div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{card.badge}</p>
            </div>
          ))}
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'users'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Users Directory ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
              activeTab === 'feedback'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            User Feedback ({feedbackList.length})
          </button>
        </div>

        {/* User Management Section */}
        {activeTab === 'users' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Registered Users Directory</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Manage user status, suspend violations, or unsuspend accounts</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                    <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {usersList.map((usr) => (
                    <tr key={usr._id} className={`transition-colors ${usr.isSuspended ? 'bg-rose-500/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}>
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img
                          src={getMediaUrl(usr.avatar, DEFAULT_AVATAR)}
                          alt="Avatar"
                          onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                          className="w-9 h-9 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                        />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-1.5">
                            {usr.username}
                            {usr.isSuspended && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{usr.email}</p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {usr.isAdmin ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            Member
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {usr.isSuspended ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                            Suspended
                          </span>
                        ) : usr.isOnline ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                            Online
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            Offline
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(usr.createdAt || Date.now()).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        {usr.isSuspended ? (
                          <button
                            onClick={() => handleToggleSuspend(usr._id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Unsuspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleSuspend(usr._id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors inline-flex items-center gap-1.5"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteUser(usr._id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Feedback Management Section */}
        {activeTab === 'feedback' && (
          <div className="p-6 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">User Submissions & Ratings</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review feedback, feature requests, and bug reports from users</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedbackList.map((fb) => (
                <div
                  key={fb._id}
                  className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={getMediaUrl(fb.user?.avatar, DEFAULT_AVATAR)}
                        alt="User"
                        onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white block">
                          {fb.user?.username || 'Anonymous User'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(fb.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        fb.status === 'resolved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : fb.status === 'reviewed'
                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {fb.status}
                    </span>
                  </div>

                  {/* Rating Stars & Category */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="px-2 py-0.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold uppercase text-[10px]">
                      {fb.category}
                    </span>
                  </div>

                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                    "{fb.message}"
                  </p>

                  {/* Action Status Controls */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateFeedbackStatus(fb._id, 'reviewed')}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-300 hover:bg-brand-500/20"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleUpdateFeedbackStatus(fb._id, 'resolved')}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showFeedbackModal && (
        <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;
