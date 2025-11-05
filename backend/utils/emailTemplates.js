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
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #1a1a1a;
      padding: 32px 40px;
      text-align: center;
      border-bottom: 3px solid #2d2d2d;
    }
    .logo {
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 48px 40px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 24px;
    }
    .text {
      font-size: 15px;
      color: #4a4a4a;
      margin-bottom: 16px;
    }
    .button-wrapper {
      text-align: center;
      margin: 40px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #1a1a1a;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      font-size: 15px;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #2d2d2d;
    }
    .divider {
      border-top: 1px solid #e5e5e5;
      margin: 32px 0;
    }
    .link-section {
      margin: 24px 0;
    }
    .link-label {
      font-size: 13px;
      color: #6b6b6b;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .link-box {
      padding: 12px;
      background-color: #f8f8f8;
      border: 1px solid #e5e5e5;
      border-radius: 4px;
      word-break: break-all;
      font-size: 12px;
      color: #4a4a4a;
      font-family: 'Courier New', monospace;
    }
    .info-box {
      background-color: #f8f8f8;
      border-left: 3px solid #1a1a1a;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-text {
      font-size: 13px;
      color: #4a4a4a;
      margin: 0;
    }
    .features {
      margin: 32px 0;
    }
    .features-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    .feature {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      padding: 12px;
      background-color: #fafafa;
      border-radius: 4px;
    }
    .feature-icon {
      font-size: 18px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .feature-content {
      flex: 1;
    }
    .feature-title {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 2px;
    }
    .feature-desc {
      font-size: 13px;
      color: #6b6b6b;
    }
    .footer {
      background-color: #fafafa;
      padding: 32px 40px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
    }
    .footer-text {
      font-size: 12px;
      color: #888888;
      margin: 6px 0;
    }
    .footer-links {
      margin: 16px 0;
    }
    .footer-link {
      color: #4a4a4a;
      text-decoration: none;
      font-size: 12px;
      margin: 0 8px;
    }
    .footer-link:hover {
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">📊 FinSync</div>
    </div>
    
    <div class="content">
      <div class="greeting">Hello ${userName || 'there'},</div>
      
      <p class="text">
        Thank you for signing up for FinSync. To complete your registration and start managing your finances, please verify your email address.
      </p>
      
      <div class="button-wrapper">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <div class="info-box">
        <p class="info-text">
          <strong>Note:</strong> This verification link will expire in 24 hours. If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
      
      <div class="divider"></div>
      
      <div class="link-section">
        <div class="link-label">Or copy and paste this URL into your browser:</div>
        <div class="link-box">${verificationUrl}</div>
      </div>
      
      <div class="divider"></div>
      
      <div class="features">
        <div class="features-title">What you can do with FinSync</div>
        
        <div class="feature">
          <span class="feature-icon">💰</span>
          <div class="feature-content">
            <div class="feature-title">Budget Tracking</div>
            <div class="feature-desc">Track expenses and manage budgets across categories</div>
          </div>
        </div>
        
        <div class="feature">
          <span class="feature-icon">📈</span>
          <div class="feature-content">
            <div class="feature-title">Stock Analysis</div>
            <div class="feature-desc">Real-time stock data and AI-powered insights</div>
          </div>
        </div>
        
        <div class="feature">
          <span class="feature-icon">🤖</span>
          <div class="feature-content">
            <div class="feature-title">AI Assistant</div>
            <div class="feature-desc">Get personalized financial advice instantly</div>
          </div>
        </div>
        
        <div class="feature">
          <span class="feature-icon">📊</span>
          <div class="feature-content">
            <div class="feature-title">Analytics</div>
            <div class="feature-desc">Visualize spending patterns with interactive charts</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-text" style="font-weight: 600; color: #1a1a1a; margin-bottom: 12px;">
        FinSync
      </div>
      
      <div class="footer-links">
        <a href="${process.env.FRONTEND_URL || '#'}" class="footer-link">Website</a>
        <span style="color: #d0d0d0;">•</span>
        <a href="${process.env.FRONTEND_URL || '#'}/support" class="footer-link">Support</a>
        <span style="color: #d0d0d0;">•</span>
        <a href="${process.env.FRONTEND_URL || '#'}/privacy" class="footer-link">Privacy</a>
      </div>
      
      <div class="footer-text">© 2025 FinSync. All rights reserved.</div>
      
      <div class="footer-text" style="margin-top: 12px;">
        This email was sent to you because you signed up for FinSync.
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
