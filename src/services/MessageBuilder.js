import { ECR_CONSTANTS } from '../utils/Constants';
import { LRCCalculator } from './LRCCalculator';

/**
 * ECR Message Builder
 * Constructs properly formatted ECR command messages
 */
export class MessageBuilder {
  
  /**
   * Build a Sale transaction command (C200)
   * @param {string} hostNo - Host number (2 digits)
   * @param {number} amount - Transaction amount in cents
   * @param {string} additionalData - Additional data (24 chars max)
   * @returns {string} Complete ECR command message
   */
  buildSaleCommand(hostNo, amount, additionalData = '') {
    const command = ECR_CONSTANTS.COMMANDS.SALE;
    const paddedHostNo = this.padHostNumber(hostNo);
    const paddedAmount = this.padAmount(amount);
    const paddedData = this.padAdditionalData(additionalData);
    
    const message = command + paddedHostNo + paddedAmount + paddedData;
    return this.wrapMessage(message);
  }
  
  /**
   * Build a Void transaction command (C201)
   * @param {string} hostNo - Host number (2 digits)
   * @param {string} traceNumber - Original transaction trace number (6 digits)
   * @param {string} additionalData - Additional data (24 chars max)
   * @returns {string} Complete ECR command message
   */
  buildVoidCommand(hostNo, traceNumber, additionalData = '') {
    const command = ECR_CONSTANTS.COMMANDS.VOID;
    const paddedHostNo = this.padHostNumber(hostNo);
    const paddedTrace = traceNumber.toString().padStart(6, '0');
    const paddedData = this.padAdditionalData(additionalData);
    
    const message = command + paddedHostNo + paddedTrace + paddedData;
    return this.wrapMessage(message);
  }
  
  /**
   * Build a Refund transaction command (C203)
   * @param {string} hostNo - Host number (2 digits)
   * @param {number} amount - Refund amount in cents
   * @param {number} originalAmount - Original transaction amount in cents
   * @param {string} additionalData - Additional data (24 chars max)
   * @returns {string} Complete ECR command message
   */
  buildRefundCommand(hostNo, amount, originalAmount, additionalData = '') {
    const command = ECR_CONSTANTS.COMMANDS.REFUND;
    const paddedHostNo = this.padHostNumber(hostNo);
    const paddedAmount = this.padAmount(amount);
    const paddedOrigAmount = this.padAmount(originalAmount);
    const paddedData = this.padAdditionalData(additionalData);
    
    const message = command + paddedHostNo + paddedAmount + paddedOrigAmount + paddedData;
    return this.wrapMessage(message);
  }
  
  /**
   * Build a PreAuth transaction command (C100)
   * @param {string} hostNo - Host number (2 digits)
   * @param {number} amount - Authorization amount in cents
   * @param {string} additionalData - Additional data (24 chars max)
   * @returns {string} Complete ECR command message
   */
  buildPreAuthCommand(hostNo, amount, additionalData = '') {
    const command = ECR_CONSTANTS.COMMANDS.PREAUTH;
    const paddedHostNo = this.padHostNumber(hostNo);
    const paddedAmount = this.padAmount(amount);
    const paddedData = this.padAdditionalData(additionalData);
    
    const message = command + paddedHostNo + paddedAmount + paddedData;
    return this.wrapMessage(message);
  }
  
  /**
   * Build a Settlement command (C500)
   * @param {string} hostNo - Host number (2 digits)
   * @returns {string} Complete ECR command message
   */
  buildSettlementCommand(hostNo) {
    const command = ECR_CONSTANTS.COMMANDS.SETTLEMENT;
    const paddedHostNo = this.padHostNumber(hostNo);
    
    const message = command + paddedHostNo;
    return this.wrapMessage(message);
  }
  
  /**
   * Build an Echo Test command (C902)
   * @returns {string} Complete ECR command message
   */
  buildEchoTestCommand() {
    const command = ECR_CONSTANTS.COMMANDS.ECHO_TEST;
    return this.wrapMessage(command);
  }
  
