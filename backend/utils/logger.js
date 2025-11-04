// logger.js

// Fixed logger implementation to avoid duplicate declaration issues
const path = require('path');
const fs = require('fs');

// Dynamically require winston to avoid caching issues
function getWinston() {
  try {
    return require('winston');
  } catch (error) {
    console.error('Error loading winston:', error);
    return null;
  }
}

const winston = getWinston();

// Ensure logs directory exists
try {
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating logs directory:', error);
}

// Create a simple fallback logger if winston fails
const createFallbackLogger = () => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  
  const logger = {
    error: (...args) => console.error('[ERROR]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    info: (...args) => console.info('[INFO]', ...args),
    debug: (...args) => {
      if (levels[logLevel] >= levels.debug) {
        console.log('[DEBUG]', ...args);
      }
    }
  };
  
  // Add utility methods
  logger.logPerformance = (operation, duration, details = {}) => {
    logger.info('Performance', { operation, duration: `${duration}ms`, ...details });
  };
  
  logger.logBusiness = (event, details, userId = null) => {
    logger.info('Business Event', { event, details, userId });
  };
  
  // Add logError method
  logger.logError = (error, req = null) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
    
    if (req) {
      errorData.request = {
        method: req.method,
        url: req.url,
        user: req.user ? req.user.id : null,
      };
    }
    
    logger.error('Error occurred', errorData);
  };
  
  return logger;
};

// Create logger with winston if available
let logger;

if (winston) {
  try {
    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    // Define console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    );

    // Create logger instance
    logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'fin-sync' },
      transports: [
        // Error log file
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // Combined log file
        new winston.transports.File({
          filename: path.join(__dirname, '../logs/combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      ]
    });

    // Add console transport for development
    if (process.env.NODE_ENV !== 'production') {
      logger.add(
        new winston.transports.Console({
          format: consoleFormat,
        })
      );
    }

    // Performance logging
    logger.logPerformance = (operation, duration, details = {}) => {
      logger.info('Performance', {
        operation,
        duration: `${duration}ms`,
        ...details,
      });
    };

    // Business logic logging
    logger.logBusiness = (event, details, userId = null) => {
      logger.info('Business Event', {
        event,
        details,
        userId,
      });
    };

    // Add logError method
    logger.logError = (error, req = null) => {
      const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      };
      
      if (req) {
        errorData.request = {
          method: req.method,
          url: req.url,
          user: req.user ? req.user.id : null,
        };
      }
      
      logger.error('Error occurred', errorData);
    };

  } catch (error) {
    console.error('Error creating winston logger:', error);
    logger = createFallbackLogger();
  }
} else {
  // Fallback to simple logger if winston is not available
  logger = createFallbackLogger();
}

// Export the logger
module.exports = logger;