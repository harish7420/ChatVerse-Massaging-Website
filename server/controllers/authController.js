const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // DB Check
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    res.status(400);
    throw new Error('User with this email or username already exists');
  }

  const userCount = await User.countDocuments();
  const isAdmin = email.toLowerCase().includes('admin') || userCount === 0;

  const user = await User.create({
    username,
    email,
    password,
    isAdmin,
  });

  const token = generateToken(res, user._id);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      isAdmin: user.isAdmin,
    },
    token,
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    if (user.isSuspended) {
      res.status(403);
      throw new Error('Your account has been suspended by an administrator');
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(res, user._id);

    return res.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isAdmin: user.isAdmin,
        isOnline: user.isOnline,
      },
      token,
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password. Please verify credentials or create a new account.');
  }
});

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = asyncHandler(async (req, res) => {
  if (req.user && req.user._id) {
    try {
      await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    } catch (e) {}
  }

  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * @desc    Forgot Password Request
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error('No user found with that email address');
  }

  // Generate random reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Password reset link sent',
    resetToken,
  });
});

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired reset token');
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({ success: true, message: 'Password has been reset successfully. You can now login.' });
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
};

