const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Generate refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Google OAuth login/signup
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ 
        success: false,
        message: 'Google credential is required' 
      });
    }

    console.log('🔐 Verifying Google token...');

    // Verify the Google token with Google's servers
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid Google token' 
      });
    }

    const { email, name, picture, sub: googleId, email_verified } = payload;

    console.log('✅ Google token verified for:', email);

    // Check if email is verified by Google
    if (!email_verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Please use a verified Google account' 
      });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (user) {
      console.log('👤 User exists, updating Google info...');
      // User exists - update Google info if needed
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.profileImage = picture || user.profileImage;
        user.isEmailVerified = true;
      }
      user.lastLogin = Date.now();
      await user.save();
    } else {
      console.log('👤 Creating new user with Google account...');
      // Create new user with Google
      user = await User.create({
        name,
        email,
        googleId,
        profileImage: picture,
        password: Math.random().toString(36).slice(-8) + 'Aa1!', // Random password (won't be used)
        isEmailVerified: true,
        authProvider: 'google',
        lastLogin: Date.now()
      });
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    console.log('✅ Google authentication successful');

    // Send tokens in response
    res.status(200).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('❌ Google Auth Error:', error);
    
    if (error.message?.includes('Token used too early')) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token timing. Please try again.' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};