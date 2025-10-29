import AsyncStorage from '@react-native-async-storage/async-storage';
import { ECR_CONSTANTS } from '../utils/Constants';

/**
 * Transaction Recording Service
 * Records all transactions in JSON format for audit and reporting
 */
class TransactionRecorder {
  constructor() {
    this.storageKey = 'ecr_transaction_records';
    this.maxRecords = 1000; // Limit to prevent storage bloat
  }

  /**
   * Record a transaction with complete details
   * @param {Object} transactionData - Original transaction request
   * @param {Object} response - ECR response
   * @param {Object} additionalData - Extra metadata
   * @returns {Promise<Object>} Recording result
   */
  async recordTransaction(transactionData, response, additionalData = {}) {
    try {
      const transactionRecord = {
        id: this.generateTransactionId(),
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        
        // Transaction Details
        type: transactionData.transactionType || 'UNKNOWN',
        category: this.getTransactionCategory(transactionData.transactionType),
        amount: transactionData.amount,
        originalAmount: transactionData.originalAmount,
        
        // Request Data
        request: {
          hostNumber: transactionData.hostNumber,
          traceNumber: transactionData.traceNumber || this.generateTraceNumber(),
          additionalData: transactionData.additionalData,
          qrData: transactionData.qrData,
          printReceipt: transactionData.printReceipt || false,
          connectionType: transactionData.connectionType,
          rawMessage: transactionData.rawMessage
        },
        
        // Response Data
        response: {
          success: response.success,
          approved: response.isApproved,
          responseCode: response.responseCode,
          responseMessage: response.responseMessage,
          merchantId: response.merchantId,
          terminalId: response.terminalId,
          batchNumber: response.batchNumber,
          receiptNumber: response.receiptNumber,
          approvalCode: response.approvalCode,
          cardNumber: response.cardNumber,
          cardType: response.cardType,
          expiryDate: response.expiryDate,
          rawResponse: response.rawResponse,
          processingTime: response.processingTime
        },
        
        // Financial Summary
        financial: {
          amountCents: this.convertToAmountCents(transactionData.amount),
          amountFormatted: this.formatAmount(transactionData.amount),
          currency: 'MYR',
          exchangeRate: 1.0
        },
        
        // Status and Metadata
        status: response.success ? (response.isApproved ? 'APPROVED' : 'DECLINED') : 'ERROR',
        error: response.error || null,
        deviceInfo: {
          connectionType: transactionData.connectionType,
          terminalModel: response.terminalModel || 'Unknown',
          softwareVersion: response.softwareVersion || 'Unknown'
        },
        
        // Receipt Information
        receipt: {
          generated: additionalData.receiptGenerated || false,
          filePath: additionalData.receiptPath || null,
          customerCopy: additionalData.customerReceipt || null,
          merchantCopy: additionalData.merchantReceipt || null
        },
        
        // Split Payment Details (if applicable)
        splitPayment: additionalData.splitPayment || null,
        
        // Additional metadata
        metadata: {
          appVersion: additionalData.appVersion || '1.0.0',
          userId: additionalData.userId || null,
          sessionId: additionalData.sessionId || null,
          location: additionalData.location || null,
          ...additionalData
        }
      };

      // Store the transaction record
      await this.storeTransactionRecord(transactionRecord);
      
      console.log(`Transaction recorded: ${transactionRecord.id}`);
      
      return {
        success: true,
        transactionId: transactionRecord.id,
        record: transactionRecord
      };
      
    } catch (error) {
      console.error('Failed to record transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store transaction record in AsyncStorage
   */
  async storeTransactionRecord(record) {
    try {
      // Get existing records
      const existingRecords = await this.getAllTransactions();
      
      // Add new record at the beginning
      existingRecords.unshift(record);
      
      // Trim to max records
      if (existingRecords.length > this.maxRecords) {
        existingRecords.splice(this.maxRecords);
      }
      
      // Save back to storage
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(existingRecords));
      
    } catch (error) {
      throw new Error(`Failed to store transaction record: ${error.message}`);
    }
  }

  /**
   * Get all transaction records
   */
  async getAllTransactions() {
    try {
      const recordsJson = await AsyncStorage.getItem(this.storageKey);
      return recordsJson ? JSON.parse(recordsJson) : [];
    } catch (error) {
      console.error('Failed to load transaction records:', error);
      return [];
    }
  }

  /**
   * Get transactions by date range
   */
  async getTransactionsByDate(startDate, endDate) {
    try {
      const allRecords = await this.getAllTransactions();
      const start = new Date(startDate).toDateString();
      const end = new Date(endDate).toDateString();
      
      return allRecords.filter(record => {
        const recordDate = new Date(record.timestamp).toDateString();
        return recordDate >= start && recordDate <= end;
      });
    } catch (error) {
      console.error('Failed to filter transactions by date:', error);
      return [];
    }
  }

  /**
   * Get transactions by status
   */
  async getTransactionsByStatus(status) {
    try {
      const allRecords = await this.getAllTransactions();
      return allRecords.filter(record => record.status === status.toUpperCase());
    } catch (error) {
      console.error('Failed to filter transactions by status:', error);
      return [];
    }
  }

  /**
   * Export transactions as JSON
   */
  async exportTransactionsJSON(filters = {}) {
    try {
      let records = await this.getAllTransactions();
      
      // Apply filters
      if (filters.startDate && filters.endDate) {
        records = records.filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= new Date(filters.startDate) && 
                 recordDate <= new Date(filters.endDate);
        });
      }
      
      if (filters.status) {
        records = records.filter(record => record.status === filters.status.toUpperCase());
      }
      
      if (filters.transactionType) {
        records = records.filter(record => record.type === filters.transactionType);
      }
      
      // Create export object
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          totalRecords: records.length,
          filters: filters,
          version: '1.0.0'
        },
        transactions: records
      };
      
