const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const BlockedUser = require('../models/BlockedUser');

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

  const users = await User.find(keyword)
    .find({ _id: { $ne: req.user._id } })
    .select('-password');
  res.json({ success: true, users });
});

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ success: true, user });
});

/**
 * @desc    Update current user profile
 * @route   PUT /api/users/update
 * @access  Private
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  const { username, bio, avatar } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (avatar) user.avatar = avatar; // Base64 data URI string stored in Atlas

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
});

/**
 * @desc    Get list of user IDs blocked by current user
 * @route   GET /api/users/blocked
 * @access  Private
 */
const getBlockedUsers = asyncHandler(async (req, res) => {
  const blockedList = await BlockedUser.find({ blocker: req.user._id });
  const blockedUserIds = blockedList.map((b) => b.blockedUser.toString());

  const blockedByList = await BlockedUser.find({ blockedUser: req.user._id });
  const blockedByIds = blockedByList.map((b) => b.blocker.toString());

  return res.json({ success: true, blockedUserIds, blockedByIds });
});

/**
 * @desc    Block a user
 * @route   POST /api/users/block/:id
 * @access  Private
 */
const blockUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;

  const existingBlock = await BlockedUser.findOne({
    blocker: req.user._id,
    blockedUser: targetUserId,
  });

  if (!existingBlock) {
    await BlockedUser.create({
      blocker: req.user._id,
      blockedUser: targetUserId,
    });
  }

  res.json({ success: true, message: 'User blocked successfully', blockedUserId: targetUserId });
});

/**
 * @desc    Unblock a user
 * @route   POST /api/users/unblock/:id
 * @access  Private
 */
const unblockUser = asyncHandler(async (req, res) => {
  const targetUserId = req.params.id;

  await BlockedUser.deleteOne({
    blocker: req.user._id,
    blockedUser: targetUserId,
  });

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

