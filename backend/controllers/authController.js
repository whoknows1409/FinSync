const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const emailService = require('../utils/emailService');

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
  let user = null;
  
  try {
    const { name, email, password } = req.body;

    console.log('📝 Registration attempt:', { name, email });

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide name, email, and password' 
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // Check if email service is available BEFORE creating user
    if (!emailService.isConfigured) {
      console.error('❌ Email service not initialized');
      return res.status(503).json({
        success: false,
        message: 'Email service is temporarily unavailable. Please try again later or contact support.',
        error: 'Email service not configured'
      });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user (not verified yet)
    user = await User.create({
      name,
      email,
      password,
      authProvider: 'local',
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    console.log('✅ User created:', user._id);
    console.log('✉️ Sending verification email to:', email);

    // Send verification email - if this fails, delete the user
    try {
      const emailResult = await emailService.sendVerificationEmail(email, verificationToken, name);
      
      console.log('✅ Verification email sent successfully:', emailResult);
      
      return res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        requiresVerification: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: false
        }
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      console.error('Full error:', emailError);
      
      // CRITICAL: Delete user if email fails - atomic operation
      if (user && user._id) {
        await User.findByIdAndDelete(user._id);
        console.log('🗑️ User deleted due to email failure:', user._id);
      }
      
      return res.status(500).json({ 
        success: false,
        message: 'Failed to send verification email. Registration cancelled. Please try again.',
        error: process.env.NODE_ENV === 'development' ? emailError.message : 'Email delivery failed'
      });
    }
  } catch (error) {
    console.error('❌ Register error:', error);
    console.error('Error stack:', error.stack);
    
    // If user was created but there was an error, clean up
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
        console.log('🗑️ Cleanup: User deleted after error:', user._id);
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup user:', cleanupError);
      }
    }
    
    // Ensure we always return JSON
    return res.status(500).json({ 
      success: false,
      message: 'Server error during registration. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Check if user registered with Google OAuth
    if (user.authProvider === 'google') {
      return res.status(400).json({ 
        success: false,
        message: 'This account was created with Google. Please sign in with Google.' 
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        requiresVerification: true,
        email: user.email
      });
    }
    
    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
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
// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired verification token. Please request a new one.' 
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail verification if welcome email fails
    }

    // Generate token for auto-login
    const authToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      token: authToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during email verification' 
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'No account found with this email address' 
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified. You can log in now.' 
      });
    }

    if (user.authProvider === 'google') {
      return res.status(400).json({ 
        success: false,
        message: 'This account uses Google sign-in and is already verified.' 
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await emailService.sendVerificationEmail(user.email, verificationToken, user.name);

    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to resend verification email. Please try again.' 
    });
  }
};
