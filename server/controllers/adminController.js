const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Message = require('../models/Message');
const Chat = require('../models/Chat');

/**
 * @desc    Get Admin Dashboard Stats & System Analytics
 * @route   GET /api/admin/stats
 * @access  Private (Admin Only)
 */
const getAdminStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const onlineUsers = await User.countDocuments({ isOnline: true });
  const totalMessages = await Message.countDocuments();
  const totalChats = await Chat.countDocuments();

  return res.json({
    success: true,
    stats: {
      totalUsers,
      activeUsers: onlineUsers,
      onlineUsers,
      totalMessages,
      totalChats,
      storageUsed: 'MongoDB Atlas',
      serverUptime: '99.99%',
    },
  });
});

/**
 * @desc    Get List of Users for Management
 * @route   GET /api/admin/users
 * @access  Private (Admin Only)
 */
const getAdminUsersList = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  return res.json({ success: true, users });
});

/**
 * @desc    Suspend or Unsuspend User
 * @route   PUT /api/admin/users/:id/suspend
 * @access  Private (Admin Only)
 */
const toggleSuspendUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isSuspended = !user.isSuspended;
  await user.save();

  return res.json({
    success: true,
    message: `User ${user.isSuspended ? 'suspended' : 'unsuspended'} successfully`,
    isSuspended: user.isSuspended,
  });
});

/**
 * @desc    Delete User
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin Only)
 */
const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await User.findByIdAndDelete(userId);

  res.json({ success: true, message: 'User deleted from system' });
});

module.exports = {
  getAdminStats,
  getAdminUsersList,
  toggleSuspendUser,
  deleteUserByAdmin,
};