      return JSON.stringify(exportData, null, 2);
      
    } catch (error) {
      throw new Error(`Failed to export transactions: ${error.message}`);
    }
  }

  /**
   * Clear all transaction records
   */
  async clearAllTransactions() {
    try {
      await AsyncStorage.removeItem(this.storageKey);
      return { success: true, message: 'All transaction records cleared' };
    } catch (error) {
      throw new Error(`Failed to clear transactions: ${error.message}`);
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(dateRange = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);
      
      const records = await this.getAllTransactions();
      const recentRecords = records.filter(record => 
        new Date(record.timestamp) >= cutoffDate
      );
      
      const stats = {
        total: recentRecords.length,
        approved: recentRecords.filter(r => r.status === 'APPROVED').length,
        declined: recentRecords.filter(r => r.status === 'DECLINED').length,
        errors: recentRecords.filter(r => r.status === 'ERROR').length,
        totalAmount: recentRecords
          .filter(r => r.status === 'APPROVED')
          .reduce((sum, r) => sum + (r.financial.amountCents || 0), 0),
        byType: this.groupByTransactionType(recentRecords),
        byDate: this.groupByDate(recentRecords)
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to calculate transaction stats:', error);
      return null;
    }
  }

  // Helper Methods
  generateTransactionId() {
    return `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  generateTraceNumber() {
    return Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  }

  getTransactionCategory(type) {
    const typeUpper = (type || '').toString().toUpperCase();
    
    if (typeUpper.includes('CARD')) return 'CARD';
    if (typeUpper.includes('EWALLET')) return 'E_WALLET';
    if (typeUpper.includes('DUITNOW')) return 'DUITNOW';
    if (['SETTLEMENT', 'ECHO_TEST'].includes(typeUpper)) return 'SYSTEM';
    
    return 'OTHER';
  }

  convertToAmountCents(amount) {
    return Math.round(parseFloat(amount || 0) * 100);
  }

  formatAmount(amount) {
    return `RM ${(parseFloat(amount || 0) / 100).toFixed(2)}`;
  }

  groupByTransactionType(records) {
    return records.reduce((acc, record) => {
      const type = record.type || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  groupByDate(records) {
    return records.reduce((acc, record) => {
      const date = new Date(record.timestamp).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
  }
}

export default TransactionRecorder;
