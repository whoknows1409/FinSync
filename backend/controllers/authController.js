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

// Throws unless Google says this access token was issued to our OAuth client
async function assertTokenIssuedToThisApp(accessToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Without the client ID there is nothing to compare against. Sign-in keeps
    // working as before; set GOOGLE_CLIENT_ID on the backend to enable the check.
    console.warn('⚠️ GOOGLE_CLIENT_ID is not set: Google access tokens are not being checked against this app.');
    return;
  }

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!response.ok) {
    throw new Error(`Google tokeninfo API returned ${response.status}`);
  }

  const info = await response.json();
  if (info.aud !== clientId && info.azp !== clientId) {
    throw new Error('Google access token was issued to a different application');
  }
}

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

    // Sanitize: strip HTML tags from name to prevent stored XSS
    const sanitizedName = String(name).replace(/<[^>]*>/g, '').trim();
    if (!sanitizedName || sanitizedName.length < 1) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid name' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid email address' 
      });
    }

    // Validate password strength
    if (String(password).length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
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
      name: sanitizedName,
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
    // SECURITY: Use generic message to prevent user/provider enumeration
    if (user.authProvider === 'google') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
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
    res.status(500).json({ success: false, message: 'Server error during login' });
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

    let payload;

    // Support two secure credential formats:
    // 1. Access tokens from OAuth2 popup flow (prefixed with 'access_token:')
    // 2. Google ID tokens from One Tap / Sign-In flow (JWT format)
    // Both are verified server-side — no client-supplied data is trusted.

    if (credential.startsWith('access_token:')) {
      // OAuth2 popup flow: verify access token by calling Google's userinfo API server-side
      const accessToken = credential.slice('access_token:'.length);
      try {
        // An access token only proves who the Google user is, not which app it
        // was issued to. Without this check a token the user granted to any
        // other website could be used to sign in here as them.
        await assertTokenIssuedToThisApp(accessToken);

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!userInfoResponse.ok) {
          throw new Error(`Google userinfo API returned ${userInfoResponse.status}`);
        }

        payload = await userInfoResponse.json();
        // Map Google userinfo fields to match ID token payload format
        payload.email_verified = payload.email_verified ?? true;
      } catch (fetchError) {
        console.error('❌ Failed to verify Google access token:', fetchError.message);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid Google credential' 
        });
      }
    } else {
      // One Tap / ID token flow: verify JWT cryptographically via Google's API
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.error('❌ Failed to verify Google credential:', verifyError.message);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid Google credential' 
        });
      }
    }
    
    if (!payload) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid Google token' 
      });
    }

    const { 
      email, 
      name, 
      picture, 
      sub: googleId,
      email_verified 
    } = payload;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email not provided by Google' 
      });
    }

    // Google's verifyIdToken already validates the token — trust email_verified from the payload
    if (!email_verified) {
      return res.status(400).json({ 
        success: false,
        message: 'Please use a verified Google account' 
      });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (user) {
      // User exists - update Google info if needed
      if (!user.googleId && googleId) {
        user.googleId = googleId;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
      }
      if (picture && picture !== user.profileImage) {
        user.profileImage = picture;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      user.lastLogin = Date.now();
      await user.save();
    } else {
      // Create new user with Google
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleId: googleId || undefined,
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
    console.error('❌ Google Auth Error:', error.message);
    
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

    // The link was either for a new account or for a change of email address
    const isEmailChange = !!user.pendingEmail;
    if (isEmailChange) {
      const taken = await User.exists({ email: user.pendingEmail, _id: { $ne: user._id } });
      if (taken) {
        user.pendingEmail = undefined;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        return res.status(400).json({
          success: false,
          message: 'That email address is now used by another account.'
        });
      }
      user.email = user.pendingEmail;
      user.pendingEmail = undefined;
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email to new accounts
    if (!isEmailChange) {
      try {
        await emailService.sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail verification if welcome email fails
      }
    }

    // Generate token for auto-login
    const authToken = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      message: isEmailChange
        ? 'Your email address has been updated.'
        : 'Email verified successfully! You can now log in.',
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

// ---------------------------------------------------------------------------
// Passwords and account lifecycle
// ---------------------------------------------------------------------------

const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour, as the email says

// Only a hash of the reset token is stored, so a database leak cannot be used
// to reset anyone's password.
const hashToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');

// Rejects every login token issued before now. JWT issue times are whole
// seconds, so round down: the token handed out in this same response stays valid.
const invalidateExistingTokens = user => {
  user.tokensValidAfter = new Date(Math.floor(Date.now() / 1000) * 1000);
};

// @desc    Email a password reset link
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  // The same answer whether or not the address has an account, so this cannot
  // be used to find out who is registered.
  const genericResponse = {
    success: true,
    message: 'If an account exists for that email address, we have sent a link to reset the password.'
  };

  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please enter your email address' });
    }

    if (!emailService.isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Password reset is unavailable right now. Please try again later.'
      });
    }

    const user = await User.findOne({ email });

    // Google accounts have no password to reset
    if (!user || user.authProvider === 'google') {
      return res.json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);
    await user.save();

    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError.message);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      return res.status(500).json({
        success: false,
        message: 'We could not send the reset email. Please try again.'
      });
    }

    res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// @desc    Set a new password using the emailed link
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Reset link and new password are required' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      });
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired. Please request a new one.'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Opening the emailed link proves the address belongs to them
    user.isEmailVerified = true;
    invalidateExistingTokens(user);
    await user.save();

    res.json({
      success: true,
      message: 'Your password has been changed. You can now sign in with it.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// @desc    Change password while signed in
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account signs in with Google, so it has no password to change.'
      });
    }
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      });
    }
    if (!(await user.comparePassword(String(currentPassword || '')))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    invalidateExistingTokens(user);
    await user.save();

    // Other devices are signed out; this one continues with a fresh token
    res.json({
      success: true,
      message: 'Password changed. Other devices have been signed out.',
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// @desc    Sign out of every device
// @route   POST /api/auth/logout-all
// @access  Private
exports.logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Move the cut-off one second ahead so the token used for this request is rejected too
    user.tokensValidAfter = new Date((Math.floor(Date.now() / 1000) + 1) * 1000);
    await user.save();

    res.json({ success: true, message: 'You have been signed out everywhere.' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// @desc    Permanently delete the account and everything stored for it
// @route   DELETE /api/auth/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Confirm it is really them: the password, or for Google accounts the word DELETE
    if (user.authProvider === 'google') {
      if (req.body?.confirm !== 'DELETE') {
        return res.status(400).json({ success: false, message: 'Type DELETE to confirm' });
      }
    } else if (!(await user.comparePassword(String(req.body?.password || '')))) {
      return res.status(400).json({ success: false, message: 'Password is incorrect' });
    }

    const userId = user._id;
    await Promise.all([
      require('../models/Transaction').deleteMany({ user: userId }),
      require('../models/RecurringTransaction').deleteMany({ user: userId }),
      require('../models/Budget').deleteMany({ user: userId }),
      require('../models/FinancialGoal').deleteMany({ user: userId }),
      require('../models/Goal').deleteMany({ user: userId }),
      require('../models/Activity').deleteMany({ user: userId }),
      require('../models/ChatHistory').deleteMany({ user: userId }),
      require('../models/Notification').deleteMany({ user: userId }),
      require('../models/TradingAccount').deleteMany({ user: userId }),
      require('../models/DashboardLayout').deleteMany({ userId }),
    ]);
    await User.deleteOne({ _id: userId });

    console.log('🗑️ Account deleted:', String(userId));
    res.json({ success: true, message: 'Your account and all of its data have been deleted.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: 'Something went wrong. Your account was not deleted.' });
  }
};
