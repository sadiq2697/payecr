import { NativeModules } from 'react-native';
import { ECR_CONSTANTS, CONNECTION_TYPES } from '../utils/Constants';
import { MessageBuilder } from './MessageBuilder';
import { ResponseParser } from './ResponseParser';
import { LRCCalculator } from './LRCCalculator';
import ReceiptService from './ReceiptService';
import { POSReceiptService } from './POSReceiptService';
import ConfigurationManager from './ConfigurationManager';
import { FileLogger } from './FileLogger';

const { ECRSerial, ECRTcp } = NativeModules;

export default class ECRService {
  constructor() {
    this.connectionType = null;
    this.isConnected = false;
    
    // Auto-reconnection state
    this.autoReconnectEnabled = false;
    this.lastConnectedDevice = null;
    this.reconnectionAttempts = 0;
    this.maxReconnectionAttempts = 5;
    this.reconnectionInterval = null;
    this.connectionMonitorInterval = null;
    this.isReconnecting = false;
    
    // Event listeners
    this.deviceDetachedListener = null;
    this.reconnectSuccessListener = null;
    this.reconnectFailedListener = null;
    this.eventEmitter = new Map(); // Simple event emitter
    
    try {
      this.messageBuilder = new MessageBuilder();
      this.responseParser = new ResponseParser();
      this.receiptService = new ReceiptService();
      
      // Initialize POS receipt service with debug logging
      console.log('[ECR DEBUG] Initializing POSReceiptService...');
      this.posReceiptService = new POSReceiptService();
      console.log('[ECR DEBUG] POSReceiptService methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.posReceiptService)));
      
      this.configManager = new ConfigurationManager();
      this.fileLogger = new FileLogger();
      
      this.communicationLog = [];
      this.currentTransaction = null;
      this.enableReceiptGeneration = true;
      this.enablePOSReceipts = true;
      
      // Log successful initialization
      console.log('[ECR INFO] ECRService initialized successfully with auto-reconnection support');
    } catch (error) {
      console.error('[ECR ERROR] Failed to initialize ECRService:', error.message);
      // Set POSReceiptService to null if initialization fails
      if (!this.posReceiptService) {
        this.enablePOSReceipts = false;
        console.warn('[ECR WARNING] POS receipt generation disabled due to initialization failure');
      }
      throw error;
    }
  }

  // Connection Methods
  async connectSerial(config = {}) {
    try {
      const serialConfig = {
        baudRate: config.baudRate || ECR_CONSTANTS.SERIAL_CONFIG.BAUD_RATE,
        dataBits: config.dataBits || ECR_CONSTANTS.SERIAL_CONFIG.DATA_BITS,
        stopBits: config.stopBits || ECR_CONSTANTS.SERIAL_CONFIG.STOP_BITS,
        parity: config.parity || 0,
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

  async testTCPConnection(config) {
    try {
      this.log('Testing TCP connection...', 'info');
      const result = await ECRTcp.testConnection(config);
      this.log(result.success ? 'TCP connection test successful' : `TCP connection test failed: ${result.message}`, result.success ? 'success' : 'error');
      return result;
    } catch (error) {
      this.log(`TCP connection test error: ${error.message}`, 'error');
      throw error;
    }
  }

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

  // Core Transaction Execution Method
  async executeTransaction(type, params, skipRecording = false) {
    const transactionMap = {
      'SALE': () => this.messageBuilder.buildSaleCommand(params.hostNo, params.amount, params.additionalData || '', params.printReceipt || false),
      'PREAUTH': () => this.messageBuilder.buildPreAuthCommand(params.hostNo, params.amount, params.additionalData || '', params.printReceipt || false),
      'WALLET_SALE': () => this.messageBuilder.buildWalletSaleCommand(params.hostNo, params.amount, params.qrCodeId, params.qrCode || '', params.additionalData || '', params.printReceipt || false),
      'WALLET_REFUND': () => this.messageBuilder.buildWalletRefundCommand(params.hostNo, params.amount, params.qrCodeId, params.qrCode || '', params.additionalData || '', params.printReceipt || false),
      'VOID': () => this.messageBuilder.buildVoidCommand(params.hostNo, params.transactionTrace, params.additionalData || '', params.printReceipt || false),
      'REFUND': () => this.messageBuilder.buildRefundCommand(params.hostNo, params.amount, params.additionalData || '', params.printReceipt || false),
      'SETTLEMENT': () => this.messageBuilder.buildSettlementCommand(params.hostNo, params.additionalData || '', params.printReceipt || false),
      'ECHO_TEST': () => this.messageBuilder.buildEchoTestCommand(),
      'READ_CARD': () => this.messageBuilder.buildReadCardCommand(),
      'SCAN_QR': () => this.messageBuilder.buildScanQRCommand()
    };

    try {
      this.log(`Starting ${type}: ${JSON.stringify(params)}`, 'info');
      
      const buildCommand = transactionMap[type];
      if (!buildCommand) throw new Error(`Unsupported transaction type: ${type}`);
      
      const command = buildCommand();
      const response = await this.sendCommand(command);
      
      this.log(`${type} completed: Status=${response.statusCode}`, response.isApproved ? 'success' : 'warning');
      
      if (!skipRecording && !params._skipRecording) {
        await this.recordTransaction(type, response, params);
      }
      
      return response;
    } catch (error) {
      this.log(`${type} failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Transaction Methods (simplified)
  async performSale(params) { return this.executeTransaction('SALE', params); }
  async performPreAuth(params) { return this.executeTransaction('PREAUTH', params); }
  async performWalletSale(params) { return this.executeTransaction('WALLET_SALE', params); }
  async performWalletRefund(params) { return this.executeTransaction('WALLET_REFUND', params); }
  async performVoid(params) { return this.executeTransaction('VOID', params); }
  async performRefund(params) { return this.executeTransaction('REFUND', params); }
  async performSettlement(params) { return this.executeTransaction('SETTLEMENT', params); }
  async performEchoTest() { return this.executeTransaction('ECHO_TEST', {}); }
  async performReadCard() { return this.executeTransaction('READ_CARD', {}); }
  async performScanQR() { return this.executeTransaction('SCAN_QR', {}); }

  // E-Wallet transaction methods with full implementation
  async performEWalletSale(params) {
    try {
      this.log(`E-Wallet Sale started with params: ${JSON.stringify(params)}`, 'debug');
      const ewalletParams = { qrCodeId: '03', ...params, qrCode: params.qrData || params.qrCode || '', _skipRecording: true };
      
      this.log('Calling performWalletSale...', 'debug');
      const response = await this.performWalletSale(ewalletParams);
      
      this.log(`Wallet sale response: ${JSON.stringify(response)}`, 'debug');
      
      if (response) {
        this.log('Recording E-Wallet transaction...', 'debug');
        await this.recordTransaction('EWALLET_SALE', response, params);
        this.log('E-Wallet transaction recorded successfully', 'debug');
      }
      
      return response;
    } catch (error) {
      this.log(`E-Wallet Sale failed: ${error.message}`, 'error');
      this.log(`E-Wallet Sale error stack: ${error.stack}`, 'error');
      throw error;
    }
  }

  async performEWalletVoid(params) {
    try {
      this.log(`E-Wallet Void started with params: ${JSON.stringify(params)}`, 'debug');
      
      // For E-Wallet void, we need to void the original e-wallet transaction
      // This requires the transaction trace from the original transaction
      if (!params.transactionTrace) {
        throw new Error('Transaction trace is required for E-Wallet void');
      }
      
      // Use standard void but mark it as an E-Wallet void for recording
      const voidParams = { ...params, _skipRecording: true };
      
      this.log('Calling performVoid for E-Wallet transaction...', 'debug');
      const response = await this.performVoid(voidParams);
      
      this.log(`E-Wallet void response: ${JSON.stringify(response)}`, 'debug');
      
      if (response) {
        this.log('Recording E-Wallet void transaction...', 'debug');
        await this.recordTransaction('EWALLET_VOID', response, params);
        this.log('E-Wallet void transaction recorded successfully', 'debug');
      }
      
      return response;
    } catch (error) {
      this.log(`E-Wallet Void failed: ${error.message}`, 'error');
      this.log(`E-Wallet Void error stack: ${error.stack}`, 'error');
      throw error;
    }
  }

  async performEWalletRefund(params) {
    try {
      this.log(`E-Wallet Refund started with params: ${JSON.stringify(params)}`, 'debug');
      const ewalletParams = { qrCodeId: '03', ...params, qrCode: params.qrData || params.qrCode || '', _skipRecording: true };
      
      this.log('Calling performWalletRefund...', 'debug');
      const response = await this.performWalletRefund(ewalletParams);
      
      this.log(`Wallet refund response: ${JSON.stringify(response)}`, 'debug');
      
      if (response) {
        this.log('Recording E-Wallet refund transaction...', 'debug');
        await this.recordTransaction('EWALLET_REFUND', response, params);
        this.log('E-Wallet refund transaction recorded successfully', 'debug');
      }
      
      return response;
    } catch (error) {
      this.log(`E-Wallet Refund failed: ${error.message}`, 'error');
      this.log(`E-Wallet Refund error stack: ${error.stack}`, 'error');
      throw error;
    }
  }

  // Core Communication Methods
  async sendCommand(command) {
    const startTime = Date.now();
    this.log(`Sending command: ${LRCCalculator.stringToHex(command)}`, 'debug');

    await this.sendENQ();
    await this.sendMessage(command);
    await this.waitForACK();
    const rawResponse = await this.waitForResponse();
    await this.sendACK();
    await this.waitForEOT();

    const parsedResponse = this.responseParser.parseResponse(rawResponse);
    const duration = Date.now() - startTime;
    this.log(`Command completed in ${duration}ms`, 'info');
    
    return parsedResponse;
  }

  async sendENQ() {
    const enq = this.messageBuilder.createENQ();
    await this.writeData(enq);
    const response = await this.readSingleChar(ECR_CONSTANTS.TIMEOUTS.ENQ);
    if (response !== ECR_CONSTANTS.CONTROL_CHARS.ACK) {
      throw new Error(`Expected ACK after ENQ, got: ${response.charCodeAt(0)}`);
    }
    this.log('ENQ/ACK exchange completed', 'debug');
  }

  async sendMessage(message) {
    await this.writeData(message);
    this.log('Message sent', 'debug');
  }

  async waitForACK() {
    const response = await this.readSingleChar(ECR_CONSTANTS.TIMEOUTS.ACK);
    if (response !== ECR_CONSTANTS.CONTROL_CHARS.ACK) {
      throw new Error(`Expected ACK, got: ${response.charCodeAt(0)}`);
    }
    this.log('Received ACK', 'debug');
  }

  async sendACK() {
    const ack = this.messageBuilder.createACK();
    await this.writeData(ack);
    this.log('Sent ACK', 'debug');
  }

  async waitForResponse() {
    const enq = await this.readSingleChar(ECR_CONSTANTS.TIMEOUTS.RESPONSE);
    if (enq !== ECR_CONSTANTS.CONTROL_CHARS.ENQ) {
      throw new Error(`Expected ENQ from terminal, got: ${enq.charCodeAt(0)}`);
    }
    
    await this.sendACK();
    const response = await this.readMessage(ECR_CONSTANTS.TIMEOUTS.RESPONSE);
    this.log('Response received', 'debug');
    return response;
  }

  async waitForEOT() {
    const startTime = Date.now();
    const timeout = ECR_CONSTANTS.TIMEOUTS.ACK;
    
    while (Date.now() - startTime < timeout) {
      const data = await this.readData();
      
      if (!data || data.length === 0) {
        await this.sleep(100);
        continue;
      }
      
      const firstChar = data.charAt(0);
      
      if (firstChar === ECR_CONSTANTS.CONTROL_CHARS.EOT) {
        this.log('Received EOT', 'debug');
        return;
      }
      
      if (firstChar === ECR_CONSTANTS.CONTROL_CHARS.STX) {
        this.log('Handling duplicate response message', 'warning');
        let completeMessage = data;
        
        if (!data.includes(ECR_CONSTANTS.CONTROL_CHARS.ETX) || 
            data.indexOf(ECR_CONSTANTS.CONTROL_CHARS.ETX) >= data.length - 1) {
          
          const messageStartTime = Date.now();
          while (Date.now() - messageStartTime < 2000) {
            const additionalData = await this.readData();
            if (additionalData) {
              completeMessage += additionalData;
              const etxIndex = completeMessage.indexOf(ECR_CONSTANTS.CONTROL_CHARS.ETX);
              if (etxIndex !== -1 && completeMessage.length > etxIndex + 1) break;
            }
            await this.sleep(50);
          }
        }
        
        await this.sendACK();
        continue;
      }
      
      throw new Error(`Expected EOT, got: ${firstChar.charCodeAt(0)}`);
    }
    
    throw new Error('Timeout waiting for EOT');
  }

  // I/O Methods
  async writeData(data) {
    if (this.connectionType === CONNECTION_TYPES.SERIAL) return await ECRSerial.writeData(data);
    if (this.connectionType === CONNECTION_TYPES.TCP) return await ECRTcp.send(data);
    throw new Error('No active connection');
  }

  async readData() {
    if (this.connectionType === CONNECTION_TYPES.SERIAL) {
      const result = await ECRSerial.readData();
      return result.data || '';
    }
    if (this.connectionType === CONNECTION_TYPES.TCP) {
      const result = await ECRTcp.receive();
      return result.data || '';
    }
    return '';
  }

  async readSingleChar(timeout) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const data = await this.readData();
      if (data && data.length > 0) return data.charAt(0);
      await this.sleep(100);
    }
    throw new Error('Timeout reading single character');
  }

  async readMessage(timeout) {
    const startTime = Date.now();
    let buffer = '';
    let stxFound = false;
    
    while (Date.now() - startTime < timeout) {
      const data = await this.readData();
      if (data) {
        buffer += data;
        
        if (!stxFound && buffer.includes(ECR_CONSTANTS.CONTROL_CHARS.STX)) {
          stxFound = true;
        }
        
        if (stxFound && buffer.includes(ECR_CONSTANTS.CONTROL_CHARS.ETX)) {
          const etxIndex = buffer.indexOf(ECR_CONSTANTS.CONTROL_CHARS.ETX);
          if (buffer.length > etxIndex + 1) return buffer;
        }
      }
      
      if (!data || data.length === 0) await this.sleep(100);
    }
    
    throw new Error('Timeout reading message');
  }

  // Utility Methods
  async checkConnection() {
    try {
      if (this.connectionType === CONNECTION_TYPES.SERIAL) {
        const result = await ECRSerial.isConnected();
        return result.isConnected;
      }
      if (this.connectionType === CONNECTION_TYPES.TCP) {
        const result = await ECRTcp.isConnected();
        return result.isConnected;
      }
      return false;
    } catch (error) {
      this.log(`Connection check failed: ${error.message}`, 'error');
      return false;
    }
  }

  sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.communicationLog.push(logEntry);
    
    if (this.communicationLog.length > 1000) {
      this.communicationLog = this.communicationLog.slice(-500);
    }
    
    this.fileLogger?.log(message, level);
    console.log(`[ECR ${level.toUpperCase()}] ${message}`);
  }

  getCommunicationLog() { return [...this.communicationLog]; }
  clearCommunicationLog() { this.communicationLog = []; }

  // USB Device Management
  async getSavedUSBDevices() {
    try {
      if (!ECRSerial) throw new Error('ECR Serial module not available');
      return await ECRSerial.getSavedUSBDevices();
    } catch (error) {
      this.log(`Error getting saved USB devices: ${error.message}`, 'error');
      throw error;
    }
  }

  async scanForUSBDevices() {
    try {
      if (!ECRSerial) throw new Error('ECR Serial module not available');
      return await ECRSerial.scanForUSBDevices();
    } catch (error) {
      this.log(`Error scanning for USB devices: ${error.message}`, 'error');
      throw error;
    }
  }

  async saveUSBDevice(device, baudRate, alias) {
    try {
      if (!ECRSerial) throw new Error('ECR Serial module not available');
      return await ECRSerial.saveUSBDevice(device, baudRate, alias);
    } catch (error) {
      this.log(`Error saving USB device: ${error.message}`, 'error');
      throw error;
    }
  }

  async removeUSBDevice(deviceId) {
    try {
      if (!ECRSerial) throw new Error('ECR Serial module not available');
      return await ECRSerial.removeUSBDevice(deviceId);
    } catch (error) {
      this.log(`Error removing USB device: ${error.message}`, 'error');
      throw error;
    }
  }

  async connectToUSBDevice(device) {
    try {
      if (!ECRSerial) throw new Error('ECR Serial module not available');
      
      // Debug logging
      console.log('ECRService.connectToUSBDevice called with:', typeof device, device);
      
      // Extract device path from device object if needed
      let devicePath;
      if (typeof device === 'string') {
        devicePath = device;
      } else if (device && typeof device === 'object') {
        devicePath = device.deviceId || device.path || device.device;
        console.log('Extracted devicePath from object:', devicePath);
      } else {
        devicePath = device;
      }
      
      if (!devicePath || typeof devicePath !== 'string') {
        console.error('Invalid device path extracted:', devicePath, 'from:', device);
        throw new Error('Invalid device path: ' + JSON.stringify(device));
      }
      
      console.log('Calling ECRSerial.connectToUSBDevice with:', devicePath);
      const result = await ECRSerial.connectToUSBDevice(devicePath);
      if (result.success) {
        this.connectionType = CONNECTION_TYPES.SERIAL;
        this.isConnected = true;
        this.log('USB device connected', 'success');
      }
      return result;
    } catch (error) {
      this.log(`Error connecting to USB device: ${error.message}`, 'error');
      throw error;
    }
  }

  // Transaction Recording
  async recordTransaction(type, response, params) {
    try {
      this.log(`Recording transaction: ${type}`, 'debug');
      
      const transactionData = {
        type,
        timestamp: Date.now(),
        amount: params.amount,
        status: response.isApproved ? 'approved' : 'declined',
        statusCode: response.statusCode,
        approvalCode: response.approvalCode,
        rrn: response.rrn,
        trace: response.transactionTrace,
        ...response
      };
      
      this.log(`Transaction recorded: ${type} - ${transactionData.status}`, 'info');
      
      // Generate receipt for successful transactions
      if (response.isApproved && this.enableReceiptGeneration) {
        this.log(`Generating receipt for approved ${type} transaction...`, 'debug');
        try {
          await this.generateReceipt(response, params);
          this.log(`Receipt generation completed for ${type}`, 'debug');
        } catch (receiptError) {
          this.log(`Receipt generation failed for ${type}: ${receiptError.message}`, 'warning');
          // Don't throw receipt errors - transaction is still successful
        }
      }
      
      return transactionData;
    } catch (error) {
      this.log(`Failed to record transaction: ${error.message}`, 'error');
      this.log(`Transaction recording error stack: ${error.stack}`, 'error');
      throw error;
    }
  }

  // Receipt Generation
  async generateReceipt(response, params) {
    try {
      if (!this.enableReceiptGeneration) {
        this.log('Receipt generation is disabled', 'debug');
        return null;
      }
      
      this.log('Starting receipt generation...', 'debug');
      
      // Generate standard receipt
      let receiptData = null;
      if (this.receiptService && typeof this.receiptService.generateReceipt === 'function') {
        try {
          receiptData = await this.receiptService.generateReceipt(response, params);
          this.log('Standard receipt generated successfully', 'debug');
        } catch (standardReceiptError) {
          this.log(`Standard receipt generation failed: ${standardReceiptError.message}`, 'warning');
        }
      } else {
        this.log('Standard receipt service not available', 'warning');
      }
      
      // Generate POS receipt (using correct method name)
      if (this.enablePOSReceipts && this.posReceiptService) {
        this.log('Checking POS receipt service...', 'debug');
        
        if (typeof this.posReceiptService.generatePOSReceipt === 'function') {
          try {
            this.log('Calling generatePOSReceipt...', 'debug');
            const posReceiptResult = this.posReceiptService.generatePOSReceipt(response, params);
            this.log(`POS receipt result: ${JSON.stringify(posReceiptResult)}`, 'debug');
            this.log(`POS receipt generated: ${posReceiptResult?.success ? 'Success' : posReceiptResult?.message || 'Unknown result'}`, posReceiptResult?.success ? 'info' : 'warning');
          } catch (posError) {
            this.log(`POS receipt generation failed: ${posError.message}`, 'warning');
            this.log(`POS receipt error stack: ${posError.stack}`, 'debug');
          }
        } else {
          this.log(`generatePOSReceipt method not found. Available methods: ${this.posReceiptService ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.posReceiptService)) : 'service is null'}`, 'warning');
        }
      } else if (this.enablePOSReceipts) {
        this.log('POS receipt service not available', 'warning');
      }
      
      return receiptData;
    } catch (error) {
      this.log(`Receipt generation failed: ${error.message}`, 'error');
      this.log(`Receipt generation error stack: ${error.stack}`, 'error');
      return null;
    }
  }

  // Configuration
  getConfiguration() { return this.configManager.getConfig(); }
  async updateConfiguration(config) { return this.configManager.updateConfig(config); }
  async resetConfiguration() { return this.configManager.resetConfig(); }

  // Enhanced Error Handling Methods
  async reconnect() {
    try {
      this.log('Attempting to reconnect...', 'info');
      
      if (this.connectionType === CONNECTION_TYPES.SERIAL) {
        await this.disconnect();
        const result = await this.connectSerial();
        return result;
      } else if (this.connectionType === CONNECTION_TYPES.TCP) {
        await this.disconnect();
        const result = await this.connectTCP();
        return result;
      }
      
      throw new Error('No connection type to reconnect');
    } catch (error) {
      this.log(`Reconnection failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async sendEchoTest() {
    try {
      return await this.performEchoTest();
    } catch (error) {
      this.log(`Echo test failed: ${error.message}`, 'error');
      throw error;
    }
  }

  // Additional Transaction Methods for Completeness
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
      case 'read_card':
        return this.performReadCard();
      case 'scan_qr':
        return this.performScanQR();
      default:
        throw new Error(`Unsupported transaction type: ${transactionType}`);
    }
  }

  // Enhanced USB Device Methods
  async deleteUSBDevice(deviceId) {
    return this.removeUSBDevice(deviceId);
  }

  async updateUSBDeviceConnection(deviceId) {
    try {
      const devices = await this.getSavedUSBDevices();
      const updatedDevices = devices.map(device => {
        if (device.deviceId === deviceId) {
          return {
            ...device,
            lastConnected: Date.now(),
            connectionCount: (device.connectionCount || 0) + 1
          };
        }
        return device;
      });
      return updatedDevices;
    } catch (error) {
      this.log(`Error updating USB device connection: ${error.message}`, 'error');
      throw error;
    }
  }

  // ===== AUTO-RECONNECTION METHODS =====

  /**
   * Simple event emitter implementation
   */
  on(event, listener) {
    if (!this.eventEmitter.has(event)) {
      this.eventEmitter.set(event, []);
    }
    this.eventEmitter.get(event).push(listener);
  }

  removeListener(event, listenerToRemove) {
    if (this.eventEmitter.has(event)) {
      const listeners = this.eventEmitter.get(event);
      const filtered = listeners.filter(listener => listener !== listenerToRemove);
      this.eventEmitter.set(event, filtered);
    }
  }

  emit(event, data) {
    if (this.eventEmitter.has(event)) {
      this.eventEmitter.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.log(`Event listener error for ${event}: ${error.message}`, 'error');
        }
      });
    }
  }

