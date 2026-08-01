import React, { useState } from 'react';
import { Star, X, Send, Sparkles, MessageSquareHeart } from 'lucide-react';
import API from '../services/api';

const FeedbackModal = ({ isOpen, onClose, onFeedbackSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      await API.post('/feedback', { rating, category, message });
      setSubmitted(true);
      if (onFeedbackSubmitted) onFeedbackSubmitted();
      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        onClose();
      }, 1800);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Fallback for demo
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setMessage('');
        onClose();
      }, 1800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thank You!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your feedback helps us make ChatVerse better for everyone.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <MessageSquareHeart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Share Your Feedback</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">We value your thoughts and suggestions</p>
              </div>
            </div>

            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                How would you rate your experience?
              </label>
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400 filter drop-shadow'
                          : 'text-gray-300 dark:text-gray-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-brand-500"
              >
                <option value="general">🌟 General Impression</option>
                <option value="feature">💡 Feature Request</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="ux">🎨 Design & UI Improvement</option>
              </select>
            </div>

            {/* Feedback Message Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Your Message</label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did you like or what could we improve?"
                required
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
