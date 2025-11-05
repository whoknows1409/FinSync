#!/usr/bin/env node

/**
 * SendGrid Configuration Tester
 * Tests if your SendGrid is properly configured
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('\n🔍 Testing SendGrid Configuration...\n');
console.log('='.repeat(60));

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ SET (' + process.env.SENDGRID_API_KEY.slice(0, 10) + '...)' : '❌ NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '❌ NOT SET');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET');

if (!process.env.SENDGRID_API_KEY) {
  console.log('\n❌ SENDGRID_API_KEY is not set!');
  console.log('Please add it to your .env file:');
  console.log('SENDGRID_API_KEY=SG.your-api-key-here\n');
  process.exit(1);
}

if (!process.env.EMAIL_FROM) {
  console.log('\n❌ EMAIL_FROM is not set!');
  console.log('Please add it to your .env file:');
  console.log('EMAIL_FROM=your-verified-email@domain.com\n');
  process.exit(1);
}

// Create transporter
console.log('\n🔧 Creating SendGrid transporter...');
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});

// Test 1: Verify connection
console.log('\n🧪 Test 1: Verifying SMTP connection...');
transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection successful!');
    console.log('✅ SendGrid API key is valid');
    console.log('✅ Can connect to smtp.sendgrid.net:587');
    
    // Test 2: Try sending test email
    console.log('\n🧪 Test 2: Attempting to send test email...');
    console.log('📧 To:', process.env.EMAIL_FROM);
    console.log('📧 From:', process.env.EMAIL_FROM);
    
    return transporter.sendMail({
      from: {
        name: 'FinSync Test',
        address: process.env.EMAIL_FROM,
      },
      to: process.env.EMAIL_FROM, // Send to yourself
      subject: 'SendGrid Test - FinSync',
      html: `
        <h1>🎉 SendGrid is Working!</h1>
        <p>If you received this email, your SendGrid configuration is correct.</p>
        <p><strong>Sender:</strong> ${process.env.EMAIL_FROM}</p>
        <p><strong>API Key:</strong> ***${process.env.SENDGRID_API_KEY.slice(-10)}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
      text: 'SendGrid is working! If you received this email, your configuration is correct.',
    });
  })
  .then((info) => {
    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('📮 Accepted:', info.accepted);
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✉️ Check your email inbox at:', process.env.EMAIL_FROM);
    console.log('✉️ Also check spam folder if not in inbox');
    console.log('\n✅ SendGrid is properly configured and working!');
    console.log('✅ You can now deploy to Render\n');
  })
  .catch((error) => {
    console.log('\n❌ TEST FAILED!');
    console.log('='.repeat(60));
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔴 AUTHENTICATION FAILED');
      console.log('This means your SendGrid API key is invalid or expired.');
      console.log('\n📝 How to fix:');
      console.log('1. Go to: https://app.sendgrid.com/settings/api_keys');
      console.log('2. Create a new API key with "Full Access"');
      console.log('3. Copy the key (starts with SG.)');
      console.log('4. Update SENDGRID_API_KEY in your .env file');
    } else if (error.message.includes('Sender Identity') || error.responseCode === 403) {
      console.log('\n🔴 SENDER NOT VERIFIED');
      console.log('Your sender email is not verified in SendGrid.');
      console.log('\n📝 How to fix:');
      console.log('1. Go to: https://app.sendgrid.com/settings/sender_auth');
      console.log('2. Click "Verify a Single Sender"');
      console.log('3. Add your email:', process.env.EMAIL_FROM);
      console.log('4. Check your email for verification link');
      console.log('5. Click the link to verify');
      console.log('6. Wait for green checkmark ✅');
      console.log('7. Run this test again');
    } else {
      console.log('\n🔴 UNKNOWN ERROR');
      console.log('Full error details:', error);
    }
    
    console.log('\n📚 Need help? Check:');
    console.log('- SENDGRID_SETUP_GUIDE.md');
    console.log('- TROUBLESHOOTING_EMAIL.md');
    console.log('');
    process.exit(1);
  });