  /**
   * Setup USB event listeners for auto-reconnection
   * Call this in app initialization (componentDidMount/useEffect)
   */
  setupUSBEventListeners() {
    try {
      this.log('Setting up USB event listeners...', 'info');

      // For React Native, we'll simulate USB events with DeviceEventEmitter
      const { DeviceEventEmitter } = require('react-native');

      // Device detached event
      this.deviceDetachedListener = DeviceEventEmitter.addListener(
        'onUSBDeviceDetached',
        this.handleDeviceDetached.bind(this)
      );

      // Auto-reconnect success event  
      this.reconnectSuccessListener = DeviceEventEmitter.addListener(
        'onUSBDeviceAttached',
        this.handleDeviceAttached.bind(this)
      );

      this.log('USB event listeners setup completed', 'info');
    } catch (error) {
      this.log(`Failed to setup USB event listeners: ${error.message}`, 'error');
    }
  }

  /**
   * Remove USB event listeners
   * Call this in cleanup (componentWillUnmount/useEffect cleanup)
   */
  removeUSBEventListeners() {
    try {
      if (this.deviceDetachedListener) {
        this.deviceDetachedListener.remove();
        this.deviceDetachedListener = null;
      }
      if (this.reconnectSuccessListener) {
        this.reconnectSuccessListener.remove();
        this.reconnectSuccessListener = null;
      }

      this.stopConnectionMonitor();
      this.log('USB event listeners removed', 'info');
    } catch (error) {
      this.log(`Error removing USB event listeners: ${error.message}`, 'error');
    }
  }

