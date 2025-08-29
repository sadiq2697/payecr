// MessageBuilder.js 

import { ECR_CONSTANTS } from '../utils/Constants';
import { LRCCalculator } from './LRCCalculator';

// Destructure constants for cleaner usage
const {
  COMMANDS,
  FIELD_LENGTHS,
  HOST_NUMBERS,
  QR_CODE_IDS,
  CONTROL_CHARS: { STX, ETX, ENQ, ACK, NAK, EOT }
} = ECR_CONSTANTS;

export class MessageBuilder {
  buildSaleCommand(hostNo, amount, additionalData = '', printReceipt = false) {
    this._validateAmount(amount, 'Sale');
    this._validateHostNumber(hostNo, 'Sale');
    this._validateAdditionalData(additionalData, 'Sale');

    // Receipt control as separate field
    const receiptFlag = printReceipt ? '1' : '0';

    return this.wrapMessage(
      COMMANDS.SALE +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      this.padAdditionalData(additionalData) +
      receiptFlag
    );
  }

  buildVoidCommand(hostNo, traceNumber, amount) {
    this._validateAmount(amount, 'Void', true);
    this._validateHostNumber(hostNo, 'Void');
    if (!/^[0-9]{6}$/.test(traceNumber)) {
      throw new Error(`Invalid traceNumber for Void. Must be 6 digits. Got: ${traceNumber}`);
    }

    return this.wrapMessage(
      COMMANDS.VOID +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      traceNumber.padStart(6, '0')
    );
  }

  buildRefundCommand(hostNo, amount, originalAmount, additionalData = '', printReceipt = false) {
    this._validateAmount(amount, 'Refund');
    this._validateAmount(originalAmount, 'Refund Original Amount');
    this._validateHostNumber(hostNo, 'Refund');
    this._validateAdditionalData(additionalData, 'Refund');

    // Receipt control as separate field
    const receiptFlag = printReceipt ? '1' : '0';

    return this.wrapMessage(
      COMMANDS.REFUND +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      this.padAmount(originalAmount) +
      this.padAdditionalData(additionalData) +
      receiptFlag
    );
  }

  buildPreAuthCommand(hostNo, amount, additionalData = '', printReceipt = false) {
    this._validateAmount(amount, 'PreAuth');
    this._validateHostNumber(hostNo, 'PreAuth');
    this._validateAdditionalData(additionalData, 'PreAuth');

    // Receipt control as separate field
    const receiptFlag = printReceipt ? '1' : '0';

    return this.wrapMessage(
      COMMANDS.PREAUTH +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      this.padAdditionalData(additionalData) +
      receiptFlag
    );
  }

  buildSettlementCommand(hostNo) {
    this._validateHostNumber(hostNo, 'Settlement');
    return this.wrapMessage(COMMANDS.SETTLEMENT + this.padHostNumber(hostNo));
  }

  buildEchoTestCommand() {
    return this.wrapMessage(COMMANDS.ECHO_TEST);
  }

  buildWalletSaleCommand(hostNo, amount, qrCodeId, qrCode = '', additionalData = '', printReceipt = false) {
    this._validateAmount(amount, 'Wallet Sale');
    this._validateHostNumber(hostNo, 'Wallet Sale');
    this._validateAdditionalData(additionalData, 'Wallet Sale');

    if (!Object.values(QR_CODE_IDS).includes(qrCodeId)) {
      throw new Error(`Invalid qrCodeId. Must be one of ${Object.values(QR_CODE_IDS).join(', ')}.`);
    }
    if (qrCode && typeof qrCode !== 'string') {
      throw new Error(`Invalid qrCode. Must be a string.`);
    }

    // Receipt control as separate field
    const receiptFlag = printReceipt ? '1' : '0';

    const qrData = qrCode
      ? qrCodeId.padStart(2, '0') + qrCode.length.toString().padStart(FIELD_LENGTHS.QR_DATA_LENGTH, '0') + qrCode
      : qrCodeId.padStart(2, '0') + '0000';

    return this.wrapMessage(
      COMMANDS.WALLET_SALE +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      qrData +
      this.padAdditionalData(additionalData) +
      receiptFlag
    );
  }

  buildReadCardCommand() {
    return this.wrapMessage(COMMANDS.READ_CARD);
  }

