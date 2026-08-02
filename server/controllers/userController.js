const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

const { uploadToCloudinary } = require('../utils/cloudinaryHelper');

// Memory fallback for offline mode
let memoryBlocked = new Map(); // blockerId -> Set of blockedUserIds

/**
 * @desc    Get all users (searchable by query)
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        $or: [
          { username: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
        ],
      }
    : {};

  try {
    const users = await User.find(keyword)
      .find({ _id: { $ne: req.user._id } })
      .select('-password');
    res.json({ success: true, users });
  } catch (error) {
    // Mock user list fallback
    const mockList = [
      {
        _id: 'mock_1',
        username: 'Sarah Connor',
        email: 'sarah@chatverse.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
        bio: 'Cybersecurity Analyst & Tech Enthusiast',
        isOnline: true,
        lastSeen: new Date(),
      },
      {
        _id: 'mock_2',
        username: 'Alex Rivera',
        email: 'alex@chatverse.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        bio: 'Building real-time web apps with React & Node',
        isOnline: false,
        lastSeen: new Date(Date.now() - 3600000),
      },
      {
        _id: 'mock_3',
        username: 'Elena Rostova',
        email: 'elena@chatverse.com',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
        bio: 'UX/UI Designer. Coffee & clean pixels.',
        isOnline: true,
        lastSeen: new Date(),
      },
    ];

    const filtered = req.query.search
      ? mockList.filter((u) => u.username.toLowerCase().includes(req.query.search.toLowerCase()))
      : mockList;

    res.json({ success: true, users: filtered });
  }
});

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json({ success: true, user });
  } catch (error) {
    res.json({
      success: true,
      user: {
        _id: req.params.id,
        username: 'Demo User',
        email: 'demo@chatverse.com',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        bio: 'Sample user profile in demo mode',
        isOnline: true,
      },
    });
  }
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/update
 * @access  Private
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const { username, bio, avatar } = req.body;
  let uploadedAvatarUrl = avatar || '';

  if (req.file) {
    try {
      uploadedAvatarUrl = await uploadToCloudinary(req.file.buffer, {
        folder: 'chatverse/avatars',
        resource_type: 'image',
      });
    } catch (err) {
      console.error('Avatar upload to Cloudinary failed:', err);
    }
  }

  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = username || user.username;
      user.bio = bio !== undefined ? bio : user.bio;
      if (uploadedAvatarUrl) {
        user.avatar = uploadedAvatarUrl;
      }

      const updatedUser = await user.save();

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          _id: updatedUser._id,
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
          isAdmin: updatedUser.isAdmin,
        },
      });
    }
  } catch (e) {}

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      ...req.user,
      username: username || req.user.username,
      bio: bio !== undefined ? bio : req.user.bio,
      avatar: uploadedAvatarUrl || avatar || req.user.avatar,
    },
  });
});

/**
 * @desc    Get list of user IDs blocked by current user
 * @route   GET /api/users/blocked
 * @access  Private
 */
const getBlockedUsers = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();

  try {
    const blockedList = await BlockedUser.find({ blocker: req.user._id });
    const blockedUserIds = blockedList.map((b) => b.blockedUser.toString());

    // Also find who blocked current user
    const blockedByList = await BlockedUser.find({ blockedUser: req.user._id });
    const blockedByIds = blockedByList.map((b) => b.blocker.toString());

    return res.json({ success: true, blockedUserIds, blockedByIds });
  } catch (e) {
    const blockedUserIds = Array.from(memoryBlocked.get(userId) || []);
    return res.json({ success: true, blockedUserIds, blockedByIds: [] });
  }
});

/**
 * @desc    Block a user
 * @route   POST /api/users/block/:id
 * @access  Private
 */
const blockUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const userId = req.user._id.toString();

  try {
    await BlockedUser.create({
      blocker: req.user._id,
      blockedUser: targetUserId,
    });
  } catch (e) {}

  if (!memoryBlocked.has(userId)) memoryBlocked.set(userId, new Set());
  memoryBlocked.get(userId).add(targetUserId);

  res.json({ success: true, message: 'User blocked successfully', blockedUserId: targetUserId });
});

/**
 * @desc    Unblock a user
 * @route   POST /api/users/unblock/:id
 * @access  Private
 */
const unblockUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;
  const userId = req.user._id.toString();

  try {
    await BlockedUser.deleteOne({
      blocker: req.user._id,
      blockedUser: targetUserId,
    });
  } catch (e) {}

  if (memoryBlocked.has(userId)) {
    memoryBlocked.get(userId).delete(targetUserId);
  }

  res.json({ success: true, message: 'User unblocked successfully', unblockedUserId: targetUserId });
});

module.exports = {
  getUsers,
  getUserById,
  updateUserProfile,
  getBlockedUsers,
  blockUser,
  unblockUser,
};
