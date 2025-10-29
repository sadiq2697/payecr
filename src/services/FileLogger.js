import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * File Logger (AsyncStorage-based)
 * Handles logging with AsyncStorage for React Native compatibility
 */
export class FileLogger {
  constructor() {
    this.logKey = 'ECR_LOG';
    this.isEnabled = true;
    this.maxLogEntries = 1000; // Keep last 1000 log entries
  }

  /**
   * Get current logs from AsyncStorage
   */
  async getLogs() {
    try {
      const logs = await AsyncStorage.getItem(this.logKey);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Save logs to AsyncStorage
   */
  async saveLogs(logs) {
    try {
      await AsyncStorage.setItem(this.logKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  /**
   * Write log message
   */
  async writeLog(level, message, extra = null) {
    if (!this.isEnabled) return;

    try {
      const logs = await this.getLogs();
      const timestamp = new Date().toISOString();
      
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        extra: extra ? JSON.stringify(extra) : null,
      };

      logs.push(logEntry);

      // Keep only the last maxLogEntries
      if (logs.length > this.maxLogEntries) {
        logs.splice(0, logs.length - this.maxLogEntries);
      }

      await this.saveLogs(logs);
      
      // Also log to console in development
      if (__DEV__) {
        console.log(`[${level.toUpperCase()}] ${timestamp}: ${message}`, extra || '');
      }
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Generic log method (for compatibility with ECRService)
   */
  async log(message, level = 'info', extra = null) {
    await this.writeLog(level.toUpperCase(), message, extra);
  }

  /**
   * Log info message
   */
  async info(message, extra = null) {
    await this.writeLog('INFO', message, extra);
  }

  /**
   * Log error message
   */
  async error(message, extra = null) {
    await this.writeLog('ERROR', message, extra);
  }

  /**
   * Log warning message
   */
  async warn(message, extra = null) {
    await this.writeLog('WARN', message, extra);
  }

  /**
   * Log debug message
   */
  async debug(message, extra = null) {
    await this.writeLog('DEBUG', message, extra);
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    try {
      await AsyncStorage.removeItem(this.logKey);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Get logs for export (formatted as text)
   */
  async exportLogs() {
    try {
      const logs = await this.getLogs();
      return logs.map(log => 
        `[${log.timestamp}] ${log.level}: ${log.message}${log.extra ? ` | ${log.extra}` : ''}`
      ).join('\n');
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '';
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats() {
    try {
      const logs = await this.getLogs();
      const stats = {
        total: logs.length,
        byLevel: {},
        oldestEntry: null,
        newestEntry: null,
      };

      if (logs.length > 0) {
        stats.oldestEntry = logs[0].timestamp;
        stats.newestEntry = logs[logs.length - 1].timestamp;

        // Count by level
        logs.forEach(log => {
          stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        });
      }

      return stats;
    } catch (error) {
      console.error('Failed to get log stats:', error);
      return { total: 0, byLevel: {}, oldestEntry: null, newestEntry: null };
    }
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isLoggingEnabled() {
    return this.isEnabled;
  }
}

// Singleton instance
export const fileLogger = new FileLogger();
export default fileLogger;