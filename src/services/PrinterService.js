import { NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';

const { ESCPrinterModule } = NativeModules;

class PrinterService {
  constructor() {
    this.isConnected = false;
    this.currentConnection = null;
    this.connectionType = null;
    this.deviceInfo = null;
    this.eventEmitter = new NativeEventEmitter(ESCPrinterModule);
    
    // Connection status tracking
    this.connectionStatus = {
      isConnected: false,
      lastConnectedDevice: null,
      connectionType: null,
      lastError: null,
    };

    // Prevent duplicate printing
    this.lastPrintTime = 0;
    this.lastPrintContent = '';
    this.printDebounceMs = 1000; // 1 second debounce

    this.setupEventListeners();
    this.autoReconnectOnStart();
  }

  setupEventListeners() {
    // Listen for printer connection events
    this.eventEmitter.addListener('onPrinterConnected', (data) => {
      console.log('Printer connected:', data);
      this.isConnected = true;
      this.connectionStatus.isConnected = true;
      this.connectionStatus.lastConnectedDevice = data || { type: 'Unknown', name: 'Printer' };
      this.connectionStatus.lastError = null; // Clear any previous errors
      this.emit('printerConnected', data);
    });

    this.eventEmitter.addListener('onPrinterDisconnected', (data) => {
      console.log('Printer disconnected:', data);
      this.isConnected = false;
      this.connectionStatus.isConnected = false;
      this.emit('printerDisconnected', data);
    });

    this.eventEmitter.addListener('onPrinterError', (error) => {
      console.error('Printer error:', error);
      const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown printer error';
      
      // If error indicates connection failure, update connection status
      if (errorMessage.includes('Not Find') || errorMessage.includes('connection') || errorMessage.includes('failed')) {
        this.isConnected = false;
        this.connectionStatus.isConnected = false;
      }
      
      this.connectionStatus.lastError = errorMessage;
      this.emit('printerError', error);
    });

    this.eventEmitter.addListener('onPrintComplete', (result) => {
      console.log('Print completed:', result);
      this.emit('printComplete', result);
    });
  }

  // Event emitter for UI updates
  emit(event, data) {
    DeviceEventEmitter.emit(`printer_${event}`, data);
  }

  on(event, callback) {
    return DeviceEventEmitter.addListener(`printer_${event}`, callback);
  }

  // Connection Methods
  async connectUSB(devicePath) {
    try {
      console.log(`Connecting to USB printer: ${devicePath}`);
      
      // Reset connection status before attempting
      this.connectionStatus.lastError = null;
      this.isConnected = false;
      this.connectionStatus.isConnected = false;
      
      const result = await ESCPrinterModule.connectUSB(devicePath);
      
      if (result.success) {
        // Don't set connected here - wait for the native event
        this.connectionType = 'USB';
        this.deviceInfo = { type: 'USB', path: devicePath };
        console.log('USB connection initiated successfully');
      } else {
        // Connection failed
        this.connectionStatus.lastError = result.error || 'USB connection failed';
      }
      
      return result;
    } catch (error) {
      console.error('USB printer connection failed:', error);
      this.connectionStatus.lastError = error.message || 'USB connection error';
      this.isConnected = false;
      this.connectionStatus.isConnected = false;
      return { success: false, error: error.message };
    }
  }

  async connectNetwork(ipAddress, port = 9100) {
    try {
      console.log(`Connecting to network printer: ${ipAddress}:${port}`);
      
      // Reset connection status before attempting
      this.connectionStatus.lastError = null;
      this.isConnected = false;
      this.connectionStatus.isConnected = false;
      
      const result = await ESCPrinterModule.connectNetwork(ipAddress, port);
      
      if (result.success) {
        // Don't set connected here - wait for the native event
        this.connectionType = 'Network';
        this.deviceInfo = { type: 'Network', address: ipAddress, port };
        console.log('Network connection initiated successfully');
      } else {
        // Connection failed
        this.connectionStatus.lastError = result.error || 'Network connection failed';
      }
      
      return result;
    } catch (error) {
      console.error('Network printer connection failed:', error);
      this.connectionStatus.lastError = error.message || 'Network connection error';
      this.isConnected = false;
      this.connectionStatus.isConnected = false;
      return { success: false, error: error.message };
    }
  }

  async connectBluetooth(macAddress) {
    try {
      console.log(`Connecting to Bluetooth printer: ${macAddress}`);
      const result = await ESCPrinterModule.connectBluetooth(macAddress);
      
      if (result.success) {
        this.isConnected = true;
        this.connectionType = 'Bluetooth';
        this.deviceInfo = { type: 'Bluetooth', address: macAddress };
        this.connectionStatus = {
          isConnected: true,
          lastConnectedDevice: this.deviceInfo,
          connectionType: 'Bluetooth',
          lastError: null,
        };
      }
      
      return result;
    } catch (error) {
      console.error('Bluetooth printer connection failed:', error);
      this.connectionStatus.lastError = error.message;
      return { success: false, error: error.message };
    }
  }

  async connectSerial(port, baudRate = '9600') {
    try {
      console.log(`Connecting to serial printer: ${port} @ ${baudRate}`);
      const result = await ESCPrinterModule.connectSerial(port, baudRate);
      
      if (result.success) {
        this.isConnected = true;
        this.connectionType = 'Serial';
        this.deviceInfo = { type: 'Serial', port, baudRate };
        this.connectionStatus = {
          isConnected: true,
          lastConnectedDevice: this.deviceInfo,
          connectionType: 'Serial',
          lastError: null,
        };
      }
      
      return result;
    } catch (error) {
      console.error('Serial printer connection failed:', error);
      this.connectionStatus.lastError = error.message;
      return { success: false, error: error.message };
    }
  }

  async disconnect() {
    try {
      console.log('Disconnecting printer...');
      const result = await ESCPrinterModule.disconnect();
      
      this.isConnected = false;
      this.connectionType = null;
      this.deviceInfo = null;
      this.connectionStatus.isConnected = false;
      
      return result;
    } catch (error) {
      console.error('Printer disconnection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Device Discovery
  async getUSBDevices() {
    try {
      const devices = await ESCPrinterModule.getUSBDevices();
      return { success: true, devices };
    } catch (error) {
      console.error('Failed to get USB devices:', error);
      return { success: false, error: error.message, devices: [] };
    }
  }

  async getBluetoothDevices() {
    try {
      const devices = await ESCPrinterModule.getBluetoothDevices();
      return { success: true, devices };
    } catch (error) {
      console.error('Failed to get Bluetooth devices:', error);
      return { success: false, error: error.message, devices: [] };
    }
  }

  async scanNetworkPrinters(subnet = '192.168.1') {
    try {
      const devices = await ESCPrinterModule.scanNetworkPrinters(subnet);
      return { success: true, devices };
    } catch (error) {
      console.error('Failed to scan network printers:', error);
      return { success: false, error: error.message, devices: [] };
    }
  }

  // Printing Methods
  async printReceipt(receiptData) {
    if (!this.isConnected) {
      return { success: false, error: 'Printer not connected' };
    }

    // Debounce duplicate receipt requests
    const currentTime = Date.now();
    const receiptHash = JSON.stringify(receiptData).substring(0, 100);
    
    if (currentTime - this.lastPrintTime < this.printDebounceMs && 
        this.lastPrintContent === receiptHash) {
      console.log('Duplicate receipt print request ignored (debounced)');
      return { success: true, message: 'Duplicate request ignored' };
    }
    
    this.lastPrintTime = currentTime;
    this.lastPrintContent = receiptHash;

    try {
      console.log('Processing receipt print request:', receiptHash);
      const result = await ESCPrinterModule.printReceipt(receiptData);
      
      // Auto-cut paper after printing receipt
      if (result.success) {
        try {
          console.log('Attempting to cut paper after receipt printing...');
          const cutResult = await this.cutPaper('full');
          console.log('Cut paper result:', cutResult);
          if (cutResult.success) {
            console.log('✂️ Paper cut successfully after receipt printing');
          } else {
            console.warn('❌ Failed to cut paper after receipt printing:', cutResult.error || cutResult.message);
          }
        } catch (cutError) {
          console.warn('❌ Paper cutting exception after receipt printing:', cutError.message);
          // Don't fail the receipt print operation just because cutting failed
        }
      }
      
      return result;
    } catch (error) {
      console.error('Receipt printing failed:', error);
      return { success: false, error: error.message };
    }
  }

  async printText(text, options = {}) {
    if (!this.isConnected) {
      return { success: false, error: 'Printer not connected' };
    }

    // Debounce duplicate print requests
    const currentTime = Date.now();
    const contentHash = text.substring(0, 100); // Use first 100 chars as identifier
    
    if (currentTime - this.lastPrintTime < this.printDebounceMs && 
        this.lastPrintContent === contentHash) {
      console.log('Duplicate print request ignored (debounced)');
      return { success: true, message: 'Duplicate request ignored' };
    }
    
    this.lastPrintTime = currentTime;
    this.lastPrintContent = contentHash;

    try {
      console.log('Processing print request:', contentHash);
      
      const printOptions = {
        fontSize: options.fontSize || 'normal',
        alignment: options.alignment || 'left',
        bold: options.bold || false,
        underline: options.underline || false,
        ...options
      };

      const result = await ESCPrinterModule.printText(text, printOptions);
      
      // Auto-cut paper after printing (unless explicitly disabled)
      if (result.success && options.autoCut !== false) {
        try {
          console.log('Attempting to cut paper after printing...');
          const cutResult = await this.cutPaper('full');
          console.log('Cut paper result:', cutResult);
          if (cutResult.success) {
            console.log('✂️ Paper cut successfully after printing');
          } else {
            console.warn('❌ Failed to cut paper after printing:', cutResult.error || cutResult.message);
          }
        } catch (cutError) {
          console.warn('❌ Paper cutting exception after printing:', cutError.message);
          // Don't fail the print operation just because cutting failed
        }
      } else if (options.autoCut === false) {
        console.log('⚠️ Auto-cut disabled for this print job');
      }
      
      return result;
    } catch (error) {
      console.error('Text printing failed:', error);
      return { success: false, error: error.message };
    }
  }

  async printBarcode(data, type = 'CODE128', options = {}) {
    if (!this.isConnected) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      const barcodeOptions = {
        type,
        height: options.height || 50,
        width: options.width || 2,
        position: options.position || 'below',
        ...options
      };

      const result = await ESCPrinterModule.printBarcode(data, barcodeOptions);
      return result;
    } catch (error) {
      console.error('Barcode printing failed:', error);
      return { success: false, error: error.message };
    }
  }

  async printQRCode(data, options = {}) {
    if (!this.isConnected) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      const qrOptions = {
        size: options.size || 6,
        errorLevel: options.errorLevel || 'M',
        ...options
      };

      const result = await ESCPrinterModule.printQRCode(data, qrOptions);
      return result;
    } catch (error) {
      console.error('QR code printing failed:', error);
      return { success: false, error: error.message };
    }
  }

  async printImage(imagePath, options = {}) {
    if (!this.isConnected) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      const imageOptions = {
        width: options.width || 384,
        alignment: options.alignment || 'center',
        ...options
      };

      const result = await ESCPrinterModule.printImage(imagePath, imageOptions);
      return result;
    } catch (error) {
      console.error('Image printing failed:', error);
      return { success: false, error: error.message };
    }
  }

  async cutPaper(type = 'full') {
    if (!this.isConnected) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      const result = await ESCPrinterModule.cutPaper(type);
      return result;
    } catch (error) {
      console.error('Paper cutting failed:', error);
      return { success: false, error: error.message };
    }
  }

  async openDrawer() {
    if (!this.isConnected) {
      return { success: false, error: 'Printer not connected' };
    }

    try {
      const result = await ESCPrinterModule.openDrawer();
      return result;
    } catch (error) {
      console.error('Cash drawer opening failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Printer Status
  async getPrinterStatus() {
    if (!this.isConnected) {
      return { 
        success: false, 
        error: 'Printer not connected',
        status: { isConnected: false }
      };
    }

    try {
      const status = await ESCPrinterModule.getPrinterStatus();
      return { success: true, status };
    } catch (error) {
      console.error('Failed to get printer status:', error);
      return { 
        success: false, 
        error: error.message,
        status: { isConnected: false }
      };
    }
  }

  // Utility Methods
  getConnectionStatus() {
    return {
      ...this.connectionStatus,
      deviceInfo: this.deviceInfo,
      connectionType: this.connectionType,
    };
  }

  isReady() {
    return this.isConnected;
  }

  // Receipt Template Builder
  buildReceipt(transactionData) {
    const receipt = {
      header: {
        storeName: transactionData.storeName || 'Your Store',
        address: transactionData.storeAddress || '',
        phone: transactionData.storePhone || '',
      },
      transaction: {
        id: transactionData.id,
        type: transactionData.type,
        amount: transactionData.amount,
        timestamp: transactionData.timestamp || new Date().toISOString(),
        status: transactionData.status,
      },
      payment: {
        method: transactionData.paymentMethod || 'Card',
        cardNumber: transactionData.cardNumber || '',
        approvalCode: transactionData.approvalCode || '',
        referenceNumber: transactionData.referenceNumber || '',
      },
      footer: {
        thankYou: 'Thank you for your business!',
        supportPhone: transactionData.supportPhone || '',
      }
    };

    return receipt;
  }

  // ECR Integration Helper
  async printECRReceipt(ecrResponse) {
    if (!ecrResponse || !ecrResponse.success) {
      return { success: false, error: 'Invalid ECR response' };
    }

    try {
      const receipt = this.buildReceipt({
        storeName: 'PayECR Store',
        id: ecrResponse.transactionId || ecrResponse.traceNumber,
        type: ecrResponse.transactionType || 'Sale',
        amount: ecrResponse.amount || ecrResponse.transactionAmount,
        timestamp: ecrResponse.timestamp || new Date().toISOString(),
        status: ecrResponse.responseCode === '00' ? 'APPROVED' : 'DECLINED',
        paymentMethod: 'Card',
        cardNumber: ecrResponse.cardNumber || ecrResponse.maskedPAN,
        approvalCode: ecrResponse.approvalCode,
        referenceNumber: ecrResponse.referenceNumber || ecrResponse.rrn,
      });

      return await this.printReceipt(receipt);
    } catch (error) {
      console.error('ECR receipt printing failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Auto-reconnection methods
  async autoReconnectOnStart() {
    try {
      console.log('Attempting auto-reconnection of saved devices...');
      const result = await ESCPrinterModule.autoReconnectDevices();
      
      if (result.count > 0) {
        console.log(`Auto-reconnected ${result.count} devices:`, result.reconnectedDevices);
        this.emit('autoReconnected', result);
      }
      
      return result;
    } catch (error) {
      console.error('Auto-reconnection failed:', error);
      return { count: 0, reconnectedDevices: [] };
    }
  }

  async getSavedDevices() {
    try {
      const devices = await ESCPrinterModule.getSavedDevices();
      return devices;
    } catch (error) {
      console.error('Failed to get saved devices:', error);
      return [];
    }
  }

  async removeDevice(deviceKey) {
    try {
      const result = await ESCPrinterModule.removeDevice(deviceKey);
      return result;
    } catch (error) {
      console.error('Failed to remove device:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleAutoReconnect(deviceKey, enabled) {
    try {
      const result = await ESCPrinterModule.toggleAutoReconnect(deviceKey, enabled);
      return result;
    } catch (error) {
      console.error('Failed to toggle auto-reconnect:', error);
      return { success: false, error: error.message };
    }
  }

  // Event emitter functionality
  emit(event, data) {
    DeviceEventEmitter.emit(`printer_${event}`, data);
  }

  on(event, listener) {
    return DeviceEventEmitter.addListener(`printer_${event}`, listener);
  }

  off(event, listener) {
    if (listener && listener.remove) {
      listener.remove();
    }
  }
}

export default PrinterService;