/**
 * Structured Logger for Production
 * Replaces console.log with structured logging
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
  userId?: string
  pharmacyId?: string
  request?: {
    url?: string
    method?: string
    ip?: string
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatLog(entry: LogEntry): string {
    if (this.isDevelopment) {
      const parts = [
        `[${entry.level.toUpperCase()}]`,
        entry.timestamp,
        entry.message,
      ]
      if (entry.context) {
        parts.push(JSON.stringify(entry.context))
      }
      if (entry.error) {
        parts.push(`${entry.error.name}: ${entry.error.message}`)
      }
      return parts.join(' ')
    }
    return JSON.stringify(entry)
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.getUserId(),
      pharmacyId: this.getPharmacyId(),
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      }
    }

    const logMessage = this.formatLog(entry)

    switch (level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) console.debug(logMessage)
        break
      case LogLevel.INFO:
        console.info(logMessage)
        break
      case LogLevel.WARN:
        console.warn(logMessage)
        break
      case LogLevel.ERROR:
        console.error(logMessage)
        if (error && !this.isDevelopment) {
          // In production, send to error tracking service
          this.sendErrorToTracking(entry)
        }
        break
    }
  }

  private getUserId(): string | undefined {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_id') ?? undefined
    }
    return undefined
  }

  private getPharmacyId(): string | undefined {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pharmacy_id') ?? undefined
    }
    return undefined
  }

  private sendErrorToTracking(entry: LogEntry): void {
    // Integration with error tracking service (Sentry, LogRocket, etc.)
    // Currently placeholder - add your error tracking service here
    if (entry.error && process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(new Error(entry.error.message))
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context, error)
  }
}

export const logger = new Logger()
