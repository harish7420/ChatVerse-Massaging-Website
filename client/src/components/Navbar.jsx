import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Shield, Settings, LogOut, Sun, Moon, MessageSquareHeart } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeContext } from '../context/ThemeContext';
import { getMediaUrl, handleImageError, DEFAULT_AVATAR } from '../utils/imageUtils';

const Navbar = ({ onOpenFeedback }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="h-16 border-b border-gray-200 dark:border-gray-800/80 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 md:px-8 flex items-center justify-between transition-colors w-full">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 group-hover:scale-105 transition-transform">
          <MessageSquare className="w-5 h-5 fill-current" />
        </div>
        <span className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-brand-600 dark:from-white dark:via-gray-200 dark:to-brand-300">
          ChatVerse
        </span>
      </Link>

      {/* Navigation Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Dark / Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </button>

        {/* Feedback Button */}
        <button
          onClick={onOpenFeedback}
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-300 border border-brand-500/20 hover:bg-brand-500/20 transition-all flex items-center gap-1.5"
          title="Share Feedback"
        >
          <MessageSquareHeart className="w-4 h-4" />
          <span className="hidden sm:inline">Feedback</span>
        </button>

        {user ? (
          <>
            <Link
              to="/dashboard"
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
                location.pathname === '/dashboard'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chats</span>
            </Link>

            {user.isAdmin && (
              <Link
                to="/admin"
                className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
                  location.pathname === '/admin'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            <Link
              to="/profile"
              className="p-0.5 rounded-full border-2 border-gray-300 dark:border-gray-700 hover:border-brand-500 transition-colors flex-shrink-0"
              title="Profile"
            >
              <img
                src={getMediaUrl(user.avatar, DEFAULT_AVATAR)}
                alt={user.username || 'User Profile'}
                onError={(e) => handleImageError(e, DEFAULT_AVATAR)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
              />
            </Link>

            <Link
              to="/settings"
              className="p-1.5 sm:p-2 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all hover:scale-[1.02]"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
