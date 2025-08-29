import { NativeModules, DeviceEventEmitter } from 'react-native';
import { ECR_CONSTANTS, CONNECTION_TYPES } from '../utils/Constants';
import { MessageBuilder } from './MessageBuilder';
import { ResponseParser } from './ResponseParser';
import { LRCCalculator } from './LRCCalculator';

const { ECRSerial, ECRTcp } = NativeModules;

/**
 * Main ECR Communication Service
 * Handles all ECR terminal communication via Serial or TCP
 */
export class ECRService {
  constructor() {
    this.connectionType = null;
    this.isConnected = false;
    this.messageBuilder = new MessageBuilder();
    this.responseParser = new ResponseParser();
    this.communicationLog = [];
    this.currentTransaction = null;
  }
  
  /**
   * Connect to ECR terminal via Serial
   * @param {Object} config - Serial configuration
   * @returns {Promise<Object>} Connection result
   */
  async connectSerial(config = {}) {
    try {
      const serialConfig = {
        baudRate: config.baudRate || ECR_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
        dataBits: config.dataBits || ECR_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
        stopBits: config.stopBits || ECR_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
        parity: config.parity || 0, // 0 = NONE
        ...config
      };
      
      this.log('Attempting serial connection...', 'info');
      const result = await ECRSerial.openSerial(serialConfig);
      
      if (result.success) {
        this.connectionType = CONNECTION_TYPES.SERIAL;
        this.isConnected = true;
        this.log('Serial connection established', 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`Serial connection failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Connect to ECR terminal via TCP
   * @param {Object} config - TCP configuration
   * @returns {Promise<Object>} Connection result
   */
  async connectTCP(config = {}) {
    try {
      const tcpConfig = {
        host: config.host || '192.168.1.100',
        port: config.port || ECR_CONSTANTS.TCP_CONFIG.PORT,
        timeout: config.timeout || ECR_CONSTANTS.TIMEOUTS.COMMAND,
        ...config
      };
      
      this.log(`Attempting TCP connection to ${tcpConfig.host}:${tcpConfig.port}...`, 'info');
      const result = await ECRTcp.connect(tcpConfig);
      
      if (result.success) {
        this.connectionType = CONNECTION_TYPES.TCP;
        this.isConnected = true;
        this.log('TCP connection established', 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`TCP connection failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Test TCP connection without establishing permanent connection
   * @param {Object} config - TCP configuration
   * @returns {Promise<Object>} Test result
   */
  async testTCPConnection(config) {
    try {
      this.log('Testing TCP connection...', 'info');
      const result = await ECRTcp.testConnection(config);
      
      if (result.success) {
        this.log('TCP connection test successful', 'success');
      } else {
        this.log(`TCP connection test failed: ${result.message}`, 'error');
      }
      
      return result;
    } catch (error) {
      this.log(`TCP connection test error: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Disconnect from ECR terminal
   * @returns {Promise<Object>} Disconnection result
   */
  async disconnect() {
    try {
      let result;
      
      if (this.connectionType === CONNECTION_TYPES.SERIAL) {
        result = await ECRSerial.closeSerial();
      } else if (this.connectionType === CONNECTION_TYPES.TCP) {
        result = await ECRTcp.disconnect();
      }
      
      this.isConnected = false;
      this.connectionType = null;
      this.log('Disconnected from ECR terminal', 'info');
      
      return result || { success: true, message: 'Disconnected' };
    } catch (error) {
      this.log(`Disconnect error: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Perform Sale transaction
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction result
   */
  async performSale(params) {
    const { hostNo, amount, additionalData = '', printReceipt = false } = params;
    
    try {
      this.log(`Starting SALE transaction: Amount=${amount}, Host=${hostNo}, Receipt=${printReceipt}`, 'info');
      
      const command = this.messageBuilder.buildSaleCommand(hostNo, amount, additionalData, printReceipt);
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log(`SALE transaction completed: Status=${response.statusCode}`, 
                 response.isApproved ? 'success' : 'warning');
      }
      
      return response;
    } catch (error) {
      this.log(`SALE transaction failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Perform Pre-Authorization transaction
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction result
   */
  async performPreAuth(params) {
    const { hostNo, amount, additionalData = '', printReceipt = false } = params;
    
    try {
      this.log(`Starting PREAUTH transaction: Amount=${amount}, Host=${hostNo}, Receipt=${printReceipt}`, 'info');
      
      const command = this.messageBuilder.buildPreAuthCommand(hostNo, amount, additionalData, printReceipt);
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log(`PREAUTH transaction completed: Status=${response.statusCode}`, 
                 response.isApproved ? 'success' : 'warning');
      }
      
      return response;
    } catch (error) {
      this.log(`PREAUTH transaction failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Perform Wallet Sale transaction with QR data
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction result
   */
  async performWalletSale(params) {
    const { hostNo, amount, qrCodeId, qrCode = '', additionalData = '', printReceipt = false } = params;
    
    try {
      this.log(`Starting WALLET SALE transaction: Amount=${amount}, QR Type=${qrCodeId}, Host=${hostNo}, Receipt=${printReceipt}`, 'info');
      
      if (qrCode) {
        this.log(`QR Code provided: ${qrCode.substring(0, 50)}...`, 'debug');
      }
      
      const command = this.messageBuilder.buildWalletSaleCommand(
        hostNo, 
        amount, 
        qrCodeId, 
        qrCode, 
        additionalData,
        printReceipt
      );
      
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log(`WALLET SALE transaction completed: Status=${response.statusCode}`, 
                 response.isApproved ? 'success' : 'warning');
      }
      
      return response;
    } catch (error) {
      this.log(`WALLET SALE transaction failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Perform Void transaction
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction result
   */
  async performVoid(params) {
    const { hostNo, traceNumber, additionalData = '' } = params;
    
    try {
      this.log(`Starting VOID transaction: Trace=${traceNumber}, Host=${hostNo}`, 'info');
      
      const command = this.messageBuilder.buildVoidCommand(hostNo, traceNumber, additionalData);
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log(`VOID transaction completed: Status=${response.statusCode}`, 
                 response.isApproved ? 'success' : 'warning');
      }
      
      return response;
    } catch (error) {
      this.log(`VOID transaction failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Perform Refund transaction
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction result
   */
  async performRefund(params) {
    const { hostNo, amount, originalAmount, additionalData = '', printReceipt = false } = params;
    
    try {
      this.log(`Starting REFUND transaction: Amount=${amount}, Original=${originalAmount}, Host=${hostNo}, Receipt=${printReceipt}`, 'info');
      
      const command = this.messageBuilder.buildRefundCommand(hostNo, amount, originalAmount, additionalData, printReceipt);
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log(`REFUND transaction completed: Status=${response.statusCode}`, 
                 response.isApproved ? 'success' : 'warning');
      }
      
      return response;
    } catch (error) {
      this.log(`REFUND transaction failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Perform Settlement
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>} Transaction result
   */
  async performSettlement(params) {
    const { hostNo } = params;
    
    try {
      this.log(`Starting SETTLEMENT: Host=${hostNo}`, 'info');
      
      const command = this.messageBuilder.buildSettlementCommand(hostNo);
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log(`SETTLEMENT completed: Status=${response.statusCode}`, 
                 response.isApproved ? 'success' : 'warning');
      }
      
      return response;
    } catch (error) {
      this.log(`SETTLEMENT failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Perform Echo Test
   * @returns {Promise<Object>} Test result
   */
  async performEchoTest() {
    try {
      this.log('Starting ECHO TEST', 'info');
      
      const command = this.messageBuilder.buildEchoTestCommand();
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log('ECHO TEST completed successfully', 'success');
      }
      
      return response;
    } catch (error) {
      this.log(`ECHO TEST failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Read Card information
   * @returns {Promise<Object>} Card read result
   */
  async readCard() {
    try {
      this.log('Starting READ CARD', 'info');
      
      const command = this.messageBuilder.buildReadCardCommand();
      const response = await this.sendCommand(command);
      
      if (response.success) {
        this.log('READ CARD completed successfully', 'success');
      }
      
      return response;
    } catch (error) {
      this.log(`READ CARD failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Send command to ECR terminal following the protocol
   * @param {string} command - ECR command message
   * @returns {Promise<Object>} Parsed response
   */
  async sendCommand(command) {
    if (!this.isConnected) {
      throw new Error('Not connected to ECR terminal');
    }
    
    try {
      // Step 1: Send ENQ and wait for ACK
      await this.sendENQ();
      
      // Step 2: Send command and wait for ACK
      await this.writeData(command);
      this.log(`Sent command: ${this.messageBuilder.getMessageHex(command)}`, 'debug');
      
      await this.waitForACK();
      
      // Step 3: Wait for terminal response
      const rawResponse = await this.waitForResponse();
      this.log(`Received response: ${LRCCalculator.stringToHex(rawResponse)}`, 'debug');
      
      // Step 4: Send ACK to acknowledge response
      await this.sendACK();
      
      // Step 5: Wait for EOT
      await this.waitForEOT();
      
      // Parse the response
      const parsedResponse = this.responseParser.parseResponse(rawResponse);
      
      return parsedResponse;
      
    } catch (error) {
      this.log(`Command execution failed: ${error.message}`, 'error');
      
      // Try to send ABORT if possible
      try {
        await this.sendABORT();
      } catch (abortError) {
        this.log(`Failed to send ABORT: ${abortError.message}`, 'error');
      }
      
      throw error;
    }
  }
  
  /**
   * Send ENQ and wait for ACK
   */
  async sendENQ() {
    const enq = this.messageBuilder.createENQ();
    await this.writeData(enq);
    this.log('Sent ENQ', 'debug');
    
    // ❌ FIXED: Use proper constant reference
    const response = await this.readSingleChar(ECR_CONSTANTS.TIMEOUTS.ENQ);
    if (response !== ECR_CONSTANTS.CONTROL_CHARS.ACK) {
      throw new Error(`Expected ACK after ENQ, got: ${response.charCodeAt(0)}`);
    }
    this.log('Received ACK for ENQ', 'debug');
  }
  
  /**
   * Wait for ACK response
   */
  async waitForACK() {
    // ❌ FIXED: Use proper constant reference
    const response = await this.readSingleChar(ECR_CONSTANTS.TIMEOUTS.ACK);
    if (response !== ECR_CONSTANTS.CONTROL_CHARS.ACK) {
      throw new Error(`Expected ACK, got: ${response.charCodeAt(0)}`);
    }
    this.log('Received ACK', 'debug');
  }
  
  /**
   * Send ACK
   */
  async sendACK() {
    const ack = this.messageBuilder.createACK();
    await this.writeData(ack);
    this.log('Sent ACK', 'debug');
  }
  
  /**
   * Send ABORT
   */
  async sendABORT() {
    const abort = this.messageBuilder.createABORT();
    await this.writeData(abort);
    this.log('Sent ABORT', 'debug');
  }
  
  /**
   * Wait for terminal response
   */
  async waitForResponse() {
    // ❌ FIXED: Use proper constant reference
    const enq = await this.readSingleChar(ECR_CONSTANTS.TIMEOUTS.RESPONSE);
    if (enq !== ECR_CONSTANTS.CONTROL_CHARS.ENQ) {
      throw new Error(`Expected ENQ from terminal, got: ${enq.charCodeAt(0)}`);
    }
    this.log('Received ENQ from terminal', 'debug');
    
    // Send ACK
    await this.sendACK();
    
    // Read the actual response message
    const response = await this.readMessage(ECR_CONSTANTS.TIMEOUTS.RESPONSE);
    return response;
  }
  
  /**
   * Wait for EOT
   */
  async waitForEOT() {
    // ❌ FIXED: Use proper constant reference
    const eot = await this.readSingleChar(ECR_CONSTANTS.TIMEOUTS.ACK);
    if (eot !== ECR_CONSTANTS.CONTROL_CHARS.EOT) {
      throw new Error(`Expected EOT, got: ${eot.charCodeAt(0)}`);
    }
    this.log('Received EOT', 'debug');
  }
  
  /**
   * Write data to connection
   */
  async writeData(data) {
    if (this.connectionType === CONNECTION_TYPES.SERIAL) {
      return await ECRSerial.writeData(data);
    } else if (this.connectionType === CONNECTION_TYPES.TCP) {
      return await ECRTcp.send(data);
    }
    throw new Error('No active connection');
  }
  
  /**
   * Read single character with timeout
   */
  async readSingleChar(timeout) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const data = await this.readData();
      if (data && data.length > 0) {
        return data.charAt(0);
      }
      await this.sleep(100);
    }
    
    throw new Error('Timeout reading single character');
  }
  
  /**
   * Read complete message with timeout
   */
  async readMessage(timeout) {
    const startTime = Date.now();
    let buffer = '';
    let stxFound = false;
    // let etxFound = false; // Removed unused variable
    
    while (Date.now() - startTime < timeout) {
      const data = await this.readData();
      if (data) {
        buffer += data;
        
        // ❌ FIXED: Use proper constant reference
        if (!stxFound && buffer.includes(ECR_CONSTANTS.CONTROL_CHARS.STX)) {
          stxFound = true;
        }
        
        if (stxFound && buffer.includes(ECR_CONSTANTS.CONTROL_CHARS.ETX)) {
          // etxFound = true; // Removed unused assignment
          // Check if we have the LRC byte after ETX
          const etxIndex = buffer.indexOf(ECR_CONSTANTS.CONTROL_CHARS.ETX);
          if (buffer.length > etxIndex + 1) {
            return buffer;
          }
        }
      }
      
      if (!data || data.length === 0) {
        await this.sleep(100);
      }
    }
    
    throw new Error('Timeout reading message');
  }
  
  /**
   * Read data from connection
   */
  async readData() {
    if (this.connectionType === CONNECTION_TYPES.SERIAL) {
      const result = await ECRSerial.readData();
      return result.data || '';
    } else if (this.connectionType === CONNECTION_TYPES.TCP) {
      const result = await ECRTcp.receive();
      return result.data || '';
    }
    return '';
  }
  
  /**
   * Check connection status
   */
  async checkConnection() {
    try {
      if (this.connectionType === CONNECTION_TYPES.SERIAL) {
        const result = await ECRSerial.isConnected();
        this.isConnected = result.connected;
      } else if (this.connectionType === CONNECTION_TYPES.TCP) {
        const result = await ECRTcp.isConnected();
        this.isConnected = result.connected;
      }
      return this.isConnected;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }
  
  /**
   * Get available serial ports
   */
  async getAvailableSerialPorts() {
    try {
      return await ECRSerial.getAvailablePorts();
    } catch (error) {
      this.log(`Error getting serial ports: ${error.message}`, 'error');
      throw error;
    }
  }
  
  /**
   * Get communication log
   */
  getCommunicationLog() {
    return this.communicationLog;
  }
  
  /**
   * Clear communication log
   */
  clearLog() {
    this.communicationLog = [];
  }
  
  /**
   * Add entry to communication log
   */
  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    this.communicationLog.push(logEntry);
    
    // Keep only last 100 entries
    if (this.communicationLog.length > 100) {
      this.communicationLog = this.communicationLog.slice(-100);
    }
    
    console.log(`[ECR ${level.toUpperCase()}] ${message}`);
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get connection info
   */
  getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      currentTransaction: this.currentTransaction
    };
  }

  // ===== USB Device Management Methods =====

  /**
   * Scan for all USB devices
   * @returns {Promise<Array>} List of discovered USB devices
   */
  async scanForUSBDevices() {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      this.log('Scanning for USB devices...', 'info');
      const devices = await ECRSerial.scanForUSBDevices();
      this.log(`Found ${devices.length} USB devices`, 'success');
      
      return devices;
    } catch (error) {
      this.log(`USB scan failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get all saved USB devices
   * @returns {Promise<Array>} List of saved USB devices
   */
  async getSavedUSBDevices() {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      const devices = await ECRSerial.getSavedUSBDevices();
      return devices;
    } catch (error) {
      this.log(`Error getting saved USB devices: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Save a USB device for automatic reconnection
   * @param {Object} device - USB device object
   * @param {number} baudRate - Baud rate for serial connection
   * @param {string} alias - User-friendly name for the device
   * @returns {Promise<Object>} Save result
   */
  async saveUSBDevice(device, baudRate, alias) {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      this.log(`Saving USB device: ${alias}`, 'info');
      const result = await ECRSerial.saveUSBDevice(device, baudRate, alias);
      
      if (result.success) {
        this.log(`USB device saved: ${alias}`, 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`Error saving USB device: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Remove a saved USB device
   * @param {string} deviceId - Device ID to remove
   * @returns {Promise<Object>} Remove result
   */
  async removeUSBDevice(deviceId) {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      this.log(`Removing USB device: ${deviceId}`, 'info');
      const result = await ECRSerial.removeUSBDevice(deviceId);
      
      if (result.success) {
        this.log(`USB device removed: ${deviceId}`, 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`Error removing USB device: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Request USB permission for a device
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object>} Permission request result
   */
  async requestUSBPermission(deviceId) {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      this.log(`Requesting USB permission: ${deviceId}`, 'info');
      const result = await ECRSerial.requestUSBPermission(deviceId);
      
      if (result.success) {
        this.log(`USB permission requested: ${deviceId}`, 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`Error requesting USB permission: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Connect to a USB device
   * @param {string} deviceId - Device ID to connect to
   * @returns {Promise<Object>} Connection result
   */
  async connectToUSBDevice(deviceId) {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      this.log(`Connecting to USB device: ${deviceId}`, 'info');
      const result = await ECRSerial.connectToUSBDevice(deviceId);
      
      if (result.success) {
        this.connectionType = CONNECTION_TYPES.SERIAL;
        this.isConnected = true;
        this.log(`Connected to USB device: ${deviceId}`, 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`Error connecting to USB device: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Toggle auto-reconnect for a USB device
   * @param {string} deviceId - Device ID
   * @param {boolean} enabled - Enable/disable auto-reconnect
   * @returns {Promise<Object>} Toggle result
   */
  async toggleUSBAutoReconnect(deviceId, enabled) {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      this.log(`Toggling auto-reconnect for ${deviceId}: ${enabled}`, 'info');
      const result = await ECRSerial.toggleUSBAutoReconnect(deviceId, enabled);
      
      if (result.success) {
        this.log(`Auto-reconnect ${enabled ? 'enabled' : 'disabled'} for ${deviceId}`, 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`Error toggling auto-reconnect: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Refresh USB device statuses
   * @returns {Promise<Object>} Refresh result
   */
  async refreshUSBDeviceStatus() {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      this.log('Refreshing USB device statuses...', 'info');
      const result = await ECRSerial.refreshUSBDeviceStatus();
      
      if (result.success) {
        this.log('USB device statuses refreshed', 'success');
      }
      
      return result;
    } catch (error) {
      this.log(`Error refreshing USB device status: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get USB device statistics
   * @returns {Promise<Object>} Device statistics
   */
  async getUSBDeviceStats() {
    try {
      if (!ECRSerial) {
        throw new Error('ECR Serial module not available');
      }
      
      const stats = await ECRSerial.getUSBDeviceStats();
      return stats;
    } catch (error) {
      this.log(`Error getting USB device stats: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Set up USB device event listeners
   * @param {Object} callbacks - Event callback functions
   */
  setupUSBEventListeners(callbacks = {}) {
    const {
      onDeviceAttached,
      onDeviceDetached,
      onDeviceDiscovered,
      onAutoReconnectAttempt,
      onAutoReconnectSuccess,
      onAutoReconnectFailed
    } = callbacks;

    // USB device attached
    if (onDeviceAttached) {
      DeviceEventEmitter.addListener('onUSBDeviceAttached', (device) => {
        this.log(`USB device attached: ${device.deviceName}`, 'info');
        onDeviceAttached(device);
      });
    }

    // USB device detached
    if (onDeviceDetached) {
      DeviceEventEmitter.addListener('onUSBDeviceDetached', (device) => {
        this.log(`USB device detached: ${device.deviceName}`, 'warning');
        onDeviceDetached(device);
      });
    }

    // Device discovered
    if (onDeviceDiscovered) {
      DeviceEventEmitter.addListener('onDeviceDiscovered', (data) => {
        const { device, isNew } = data;
        this.log(`Device discovered: ${device.displayName} (${isNew ? 'new' : 'known'})`, 'info');
        onDeviceDiscovered(device, isNew);
      });
    }

    // Auto-reconnect attempt
    if (onAutoReconnectAttempt) {
      DeviceEventEmitter.addListener('onAutoReconnectAttempt', (device) => {
        this.log(`Auto-reconnect attempt: ${device.displayName}`, 'info');
        onAutoReconnectAttempt(device);
      });
    }

    // Auto-reconnect success
    if (onAutoReconnectSuccess) {
      DeviceEventEmitter.addListener('onAutoReconnectSuccess', (device) => {
        this.log(`Auto-reconnect success: ${device.displayName}`, 'success');
        onAutoReconnectSuccess(device);
      });
    }

    // Auto-reconnect failed
    if (onAutoReconnectFailed) {
      DeviceEventEmitter.addListener('onAutoReconnectFailed', (data) => {
        const { device, error } = data;
        this.log(`Auto-reconnect failed: ${device.displayName} - ${error}`, 'error');
        onAutoReconnectFailed(device, error);
      });
    }
  }

  /**
   * Remove USB device event listeners
   */
  removeUSBEventListeners() {
    DeviceEventEmitter.removeAllListeners('onUSBDeviceAttached');
    DeviceEventEmitter.removeAllListeners('onUSBDeviceDetached');
    DeviceEventEmitter.removeAllListeners('onDeviceDiscovered');
    DeviceEventEmitter.removeAllListeners('onAutoReconnectAttempt');
    DeviceEventEmitter.removeAllListeners('onAutoReconnectSuccess');
    DeviceEventEmitter.removeAllListeners('onAutoReconnectFailed');
  }
// Add these enhanced methods to your ECRService.js

/**
 * Perform Wallet Refund transaction
 * @param {Object} params - Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
async performWalletRefund(params) {
  const { hostNo, amount, originalAmount, qrCodeId, additionalData = '', printReceipt = false } = params;
  
  try {
    this.log(`Starting WALLET REFUND transaction: Amount=${amount}, Original=${originalAmount}, QR Type=${qrCodeId}, Host=${hostNo}, Receipt=${printReceipt}`, 'info');
    
    const command = this.messageBuilder.buildWalletRefundCommand(
      hostNo, 
      amount, 
      originalAmount,
      qrCodeId, 
      additionalData,
      printReceipt
    );
    
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.log(`WALLET REFUND transaction completed: Status=${response.statusCode}`, 
               response.isApproved ? 'success' : 'warning');
    }
    
    return response;
  } catch (error) {
    this.log(`WALLET REFUND transaction failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Perform Cash Advance transaction
 * @param {Object} params - Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
async performCashAdvance(params) {
  const { hostNo, amount, additionalData = '' } = params;
  
  try {
    this.log(`Starting CASH ADVANCE transaction: Amount=${amount}, Host=${hostNo}`, 'info');
    
    const command = this.messageBuilder.buildCashAdvanceCommand(hostNo, amount, additionalData);
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.log(`CASH ADVANCE transaction completed: Status=${response.statusCode}`, 
               response.isApproved ? 'success' : 'warning');
    }
    
    return response;
  } catch (error) {
    this.log(`CASH ADVANCE transaction failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Perform Sale with Cash transaction
 * @param {Object} params - Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
async performSaleWithCash(params) {
  const { hostNo, saleAmount, cashAmount, additionalData = '' } = params;
  
  try {
    this.log(`Starting SALE WITH CASH transaction: Sale=${saleAmount}, Cash=${cashAmount}, Host=${hostNo}`, 'info');
    
    const command = this.messageBuilder.buildSaleWithCashCommand(hostNo, saleAmount, cashAmount, additionalData);
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.log(`SALE WITH CASH transaction completed: Status=${response.statusCode}`, 
               response.isApproved ? 'success' : 'warning');
    }
    
    return response;
  } catch (error) {
    this.log(`SALE WITH CASH transaction failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Perform Transaction Adjustment
 * @param {Object} params - Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
async performAdjust(params) {
  const { hostNo, originalAmount, adjustedAmount, traceNumber } = params;
  
  try {
    this.log(`Starting ADJUST transaction: Original=${originalAmount}, Adjusted=${adjustedAmount}, Trace=${traceNumber}, Host=${hostNo}`, 'info');
    
    const command = this.messageBuilder.buildAdjustCommand(hostNo, originalAmount, adjustedAmount, traceNumber);
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.log(`ADJUST transaction completed: Status=${response.statusCode}`, 
               response.isApproved ? 'success' : 'warning');
    }
    
    return response;
  } catch (error) {
    this.log(`ADJUST transaction failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Perform QR Code Scan
 * @returns {Promise<Object>} Scan result
 */
async performScanQR() {
  try {
    this.log('Starting SCAN QR', 'info');
    
    const command = this.messageBuilder.buildScanQRCommand();
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.log('SCAN QR completed successfully', 'success');
    }
    
    return response;
  } catch (error) {
    this.log(`SCAN QR failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Get Transaction Status
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Status result
 */
async getTransactionStatus(params) {
  const { uniqueId, originalAmount = 0, printReceipt = false } = params;
  
  try {
    this.log(`Getting TRANSACTION STATUS: ID=${uniqueId}, Amount=${originalAmount}`, 'info');
    
    const command = this.messageBuilder.buildTransactionStatusCommand(uniqueId, originalAmount, printReceipt);
    const response = await this.sendCommand(command);
    
    if (response.success) {
      this.log('TRANSACTION STATUS completed successfully', 'success');
    }
    
    return response;
  } catch (error) {
    this.log(`TRANSACTION STATUS failed: ${error.message}`, 'error');
    throw error;
  }
}


/**
 * Enhanced method to handle any transaction type with proper routing
 * @param {string} transactionType - Type from TRANSACTION_TYPES
 * @param {Object} params - Transaction parameters
 * @returns {Promise<Object>} Transaction result
 */
async performTransaction(transactionType, params) {
  switch (transactionType) {
    case 'sale':
      return this.performSale(params);
    case 'wallet_sale':
      return this.performWalletSale(params);
    case 'void':
      return this.performVoid(params);
    case 'refund':
      return this.performRefund(params);
    case 'wallet_refund':
      return this.performWalletRefund(params);
    case 'settlement':
      return this.performSettlement(params);
    case 'preauth':
      return this.performPreAuth(params);
    case 'echo_test':
      return this.performEchoTest();
    case 'cash_advance':
      return this.performCashAdvance(params);
    case 'sale_with_cash':
      return this.performSaleWithCash(params);
    case 'adjust':
      return this.performAdjust(params);
    case 'read_card':
      return this.readCard();
    case 'scan_qr':
      return this.performScanQR();
    default:
      throw new Error(`Unsupported transaction type: ${transactionType}`);
  }
}

/**
 * Validate QR code before sending
 * @param {string} qrCode - QR code data
 * @param {string} qrCodeId - QR code type
 * @returns {Object} Validation result
 */
validateQRCode(qrCode, qrCodeId) {
  const result = {
    valid: false,
    qrType: 'unknown',
    errors: []
  };

  if (!qrCode || typeof qrCode !== 'string') {
    result.errors.push('QR code data is required');
    return result;
  }

  if (qrCode.length < 10) {
    result.errors.push('QR code data is too short');
    return result;
  }

  // Enhanced QR validation based on type
  switch (qrCodeId) {
    case ECR_CONSTANTS.QR_CODE_IDS.ALIPAY:
      if (qrCode.includes('alipay') || qrCode.startsWith('https://qr.alipay.com')) {
        result.valid = true;
        result.qrType = 'Alipay';
      } else {
        result.errors.push('Invalid Alipay QR format');
      }
      break;

    case ECR_CONSTANTS.QR_CODE_IDS.MBB_QRPAY:
      if (qrCode.includes('maybank') || qrCode.includes('qrpay')) {
        result.valid = true;
        result.qrType = 'Maybank QRPay';
      } else {
        result.errors.push('Invalid Maybank QRPay format');
      }
      break;

    case ECR_CONSTANTS.QR_CODE_IDS.EWALLET:
      result.valid = true;
      result.qrType = 'E-Wallet';
      break;

    case ECR_CONSTANTS.QR_CODE_IDS.HLB_GTX:
      result.valid = true;
      result.qrType = 'HLB GTX';
      break;

    default:
      result.errors.push('Unknown QR code type');
  }

  return result;
}

/**
 * Enhanced logging with transaction context
 * @param {string} message - Log message
 * @param {string} level - Log level
 * @param {Object} context - Additional context
 */
logWithContext(message, level = 'info', context = {}) {
  const contextStr = Object.keys(context).length > 0 
    ? ` [${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(', ')}]`
    : '';
    
  this.log(`${message}${contextStr}`, level);
}

/**
 * Get comprehensive status information
 * @returns {Object} Detailed status
 */
getDetailedStatus() {
  return {
    isConnected: this.isConnected,
    connectionType: this.connectionType,
    currentTransaction: this.currentTransaction,
    logEntries: this.communicationLog.length,
    lastActivity: this.communicationLog.length > 0 
      ? this.communicationLog[this.communicationLog.length - 1].timestamp 
      : null,
    supportedTransactions: [
      'sale', 'wallet_sale', 'void', 'refund', 'wallet_refund',
      'settlement', 'preauth', 'echo_test', 'cash_advance', 
      'sale_with_cash', 'adjust', 'read_card', 'scan_qr'
    ]
  };
}
}