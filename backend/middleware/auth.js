const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check if authorization header exists and starts with 'Bearer'
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract the token
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, return error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Load only what request handlers use. The profile image is stored on
      // the user and can be large, so it is not loaded on every request.
      req.user = await User.findById(decoded.id).select('_id name email tokensValidAfter');
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Tokens issued before a password change or "sign out everywhere" no longer work
      if (req.user.tokensValidAfter && decoded.iat * 1000 < req.user.tokensValidAfter.getTime()) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.'
        });
      }
      
      next();
    } catch (error) {
      // An expired or malformed token is routine, not an application error
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = { protect };