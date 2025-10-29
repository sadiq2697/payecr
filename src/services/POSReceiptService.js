import { ECR_CONSTANTS } from '../utils/Constants';

/**
 * POS Receipt Printer Service
 * Generates formatted receipts for thermal/POS printers
 * Based on C# ECRip.cs receipt formatting but optimized for POS printing
 */
export class POSReceiptService {
  constructor() {
    this.printerWidth = 32; // Standard thermal printer width (32 characters)
    this.merchantInfo = {
      name: 'MERCHANT NAME',
      address1: '123 Main Street',
      address2: 'City, State 12345',
      phone: 'Tel: (555) 123-4567'
    };
  }

  /**
   * Set merchant information for receipts
   * @param {Object} merchantInfo - Merchant details
   */
  setMerchantInfo(merchantInfo) {
    this.merchantInfo = { ...this.merchantInfo, ...merchantInfo };
  }

  /**
   * Generate POS receipt format for successful transaction
   * @param {Object} response - Parsed transaction response
   * @param {Object} transactionData - Original transaction data
   * @returns {Object} Receipt data for POS printer
   */
  generatePOSReceipt(response, transactionData) {
    if (!response.success || !response.isApproved) {
      return {
        success: false,
        message: 'Receipt not generated - transaction not approved',
        receiptData: null
      };
    }

    try {
      const receiptData = this.formatPOSReceipt(response, transactionData);
      
      return {
        success: true,
        message: 'Receipt generated successfully',
        receiptData: receiptData,
        printCommands: this.generatePrintCommands(receiptData)
      };
    } catch (error) {
      return {
        success: false,
        message: `Receipt generation failed: ${error.message}`,
        receiptData: null
      };
    }
  }

  /**
   * Format receipt for POS printer based on transaction type
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {Object} Formatted receipt data
   */
  formatPOSReceipt(response, transactionData) {
    const receiptData = {
      header: this.formatHeader(),
      transactionDetails: this.formatTransactionDetails(response, transactionData),
      footer: this.formatFooter(),
      rawText: ''
    };

    // Combine all sections
    receiptData.rawText = [
      ...receiptData.header,
      '',
      ...receiptData.transactionDetails,
      '',
      ...receiptData.footer
    ].join('\n');

    return receiptData;
  }

  /**
   * Format receipt header with merchant info
   * @returns {Array} Header lines
   */
  formatHeader() {
    const lines = [];
    
    // Center merchant name
    lines.push(this.centerText(this.merchantInfo.name));
    lines.push(this.centerText(this.merchantInfo.address1));
    lines.push(this.centerText(this.merchantInfo.address2));
    lines.push(this.centerText(this.merchantInfo.phone));
    lines.push(this.printLine('-'));
    
    return lines;
  }

