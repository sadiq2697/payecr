import { NativeModules } from 'react-native';
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
        baudRate: config.baudRate || ECR_CONSTANTS.SERIAL_BAUD_RATE,
        dataBits: config.dataBits || ECR_CONSTANTS.SERIAL_DATA_BITS,
        stopBits: config.stopBits || 1,
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
        port: config.port || ECR_CONSTANTS.TCP_PORT,
        timeout: config.timeout || 5000,
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
    const { hostNo, amount, additionalData = '' } = params;
    
    try {
      this.log(`Starting SALE transaction: Amount=${amount}, Host=${hostNo}`, 'info');
      
      const command = this.messageBuilder.buildSaleCommand(hostNo, amount, additionalData);
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
    const { hostNo, amount, originalAmount, additionalData = '' } = params;
    
    try {
      this.log(`Starting REFUND transaction: Amount=${amount}, Original=${originalAmount}, Host=${hostNo}`, 'info');
      
      const command = this.messageBuilder.buildRefundCommand(hostNo, amount, originalAmount, additionalData);
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
    
    const response = await this.readSingleChar(ECR_CONSTANTS.ENQ_TIMEOUT);
    if (response !== ECR_CONSTANTS.ACK) {
      throw new Error(`Expected ACK after ENQ, got: ${response.charCodeAt(0)}`);
    }
    this.log('Received ACK for ENQ', 'debug');
  }
  
  /**
   * Wait for ACK response
   */
  async waitForACK() {
    const response = await this.readSingleChar(ECR_CONSTANTS.ACK_TIMEOUT);
    if (response !== ECR_CONSTANTS.ACK) {
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
    // First wait for ENQ from terminal
    const enq = await this.readSingleChar(ECR_CONSTANTS.RESPONSE_TIMEOUT);
    if (enq !== ECR_CONSTANTS.ENQ) {
      throw new Error(`Expected ENQ from terminal, got: ${enq.charCodeAt(0)}`);
    }
    this.log('Received ENQ from terminal', 'debug');
    
    // Send ACK
    await this.sendACK();
    
    // Read the actual response message
    const response = await this.readMessage(ECR_CONSTANTS.RESPONSE_TIMEOUT);
    return response;
  }
  
  /**
   * Wait for EOT
   */
  async waitForEOT() {
    const eot = await this.readSingleChar(ECR_CONSTANTS.ACK_TIMEOUT);
    if (eot !== ECR_CONSTANTS.EOT) {
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
    let etxFound = false;
    
    while (Date.now() - startTime < timeout) {
      const data = await this.readData();
      if (data) {
        buffer += data;
        
        if (!stxFound && buffer.includes(ECR_CONSTANTS.STX)) {
          stxFound = true;
        }
        
        if (stxFound && buffer.includes(ECR_CONSTANTS.ETX)) {
          etxFound = true;
          // Check if we have the LRC byte after ETX
          const etxIndex = buffer.indexOf(ECR_CONSTANTS.ETX);
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
}

