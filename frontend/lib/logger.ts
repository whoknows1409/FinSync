/**
 * Logger utility for consistent logging across the application
 * 
 * In production, only errors and warnings are logged.
 * In development, all logs are shown.
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args)
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (...args: any[]) => {
    console.warn(...args)
  },

  /**
   * Log errors (always shown)
   */
  error: (...args: any[]) => {
    console.error(...args)
  },

  /**
   * Log debug information (only in development)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  }
}
