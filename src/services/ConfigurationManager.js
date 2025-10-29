import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Configuration Manager
 * Handles configuration file reading/writing similar to C# ConFig.txt
 */
export class ConfigurationManager {
  constructor() {
    this.storageKey = 'ecr_configuration';
    this.config = {
      IP_POS: '192.168.0.154',
      PORT_POS: '86',
      IP_TERMINAL: '192.168.0.200',
      PORT_Terminal: '88',
      BAUD_RATE: '9600',
      DATA_BITS: '8',
      PARITY: 'None',
      STOP_BITS: '1',
      TIMEOUT: '30000',
      LOG_ENABLED: 'true',
      LOG_PATH: '/ECR_LOG',
      RECEIPT_PATH: '/ECR_Receipts',
      CONNECTION_TYPE: 'Serial', // Serial or TCP
      // Additional configuration for modern features
      ENABLE_RECEIPTS: 'true',
      ENABLE_POS_RECEIPTS: 'true',
      ENABLE_SPLIT_PAYMENTS: 'true',
      DEFAULT_CURRENCY: 'MYR',
      THEME: 'light',
      ENABLE_ANIMATIONS: 'true',
      LOG_LEVEL: 'info',
      MAX_LOG_FILES: '10',
      LOG_RETENTION_DAYS: '30'
    };
    this.loadConfiguration();
  }

  /**
   * Load configuration from AsyncStorage
   */
  async loadConfiguration() {
    try {
      const configJson = await AsyncStorage.getItem(this.storageKey);
      if (configJson) {
        const savedConfig = JSON.parse(configJson);
        // Merge with defaults to ensure all keys exist
        this.config = { ...this.config, ...savedConfig };
      } else {
        // Save default configuration
        await this.saveConfiguration();
      }
    } catch (error) {
      console.warn('Failed to load configuration, using defaults:', error.message);
    }
  }

