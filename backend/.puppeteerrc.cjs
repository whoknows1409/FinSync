/**
 * Puppeteer configuration for Render deployment.
 * Skips Chrome download during npm install since Render provides
 * a system Chromium via PUPPETEER_EXECUTABLE_PATH env var.
 */
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  skipDownload: true,
};
