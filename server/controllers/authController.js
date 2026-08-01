const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

// In-Memory User Mock Store for offline testing pre-seeded with demo accounts
const mockUsers = [
  {
    _id: 'usr_admin_demo',
    username: 'Admin Haris',
    email: 'admin@chatverse.com',
    password: 'admin123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    bio: 'System Administrator & Lead Developer',
    isAdmin: true,
    isOnline: true,
    isSuspended: false,
  },
  {
    _id: 'usr_user_demo',
    username: 'Demo User',
    email: 'user@chatverse.com',
    password: 'user123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    bio: 'ChatVerse Active Member',
    isAdmin: false,
    isOnline: true,
    isSuspended: false,
  },
];

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // DB Check
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      res.status(400);
      throw new Error('User with this email or username already exists');
    }

    const isAdmin = email.toLowerCase().includes('admin') || (await User.countDocuments()) === 0;

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
  } catch (error) {
    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      let existingMock = mockUsers.find((u) => u.email === email || u.username === username);
      if (existingMock) {
        res.status(400);
        throw new Error('User already exists (mock database mode)');
      }

      const mockUser = {
        _id: 'usr_' + Date.now(),
        username,
        email,
        password,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        bio: 'Hey there! I am using ChatVerse.',
        isAdmin: mockUsers.length === 0 || email.includes('admin'),
        isSuspended: false,
      };
      mockUsers.push(mockUser);

      const token = generateToken(res, mockUser._id);
      return res.status(201).json({
        success: true,
        message: 'Registration successful (Offline Mock Mode)',
        user: {
          _id: mockUser._id,
          username: mockUser.username,
          email: mockUser.email,
          avatar: mockUser.avatar,
          bio: mockUser.bio,
          isAdmin: mockUser.isAdmin,
        },
        token,
      });
    }
    throw error;
  }
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email }).select('+password');

    // Auto-create demo accounts if attempting login for the first time
    if (!user && (email === 'admin@chatverse.com' || email === 'user@chatverse.com')) {
      const isAdmin = email.includes('admin');
      const username = isAdmin ? 'Admin Haris' : 'Demo User';
      const userPass = password || (isAdmin ? 'admin123' : 'user123');

      user = await User.create({
        username,
        email,
        password: userPass,
        isAdmin,
      });
      user = await User.findOne({ email }).select('+password');
    }

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
  } catch (error) {
    if (error.name === 'MongooseError' || error.message.includes('buffering timed out')) {
      let mockUser = mockUsers.find((u) => u.email === email);
      if (!mockUser && (email === 'admin@chatverse.com' || email === 'user@chatverse.com')) {
        const isAdmin = email.includes('admin');
        mockUser = {
          _id: 'usr_' + Date.now(),
          username: isAdmin ? 'Admin Haris' : 'Demo User',
          email,
          password: password || (isAdmin ? 'admin123' : 'user123'),
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          bio: 'Demo Account',
          isAdmin,
          isOnline: true,
          isSuspended: false,
        };
        mockUsers.push(mockUser);
      }

      if (mockUser && mockUser.password === password) {
        if (mockUser.isSuspended) {
          res.status(403);
          throw new Error('Your account has been suspended by an administrator');
        }
        const token = generateToken(res, mockUser._id);
        return res.json({
          success: true,
          message: 'Logged in successfully (Demo Mode)',
          user: {
            _id: mockUser._id,
            username: mockUser.username,
            email: mockUser.email,
            avatar: mockUser.avatar,
            bio: mockUser.bio,
            isAdmin: mockUser.isAdmin,
            isOnline: true,
          },
          token,
        });
      }
    }
    throw error;
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
    } catch (e) {
      // Ignored in mock fallback
    }
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
    message: 'Password reset link sent to email (Demo Token generated)',
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
