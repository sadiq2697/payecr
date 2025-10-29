import { ECR_CONSTANTS } from '../utils/Constants';

/**
 * Receipt Generation Service
 * Replicates the C# ECRip.cs receipt generation functionality
 * Creates formatted receipt files for successful transactions
 */
export class ReceiptService {
  constructor() {
    this.receiptPath = 'ECR_Receipts/'; // Mobile-friendly path
    this.fileSystem = null; // Will be injected based on platform
  }

  /**
   * Set the file system handler (React Native RNFS, etc.)
   * @param {Object} fileSystem - File system handler
   */
  setFileSystem(fileSystem) {
    this.fileSystem = fileSystem;
  }

  /**
   * Generate receipt file for successful transaction
   * @param {Object} response - Parsed transaction response
   * @param {Object} transactionData - Original transaction data
   * @param {string} customFileName - Optional custom filename
   * @returns {Promise<Object>} Receipt generation result
   */
  async generateReceipt(response, transactionData, customFileName = '') {
    try {
      // Only generate receipts for successful transactions
      if (!response.success || !response.isApproved) {
        return {
          success: false,
          message: 'Receipt not generated - transaction not approved',
          filePath: null
        };
      }

      // Generate filename (matches C# logic)
      const fileName = this.generateFileName(response.responseCode, customFileName);
      const filePath = this.receiptPath + fileName;

      // Ensure directory exists
      await this.ensureDirectoryExists();

      // Generate receipt content based on transaction type
      const receiptContent = this.formatReceipt(response, transactionData);

      // Write receipt file
      await this.writeReceiptFile(filePath, receiptContent);

      return {
        success: true,
        message: 'Receipt generated successfully',
        filePath: filePath,
        fileName: fileName
      };

    } catch (error) {
      return {
        success: false,
        message: `Receipt generation failed: ${error.message}`,
        filePath: null
      };
    }
  }

  /**
   * Generate filename following C# pattern
   * @param {string} responseCode - Response code (R200, R201, etc.)
   * @param {string} customName - Custom filename if provided
   * @returns {string} Generated filename
   */
  generateFileName(responseCode, customName = '') {
    if (customName && customName.trim() !== '') {
      return `${customName.trim()}.TXT`;
    }
    
    const now = new Date();
    const dateTime = now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/\D/g, ''); // Remove non-digits
    
