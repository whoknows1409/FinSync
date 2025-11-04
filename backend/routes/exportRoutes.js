const express = require('express');
const router = express.Router();
const {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportAllData
} = require('../controllers/exportController');
const { protect } = require('../middleware/auth');

router.get('/csv', protect, exportToCSV);
router.get('/excel', protect, exportToExcel);
router.get('/pdf', protect, exportToPDF);
router.get('/all', protect, exportAllData);

module.exports = router;