const express = require('express');
const router = express.Router();
const { getLogo } = require('../controllers/settingsController');

router.get('/logo', getLogo);

module.exports = router;