  /**
   * Store last connected device for app restart reconnection
   */
  async storeLastConnectedDevice(deviceId) {
    try {
      // Use a simple in-memory storage for React Native
      // In production, use AsyncStorage
      this._lastStoredDevice = {
        deviceId,
        timestamp: Date.now()
      };
      this.log(`Stored last connected device: ${deviceId}`, 'debug');
    } catch (error) {
      this.log(`Failed to store last device: ${error.message}`, 'warning');
    }
  }

  /**
   * Retrieve last connected device from storage
   */
  async getLastConnectedDevice() {
    try {
      if (this._lastStoredDevice) {
        const deviceInfo = this._lastStoredDevice;
        // Check if stored device is not too old (24 hours)
        if (Date.now() - deviceInfo.timestamp < 24 * 60 * 60 * 1000) {
          return deviceInfo.deviceId;
        }
      }
    } catch (error) {
      this.log(`Failed to retrieve last device: ${error.message}`, 'warning');
    }
    return null;
  }

  /**
   * Enhanced connection method with auto-reconnect setup
   */
  async connectToUSBDeviceWithAutoReconnect(deviceId) {
    try {
      this.log(`Connecting to device with auto-reconnect: ${deviceId}`, 'info');
      
      // Ensure deviceId is a string
      const devicePath = typeof deviceId === 'string' ? deviceId : 
                        (deviceId.deviceId || deviceId.path || deviceId.device || deviceId);
                        
      const result = await this.connectToUSBDevice(devicePath);
      
      if (result.success) {
        // Store device info for auto-reconnection
        this.lastConnectedDevice = {
          deviceId,
          timestamp: Date.now(),
          connectionDetails: result
        };

        // Enable auto-reconnect for this device
        await this.enableAutoReconnectForDevice(deviceId);
        
        // Start connection monitoring
        this.startConnectionMonitor();
        
        this.log(`Auto-reconnect enabled for device: ${deviceId}`, 'info');
      }
      
      return result;
    } catch (error) {
      this.log(`Failed to connect with auto-reconnect: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Enable auto-reconnect for a specific device
   */
  async enableAutoReconnectForDevice(deviceId) {
    try {
      // Check if native module supports auto-reconnect
      if (ECRSerial && typeof ECRSerial.toggleUSBAutoReconnect === 'function') {
        await ECRSerial.toggleUSBAutoReconnect(deviceId, true);
        this.log('Native auto-reconnect enabled', 'debug');
      }

      this.autoReconnectEnabled = true;
      this.reconnectionAttempts = 0;
      
      // Store in persistent storage
      await this.storeLastConnectedDevice(deviceId);
      
      this.log(`Auto-reconnect enabled for device: ${deviceId}`, 'info');
      return true;
    } catch (error) {
      this.log(`Failed to enable auto-reconnect: ${error.message}`, 'error');
      // Continue without native auto-reconnect, use manual monitoring
      this.autoReconnectEnabled = true;
      this.reconnectionAttempts = 0;
      await this.storeLastConnectedDevice(deviceId);
      return true;
    }
  }

  /**
   * Auto-connect to last used device on app startup
   * Call this during app initialization
   */
  async autoConnectLastDevice() {
    try {
      const lastDeviceId = await this.getLastConnectedDevice();
      if (!lastDeviceId) {
        this.log('No previous device found for auto-connection', 'info');
        return false;
      }

      this.log(`Attempting auto-connection to last device: ${lastDeviceId}`, 'info');

      // Check if device is available
      const savedDevices = await this.getSavedUSBDevices();
      const targetDevice = savedDevices.find(d => d.deviceId === lastDeviceId);
      
      if (!targetDevice) {
        this.log('Last connected device not found in saved devices', 'warning');
        return false;
      }

      if (!targetDevice.isOnline) {
        this.log('Last connected device is not currently available', 'info');
        return false;
      }

      // Attempt connection
      const result = await this.connectToUSBDeviceWithAutoReconnect(lastDeviceId);
      
      if (result.success) {
        this.log('Auto-connection successful', 'success');
        return true;
      } else {
        this.log('Auto-connection failed', 'warning');
        return false;
      }
    } catch (error) {
      this.log(`Auto-connection error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Start background connection monitoring
   */
  startConnectionMonitor() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }

    this.connectionMonitorInterval = setInterval(async () => {
      try {
        if (!this.autoReconnectEnabled || this.isReconnecting) {
          return;
        }

        const isConnected = await this.checkConnection();
        if (!isConnected && this.lastConnectedDevice && this.isConnected) {
          this.log('Connection lost detected by monitor, attempting reconnection...', 'warning');
          this.isConnected = false; // Update state immediately
          this.emit('deviceDetached', { deviceId: this.lastConnectedDevice.deviceId });
          await this.attemptReconnection();
        }
      } catch (error) {
        this.log(`Connection monitor error: ${error.message}`, 'error');
      }
    }, 3000); // Check every 3 seconds

    this.log('Connection monitor started', 'info');
  }

  /**
   * Stop background connection monitoring
   */
  stopConnectionMonitor() {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
      this.log('Connection monitor stopped', 'info');
    }
  }

