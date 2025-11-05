#!/usr/bin/env node
require('dotenv').config();
const emailService = require('../utils/emailService');

console.log('\n🔍 Email Service Status Check\n');
console.log('='.repeat(60));
console.log('\n📋 Properties:');
console.log('  isConfigured:', emailService.isConfigured);
console.log('  transporter exists:', !!emailService.transporter);
console.log('\n📋 Environment Variables:');
console.log('  SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ SET' : '❌ NOT SET');
console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET');
console.log('\n' + '='.repeat(60));

if (emailService.isConfigured) {
  console.log('✅ Email service is properly configured\n');
} else {
  console.log('❌ Email service is NOT configured\n');
  process.exit(1);
}
