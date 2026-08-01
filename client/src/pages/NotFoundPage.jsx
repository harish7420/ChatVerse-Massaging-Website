import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/30">
            <AlertCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold text-gray-100">404 - Page Not Found</h1>
            <p className="text-sm text-gray-400">
              The page or conversation you are looking for does not exist or was moved.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-brand-500/25 hover:scale-105 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