  /**
   * Get configuration from AsyncStorage with key
   * @param {string} key - Configuration key
   * @returns {Promise<any>} Configuration value
   */
  async getAsync(key) {
    try {
      const value = await AsyncStorage.getItem(`${this.storageKey}_${key}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Failed to get async config ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Set configuration in AsyncStorage with key
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   * @returns {Promise<void>}
   */
  async setAsync(key, value) {
    try {
      await AsyncStorage.setItem(`${this.storageKey}_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set async config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Save configuration to AsyncStorage
   */
  async saveConfiguration() {
    try {
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(this.config));
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Failed to save configuration:', error.message);
      throw error;
    }
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key
   * @returns {string} Configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   */
  set(key, value) {
    this.config[key] = value;
  }

  /**
   * Get all configuration
   * @returns {Object} All configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Get configuration (async method for compatibility)
   * @returns {Promise<Object>} All configuration
   */
  async getConfiguration() {
    // Ensure configuration is loaded
    await this.loadConfiguration();
    return this.getAll();
  }

  /**
   * Get TCP/IP configuration
   * @returns {Object} TCP/IP settings
   */
  getTCPConfig() {
    return {
      posHost: this.config.IP_POS,
      posPort: parseInt(this.config.PORT_POS),
      terminalHost: this.config.IP_TERMINAL,
      terminalPort: parseInt(this.config.PORT_Terminal)
    };
  }

  /**
   * Get Serial configuration
   * @returns {Object} Serial settings
   */
  getSerialConfig() {
    return {
      baudRate: parseInt(this.config.BAUD_RATE),
      dataBits: parseInt(this.config.DATA_BITS),
      parity: this.config.PARITY,
      stopBits: parseInt(this.config.STOP_BITS),
      timeout: parseInt(this.config.TIMEOUT)
    };
  }

  /**
   * Get connection type
   * @returns {string} Connection type (Serial or TCP)
   */
  getConnectionType() {
    return this.config.CONNECTION_TYPE;
  }

  /**
   * Set connection type
   * @param {string} type - Connection type (Serial or TCP)
   */
  setConnectionType(type) {
    if (['Serial', 'TCP'].includes(type)) {
      this.config.CONNECTION_TYPE = type;
    } else {
      throw new Error('Invalid connection type. Must be Serial or TCP');
    }
  }

  /**
   * Get logging configuration
   * @returns {Object} Logging settings
   */
  getLoggingConfig() {
    return {
      enabled: this.config.LOG_ENABLED === 'true',
      logPath: this.config.LOG_PATH,
      receiptPath: this.config.RECEIPT_PATH
    };
  }

  /**
   * Update TCP/IP settings
   * @param {Object} settings - TCP settings
   */
  updateTCPSettings(settings) {
    if (settings.posHost) this.config.IP_POS = settings.posHost;
    if (settings.posPort) this.config.PORT_POS = settings.posPort.toString();
    if (settings.terminalHost) this.config.IP_TERMINAL = settings.terminalHost;
    if (settings.terminalPort) this.config.PORT_Terminal = settings.terminalPort.toString();
  }

  /**
   * Update Serial settings
   * @param {Object} settings - Serial settings
   */
  updateSerialSettings(settings) {
    if (settings.baudRate) this.config.BAUD_RATE = settings.baudRate.toString();
    if (settings.dataBits) this.config.DATA_BITS = settings.dataBits.toString();
    if (settings.parity) this.config.PARITY = settings.parity;
    if (settings.stopBits) this.config.STOP_BITS = settings.stopBits.toString();
    if (settings.timeout) this.config.TIMEOUT = settings.timeout.toString();
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults() {
    this.config = {
      IP_POS: '192.168.0.154',
      PORT_POS: '86',
      IP_TERMINAL: '192.168.0.200',
      PORT_Terminal: '88',
      BAUD_RATE: '9600',
      DATA_BITS: '8',
      PARITY: 'None',
      STOP_BITS: '1',
      TIMEOUT: '30000',
      LOG_ENABLED: 'true',
      LOG_PATH: '/ECR_LOG',
      RECEIPT_PATH: '/ECR_Receipts',
      CONNECTION_TYPE: 'Serial',
      ENABLE_RECEIPTS: 'true',
      ENABLE_POS_RECEIPTS: 'true',
      ENABLE_SPLIT_PAYMENTS: 'true',
      DEFAULT_CURRENCY: 'MYR',
      THEME: 'light',
      ENABLE_ANIMATIONS: 'true',
      LOG_LEVEL: 'info',
      MAX_LOG_FILES: '10',
      LOG_RETENTION_DAYS: '30'
    };
  }

  /**
   * Validate configuration
   * @returns {Array} Array of validation errors
   */
  validate() {
    const errors = [];
    
    // Validate IP addresses
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(this.config.IP_POS)) {
      errors.push('Invalid POS IP address');
    }
    if (!ipRegex.test(this.config.IP_TERMINAL)) {
      errors.push('Invalid Terminal IP address');
    }
    
    // Validate ports
    const posPort = parseInt(this.config.PORT_POS);
    if (isNaN(posPort) || posPort < 1 || posPort > 65535) {
      errors.push('Invalid POS port number');
    }
    
    const terminalPort = parseInt(this.config.PORT_Terminal);
    if (isNaN(terminalPort) || terminalPort < 1 || terminalPort > 65535) {
      errors.push('Invalid Terminal port number');
    }
    
    // Validate baud rate
    const validBaudRates = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
    const baudRate = parseInt(this.config.BAUD_RATE);
    if (!validBaudRates.includes(baudRate)) {
      errors.push('Invalid baud rate');
    }
    
    // Validate connection type
    if (!['Serial', 'TCP'].includes(this.config.CONNECTION_TYPE)) {
      errors.push('Invalid connection type');
    }
    
    return errors;
  }
}

export default ConfigurationManager;