  buildTransactionStatusCommand(uniqueId, originalAmount = 0, printReceipt = false) {
    if (!uniqueId.startsWith('TT')) {
      throw new Error(`Invalid uniqueId. Must start with "TT".`);
    }
    this._validateAmount(originalAmount, 'Transaction Status Original Amount', true);
    if (typeof printReceipt !== 'boolean') {
      throw new Error(`Invalid printReceipt. Must be boolean.`);
    }

    return this.wrapMessage(
      COMMANDS.TRANSACTION_STATUS +
      uniqueId.padEnd(FIELD_LENGTHS.ADDITIONAL_DATA, ' ') +
      this.padAmount(originalAmount) +
      (printReceipt ? '1' : '0')
    );
  }


  // ===== Enhanced QR and Wallet Commands =====

  buildWalletRefundCommand(hostNo, amount, originalAmount, qrCodeId, additionalData = '', printReceipt = false) {
    this._validateAmount(amount, 'Wallet Refund');
    this._validateAmount(originalAmount, 'Wallet Refund Original Amount');
    this._validateHostNumber(hostNo, 'Wallet Refund');
    this._validateAdditionalData(additionalData, 'Wallet Refund');

    if (!Object.values(QR_CODE_IDS).includes(qrCodeId)) {
      throw new Error(`Invalid qrCodeId. Must be one of ${Object.values(QR_CODE_IDS).join(', ')}.`);
    }

    // Receipt control as separate field
    const receiptFlag = printReceipt ? '1' : '0';

    return this.wrapMessage(
      COMMANDS.WALLET_REFUND +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      this.padAmount(originalAmount) +
      qrCodeId.padStart(2, '0') +
      this.padAdditionalData(additionalData) +
      receiptFlag
    );
  }

  buildScanQRCommand() {
    return this.wrapMessage(COMMANDS.SCAN_QR);
  }

  // ===== Cash Advance Commands =====

  buildCashAdvanceCommand(hostNo, amount, additionalData = '') {
    this._validateAmount(amount, 'Cash Advance');
    this._validateHostNumber(hostNo, 'Cash Advance');
    this._validateAdditionalData(additionalData, 'Cash Advance');

    return this.wrapMessage(
      COMMANDS.CASH_ADVANCE +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      this.padAdditionalData(additionalData)
    );
  }

  buildSaleWithCashCommand(hostNo, saleAmount, cashAmount, additionalData = '') {
    this._validateAmount(saleAmount, 'Sale with Cash - Sale Amount');
    this._validateAmount(cashAmount, 'Sale with Cash - Cash Amount');
    this._validateHostNumber(hostNo, 'Sale with Cash');
    this._validateAdditionalData(additionalData, 'Sale with Cash');

    return this.wrapMessage(
      COMMANDS.SALE_WITH_CASH +
      this.padHostNumber(hostNo) +
      this.padAmount(saleAmount) +
      this.padAmount(cashAmount) +
      this.padAdditionalData(additionalData)
    );
  }

  buildAdjustCommand(hostNo, originalAmount, adjustedAmount, traceNumber) {
    this._validateAmount(originalAmount, 'Adjust Original Amount');
    this._validateAmount(adjustedAmount, 'Adjust New Amount');
    this._validateHostNumber(hostNo, 'Adjust');
    if (!/^[0-9]{6}$/.test(traceNumber)) {
      throw new Error(`Invalid traceNumber for Adjust. Must be 6 digits.`);
    }

    return this.wrapMessage(
      COMMANDS.ADJUST +
      this.padHostNumber(hostNo) +
      this.padAmount(originalAmount) +
      this.padAmount(adjustedAmount) +
      traceNumber.padStart(6, '0')
    );
  }

  // ===== Helpers =====

  wrapMessage(message) {
    const withEtx = message + ETX;
    const lrc = LRCCalculator.calculate(withEtx);
    return STX + withEtx + String.fromCharCode(lrc);
  }

  padHostNumber(hostNo) {
    // Handle special host numbers and numeric ones
    if (Object.values(HOST_NUMBERS).includes(hostNo)) {
      return hostNo; // CP, QR, DN are already correct length
    }
    if (!/^[0-9]{1,2}$/.test(hostNo)) {
      throw new Error(`Invalid host number: ${hostNo}. Must be numeric (00-99) or special (CP, QR, DN).`);
    }
    return hostNo.padStart(FIELD_LENGTHS.HOST_NO, '0');
  }

  padAmount(amount) {
    return amount.toString().padStart(FIELD_LENGTHS.AMOUNT, '0');
  }

