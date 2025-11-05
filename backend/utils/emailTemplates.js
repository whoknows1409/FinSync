// Email Templates for FinSync
// Use these templates with SendGrid or directly in emailService

/**
 * Get HTML email template for email verification
 * @param {string} userName - User's name
 * @param {string} verificationUrl - Verification URL
 * @returns {string} HTML email content
 */
const getVerificationEmailHtml = (userName, verificationUrl) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your FinSync Account</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Arial', 'Helvetica', sans-serif;
      background-color: #f4f4f7;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .email-body {
      padding: 40px 30px;
      color: #333333;
    }
    .greeting {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #333333;
    }
    .content {
      font-size: 16px;
      line-height: 1.6;
      color: #555555;
      margin-bottom: 30px;
    }
    .button-container {
      text-align: center;
      margin: 40px 0;
    }
    .verify-button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    .link-text {
      margin-top: 30px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 6px;
      word-break: break-all;
      font-size: 12px;
      color: #666666;
    }
    .expiry-notice {
      text-align: center;
      font-size: 14px;
      color: #e74c3c;
      font-weight: bold;
      margin: 20px 0;
    }
    .security-note {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 30px 0;
      font-size: 14px;
      color: #856404;
    }
    .features {
      margin: 30px 0;
    }
    .feature-item {
      display: flex;
      align-items: start;
      margin: 15px 0;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 6px;
    }
    .feature-icon {
      font-size: 24px;
      margin-right: 12px;
    }
    .feature-text {
      font-size: 14px;
      color: #555555;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      font-size: 12px;
      color: #888888;
      margin: 5px 0;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-link {
      display: inline-block;
      margin: 0 10px;
      color: #667eea;
      text-decoration: none;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-header">
      <div class="logo">📊 FinSync</div>
      <h1 style="margin: 0; font-size: 28px;">Welcome to FinSync!</h1>
    </div>
    
    <div class="email-body">
      <div class="greeting">Hello ${userName || 'there'}! 👋</div>
      
      <div class="content">
        <p>Thank you for signing up for <strong>FinSync</strong> - your intelligent personal finance management platform.</p>
        
        <p>To complete your registration and unlock all features, please verify your email address by clicking the button below:</p>
      </div>
      
      <div class="button-container">
        <a href="${verificationUrl}" class="verify-button">
          ✉️ Verify Email Address
        </a>
      </div>
      
      <div class="expiry-notice">
        ⏰ This verification link expires in 24 hours
      </div>
      
      <div class="content">
        <p><strong>Or copy and paste this link into your browser:</strong></p>
        <div class="link-text">
          ${verificationUrl}
        </div>
      </div>
      
      <div class="security-note">
        <strong>⚠️ Security Notice:</strong> If you didn't create an account with FinSync, you can safely ignore this email. Your information is secure.
      </div>
      
      <div class="features">
        <p style="font-weight: bold; font-size: 18px; margin-bottom: 15px;">What you can do with FinSync:</p>
        
        <div class="feature-item">
          <span class="feature-icon">💰</span>
          <span class="feature-text"><strong>Smart Budget Tracking</strong> - Track expenses and manage budgets across categories</span>
        </div>
        
        <div class="feature-item">
          <span class="feature-icon">📈</span>
          <span class="feature-text"><strong>Stock Analysis</strong> - Real-time stock data and AI-powered insights</span>
        </div>
        
        <div class="feature-item">
          <span class="feature-icon">🎮</span>
          <span class="feature-text"><strong>Paper Trading</strong> - Practice trading with virtual money</span>
        </div>
        
        <div class="feature-item">
          <span class="feature-icon">🤖</span>
          <span class="feature-text"><strong>AI Chatbot</strong> - Get personalized financial advice instantly</span>
        </div>
        
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <span class="feature-text"><strong>Advanced Analytics</strong> - Visualize spending patterns with interactive charts</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-text" style="font-weight: bold; font-size: 14px; margin-bottom: 15px;">
        📊 FinSync - Your Personal Finance Companion
      </div>
      
      <div class="social-links">
        <a href="${process.env.FRONTEND_URL || '#'}" class="social-link">Website</a> •
        <a href="${process.env.FRONTEND_URL || '#'}/support" class="social-link">Support</a> •
        <a href="${process.env.FRONTEND_URL || '#'}/privacy" class="social-link">Privacy Policy</a>
      </div>
      
      <div class="footer-text">
        © 2025 FinSync. All rights reserved.
      </div>
      
      <div class="footer-text" style="margin-top: 15px;">
        This is an automated email, please do not reply directly to this message.
      </div>
      
      <div class="footer-text" style="margin-top: 10px; color: #aaaaaa;">
        You're receiving this email because you signed up for FinSync.
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Get plain text email template for email verification
 * @param {string} userName - User's name
 * @param {string} verificationUrl - Verification URL
 * @returns {string} Plain text email content
 */
const getVerificationEmailText = (userName, verificationUrl) => {
  return `
Welcome to FinSync!

Hello ${userName || 'there'}!

Thank you for signing up for FinSync - your intelligent personal finance management platform.

To complete your registration and unlock all features, please verify your email address by visiting:

${verificationUrl}

This verification link expires in 24 hours.

What you can do with FinSync:

💰 Smart Budget Tracking - Track expenses and manage budgets across categories
📈 Stock Analysis - Real-time stock data and AI-powered insights
🎮 Paper Trading - Practice trading with virtual money
🤖 AI Chatbot - Get personalized financial advice instantly
📊 Advanced Analytics - Visualize spending patterns with interactive charts

Security Notice: If you didn't create an account with FinSync, you can safely ignore this email. Your information is secure.

---
© 2025 FinSync. All rights reserved.
This is an automated email, please do not reply directly to this message.
  `;
};

module.exports = {
  getVerificationEmailHtml,
  getVerificationEmailText
};
