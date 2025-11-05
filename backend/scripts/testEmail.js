#!/usr/bin/env node

/**
 * Email Testing Script for FinSync
 * 
 * This script tests the SendGrid email configuration
 * Usage: node backend/scripts/testEmail.js <recipient-email>
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`),
};

async function testEmailConfiguration() {
  log.title();
  console.log(`${colors.bright}${colors.blue}     📧 FinSync Email Configuration Test${colors.reset}`);
  log.title();

  // Check environment variables
  log.info('Checking environment configuration...\n');

  const checks = {
    'SENDGRID_API_KEY': process.env.SENDGRID_API_KEY,
    'EMAIL_FROM': process.env.EMAIL_FROM,
    'FRONTEND_URL': process.env.FRONTEND_URL,
  };

  let allConfigured = true;

  for (const [key, value] of Object.entries(checks)) {
    if (value) {
      log.success(`${key}: ${key === 'SENDGRID_API_KEY' ? '***' + value.slice(-10) : value}`);
    } else {
      log.error(`${key}: Not configured`);
      allConfigured = false;
    }
  }

  if (!allConfigured) {
    log.error('\n❌ Missing required environment variables!');
    log.info('Please set up your .env file with the following variables:');
    log.info('  - SENDGRID_API_KEY');
    log.info('  - EMAIL_FROM');
    log.info('  - FRONTEND_URL\n');
    log.info('See SENDGRID_SETUP_GUIDE.md for detailed setup instructions.');
    process.exit(1);
  }

  // Get recipient email from command line argument
  const recipientEmail = process.argv[2];

  if (!recipientEmail) {
    log.error('\n❌ Please provide a recipient email address!');
    log.info('Usage: node backend/scripts/testEmail.js <recipient-email>');
    log.info('Example: node backend/scripts/testEmail.js your-email@gmail.com\n');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    log.error(`\n❌ Invalid email format: ${recipientEmail}\n`);
    process.exit(1);
  }

  log.success('\n✅ All environment variables configured correctly!\n');

  // Test sending verification email
  log.title();
  console.log(`${colors.bright}${colors.blue}     📨 Testing Email Delivery${colors.reset}`);
  log.title();

  log.info(`\nSending test verification email to: ${recipientEmail}\n`);

  try {
    const testToken = 'test-verification-token-' + Date.now();
    const testUserName = 'Test User';

    const result = await emailService.sendVerificationEmail(
      recipientEmail,
      testToken,
      testUserName
    );

    if (result.success) {
      log.success('\n🎉 Email sent successfully!\n');
      log.info('Email Details:');
      log.info(`  - Recipient: ${recipientEmail}`);
      log.info(`  - Sender: ${process.env.EMAIL_FROM}`);
      log.info(`  - Message ID: ${result.messageId}`);
      log.info(`  - Status: Delivered to SendGrid\n`);

      log.title();
      console.log(`${colors.bright}${colors.green}     ✅ Test Passed - Email Configuration Working!${colors.reset}`);
      log.title();

      log.info('\n📋 Next Steps:\n');
      log.info('1. Check your email inbox (including spam folder)');
      log.info('2. Verify you received the email');
      log.info('3. Check the email formatting and content');
      log.info('4. Try clicking the verification link');
      log.info('5. If everything looks good, your email system is ready!\n');

      log.info('💡 Tips:');
      log.info('  - Check SendGrid dashboard for delivery analytics');
      log.info('  - URL: https://app.sendgrid.com/');
      log.info('  - Go to Activity → Search for your email\n');
    } else {
      log.error('\n❌ Email sending failed but no error was thrown');
      process.exit(1);
    }
  } catch (error) {
    log.error('\n❌ Failed to send email!\n');
    log.error('Error Details:');
    log.error(`  - Message: ${error.message}`);
    if (error.response) {
      log.error(`  - Response: ${JSON.stringify(error.response, null, 2)}`);
    }
    log.error(`\n${error.stack}\n`);

    log.title();
    console.log(`${colors.bright}${colors.red}     ❌ Test Failed${colors.reset}`);
    log.title();

    log.warn('\n🔧 Troubleshooting Steps:\n');
    log.info('1. Verify your SENDGRID_API_KEY is correct');
    log.info('2. Check that EMAIL_FROM is verified in SendGrid dashboard');
    log.info('3. Ensure your SendGrid account is active');
    log.info('4. Check SendGrid dashboard for any account issues');
    log.info('5. Review backend/utils/emailService.js for configuration\n');

    log.info('📚 Documentation:');
    log.info('  - Setup Guide: SENDGRID_SETUP_GUIDE.md');
    log.info('  - SendGrid Docs: https://docs.sendgrid.com/\n');

    process.exit(1);
  }
}

// Run the test
testEmailConfiguration().catch((error) => {
  log.error('\n❌ Unexpected error occurred!');
  log.error(error.message);
  console.error(error);
  process.exit(1);
});
