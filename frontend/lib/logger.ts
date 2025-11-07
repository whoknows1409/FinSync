/**
 * Logger utility for consistent logging across the application
 * 
 * In production, only errors and warnings are logged.
 * In development, all logs are shown.
 * 
 * IMPORTANT: This logger automatically sanitizes sensitive data from logs
 * to prevent exposure of passwords, tokens, credentials, etc.
 */

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Sensitive keys that should never be logged
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'credential',
  'secret',
  'apiKey',
  'authorization',
  'auth',
  'sessionId',
  'cookie',
  'jwt',
  'bearer'
]

/**
 * Sanitize an object by removing sensitive keys
 */
function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  // Handle primitive types
  if (typeof obj !== 'object') return obj
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item))
  }
  
  // Handle objects
  const sanitized: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase()
      
      // Check if key contains sensitive data
      const isSensitive = SENSITIVE_KEYS.some(sensitive => 
        lowerKey.includes(sensitive.toLowerCase())
      )
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = sanitize(obj[key])
      } else {
        sanitized[key] = obj[key]
      }
    }
  }
  
  return sanitized
}

/**
 * Sanitize arguments before logging
 */
function sanitizeArgs(...args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return sanitize(arg)
    }
    return arg
  })
}

export const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...sanitizeArgs(...args))
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...sanitizeArgs(...args))
    }
  },

  /**
   * Log warnings (always shown, sanitized in production)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    } else {
      console.warn(...sanitizeArgs(...args))
    }
  },

  /**
   * Log errors (always shown, sanitized in production)
   */
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args)
    } else {
      console.error(...sanitizeArgs(...args))
    }
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...sanitizeArgs(...args))
    }
  }
}
