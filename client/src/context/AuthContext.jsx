import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('chatverse_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('chatverse_token') || null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, password });
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('chatverse_user', JSON.stringify(data.user));
        localStorage.setItem('chatverse_token', data.token);
        showToast('Successfully logged in!', 'success');
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', { username, email, password });
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('chatverse_user', JSON.stringify(data.user));
        localStorage.setItem('chatverse_token', data.token);
        showToast('Welcome to ChatVerse! Account created successfully.', 'success');
        return { success: true };
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await API.post('/auth/logout');
    } catch (e) {}
    setUser(null);
    setToken(null);
    localStorage.removeItem('chatverse_user');
    localStorage.removeItem('chatverse_token');
    showToast('Logged out successfully', 'info');
  };

  const updateUserProfile = async (userData) => {
    setLoading(true);
    try {
      const { data } = await API.put('/users/update', userData);
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('chatverse_user', JSON.stringify(data.user));
        showToast('Profile updated!', 'success');
        return { success: true };
      }
    } catch (error) {
      showToast('Profile update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        toast,
        showToast,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