    return `${responseCode}_${dateTime}.TXT`;
  }

  /**
   * Format receipt content based on transaction type
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt content
   */
  formatReceipt(response, transactionData) {
    const responseCode = response.responseCode;
    
    switch (responseCode) {
      case ECR_CONSTANTS.RESPONSES.WALLET_SALE:
        return this.formatWalletSaleReceipt(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.VOID:
        return this.formatVoidReceipt(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.SETTLEMENT:
        return this.formatSettlementReceipt(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.SALE:
        return this.formatSaleReceipt(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.REFUND:
        return this.formatRefundReceipt(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.WALLET_REFUND:
        return this.formatWalletRefundReceipt(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.PREAUTH:
      case ECR_CONSTANTS.RESPONSES.PREAUTH_PARKING:
        return this.formatPreAuthReceipt(response, transactionData);
      default:
        return this.formatGenericReceipt(response, transactionData);
    }
  }

  /**
   * Format R290 (Wallet Sale) receipt - matches C# lines 507-530
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatWalletSaleReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push('');
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    lines.push(`\t${response.responseCode}`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push('');
    lines.push(`APP CODE :        ${response.approvalCode || ''}`);
    lines.push('');
    lines.push(`BATCH #  :        ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`TRACE #  :        ${response.transactionTrace || ''}`);
    lines.push('');
    lines.push(`PrtnrTrxID #  :   ${response.partnerTrxId || ''}`);
    lines.push('');
    lines.push(`AlpayTrxID #  :   ${response.alipayTrxId || ''}`);
    lines.push('');
    lines.push(`CustomerID #  :   ${response.customerId || ''}`);
    lines.push('');
    lines.push(`CardAppLabel     ${response.cardAppLabel || ''}`);
    lines.push('');
    lines.push('');
    lines.push(`TVR     ${response.tvr || ''}`);
    lines.push('');
    lines.push(`TSI     ${response.tsi || ''}`);
    lines.push('');
    lines.push(`AMOUNT RM     ${this.formatAmount(transactionData.amount || 0)}`);
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format R201 (Void) receipt - matches C# lines 536-551
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatVoidReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push('');
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    lines.push(`\t${response.responseCode}`);
    lines.push('');
    lines.push(`BATCH #  :        ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`TRACE #  :        ${response.transactionTrace || ''}`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push(`RRN REF #:  ${response.rrn || ''}`);
    lines.push('');
    lines.push(`APP CODE :        ${response.approvalCode || ''}`);
    lines.push('');
    lines.push(`${response.aid || ''}`);
    lines.push('');
    lines.push(`AMOUNT RM     -${this.formatAmount(transactionData.amount || 0)}`);
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format R500 (Settlement) receipt - matches C# lines 557-571
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatSettlementReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`\t${response.responseCode}`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push('');
    lines.push(`BATCH #        :   ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`BatchCount #   :   ${response.totalSalesCount || ''}`);
    lines.push('');
    lines.push(`BatchAmount #  :   ${response.totalSalesAmount || ''}`);
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format R200 (Sale) receipt - matches C# lines 572-592
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatSaleReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push('');
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    lines.push(`\t${response.responseCode}`);
    lines.push('');
    lines.push(`  ${this.maskCardNumber(response.cardNumber || '')}`);
    lines.push('');
    lines.push(`BATCH #  :        ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`TRACE #  :        ${response.transactionTrace || ''}`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push(`RRN REF #:  ${response.rrn || ''}`);
    lines.push('');
    lines.push(`APP CODE :        ${response.approvalCode || ''}`);
    lines.push('');
    lines.push(`${response.aid || ''}`);
    lines.push('');
    lines.push(`CRYPT    :${response.tc || ''}`);
    lines.push('');
    lines.push(`App Trx ID #:     ${response.appTrxId || ''}`);
    lines.push('');
    lines.push(`MAH Trx ID #:     ${response.mahTrxId || ''}`);
    lines.push('');
    lines.push(`AMOUNT RM     ${this.formatAmount(transactionData.amount || 0)}`);
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format Refund receipt
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatRefundReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push('');
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    lines.push(`\t${response.responseCode} - REFUND`);
    lines.push('');
    lines.push(`  ${this.maskCardNumber(response.cardNumber || '')}`);
    lines.push('');
    lines.push(`BATCH #  :        ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`TRACE #  :        ${response.transactionTrace || ''}`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push(`RRN REF #:  ${response.rrn || ''}`);
    lines.push('');
    lines.push(`APP CODE :        ${response.approvalCode || ''}`);
    lines.push('');
    lines.push(`ORIGINAL AMOUNT:  ${this.formatAmount(transactionData.originalAmount || 0)}`);
    lines.push('');
    lines.push(`REFUND AMOUNT:    ${this.formatAmount(transactionData.amount || 0)}`);
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format Wallet Refund receipt
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatWalletRefundReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push('');
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    lines.push(`\t${response.responseCode} - WALLET REFUND`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push('');
    lines.push(`APP CODE :        ${response.approvalCode || ''}`);
    lines.push('');
    lines.push(`BATCH #  :        ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`TRACE #  :        ${response.transactionTrace || ''}`);
    lines.push('');
    lines.push(`PrtnrTrxID #  :   ${response.partnerTrxId || ''}`);
    lines.push('');
    lines.push(`AlpayTrxID #  :   ${response.alipayTrxId || ''}`);
    lines.push('');
    lines.push(`CustomerID #  :   ${response.customerId || ''}`);
    lines.push('');
    lines.push(`ORIGINAL AMOUNT:  ${this.formatAmount(transactionData.originalAmount || 0)}`);
    lines.push('');
    lines.push(`REFUND AMOUNT:    ${this.formatAmount(transactionData.amount || 0)}`);
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format Pre-Authorization receipt
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatPreAuthReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    const isParking = response.responseCode === ECR_CONSTANTS.RESPONSES.PREAUTH_PARKING;
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push('');
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    lines.push(`\t${response.responseCode}${isParking ? ' - PARKING' : ' - PREAUTH'}`);
    lines.push('');
    lines.push(`  ${this.maskCardNumber(response.cardNumber || '')}`);
    lines.push('');
    lines.push(`BATCH #  :        ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`TRACE #  :        ${response.transactionTrace || ''}`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push(`RRN REF #:  ${response.rrn || ''}`);
    lines.push('');
    lines.push(`APP CODE :        ${response.approvalCode || ''}`);
    lines.push('');
    lines.push(`AMOUNT RM     ${this.formatAmount(transactionData.amount || 0)}`);
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Format generic receipt for other transaction types
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {string} Formatted receipt
   */
  formatGenericReceipt(response, transactionData) {
    const lines = [];
    const now = new Date().toLocaleString();
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push('');
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push('');
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    lines.push(`\t${response.responseCode} - ${response.responseCodeDescription || ''}`);
    lines.push('');
    lines.push(`DATE/TIME: ${now}`);
    lines.push('');
    lines.push(`STATUS: ${response.statusDescription || ''}`);
    lines.push('');
    lines.push(`BATCH #  :        ${response.batchNumber || ''}`);
    lines.push('');
    lines.push(`TRACE #  :        ${response.transactionTrace || ''}`);
    lines.push('');
    lines.push(`APP CODE :        ${response.approvalCode || ''}`);
    lines.push('');
    
    if (transactionData.amount) {
      lines.push(`AMOUNT RM     ${this.formatAmount(transactionData.amount)}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Mask card number for display (show only last 4 digits)
   * @param {string} cardNumber - Full card number
   * @returns {string} Masked card number
   */
  maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    const lastFour = cardNumber.slice(-4);
    const masked = '**** **** **** ' + lastFour;
    return masked;
  }

  /**
   * Format amount for display (assumes amount is in cents)
   * @param {number} amount - Amount in cents
   * @returns {string} Formatted amount
   */
  formatAmount(amount) {
    if (typeof amount !== 'number') return '0.00';
    const dollars = Math.abs(amount) / 100;
    return dollars.toFixed(2);
  }

  /**
   * Ensure receipt directory exists
   * @returns {Promise<void>}
   */
  async ensureDirectoryExists() {
    if (!this.fileSystem) {
      throw new Error('File system not initialized');
    }
    
    try {
      const exists = await this.fileSystem.exists(this.receiptPath);
      if (!exists) {
        await this.fileSystem.mkdir(this.receiptPath);
      }
    } catch (error) {
      throw new Error(`Failed to create receipt directory: ${error.message}`);
    }
  }

  /**
   * Write receipt content to file
   * @param {string} filePath - Full file path
   * @param {string} content - Receipt content
   * @returns {Promise<void>}
   */
  async writeReceiptFile(filePath, content) {
    if (!this.fileSystem) {
      throw new Error('File system not initialized');
    }

    try {
      await this.fileSystem.writeFile(filePath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write receipt file: ${error.message}`);
    }
  }

  /**
   * Get all receipt files
   * @returns {Promise<Array>} List of receipt files
   */
  async getReceiptFiles() {
    if (!this.fileSystem) {
      throw new Error('File system not initialized');
    }

    try {
      const exists = await this.fileSystem.exists(this.receiptPath);
      if (!exists) {
        return [];
      }

      const files = await this.fileSystem.readDir(this.receiptPath);
      return files.filter(file => file.name.endsWith('.TXT'));
    } catch (error) {
      throw new Error(`Failed to read receipt files: ${error.message}`);
    }
  }

  /**
   * Read receipt file content
   * @param {string} fileName - Receipt file name
   * @returns {Promise<string>} Receipt content
   */
  async readReceiptFile(fileName) {
    if (!this.fileSystem) {
      throw new Error('File system not initialized');
    }

    try {
      const filePath = this.receiptPath + fileName;
      return await this.fileSystem.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read receipt file: ${error.message}`);
    }
  }

  /**
   * Delete receipt file
   * @param {string} fileName - Receipt file name
   * @returns {Promise<void>}
   */
  async deleteReceiptFile(fileName) {
    if (!this.fileSystem) {
      throw new Error('File system not initialized');
    }

    try {
      const filePath = this.receiptPath + fileName;
      await this.fileSystem.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete receipt file: ${error.message}`);
    }
  }
}

export default ReceiptService;