  /**
   * Build a QR/Wallet Sale command (C290)
   * @param {string} hostNo - Host number (2 digits)
   * @param {number} amount - Transaction amount in cents
   * @param {string} qrCodeId - QR Code ID (2 digits)
   * @param {string} qrCode - QR Code data
   * @param {string} additionalData - Additional data (24 chars max)
   * @returns {string} Complete ECR command message
   */
  buildWalletSaleCommand(hostNo, amount, qrCodeId, qrCode = '', additionalData = '') {
    const command = ECR_CONSTANTS.COMMANDS.WALLET_SALE;
    const paddedHostNo = this.padHostNumber(hostNo);
    const paddedAmount = this.padAmount(amount);
    const paddedQrId = qrCodeId.toString().padStart(2, '0');
    
    let qrData = '';
    if (qrCode) {
      const qrLength = qrCode.length.toString().padStart(4, '0');
      qrData = paddedQrId + qrLength + qrCode;
    } else {
      qrData = paddedQrId + '0000';
    }
    
    const paddedData = this.padAdditionalData(additionalData);
    
    const message = command + paddedHostNo + paddedAmount + qrData + paddedData;
    return this.wrapMessage(message);
  }
  
  /**
   * Build a Read Card command (C910)
   * @returns {string} Complete ECR command message
   */
  buildReadCardCommand() {
    const command = ECR_CONSTANTS.COMMANDS.READ_CARD;
    return this.wrapMessage(command);
  }
  
  /**
   * Wrap message with STX, ETX, and LRC
   * @param {string} message - Raw message content
   * @returns {string} Complete wrapped message
   */
  wrapMessage(message) {
    const stx = ECR_CONSTANTS.STX;
    const etx = ECR_CONSTANTS.ETX;
    const messageWithEtx = message + etx;
    const lrc = LRCCalculator.calculate(messageWithEtx);
    
    return stx + messageWithEtx + String.fromCharCode(lrc);
  }
  
  /**
   * Pad host number to 2 digits
   * @param {string} hostNo - Host number
   * @returns {string} Padded host number
   */
  padHostNumber(hostNo) {
    if (hostNo === 'CP' || hostNo === 'QR' || hostNo === 'DN') {
      return hostNo;
    }
    return hostNo.toString().padStart(2, '0');
  }
  
  /**
   * Pad amount to 12 digits (left padded with zeros)
   * @param {number} amount - Amount in cents
   * @returns {string} Padded amount string
   */
  padAmount(amount) {
    return amount.toString().padStart(ECR_CONSTANTS.FIELD_LENGTHS.AMOUNT, '0');
  }
  
  /**
   * Pad additional data to 24 characters (right padded with spaces)
   * @param {string} data - Additional data
   * @returns {string} Padded data string
   */
  padAdditionalData(data) {
    return data.padEnd(ECR_CONSTANTS.FIELD_LENGTHS.ADDITIONAL_DATA, ' ');
  }
  
  /**
   * Create ENQ (Enquiry) message
   * @returns {string} ENQ character
   */
  createENQ() {
    return ECR_CONSTANTS.ENQ;
  }
  
  /**
   * Create ACK (Acknowledge) message
   * @returns {string} ACK character
   */
  createACK() {
    return ECR_CONSTANTS.ACK;
  }
  
  /**
   * Create NAK (Negative Acknowledge) message
   * @returns {string} NAK character
   */
  createNAK() {
    return ECR_CONSTANTS.NAK;
  }
  
  /**
   * Create EOT (End of Transmission) message
   * @returns {string} EOT character
   */
  createEOT() {
    return ECR_CONSTANTS.EOT;
  }
  
  /**
   * Create ABORT message
   * @returns {string} ABORT string
   */
  createABORT() {
    return 'ABORT';
  }
  
  /**
   * Get message hex representation for debugging
   * @param {string} message - Message to convert
   * @returns {string} Hex representation
   */
  getMessageHex(message) {
    return LRCCalculator.stringToHex(message);
  }
}

