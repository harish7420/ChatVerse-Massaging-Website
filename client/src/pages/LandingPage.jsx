import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Shield, Zap, Lock, Globe, Cpu, Users, Sparkles, ArrowRight, MessageSquareHeart, Mic, CheckCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import FeedbackModal from '../components/FeedbackModal';

const LandingPage = () => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors selection:bg-brand-500 selection:text-white">
      <Navbar onOpenFeedback={() => setShowFeedbackModal(true)} />

      {/* Hero Section */}
      <section className="relative pt-16 pb-28 px-4 md:px-8 overflow-hidden">
        {/* Glowing Ambient Background Orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-brand-600/20 to-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-900 text-xs font-bold text-brand-600 dark:text-brand-300 border border-gray-200 dark:border-brand-500/30 shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span>ChatVerse 2.0 WhatsApp-Powered Real-Time Engine</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-brand-600 dark:from-white dark:via-gray-100 dark:to-brand-300 leading-tight"
          >
            Connect, Collaborate & Communicate in Real-Time
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            Voice messages, WhatsApp status stories, read receipts, peer-to-peer audio/video calls, and light & dark themes built with React & Socket.io.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white font-bold text-base shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              Start Chatting Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 font-bold text-base hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 text-center shadow-sm"
            >
              Sign In to Account
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-20 px-4 md:px-8 bg-white dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800/80 transition-colors">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Engineered for Seamless UX</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
              Loaded with rich WhatsApp features, responsive layout, and full user feedback management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Mic className="w-6 h-6 text-brand-500" />,
                title: 'Voice Notes & Audio Recording',
                desc: 'Record live voice messages with MediaRecorder API, duration timers, and custom waveform player.',
              },
              {
                icon: <CheckCheck className="w-6 h-6 text-cyan-500" />,
                title: 'Read Receipts & Status Ticks',
                desc: 'Single check (✓) sent, double check (✓✓) delivered, and blue double check (✓✓) read statuses.',
              },
              {
                icon: <Sparkles className="w-6 h-6 text-purple-500" />,
                title: 'WhatsApp Status Stories',
                desc: 'Post 24-hour text or image status updates with automated story progress indicators.',
              },
              {
                icon: <Globe className="w-6 h-6 text-emerald-500" />,
                title: 'WebRTC Audio & Video Calls',
                desc: 'Real-time peer-to-peer WebRTC calling with audio and video stream overlays.',
              },
              {
                icon: <MessageSquareHeart className="w-6 h-6 text-pink-500" />,
                title: 'User Feedback System',
                desc: 'Interactive feedback modal with ratings and dedicated Admin Dashboard review panel.',
              },
              {
                icon: <Cpu className="w-6 h-6 text-amber-500" />,
                title: 'Fixed Light & Dark Modes',
                desc: 'Adaptive Tailwind CSS & CSS variables design system optimized for all device sizes.',
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -6 }}
                className="p-6 rounded-3xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-brand-500/40 transition-all space-y-3 shadow-sm"
              >
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700 shadow-xs">
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400">
        <p>© 2026 ChatVerse Platform. Designed for high-performance communication.</p>
      </footer>

      {showFeedbackModal && (
        <FeedbackModal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} />
      )}
    </div>
  );
};

export default LandingPage;