  /**
   * Handle device detached event
   */
  async handleDeviceDetached(event) {
    try {
      const deviceInfo = event.deviceName || event.deviceId || 'unknown';
      this.log(`Device detached: ${deviceInfo}`, 'warning');
      
      // Update connection state
      this.isConnected = false;
      this.connectionType = null;
      
      // Reset reconnection attempts
      this.reconnectionAttempts = 0;
      
      // Emit event for UI updates
      this.emit('deviceDetached', { deviceId: deviceInfo });
      
    } catch (error) {
      this.log(`Error handling device detached: ${error.message}`, 'error');
    }
  }

  /**
   * Handle device attached event (potential reconnection)
   */
  async handleDeviceAttached(event) {
    try {
      const deviceInfo = event.deviceName || event.deviceId || 'unknown';
      this.log(`Device attached: ${deviceInfo}`, 'info');
      
      // If we have a last connected device and auto-reconnect is enabled, try to reconnect
      if (this.autoReconnectEnabled && this.lastConnectedDevice && !this.isConnected) {
        this.log('Attempting auto-reconnection on device attachment...', 'info');
        setTimeout(() => this.attemptReconnection(), 1000); // Small delay for device initialization
      }
      
    } catch (error) {
      this.log(`Error handling device attached: ${error.message}`, 'error');
    }
  }

