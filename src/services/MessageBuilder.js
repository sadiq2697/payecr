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

    // Additional QR code validation
    if (qrCode) {
      if (qrCode.length === 0) {
        throw new Error('QR code cannot be empty string. Use undefined or null for no QR code.');
      }
      if (qrCode.length > 9999) {
        throw new Error('QR code too long. Maximum length is 9999 characters.');
      }
      console.log(`Building wallet sale with QR data: ID=${qrCodeId}, Length=${qrCode.length}, Data=${qrCode.substring(0, 100)}...`);
    } else {
      console.log(`Building wallet sale without QR data - terminal will activate scanner`);
    }

    // Receipt control as separate field
    const receiptFlag = printReceipt ? '1' : '0';

    const qrData = qrCode
      ? qrCodeId.padStart(2, '0') + qrCode.length.toString().padStart(FIELD_LENGTHS.QR_DATA_LENGTH, '0') + qrCode
      : qrCodeId.padStart(2, '0') + '0000';

    console.log(`QR Data formatted: ${qrData.substring(0, 50)}...`);

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

  // ===== Missing ECR Commands from C# Implementation =====

  /**
   * Build Pre-Authorization Parking command (C101)
   */
  buildPreAuthParkingCommand(hostNo, amount, additionalData = '', printReceipt = false) {
    this._validateAmount(amount, 'PreAuth Parking');
    this._validateHostNumber(hostNo, 'PreAuth Parking');
    this._validateAdditionalData(additionalData, 'PreAuth Parking');

    const receiptFlag = printReceipt ? '1' : '0';

    return this.wrapMessage(
      COMMANDS.PREAUTH_PARKING +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      this.padAdditionalData(additionalData) +
      receiptFlag
    );
  }

  /**
   * Build Cash Back command (C205)
   */
  buildCashBackCommand(hostNo, amount, additionalData = '') {
    this._validateAmount(amount, 'Cash Back');
    this._validateHostNumber(hostNo, 'Cash Back');
    this._validateAdditionalData(additionalData, 'Cash Back');

    return this.wrapMessage(
      COMMANDS.CASH_BACK +
      this.padHostNumber(hostNo) +
      this.padAmount(amount) +
      this.padAdditionalData(additionalData)
    );
  }

  /**
   * Build Sale Completion command (C230)
   */
  buildSaleCompletionCommand(hostNo, approvalCode, additionalData = '') {
    this._validateHostNumber(hostNo, 'Sale Completion');
    this._validateAdditionalData(additionalData, 'Sale Completion');
    
    if (!approvalCode || approvalCode.length !== 6) {
      throw new Error('Invalid approval code for Sale Completion. Must be 6 characters.');
    }

    return this.wrapMessage(
      COMMANDS.SALE_COMPLETION +
      this.padHostNumber(hostNo) +
      approvalCode.padStart(6, '0') +
      this.padAdditionalData(additionalData)
    );
  }

  /**
   * Build Point Enquiry command (C241)
   */
  buildPointEnquiryCommand() {
    return this.wrapMessage(COMMANDS.POINT_ENQUIRY);
  }

  /**
   * Build Instant Reward command (C242)
   */
  buildInstantRewardCommand(amount) {
    this._validateAmount(amount, 'Instant Reward');
    return this.wrapMessage(COMMANDS.INSTANT_REWARD + this.padAmount(amount));
  }

  /**
   * Build Point Redemption command (C243)
   */
  buildPointRedemptionCommand(points) {
    if (!Number.isInteger(points) || points <= 0) {
      throw new Error('Invalid points for Point Redemption. Must be positive integer.');
    }
    return this.wrapMessage(COMMANDS.POINT_REDEMPTION + points.toString().padStart(12, '0'));
  }

  /**
   * Build Value Redemption command (C244)
   */
  buildValueRedemptionCommand(amount) {
    this._validateAmount(amount, 'Value Redemption');
    return this.wrapMessage(COMMANDS.VALUE_REDEMPTION + this.padAmount(amount));
  }

  /**
   * Build Gift Redemption command (C245)
   */
  buildGiftRedemptionCommand(giftCode, quantity) {
    if (!giftCode || typeof giftCode !== 'string') {
      throw new Error('Invalid gift code for Gift Redemption.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid quantity for Gift Redemption. Must be positive integer.');
    }

    return this.wrapMessage(
      COMMANDS.GIFT_REDEMPTION +
      giftCode.padEnd(12, ' ') +
      quantity.toString().padStart(12, '0')
    );
  }

  /**
   * Build Hot Deal command (C246)
   */
  buildHotDealCommand(giftCode, quantity) {
    if (!giftCode || typeof giftCode !== 'string') {
      throw new Error('Invalid gift code for Hot Deal.');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Invalid quantity for Hot Deal. Must be positive integer.');
    }

    return this.wrapMessage(
      COMMANDS.HOT_DEAL +
      giftCode.padEnd(12, ' ') +
      quantity.toString().padStart(12, '0')
    );
  }

  /**
   * Build OTSR Redemption command (C275)
   */
  buildOTSRRedemptionCommand(amount) {
    this._validateAmount(amount, 'OTSR Redemption');
    return this.wrapMessage(COMMANDS.OTSR_REDEMPTION + this.padAmount(amount));
  }

  /**
   * Build OTSR Enquiry command (C276)
   */
  buildOTSREnquiryCommand() {
    return this.wrapMessage(COMMANDS.OTSR_ENQUIRY);
  }

  /**
   * Build Read MyKad command (C610)
   */
  buildReadMyKadCommand() {
    return this.wrapMessage(COMMANDS.READ_MYKAD);
  }

  /**
   * Build PIN Entry command (C700)
   */
  buildPINEntryCommand(cardNumber, sessionKey) {
    if (!cardNumber || cardNumber.length !== 19) {
      throw new Error('Invalid card number for PIN Entry. Must be 19 digits.');
    }
    if (!sessionKey || typeof sessionKey !== 'string') {
      throw new Error('Invalid session key for PIN Entry.');
    }

    return this.wrapMessage(
      COMMANDS.PIN_ENTRY +
      cardNumber.padStart(19, '0') +
      sessionKey
    );
  }

  /**
   * Build Genting Card command (C800)
   */
  buildGentingCardCommand() {
    return this.wrapMessage(COMMANDS.GENTING_CARD);
  }

  /**
   * Build Get TID/MID command (C904)
   */
  buildGetTIDMIDCommand() {
    return this.wrapMessage(COMMANDS.GET_TID_MID);
  }

  /**
   * Build Get Token command (C911)
   */
  buildGetTokenCommand() {
    return this.wrapMessage(COMMANDS.GET_TOKEN);
  }

  /**
   * Build MiFare command (C912)
   */
  buildMiFareCommand() {
    return this.wrapMessage(COMMANDS.MIFARE);
  }

  /**
   * Build Loyalty Void command (C342)
   */
  buildLoyaltyVoidCommand(voidType, hostNo, traceNumber, additionalData = '') {
    this._validateHostNumber(hostNo, 'Loyalty Void');
    this._validateAdditionalData(additionalData, 'Loyalty Void');
    
    if (!traceNumber || !/^[0-9]{1,6}$/.test(traceNumber)) {
      throw new Error('Invalid trace number for Loyalty Void. Must be 1-6 digits.');
    }
    
    if (!['instant_reward', 'point_redemption', 'value_redemption', 'gift_redemption', 'hot_deal'].includes(voidType)) {
      throw new Error('Invalid void type. Must be one of: instant_reward, point_redemption, value_redemption, gift_redemption, hot_deal');
    }

    return this.wrapMessage(
      COMMANDS.LOYALTY_VOID +
      this.padHostNumber(hostNo) +
      traceNumber.padStart(6, '0') +
      this.padAdditionalData(additionalData)
    );
  }

  /**
   * Build Set Time command (C921)
   */
  buildSetTimeCommand(dateTime) {
    // Format: YYYYMMDDHHMMSS
    if (!dateTime || dateTime.length !== 14) {
      // Use current time if not provided
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const hour = now.getHours().toString().padStart(2, '0');
      const minute = now.getMinutes().toString().padStart(2, '0');
      const second = now.getSeconds().toString().padStart(2, '0');
      dateTime = year + month + day + hour + minute + second;
    }

    return this.wrapMessage(COMMANDS.SET_TIME + dateTime);
  }

  /**
   * Build QR Pay Requery command (C208) - Enhanced implementation
   */
  buildQRPayRequeryCommand(transactionId) {
    if (!transactionId || typeof transactionId !== 'string') {
      throw new Error('Invalid transaction ID for QR Pay Requery.');
    }

    return this.wrapMessage(
      COMMANDS.TRANSACTION_STATUS +
      transactionId.padEnd(FIELD_LENGTHS.ADDITIONAL_DATA, ' ')
    );
  }

  /**
   * Enhanced Wallet Sale with car park mode support
   */
  buildWalletSaleCommandWithCarPark(hostNo, amount, qrCodeId, qrCode = '', additionalData = '', printReceipt = false, isCarPark = false) {
    const command = this.buildWalletSaleCommand(hostNo, amount, qrCodeId, qrCode, additionalData, printReceipt);
    
    // Car park mode will be handled in ECRService with automatic completion
    return command;
  }

  /**
   * Build command for MiFare with car park support (matches C# CarPark mode)
   */
  buildMiFareCommandWithCarPark() {
    return this.wrapMessage(COMMANDS.MIFARE);
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
      [COMMANDS.PREAUTH_PARKING]: 'Pre-Authorization Parking',
      [COMMANDS.CASH_BACK]: 'Cash Back',
      [COMMANDS.ADJUST]: 'Adjustment',
      [COMMANDS.SALE_COMPLETION]: 'Sale Completion',
      [COMMANDS.POINT_ENQUIRY]: 'Point Enquiry',
      [COMMANDS.INSTANT_REWARD]: 'Instant Reward',
      [COMMANDS.POINT_REDEMPTION]: 'Point Redemption',
      [COMMANDS.VALUE_REDEMPTION]: 'Value Redemption',
      [COMMANDS.GIFT_REDEMPTION]: 'Gift Redemption',
      [COMMANDS.HOT_DEAL]: 'Hot Deal',
      [COMMANDS.OTSR_REDEMPTION]: 'OTSR Redemption',
      [COMMANDS.OTSR_ENQUIRY]: 'OTSR Enquiry',
      [COMMANDS.WALLET_SALE]: 'Wallet Sale',
      [COMMANDS.WALLET_REFUND]: 'Wallet Refund',
      [COMMANDS.READ_MYKAD]: 'Read MyKad',
      [COMMANDS.PIN_ENTRY]: 'PIN Entry',
      [COMMANDS.GENTING_CARD]: 'Genting Card',
      [COMMANDS.SETTLEMENT]: 'Settlement',
      [COMMANDS.ECHO_TEST]: 'Echo Test',
      [COMMANDS.GET_TID_MID]: 'Get TID/MID',
      [COMMANDS.SCAN_QR]: 'Scan QR Code',
      [COMMANDS.READ_CARD]: 'Read Card',
      [COMMANDS.GET_TOKEN]: 'Get Token',
      [COMMANDS.MIFARE]: 'MiFare',
      [COMMANDS.LOYALTY_VOID]: 'Loyalty Void',
      [COMMANDS.SET_TIME]: 'Set Time'
    };
    
    return descriptions[commandCode] || `Unknown Command: ${commandCode}`;
  }
}