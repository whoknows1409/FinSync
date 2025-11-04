const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const Budget = require('../models/Budget');
const TradingAccount = require('../models/TradingAccount');
const Activity = require('../models/Activity');
const fs = require('fs');

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
// @desc    Update user profile
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, bio, membershipType } = req.body;
    
    // Find user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (bio) user.bio = bio;
    if (membershipType) user.membershipType = membershipType;
    
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
    
    res.json({
      success: true,
      data: updatedUser
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