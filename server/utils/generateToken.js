const jwt = require('jsonwebtoken');

/**
 * Generate JWT token and set HTTP-only cookie
 * @param {Object} res - Express response object
 * @param {string} userId - User ID string
 * @returns {string} token
 */
const generateToken = (res, userId) => {
  const secret = process.env.JWT_SECRET || 'chatverse_super_secret_jwt_key_2026';
  const token = jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  // Set HTTP-Only Cookie
  if (res && res.cookie) {
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  return token;
};

module.exports = generateToken;
