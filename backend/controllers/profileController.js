const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Budget = require('../models/Budget');
const TradingAccount = require('../models/TradingAccount');
const Activity = require('../models/Activity');
const emailService = require('../utils/emailService');
const crypto = require('crypto');
const fs = require('fs');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stripTags = value => String(value).replace(/<[^>]*>/g, '').trim();

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
//
// Users can change their name, phone, bio and notification preferences here.
// Membership level cannot be set by the user, and a new email address only
// takes effect after the confirmation link sent to it has been opened.
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, bio, notificationPreferences } = req.body || {};
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Update fields
    if (name !== undefined) {
      const cleanName = stripTags(name);
      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Please provide a valid name' });
      }
      user.name = cleanName;
    }
    if (phone !== undefined) user.phone = stripTags(phone);
    if (bio !== undefined) user.bio = stripTags(bio);

    if (notificationPreferences && typeof notificationPreferences === 'object') {
      for (const key of ['budgetAlerts', 'stockAlerts']) {
        if (typeof notificationPreferences[key] === 'boolean') {
          user.notificationPreferences[key] = notificationPreferences[key];
        }
      }
    }

    // A different email address is held as pending until it is confirmed
    let pendingEmail = null;
    const requestedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (requestedEmail && requestedEmail !== user.email) {
      if (user.authProvider === 'google') {
        return res.status(400).json({
          success: false,
          message: 'This account signs in with Google, so its email address cannot be changed here.'
        });
      }
      if (!EMAIL_PATTERN.test(requestedEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
      }
      if (await User.exists({ email: requestedEmail })) {
        return res.status(400).json({ success: false, message: 'That email address is already in use' });
      }
      if (!emailService.isConfigured) {
        return res.status(503).json({
          success: false,
          message: 'Email changes are unavailable right now. Please try again later.'
        });
      }

      pendingEmail = requestedEmail;
      user.pendingEmail = requestedEmail;
      user.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
    // Handle profile image if uploaded
    if (req.file) {
      try {
        // Log file details for debugging
        console.log('File details:', {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path
        });
        
        // Check if file exists
        if (!fs.existsSync(req.file.path)) {
          console.error('File not found at path:', req.file.path);
          return res.status(500).json({ success: false, message: 'File not found' });
        }
        
        // Read file and convert to base64
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';
        
        user.profileImage = `data:${mimeType};base64,${base64Image}`;
        
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        console.log('Temporary file deleted successfully');
      } catch (err) {
        console.error('Error processing image:', err);
        // Don't fail the whole operation if image processing fails
        console.log('Continuing without updating profile image');
      }
    }
    
    // Save updated user
    const updatedUser = await user.save();

    if (pendingEmail) {
      try {
        await emailService.sendVerificationEmail(pendingEmail, user.emailVerificationToken, user.name);
      } catch (emailError) {
        console.error('Could not send email change confirmation:', emailError.message);
        user.pendingEmail = undefined;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        return res.status(500).json({
          success: false,
          message: 'We could not send the confirmation email, so your email address was not changed. Your other changes were saved.'
        });
      }
    }
    
    // Log activity
    try {
      await Activity.create({
        user: req.user.id,
        action: 'Updated profile information',
        type: 'profile'
      });
    } catch (activityErr) {
      console.error('Error logging activity:', activityErr);
      // Don't fail the whole operation if activity logging fails
    }
    
    // The user's toJSON removes the password hash and tokens
    res.json({
      success: true,
      data: updatedUser,
      emailChangePending: !!pendingEmail,
      message: pendingEmail
        ? `Profile updated. We sent a confirmation link to ${pendingEmail}; your email address will change once you open it.`
        : 'Profile updated successfully!'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Upload profile image
// @route   POST /api/profile/image
// @access  Private
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Log file details for debugging
    console.log('File details:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    try {
      // Check if file exists
      if (!fs.existsSync(req.file.path)) {
        console.error('File not found at path:', req.file.path);
        return res.status(500).json({ success: false, message: 'File not found' });
      }
      
      // Read file and convert to base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';
      
      user.profileImage = `data:${mimeType};base64,${base64Image}`;
      await user.save();
      
      // Delete the temporary file
      fs.unlinkSync(req.file.path);
      console.log('Temporary file deleted successfully');
      
      // Log activity
      try {
        await Activity.create({
          user: req.user.id,
          action: 'Updated profile picture',
          type: 'profile'
        });
      } catch (activityErr) {
        console.error('Error logging activity:', activityErr);
        // Don't fail the whole operation if activity logging fails
      }
      
      res.json({
        success: true,
        data: {
          profileImage: user.profileImage
        }
      });
    } catch (err) {
      console.error('Error processing image:', err);
      return res.status(500).json({ success: false, message: 'Error processing image: ' + err.message });
    }
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get user statistics
// @route   GET /api/profile/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get total transactions count
    const totalTransactions = await Transaction.countDocuments({ user: userId });
    
    // Get active goals count
    const activeGoals = await Goal.countDocuments({ 
      user: userId, 
      status: 'active' 
    });
    
    // Get active budgets count - budgets with endDate >= today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const activeBudgets = await Budget.countDocuments({ 
      user: userId,
      status: 'active',
      endDate: { $gte: today }
    });
    
    // Get portfolio value - use totalValue field from TradingAccount
    const tradingAccounts = await TradingAccount.find({ user: userId, isActive: true });
    
    let portfolioValue = 0;
    tradingAccounts.forEach(account => {
      portfolioValue += account.totalValue || 0;
    });
    
    // Format portfolio value
    let formattedPortfolioValue = '₹0';
    if (portfolioValue > 0) {
      if (portfolioValue >= 100000) {
        const lakhs = portfolioValue / 100000;
        formattedPortfolioValue = `₹${lakhs.toFixed(1)}L`;
      } else {
        formattedPortfolioValue = `₹${Math.round(portfolioValue).toLocaleString()}`;
      }
    }
    
    // Get member since date
    const user = await User.findById(userId);
    const memberSince = new Date(user.createdAt);
    const formattedMemberSince = memberSince.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
    
    res.json({
      success: true,
      data: {
        totalTransactions,
        activeGoals,
        activeBudgets,
        portfolioValue: formattedPortfolioValue,
        memberSince: formattedMemberSince
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get recent activities
// @route   GET /api/profile/activities
// @access  Private
exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id })
      .sort({ timestamp: -1 })
      .limit(10);
    
    // Format activities for display
    const formattedActivities = activities.map(activity => {
      const timeAgo = getTimeAgo(activity.timestamp);
      return {
        action: activity.action,
        time: timeAgo,
        type: activity.type
      };
    });
    
    res.json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Helper function to format time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval + " year" + (interval > 1 ? "s" : "") + " ago";
  }
  
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval + " month" + (interval > 1 ? "s" : "") + " ago";
  }
  
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval + " day" + (interval > 1 ? "s" : "") + " ago";
  }
  
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
  }
  
  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
  }
  
  return Math.floor(seconds) + " second" + (seconds > 1 ? "s" : "") + " ago";
}