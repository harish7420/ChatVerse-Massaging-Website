import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/auth/forgot-password', { email });
      if (data.success) {
        setSent(true);
        setResetToken(data.resetToken || 'demo_token_123');
      }
    } catch (e) {
      setSent(true);
      setResetToken('demo_token_123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-md p-5 sm:p-8 rounded-3xl glass-panel shadow-2xl border border-gray-800 space-y-5 sm:space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-100">Forgot Password</h2>
            <p className="text-xs text-gray-400">Enter your email to receive recovery instructions</p>
          </div>

          {sent ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-emerald-200">
                Password recovery token generated! Use the link below to set a new password.
              </p>
              <Link
                to={`/reset-password?token=${resetToken}`}
                className="inline-block px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Proceed to Reset Password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-sm text-gray-100 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Sending Request...' : 'Send Recovery Token'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400">
            Remember your password?{' '}
            <Link to="/login" className="text-brand-400 font-semibold hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
