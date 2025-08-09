import { ECR_CONSTANTS } from '../utils/Constants';
import { LRCCalculator } from './LRCCalculator';

/**
 * ECR Response Parser
 * Parses ECR terminal responses into structured data
 */
export class ResponseParser {
  
  /**
   * Parse a complete ECR response message
   * @param {string} rawResponse - Raw response from terminal
   * @returns {Object} Parsed response object
   */
  parseResponse(rawResponse) {
    try {
      // Verify LRC first
      if (!LRCCalculator.verify(rawResponse)) {
        return {
          success: false,
          error: 'Invalid LRC checksum',
          rawData: rawResponse,
          hexData: LRCCalculator.stringToHex(rawResponse)
        };
      }
      
      // Extract message content (remove STX, ETX, LRC)
      const stxIndex = rawResponse.indexOf(ECR_CONSTANTS.STX);
      const etxIndex = rawResponse.indexOf(ECR_CONSTANTS.ETX);
      
      if (stxIndex === -1 || etxIndex === -1) {
        return {
          success: false,
          error: 'Invalid message format - missing STX/ETX',
          rawData: rawResponse
        };
      }
      
      const messageContent = rawResponse.substring(stxIndex + 1, etxIndex);
      const responseCode = messageContent.substring(0, 4);
      
      // Parse based on response type
      switch (responseCode) {
        case ECR_CONSTANTS.RESPONSES.SALE:
          return this.parseSaleResponse(messageContent);
        case ECR_CONSTANTS.RESPONSES.VOID:
          return this.parseVoidResponse(messageContent);
        case ECR_CONSTANTS.RESPONSES.REFUND:
          return this.parseRefundResponse(messageContent);
        case ECR_CONSTANTS.RESPONSES.PREAUTH:
          return this.parsePreAuthResponse(messageContent);
        case ECR_CONSTANTS.RESPONSES.SETTLEMENT:
          return this.parseSettlementResponse(messageContent);
        case ECR_CONSTANTS.RESPONSES.ECHO_TEST:
          return this.parseEchoTestResponse(messageContent);
        case ECR_CONSTANTS.RESPONSES.WALLET_SALE:
          return this.parseWalletSaleResponse(messageContent);
        case ECR_CONSTANTS.RESPONSES.READ_CARD:
          return this.parseReadCardResponse(messageContent);
        default:
          return {
            success: false,
            error: `Unknown response code: ${responseCode}`,
            rawData: rawResponse,
            responseCode: responseCode
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Parse error: ${error.message}`,
        rawData: rawResponse
      };
    }
  }
  
  /**
   * Parse Sale response (R200)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed sale response
   */
  parseSaleResponse(message) {
    const response = {
      success: true,
      transactionType: 'SALE',
      responseCode: 'R200',
      cardNumber: message.substring(4, 23).trim(),
      expiryDate: message.substring(23, 27).trim(),
      statusCode: message.substring(27, 29),
      approvalCode: message.substring(29, 35).trim(),
      rrn: message.substring(35, 47).trim(),
      transactionTrace: message.substring(47, 53).trim(),
      batchNumber: message.substring(53, 59).trim(),
      hostNo: message.substring(59, 61).trim(),
      terminalId: message.substring(61, 69).trim(),
      merchantId: message.substring(69, 84).trim(),
      aid: message.substring(84, 98).trim(),
      tc: message.substring(98, 114).trim(),
      cardholderName: message.substring(114, 140).trim(),
      cardType: message.substring(140, 142).trim(),
      rawData: message
    };
    
    // Parse additional data if present
    if (message.length > 142) {
      response.cardAppLabel = message.substring(142, 158).trim();
      if (message.length > 158) {
        response.tvr = message.substring(158, 168).trim();
        response.tsi = message.substring(168, 172).trim();
      }
    }
    
    response.isApproved = response.statusCode === ECR_CONSTANTS.STATUS_CODES.SUCCESS;
    response.statusDescription = this.getStatusDescription(response.statusCode);
    
    return response;
  }
  
  /**
   * Parse Void response (R201)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed void response
   */
  parseVoidResponse(message) {
    const response = {
      success: true,
      transactionType: 'VOID',
      responseCode: 'R201',
      amount: message.substring(4, 16).trim(),
      statusCode: message.substring(16, 18),
      approvalCode: message.substring(18, 24).trim(),
      rrn: message.substring(24, 36).trim(),
      transactionTrace: message.substring(36, 42).trim(),
      batchNumber: message.substring(42, 48).trim(),
      hostNo: message.substring(48, 50).trim(),
      rawData: message
    };
    
    // Parse additional wallet data if present
    if (message.length > 50) {
      response.partnerTrxId = message.substring(50, 82).trim();
      response.alipayTrxId = message.substring(82, 146).trim();
      response.customerId = message.substring(146, 172).trim();
    }
    
    response.isApproved = response.statusCode === ECR_CONSTANTS.STATUS_CODES.SUCCESS;
    response.statusDescription = this.getStatusDescription(response.statusCode);
    
    return response;
  }
  
  /**
   * Parse Refund response (R203)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed refund response
   */
  parseRefundResponse(message) {
    // Similar structure to sale response
    return this.parseSaleResponse(message.replace('R203', 'R200'));
  }
  
  /**
   * Parse PreAuth response (R100)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed preauth response
   */
  parsePreAuthResponse(message) {
    // Similar structure to sale response
    const response = this.parseSaleResponse(message.replace('R100', 'R200'));
    response.transactionType = 'PREAUTH';
    response.responseCode = 'R100';
    return response;
  }
  
  /**
   * Parse Settlement response (R500)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed settlement response
   */
  parseSettlementResponse(message) {
    const response = {
      success: true,
      transactionType: 'SETTLEMENT',
      responseCode: 'R500',
      hostNo: message.substring(4, 6).trim(),
      statusCode: message.substring(6, 8),
      batchNumber: message.substring(8, 14).trim(),
      batchCount: message.substring(14, 17).trim(),
      batchAmount: message.substring(17, 29).trim(),
      rawData: message
    };
    
    response.isApproved = response.statusCode === ECR_CONSTANTS.STATUS_CODES.SUCCESS;
    response.statusDescription = this.getStatusDescription(response.statusCode);
    
    return response;
  }
  
  /**
   * Parse Echo Test response (R902)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed echo response
   */
  parseEchoTestResponse(message) {
    return {
      success: true,
      transactionType: 'ECHO_TEST',
      responseCode: 'R902',
      statusCode: '00',
      isApproved: true,
      statusDescription: 'Echo test successful',
      rawData: message
    };
  }
  
  /**
   * Parse Wallet Sale response (R290)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed wallet sale response
   */
  parseWalletSaleResponse(message) {
    const response = {
      success: true,
      transactionType: 'WALLET_SALE',
      responseCode: 'R290',
      statusCode: message.substring(4, 6),
      approvalCode: message.substring(6, 12).trim(),
      transactionTrace: message.substring(12, 18).trim(),
      batchNumber: message.substring(18, 24).trim(),
      hostNo: message.substring(24, 26).trim(),
      terminalId: message.substring(26, 34).trim(),
      merchantId: message.substring(34, 49).trim(),
      partnerTrxId: message.substring(49, 81).trim(),
      alipayTrxId: message.substring(81, 145).trim(),
      rawData: message
    };
    
    if (message.length > 145) {
      response.customerId = message.substring(145, 171).trim();
    }
    
    response.isApproved = response.statusCode === ECR_CONSTANTS.STATUS_CODES.SUCCESS;
    response.statusDescription = this.getStatusDescription(response.statusCode);
    
    return response;
  }
  
  /**
   * Parse Read Card response (R910)
   * @param {string} message - Message content without STX/ETX/LRC
   * @returns {Object} Parsed read card response
   */
  parseReadCardResponse(message) {
    const response = {
      success: true,
      transactionType: 'READ_CARD',
      responseCode: 'R910',
      cardNumber: message.substring(4, 23).trim(),
      expiryDate: message.substring(23, 27).trim(),
      cardholderName: message.substring(27, 53).trim(),
      cardType: message.substring(53, 55).trim(),
      statusCode: '00',
      isApproved: true,
      statusDescription: 'Card read successful',
      rawData: message
    };
    
    return response;
  }
  
  /**
   * Get human-readable status description
   * @param {string} statusCode - Status code from response
   * @returns {string} Status description
   */
  getStatusDescription(statusCode) {
    const descriptions = {
      '00': 'Approved',
      '01': 'Refer to card issuer',
      '02': 'Refer to card issuer (special condition)',
      '03': 'Invalid merchant',
      '04': 'Pick up card',
      '05': 'Do not honor',
      '06': 'Error',
      '07': 'Pick up card (special condition)',
      '08': 'Honor with identification',
      '09': 'Request in progress',
      '10': 'Approved for partial amount',
      '11': 'Approved (VIP)',
      '12': 'Invalid transaction',
      '13': 'Invalid amount',
      '14': 'Invalid card number',
      '15': 'No such issuer',
      '30': 'Format error',
      '41': 'Lost card - pick up',
      '43': 'Stolen card - pick up',
      '51': 'Insufficient funds',
      '54': 'Expired card',
      '55': 'Incorrect PIN',
      '57': 'Transaction not permitted to cardholder',
      '58': 'Transaction not permitted to terminal',
      '61': 'Exceeds withdrawal amount limit',
      '62': 'Restricted card',
      '65': 'Exceeds withdrawal frequency limit',
      '75': 'Allowable number of PIN tries exceeded',
      '91': 'Issuer or switch is inoperative',
      '96': 'System malfunction'
    };
    
    return descriptions[statusCode] || `Unknown status: ${statusCode}`;
  }
  
  /**
   * Get card type description
   * @param {string} cardType - Card type code
   * @returns {string} Card type description
   */
  getCardTypeDescription(cardType) {
    const cardTypes = {
      '01': 'Visa',
      '02': 'Mastercard',
      '03': 'American Express',
      '04': 'Diners Club',
      '05': 'JCB',
      '06': 'UnionPay',
      '07': 'MyDebit',
      '08': 'UPI'
    };
    
    return cardTypes[cardType] || `Unknown card type: ${cardType}`;
  }
  
  /**
   * Format amount from string to decimal
   * @param {string} amountStr - Amount string (in cents)
   * @returns {number} Amount in dollars/ringgit
   */
  formatAmount(amountStr) {
    const cents = parseInt(amountStr, 10);
    return cents / 100;
  }
  
  /**
   * Check if response indicates successful transaction
   * @param {Object} response - Parsed response object
   * @returns {boolean} True if transaction was successful
   */
  isSuccessfulTransaction(response) {
    return response.success && response.isApproved;
  }
}

