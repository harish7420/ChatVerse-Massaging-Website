const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');

/**
 * Protect routes by verifying JWT token from Header or Cookie
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check Bearer Token in authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const secret = process.env.JWT_SECRET || 'chatverse_super_secret_jwt_key_2026';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }

    if (user.isSuspended) {
      res.status(403);
      throw new Error('Account suspended by administrator');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token failed: ' + error.message);
  }
});

/**
 * Restrict routes to Admin users only
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin === true) {
    next();
  } else {
    res.status(403);
    throw new Error('Forbidden: Admin access required');
  }
};

module.exports = { protect, adminOnly };