  /**
   * Format transaction details based on response type
   * @param {Object} response - Parsed response
   * @param {Object} transactionData - Original transaction data
   * @returns {Array} Transaction detail lines
   */
  formatTransactionDetails(response, transactionData) {
    const responseCode = response.responseCode;
    
    switch (responseCode) {
      case ECR_CONSTANTS.RESPONSES.SALE:
        return this.formatSaleDetails(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.WALLET_SALE:
        return this.formatWalletSaleDetails(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.VOID:
        return this.formatVoidDetails(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.REFUND:
        return this.formatRefundDetails(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.WALLET_REFUND:
        return this.formatWalletRefundDetails(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.SETTLEMENT:
        return this.formatSettlementDetails(response, transactionData);
      case ECR_CONSTANTS.RESPONSES.PREAUTH:
      case ECR_CONSTANTS.RESPONSES.PREAUTH_PARKING:
        return this.formatPreAuthDetails(response, transactionData);
      default:
        return this.formatGenericDetails(response, transactionData);
    }
  }

  /**
   * Format sale transaction details (R200)
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatSaleDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    
    lines.push(this.centerText('** SALE RECEIPT **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    // Card information
    if (response.cardNumber) {
      lines.push(`Card: ${this.maskCardNumber(response.cardNumber)}`);
    }
    if (response.cardType) {
      lines.push(`Type: ${response.cardTypeDescription || response.cardType}`);
    }
    if (response.cardholderName) {
      lines.push(`Name: ${response.cardholderName}`);
    }
    lines.push('');
    
    // Transaction details
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    
    if (response.batchNumber) {
      lines.push(`BATCH #: ${response.batchNumber}`);
    }
    if (response.transactionTrace) {
      lines.push(`TRACE #: ${response.transactionTrace}`);
    }
    if (response.rrn) {
      lines.push(`RRN: ${response.rrn}`);
    }
    if (response.approvalCode) {
      lines.push(`AUTH: ${response.approvalCode}`);
    }
    lines.push('');
    
    // Amount
    const amount = this.formatAmount(transactionData.amount || 0);
    lines.push(this.rightAlign(`AMOUNT: RM ${amount}`));
    lines.push(this.printLine('='));
    lines.push(this.rightAlign(`TOTAL: RM ${amount}`));
    
    // Status
    lines.push('');
    lines.push(this.centerText('** APPROVED **'));
    
    return lines;
  }

  /**
   * Format wallet sale details (R290)
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatWalletSaleDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    
    lines.push(this.centerText('** WALLET SALE **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    // Wallet information
    if (response.partnerTrxId) {
      lines.push(`Partner ID: ${response.partnerTrxId}`);
    }
    if (response.alipayTrxId) {
      lines.push(`Alipay ID: ${response.alipayTrxId}`);
    }
    if (response.customerId) {
      lines.push(`Customer: ${response.customerId}`);
    }
    lines.push('');
    
    // Transaction details
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    
    if (response.batchNumber) {
      lines.push(`BATCH #: ${response.batchNumber}`);
    }
    if (response.transactionTrace) {
      lines.push(`TRACE #: ${response.transactionTrace}`);
    }
    if (response.approvalCode) {
      lines.push(`AUTH: ${response.approvalCode}`);
    }
    lines.push('');
    
    // Amount
    const amount = this.formatAmount(transactionData.amount || 0);
    lines.push(this.rightAlign(`AMOUNT: RM ${amount}`));
    lines.push(this.printLine('='));
    lines.push(this.rightAlign(`TOTAL: RM ${amount}`));
    
    // Status
    lines.push('');
    lines.push(this.centerText('** APPROVED **'));
    
    return lines;
  }

  /**
   * Format void transaction details (R201)
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatVoidDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    
    lines.push(this.centerText('** VOID RECEIPT **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    // Transaction details
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    
    if (response.batchNumber) {
      lines.push(`BATCH #: ${response.batchNumber}`);
    }
    if (response.transactionTrace) {
      lines.push(`TRACE #: ${response.transactionTrace}`);
    }
    if (response.rrn) {
      lines.push(`RRN: ${response.rrn}`);
    }
    if (response.approvalCode) {
      lines.push(`AUTH: ${response.approvalCode}`);
    }
    lines.push('');
    
    // Amount (negative for void)
    const amount = this.formatAmount(transactionData.amount || 0);
    lines.push(this.rightAlign(`VOID AMT: -RM ${amount}`));
    
    // Status
    lines.push('');
    lines.push(this.centerText('** VOID APPROVED **'));
    
    return lines;
  }

  /**
   * Format refund transaction details (R203)
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatRefundDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    
    lines.push(this.centerText('** REFUND RECEIPT **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    // Card information
    if (response.cardNumber) {
      lines.push(`Card: ${this.maskCardNumber(response.cardNumber)}`);
    }
    lines.push('');
    
    // Transaction details
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    
    if (response.batchNumber) {
      lines.push(`BATCH #: ${response.batchNumber}`);
    }
    if (response.transactionTrace) {
      lines.push(`TRACE #: ${response.transactionTrace}`);
    }
    if (response.rrn) {
      lines.push(`RRN: ${response.rrn}`);
    }
    if (response.approvalCode) {
      lines.push(`AUTH: ${response.approvalCode}`);
    }
    lines.push('');
    
    // Amounts
    if (transactionData.originalAmount) {
      const originalAmount = this.formatAmount(transactionData.originalAmount);
      lines.push(`ORIG AMT: RM ${originalAmount}`);
    }
    
    const refundAmount = this.formatAmount(transactionData.amount || 0);
    lines.push(this.rightAlign(`REFUND: RM ${refundAmount}`));
    
    // Status
    lines.push('');
    lines.push(this.centerText('** REFUND APPROVED **'));
    
    return lines;
  }

  /**
   * Format settlement details (R500)
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatSettlementDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    
    lines.push(this.centerText('** SETTLEMENT **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    lines.push(`HOST: ${response.hostNo || '00'}`);
    if (response.batchNumber) {
      lines.push(`BATCH #: ${response.batchNumber}`);
    }
    lines.push('');
    
    // Settlement totals
    if (response.totalSalesCount) {
      lines.push(`SALES COUNT: ${response.totalSalesCount}`);
    }
    if (response.totalSalesAmount) {
      lines.push(`SALES AMT: RM ${this.formatAmount(parseInt(response.totalSalesAmount) || 0)}`);
    }
    if (response.totalRefundsCount) {
      lines.push(`REFUND COUNT: ${response.totalRefundsCount}`);
    }
    if (response.totalRefundsAmount) {
      lines.push(`REFUND AMT: RM ${this.formatAmount(parseInt(response.totalRefundsAmount) || 0)}`);
    }
    if (response.netAmount) {
      lines.push(this.printLine('-'));
      lines.push(this.rightAlign(`NET AMT: RM ${this.formatAmount(parseInt(response.netAmount) || 0)}`));
    }
    
    lines.push('');
    lines.push(this.centerText('** SETTLED **'));
    
    return lines;
  }

  /**
   * Format pre-authorization details
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatPreAuthDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    const isParking = response.responseCode === ECR_CONSTANTS.RESPONSES.PREAUTH_PARKING;
    
    lines.push(this.centerText(isParking ? '** PARKING PREAUTH **' : '** PRE-AUTHORIZATION **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    // Card information
    if (response.cardNumber) {
      lines.push(`Card: ${this.maskCardNumber(response.cardNumber)}`);
    }
    lines.push('');
    
    // Transaction details
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    
    if (response.batchNumber) {
      lines.push(`BATCH #: ${response.batchNumber}`);
    }
    if (response.transactionTrace) {
      lines.push(`TRACE #: ${response.transactionTrace}`);
    }
    if (response.approvalCode) {
      lines.push(`AUTH: ${response.approvalCode}`);
    }
    lines.push('');
    
    // Amount
    const amount = this.formatAmount(transactionData.amount || 0);
    lines.push(this.rightAlign(`PREAUTH: RM ${amount}`));
    
    // Status
    lines.push('');
    lines.push(this.centerText('** APPROVED **'));
    
    if (isParking) {
      lines.push('');
      lines.push(this.centerText('Present receipt for exit'));
    }
    
    return lines;
  }

  /**
   * Format wallet refund details (R292)
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatWalletRefundDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    
    lines.push(this.centerText('** WALLET REFUND **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    // Wallet information
    if (response.partnerTrxId) {
      lines.push(`Partner ID: ${response.partnerTrxId}`);
    }
    if (response.customerId) {
      lines.push(`Customer: ${response.customerId}`);
    }
    lines.push('');
    
    // Transaction details
    lines.push(`HOST: ${response.hostNo || '00'}`);
    lines.push(`TID: ${response.terminalId || ''}`);
    lines.push(`MID: ${response.merchantId || ''}`);
    lines.push('');
    
    if (response.approvalCode) {
      lines.push(`AUTH: ${response.approvalCode}`);
    }
    lines.push('');
    
    // Amounts
    if (transactionData.originalAmount) {
      const originalAmount = this.formatAmount(transactionData.originalAmount);
      lines.push(`ORIG AMT: RM ${originalAmount}`);
    }
    
    const refundAmount = this.formatAmount(transactionData.amount || 0);
    lines.push(this.rightAlign(`REFUND: RM ${refundAmount}`));
    
    // Status
    lines.push('');
    lines.push(this.centerText('** REFUND APPROVED **'));
    
    return lines;
  }

  /**
   * Format generic transaction details
   * @param {Object} response - Response data
   * @param {Object} transactionData - Transaction data
   * @returns {Array} Formatted lines
   */
  formatGenericDetails(response, transactionData) {
    const lines = [];
    const now = new Date();
    
    lines.push(this.centerText('** TRANSACTION RECEIPT **'));
    lines.push('');
    lines.push(`Date: ${this.formatDate(now)}`);
    lines.push(`Time: ${this.formatTime(now)}`);
    lines.push('');
    
    lines.push(`TYPE: ${response.responseCodeDescription || response.responseCode}`);
    lines.push(`HOST: ${response.hostNo || '00'}`);
    
    if (response.terminalId) {
      lines.push(`TID: ${response.terminalId}`);
    }
    if (response.merchantId) {
      lines.push(`MID: ${response.merchantId}`);
    }
    lines.push('');
    
    if (response.approvalCode) {
      lines.push(`AUTH: ${response.approvalCode}`);
    }
    lines.push('');
    
    lines.push(`STATUS: ${response.statusDescription || response.statusCode}`);
    
    return lines;
  }

  /**
   * Format receipt footer
   * @returns {Array} Footer lines
   */
  formatFooter() {
    const lines = [];
    
    lines.push(this.printLine('-'));
    lines.push(this.centerText('Thank You!'));
    lines.push(this.centerText('Please Keep This Receipt'));
    lines.push('');
    lines.push('');
    lines.push('');
    
    return lines;
  }

  // ===== Utility Methods =====

  /**
   * Center text within printer width
   * @param {string} text - Text to center
   * @returns {string} Centered text
   */
  centerText(text) {
    if (text.length >= this.printerWidth) return text;
    const padding = Math.floor((this.printerWidth - text.length) / 2);
    return ' '.repeat(padding) + text;
  }

  /**
   * Right align text within printer width
   * @param {string} text - Text to align
   * @returns {string} Right aligned text
   */
  rightAlign(text) {
    if (text.length >= this.printerWidth) return text;
    const padding = this.printerWidth - text.length;
    return ' '.repeat(padding) + text;
  }

  /**
   * Create a line of characters
   * @param {string} char - Character to repeat
   * @returns {string} Line of characters
   */
  printLine(char = '-') {
    return char.repeat(this.printerWidth);
  }

  /**
   * Mask card number for display
   * @param {string} cardNumber - Full card number
   * @returns {string} Masked card number
   */
  maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    const lastFour = cardNumber.slice(-4);
    return `**** **** **** ${lastFour}`;
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
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date
   */
  formatDate(date) {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Format time for display
   * @param {Date} date - Date object
   * @returns {string} Formatted time
   */
  formatTime(date) {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Generate ESC/POS print commands (basic implementation)
   * @param {Object} receiptData - Receipt data
   * @returns {Array} Print commands for ESC/POS
   */
  generatePrintCommands(receiptData) {
    const commands = [];
    
    // Initialize printer
    commands.push('\x1B\x40'); // ESC @ - Initialize printer
    
    // Set character set
    commands.push('\x1B\x74\x00'); // ESC t 0 - Character set
    
    // Receipt content
    commands.push(receiptData.rawText);
    
    // Feed and cut
    commands.push('\x1D\x56\x41\x03'); // GS V A - Cut paper
    
    return commands;
  }
}

export default POSReceiptService;