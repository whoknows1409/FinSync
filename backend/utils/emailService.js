const sgMail = require('@sendgrid/mail');
const logger = require('./logger');
const { getVerificationEmailHtml, getVerificationEmailText } = require('./emailTemplates');

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.initializeSendGrid();
  }

  initializeSendGrid() {
    // Only use SendGrid HTTP API (works on Render, no SMTP port blocking)
    if (!process.env.SENDGRID_API_KEY) {
      logger.error('❌ SendGrid API key not configured. SENDGRID_API_KEY environment variable is required.');
      logger.error('⚠️ Email service will not be available until SENDGRID_API_KEY is configured.');
      return;
    }

    if (!process.env.EMAIL_FROM) {
      logger.warn('⚠️ EMAIL_FROM not configured. Using default sender address.');
    }

    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.isConfigured = true;
      logger.info('✅ Email service initialized with SendGrid HTTP API');
      logger.info(`📧 Using sender address: ${process.env.EMAIL_FROM || 'noreply@finsync.com'}`);
    } catch (error) {
      logger.error('❌ Failed to initialize SendGrid:', error);
      logger.error('⚠️ Email service will not be available. Please check your configuration.');
      this.isConfigured = false;
    }
  }

  async sendVerificationEmail(email, verificationToken, userName) {
    if (!this.isConfigured) {
      const error = new Error('Email service not configured. Please set up SendGrid API key.');
      logger.error('❌ Email service not configured');
      throw error;
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@finsync.com';

    logger.info(`📧 Preparing verification email for: ${email}`);
    logger.info(`📧 From: ${fromEmail}`);
    logger.info(`📧 Verification URL: ${verificationUrl}`);

    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'FinSync',
      },
      subject: 'Verify Your FinSync Account',
      html: getVerificationEmailHtml(userName, verificationUrl),
      text: getVerificationEmailText(userName, verificationUrl),
      // Anti-spam improvements
      replyTo: fromEmail,
      categories: ['email-verification', 'account-setup'],
      customArgs: {
        environment: process.env.NODE_ENV || 'production',
        emailType: 'verification'
      },
      trackingSettings: {
        clickTracking: {
          enable: true,
          enableText: false
        },
        openTracking: {
          enable: true
        },
        subscriptionTracking: {
          enable: false
        }
      },
      mailSettings: {
        bypassListManagement: {
          enable: false
        },
        footer: {
          enable: false
        },
        sandboxMode: {
          enable: false
        }
      }
    };

    try {
      logger.info(`✉️ Sending verification email to: ${email} via SendGrid HTTP API`);
      logger.info(`📧 Mail options:`, JSON.stringify({
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        hasHtml: !!msg.html,
        hasText: !!msg.text
      }));
      
      const response = await sgMail.send(msg);
      logger.info(`✅ Verification email sent successfully to: ${email}`, { 
        statusCode: response[0].statusCode,
        headers: response[0].headers
      });
      return { success: true, statusCode: response[0].statusCode };
    } catch (error) {
      logger.error(`❌ Failed to send verification email to: ${email}`);
      logger.error('❌ Error type:', error.constructor.name);
      logger.error('❌ Error message:', error.message);
      
      if (error.response) {
        logger.error('SendGrid API error details:', {
          statusCode: error.response.statusCode,
          body: error.response.body,
          headers: error.response.headers
        });
      }
      
      // Create detailed error message
      let errorMessage = 'Failed to send verification email';
      
      if (error.code === 403) {
        errorMessage = 'Email sender not verified in SendGrid. Please verify your sender identity.';
      } else if (error.code === 401) {
        errorMessage = 'SendGrid authentication failed. Invalid API key.';
      } else if (error.response && error.response.body) {
        const body = error.response.body;
        if (body.errors && body.errors.length > 0) {
          errorMessage = body.errors[0].message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Throw with detailed message
      const detailedError = new Error(errorMessage);
      detailedError.originalError = error;
      throw detailedError;
    }
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    if (!this.isConfigured) {
      logger.error('❌ Email service not configured');
      throw new Error('Email service not configured. Please contact support.');
    }

    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@finsync.com';

    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'FinSync',
      },
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
      const response = await sgMail.send(msg);
      logger.info('Password reset email sent:', { email, statusCode: response[0].statusCode });
      return { success: true, statusCode: response[0].statusCode };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email. Please try again.');
    }
  }

  async sendWelcomeEmail(email, userName) {
    if (!this.isConfigured) {
      logger.warn('⚠️ Email service not configured, skipping welcome email');
      return { success: false, message: 'Email service not configured' };
    }

    const fromEmail = process.env.EMAIL_FROM || 'noreply@finsync.com';

    const msg = {
      to: email,
      from: {
        email: fromEmail,
        name: 'FinSync',
      },
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
      const response = await sgMail.send(msg);
      logger.info('Welcome email sent:', { email, statusCode: response[0].statusCode });
      return { success: true, statusCode: response[0].statusCode };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
module.exports = emailService;
