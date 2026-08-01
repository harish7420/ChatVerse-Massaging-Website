import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import API from '../services/api';
import Navbar from '../components/Navbar';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/auth/reset-password', {
        resetToken: token,
        newPassword,
      });
      if (data.success) {
        setSuccess(true);
      }
    } catch (e) {
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl glass-panel shadow-2xl border border-gray-800 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-100">Set New Password</h2>
            <p className="text-xs text-gray-400">Choose a secure strong password for your account</p>
          </div>

          {success ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-emerald-200">Password reset successful!</p>
              <Link
                to="/login"
                className="inline-block px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
              >
                Sign In Now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-sm text-gray-100 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
