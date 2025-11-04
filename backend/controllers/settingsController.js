const Settings = require('../models/Settings');

// @desc    Get the app logo
// @route   GET /api/settings/logo
// @access  Public
exports.getLogo = async (req, res) => {
  try {
    // Find the settings document that contains the logo
    const settings = await Settings.findOne({});
    
    if (!settings || !settings.logo) {
      return res.status(404).json({ success: false, message: 'Logo not found' });
    }
    
    // Set the appropriate content type
    res.set('Content-Type', settings.logo.contentType);
    
    // Send the logo data
    res.send(settings.logo.data);
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};