  padAdditionalData(data) {
    return data.padEnd(FIELD_LENGTHS.ADDITIONAL_DATA, ' ');
  }

  // Control character creators using destructured constants
  createENQ() { return ENQ; }
  createACK() { return ACK; }
  createNAK() { return NAK; }
  createEOT() { return EOT; }
  createABORT() { return 'ABORT'; }

  getMessageHex(message) { 
    return LRCCalculator.stringToHex(message); 
  }

  // ===== Validation Helpers =====

  _validateAmount(amount, context, allowZero = false) {
    if (!Number.isInteger(amount) || amount < 0 || (!allowZero && amount === 0)) {
      throw new Error(`Invalid ${context} amount. Must be positive integer${allowZero ? ' or zero' : ''}.`);
    }
    if (amount > 999999999999) { // 12 digit limit
      throw new Error(`${context} amount exceeds maximum value (999999999999 cents).`);
    }
  }

  _validateHostNumber(hostNo, context) {
    const validHosts = Object.values(HOST_NUMBERS);
    const isNumericHost = /^[0-9]{1,2}$/.test(hostNo);
    
    if (!validHosts.includes(hostNo) && !isNumericHost) {
      throw new Error(`Invalid host number for ${context}. Must be ${validHosts.join(', ')} or numeric (00-99).`);
    }
  }

  _validateAdditionalData(data, context) {
    if (typeof data !== 'string') {
      throw new Error(`Invalid additional data for ${context}. Must be string.`);
    }
    if (data.length > FIELD_LENGTHS.ADDITIONAL_DATA) {
      throw new Error(`Additional data for ${context} exceeds ${FIELD_LENGTHS.ADDITIONAL_DATA} characters.`);
    }
  }

  _validateTraceNumber(traceNumber, context) {
    if (!/^[0-9]{1,6}$/.test(traceNumber)) {
      throw new Error(`Invalid trace number for ${context}. Must be 1-6 digits.`);
    }
  }

  // ===== Utility Methods =====

  /**
   * Create a complete transaction message with proper formatting
   * @param {string} command - Command code
   * @param {Array} fields - Array of field values
   * @returns {string} Complete message
   */
  createTransactionMessage(command, fields = []) {
    const message = command + fields.join('');
    return this.wrapMessage(message);
  }

  /**
   * Validate QR code data format
   * @param {string} qrCode - QR code data
   * @param {string} qrCodeId - QR code type ID
   * @returns {boolean} True if valid
   */
  validateQRCode(qrCode, qrCodeId) {
    if (!qrCode || typeof qrCode !== 'string') {
      return false;
    }

    // Basic validation based on QR type
    switch (qrCodeId) {
      case QR_CODE_IDS.ALIPAY:
        return qrCode.includes('alipay') || qrCode.length > 10;
      case QR_CODE_IDS.MBB_QRPAY:
        return qrCode.includes('maybank') || qrCode.length > 10;
      case QR_CODE_IDS.GHL_MAH:
        return qrCode.length > 10;
      case QR_CODE_IDS.HLB_GTX:
        return qrCode.length > 10;
      default:
        return qrCode.length > 10;
    }
  }

  /**
   * Get command description for logging
   * @param {string} commandCode - Command code (e.g., 'C200')
   * @returns {string} Human readable description
   */
  getCommandDescription(commandCode) {
    const descriptions = {
      [COMMANDS.SALE]: 'Sale Transaction',
      [COMMANDS.VOID]: 'Void Transaction',
      [COMMANDS.REFUND]: 'Refund Transaction',
      [COMMANDS.PREAUTH]: 'Pre-Authorization',
      [COMMANDS.SETTLEMENT]: 'Settlement',
      [COMMANDS.ECHO_TEST]: 'Echo Test',
      [COMMANDS.WALLET_SALE]: 'Wallet Sale',
      [COMMANDS.WALLET_REFUND]: 'Wallet Refund',
      [COMMANDS.READ_CARD]: 'Read Card',
      [COMMANDS.SCAN_QR]: 'Scan QR Code',
      [COMMANDS.CASH_ADVANCE]: 'Cash Advance',
      [COMMANDS.SALE_WITH_CASH]: 'Sale with Cash',
      [COMMANDS.ADJUST]: 'Adjustment'
    };
    
    return descriptions[commandCode] || `Unknown Command: ${commandCode}`;
  }
}