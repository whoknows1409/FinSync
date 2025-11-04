const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getStats,
  getActivities,
  uploadProfileImage
} = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

router.get('/', protect, getProfile);

// Handle profile update with optional image upload
router.put('/', protect, (req, res, next) => {
  // Check if the request contains multipart/form-data (file upload)
  const contentType = req.headers['content-type'];
  if (contentType && contentType.includes('multipart/form-data')) {
    // Use multer middleware for file uploads
    uploadSingle('profileImage')(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({ success: false, message: 'File upload error' });
      }
      next();
    });
  } else {
    // Skip multer for regular JSON updates
    next();
  }
}, updateProfile);

// Dedicated image upload endpoint
router.post('/image', protect, uploadSingle('profileImage'), uploadProfileImage);
router.get('/stats', protect, getStats);
router.get('/activities', protect, getActivities);

module.exports = router;