const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Check if SendGrid is configured (recommended)
    if (process.env.SENDGRID_API_KEY) {
      try {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false, // use TLS
          auth: {
            user: 'apikey', // This is always 'apikey' for SendGrid
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        logger.info('✅ Email service initialized with SendGrid');
        return;
      } catch (error) {
        logger.error('Failed to initialize SendGrid:', error);
      }
    }

    // Fallback to other email services if SendGrid is not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      logger.warn('⚠️ Email service not configured. SENDGRID_API_KEY or (EMAIL_USER and EMAIL_PASS) environment variables are required.');
      return;
    }

    try {
      // Create transporter based on email service
      if (process.env.EMAIL_SERVICE === 'gmail') {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // Use App Password for Gmail
          },
        });
      } else {
        // Generic SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
      }

      logger.info('✅ Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
    }
  }

  async sendVerificationEmail(email, verificationToken, userName) {
    if (!this.transporter) {
      logger.error('❌ Email service not configured');
      throw new Error('Email service not configured. Please contact support.');
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@finsync.com';

    const mailOptions = {
      from: {
        name: 'FinSync',
        address: fromEmail,
      },
      to: email,
      subject: 'Verify Your FinSync Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px;
              border-radius: 10px;
              color: white;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 8px;
              margin-top: 20px;
              color: #333;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">📊 FinSync</div>
            <h1>Welcome to FinSync!</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userName || 'there'}! 👋</h2>
            
            <p>Thank you for signing up for FinSync - your personal finance management platform.</p>
            
            <p>To complete your registration and start managing your finances, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
              ${verificationUrl}
            </p>
            
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            
            <p>If you didn't create an account with FinSync, you can safely ignore this email.</p>
            
            <div class="footer">
              <p>© 2025 FinSync. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to FinSync!
        
        Hello ${userName || 'there'}!
        
        Thank you for signing up for FinSync - your personal finance management platform.
        
        To complete your registration, please verify your email address by visiting:
        ${verificationUrl}
        
        This verification link will expire in 24 hours.
        
        If you didn't create an account with FinSync, you can safely ignore this email.
        
        © 2025 FinSync. All rights reserved.
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Verification email sent:', { email, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email. Please try again.');
    }
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    if (!this.transporter) {
      logger.error('❌ Email service not configured');
      throw new Error('Email service not configured. Please contact support.');
    }

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@finsync.com';

    const mailOptions = {
      from: {
        name: 'FinSync',
        address: fromEmail,
      },
      to: email,
      subject: 'Reset Your FinSync Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px;
              border-radius: 10px;
              color: white;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 8px;
              margin-top: 20px;
              color: #333;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">📊 FinSync</div>
            <h1>Password Reset Request</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userName || 'there'}! 👋</h2>
            
            <p>We received a request to reset your FinSync account password.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul style="margin: 10px 0;">
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request a password reset, ignore this email</li>
                <li>Your password won't change until you create a new one</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>© 2025 FinSync. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hello ${userName || 'there'}!
        
        We received a request to reset your FinSync account password.
        
        Reset your password by visiting:
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, you can safely ignore this email.
        
        © 2025 FinSync. All rights reserved.
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Password reset email sent:', { email, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email. Please try again.');
    }
  }

  async sendWelcomeEmail(email, userName) {
    if (!this.transporter) {
      logger.warn('⚠️ Email service not configured, skipping welcome email');
      return { success: false, message: 'Email service not configured' };
    }

    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@finsync.com';

    const mailOptions = {
      from: {
        name: 'FinSync',
        address: fromEmail,
      },
      to: email,
      subject: '🎉 Welcome to FinSync!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 30px;
              border-radius: 10px;
              color: white;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 8px;
              margin-top: 20px;
              color: #333;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .feature {
              background: #f8f9fa;
              padding: 15px;
              margin: 10px 0;
              border-radius: 5px;
              border-left: 4px solid #667eea;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">📊 FinSync</div>
            <h1>Welcome Aboard! 🎉</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userName}! 👋</h2>
            
            <p>Congratulations! Your email has been verified and your FinSync account is now active.</p>
            
            <p>Here's what you can do with FinSync:</p>
            
            <div class="feature">
              <strong>💰 Track Expenses</strong>
              <p>Monitor your spending and categorize transactions automatically</p>
            </div>
            
            <div class="feature">
              <strong>📊 Budget Planning</strong>
              <p>Create budgets and get insights on your spending habits</p>
            </div>
            
            <div class="feature">
              <strong>📈 Stock Analysis</strong>
              <p>Track stocks and get AI-powered investment recommendations</p>
            </div>
            
            <div class="feature">
              <strong>🤖 AI Assistant</strong>
              <p>Chat with our AI for personalized financial advice</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
            </div>
            
            <p style="margin-top: 30px;">Need help? Check out our guides or reach out to support.</p>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
              <p>© 2025 FinSync. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Welcome email sent:', { email, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