  /**
   * Manual reconnection attempt
   */
  async attemptReconnection() {
    if (this.isReconnecting || !this.lastConnectedDevice) {
      return;
    }

    this.isReconnecting = true;
    
    try {
      this.log(`Attempting reconnection (attempt ${this.reconnectionAttempts + 1}/${this.maxReconnectionAttempts})...`, 'info');
      
      // Check if device is available
      const savedDevices = await this.getSavedUSBDevices();
      const targetDevice = savedDevices.find(d => d.deviceId === this.lastConnectedDevice.deviceId);
      
      if (!targetDevice?.isOnline) {
        this.log('Target device not available for reconnection', 'warning');
        this.isReconnecting = false;
        return;
      }

      const result = await this.connectToUSBDevice(this.lastConnectedDevice.deviceId);
      
      if (result.success) {
        this.log('Reconnection successful', 'success');
        this.isConnected = true;
        this.connectionType = CONNECTION_TYPES.SERIAL;
        this.reconnectionAttempts = 0;
        
        // Emit success event
        this.emit('autoReconnectSuccess', { deviceId: this.lastConnectedDevice.deviceId });
      } else {
        throw new Error(result.message || 'Connection failed');
      }
      
    } catch (error) {
      this.reconnectionAttempts++;
      this.log(`Reconnection failed: ${error.message}`, 'error');
      
      if (this.reconnectionAttempts >= this.maxReconnectionAttempts) {
        this.log('Max reconnection attempts reached', 'error');
        this.autoReconnectEnabled = false;
        this.emit('reconnectionExhausted', { deviceId: this.lastConnectedDevice?.deviceId });
      } else {
        // Schedule next reconnection attempt with exponential backoff
        const delay = Math.min(2000 * this.reconnectionAttempts, 30000);
        this.log(`Next reconnection attempt in ${delay}ms`, 'info');
        setTimeout(() => {
          if (this.autoReconnectEnabled && !this.isConnected) {
            this.attemptReconnection();
          }
        }, delay);
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Enhanced disconnect with auto-reconnect cleanup
   */
  async disconnectWithCleanup() {
    try {
      // Disable auto-reconnect
      if (this.lastConnectedDevice && ECRSerial && typeof ECRSerial.toggleUSBAutoReconnect === 'function') {
        try {
          await ECRSerial.toggleUSBAutoReconnect(this.lastConnectedDevice.deviceId, false);
        } catch (error) {
          this.log(`Failed to disable native auto-reconnect: ${error.message}`, 'warning');
        }
      }
      
      // Stop monitoring
      this.stopConnectionMonitor();
      
      // Reset state
      this.autoReconnectEnabled = false;
      this.lastConnectedDevice = null;
      this.reconnectionAttempts = 0;
      this.isReconnecting = false;
      
      // Regular disconnect
      const result = await this.disconnect();
      
      this.log('Disconnected with auto-reconnect cleanup', 'info');
      return result;
      
    } catch (error) {
      this.log(`Error during disconnect cleanup: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Get auto-reconnection status
   */
  getAutoReconnectStatus() {
    return {
      enabled: this.autoReconnectEnabled,
      lastDevice: this.lastConnectedDevice,
      reconnectionAttempts: this.reconnectionAttempts,
      isReconnecting: this.isReconnecting,
      maxAttempts: this.maxReconnectionAttempts,
      isConnected: this.isConnected
    };
  }

  /**
   * Force reconnection attempt
   */
  async forceReconnect() {
    if (!this.lastConnectedDevice) {
      throw new Error('No device to reconnect to');
    }
    
    this.reconnectionAttempts = 0; // Reset attempts
    await this.attemptReconnection();
  }

  /**
   * Validate transaction parameters for security and data integrity
   */
  validateTransactionParams(type, params) {
    if (!params || typeof params !== 'object') {
      throw new Error('Transaction parameters must be an object');
    }

    const validated = { ...params };

    // Validate hostNo if present
    if (params.hostNo !== undefined) {
      if (typeof params.hostNo !== 'string' || params.hostNo.length > 2) {
        throw new Error('Host number must be a string with maximum 2 characters');
      }
      validated.hostNo = params.hostNo.replace(/[^0-9A-Z]/g, ''); // Sanitize
    }

    // Validate amount for monetary transactions
    if (['SALE', 'PREAUTH', 'WALLET_SALE', 'WALLET_REFUND', 'REFUND'].includes(type)) {
      if (!params.amount) {
        throw new Error(`Amount is required for ${type} transaction`);
      }
      if (typeof params.amount !== 'string' || !/^\d+$/.test(params.amount)) {
        throw new Error('Amount must be a string containing only digits');
      }
      if (params.amount.length > 12) {
        throw new Error('Amount cannot exceed 12 digits');
      }
      const amountValue = parseInt(params.amount, 10);
      if (amountValue <= 0 || amountValue > 999999999999) {
        throw new Error('Amount must be between 1 and 999999999999');
      }
    }

    // Validate transaction trace for VOID
    if (type === 'VOID') {
      if (!params.transactionTrace) {
        throw new Error('Transaction trace is required for VOID transaction');
      }
      if (typeof params.transactionTrace !== 'string' || params.transactionTrace.length > 6) {
        throw new Error('Transaction trace must be a string with maximum 6 characters');
      }
      validated.transactionTrace = params.transactionTrace.replace(/[^0-9]/g, ''); // Only digits
    }

    // Validate QR code data for wallet transactions
    if (['WALLET_SALE', 'WALLET_REFUND'].includes(type)) {
      if (params.qrCode && typeof params.qrCode === 'string') {
        // Limit QR code length for security
        if (params.qrCode.length > 500) {
          throw new Error('QR code data cannot exceed 500 characters');
        }
        // Basic QR code format validation (can be enhanced based on requirements)
        validated.qrCode = params.qrCode.trim();
      }
      
      if (params.qrCodeId) {
        if (typeof params.qrCodeId !== 'string' || params.qrCodeId.length > 2) {
          throw new Error('QR code ID must be a string with maximum 2 characters');
        }
        validated.qrCodeId = params.qrCodeId.replace(/[^0-9]/g, ''); // Only digits
      }
    }

    // Sanitize additional data
    if (params.additionalData) {
      if (typeof params.additionalData !== 'string') {
        throw new Error('Additional data must be a string');
      }
      if (params.additionalData.length > 24) {
        throw new Error('Additional data cannot exceed 24 characters');
      }
      // Remove potentially dangerous characters
      validated.additionalData = params.additionalData.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
    }

    // Validate print receipt flag
    if (params.printReceipt !== undefined) {
      validated.printReceipt = Boolean(params.printReceipt);
    }

    return validated;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove or mask sensitive data
    if (sanitized.qrCode) {
      sanitized.qrCode = sanitized.qrCode.length > 10 ? 
        sanitized.qrCode.substring(0, 10) + '...' : 
        sanitized.qrCode;
    }
    
    // Don't log additional data that might contain sensitive info
    if (sanitized.additionalData) {
      sanitized.additionalData = '[REDACTED]';
    }

    return sanitized;
  }
}