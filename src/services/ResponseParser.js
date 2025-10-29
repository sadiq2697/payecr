import { ECR_CONSTANTS } from '../utils/Constants';
import { LRCCalculator } from './LRCCalculator';

export class ResponseParser {
  parseResponse(rawResponse) {
    try {
      if (!LRCCalculator.verify(rawResponse)) {
        return {
          success: false,
          error: 'Invalid LRC checksum',
          rawData: rawResponse,
          hexData: LRCCalculator.stringToHex(rawResponse)
        };
      }

      // Convert G290 to R290 for proper parsing (terminal sometimes returns G290 for E-wallet)
      rawResponse = rawResponse.replace(/G290/g, 'R290').replace(/G292/g, 'R292');
      
      const stxIndex = rawResponse.indexOf(ECR_CONSTANTS.CONTROL_CHARS.STX);
      const etxIndex = rawResponse.indexOf(ECR_CONSTANTS.CONTROL_CHARS.ETX);
      if (stxIndex === -1 || etxIndex === -1) {
        return {
          success: false,
          error: 'Invalid message format - missing STX/ETX',
          rawData: rawResponse
        };
      }

      const messageContent = rawResponse.substring(stxIndex + 1, etxIndex);
      const responseCode = messageContent.substring(0, 4).trim();
      const transactionType = this.getTransactionType(responseCode);

      if (!transactionType) {
        return {
          success: false,
          error: `Unknown response code: ${responseCode}`,
          rawData: rawResponse,
          responseCode
        };
      }

      let parsedResponse = {};

      if (['SALE', 'SALE_WITH_CASH', 'ADJUST', 'OFFLINE_SALE', 'CASH_ADVANCE', 'PREAUTH', 'REFUND']
        .includes(transactionType)) {
        parsedResponse = this.parseCardTransactionResponse(messageContent, responseCode, transactionType);
      } else if (transactionType.includes('WALLET')) {
        parsedResponse = this.parseWalletTransactionResponse(messageContent, responseCode, transactionType);
      } else {
        const map = {
          VOID: this.parseVoidResponse,
          SETTLEMENT: this.parseSettlementResponse,
          READ_CARD: this.parseReadCardResponse,
          SCAN_QR: this.parseScanQRResponse,
          TRANSACTION_STATUS: this.parseTransactionStatusResponse,
          ECHO_TEST: this.parseEchoTestResponse,
          // Missing response parsers from C# implementation
          PREAUTH_PARKING: this.parsePreAuthParkingResponse,
          CASH_BACK: this.parseCashBackResponse,
          SALE_COMPLETION: this.parseSaleCompletionResponse,
          POINT_ENQUIRY: this.parsePointEnquiryResponse,
          INSTANT_REWARD: this.parseInstantRewardResponse,
          POINT_REDEMPTION: this.parsePointRedemptionResponse,
          VALUE_REDEMPTION: this.parseValueRedemptionResponse,
          GIFT_REDEMPTION: this.parseGiftRedemptionResponse,
          HOT_DEAL: this.parseHotDealResponse,
          OTSR_REDEMPTION: this.parseOTSRRedemptionResponse,
          OTSR_ENQUIRY: this.parseOTSREnquiryResponse,
          READ_MYKAD: this.parseReadMyKadResponse,
          PIN_ENTRY: this.parsePINEntryResponse,
          GENTING_CARD: this.parseGentingCardResponse,
          GET_TID_MID: this.parseGetTIDMIDResponse,
          GET_TOKEN: this.parseGetTokenResponse,
          MIFARE: this.parseMiFareResponse,
          LOYALTY_VOID: this.parseLoyaltyVoidResponse,
          SET_TIME: this.parseSetTimeResponse
        };
        if (map[transactionType]) {
          parsedResponse = map[transactionType].call(this, messageContent, responseCode) || {};
        }
      }

      parsedResponse.hostType = this.getHostType(responseCode);
      parsedResponse.statusDescription = this.getStatusCodeDescription(
        parsedResponse.statusCode || '',
        parsedResponse.hostType,
        transactionType
      );
      parsedResponse.statusCategory = this.getStatusCodeCategory(parsedResponse.statusCode || '');
      parsedResponse.responseCodeDescription = this.getResponseCodeDescription(responseCode);
      parsedResponse.rawData = rawResponse;
      
      // Check if this is a terminal error vs normal decline
      const isTerminalError = this.isTerminalError(parsedResponse.statusCode || '');
      
      if (isTerminalError) {
        // Terminal errors should be treated as failures, not successful declines
        return {
          success: false,
          error: `Terminal error: ${parsedResponse.statusDescription}`,
          statusCode: parsedResponse.statusCode,
          statusDescription: parsedResponse.statusDescription,
          statusCategory: parsedResponse.statusCategory,
          isTerminalError: true,
          rawData: rawResponse,
          ...parsedResponse
        };
      }
      
      // Normal transaction - check if approved
      parsedResponse.success = true;
      parsedResponse.isApproved = this.isStatusCodeApproved(
        parsedResponse.statusCode || '',
        parsedResponse.hostType,
        transactionType
      );

      return parsedResponse;
    } catch (error) {
      return { success: false, error: `Parse error: ${error.message}`, rawData: rawResponse };
    }
  }

  parseCardTransactionResponse(message, responseCode, transactionType) {
    const r = {
      transactionType,
      responseCode,
      cardNumber: message.substring(4, 4 + ECR_CONSTANTS.FIELD_LENGTHS.CARD_NUMBER).trim(),
      expiryDate: message.substring(23, 23 + ECR_CONSTANTS.FIELD_LENGTHS.EXPIRY_DATE).trim(),
      statusCode: message.substring(27, 27 + ECR_CONSTANTS.FIELD_LENGTHS.STATUS_CODE).trim(),
      approvalCode: message.substring(29, 29 + ECR_CONSTANTS.FIELD_LENGTHS.APPROVAL_CODE).trim(),
      rrn: message.substring(35, 35 + ECR_CONSTANTS.FIELD_LENGTHS.RRN).trim(),
      transactionTrace: message.substring(47, 47 + ECR_CONSTANTS.FIELD_LENGTHS.TRANSACTION_TRACE).trim(),
      batchNumber: message.substring(53, 53 + ECR_CONSTANTS.FIELD_LENGTHS.BATCH_NUMBER).trim(),
      hostNo: message.substring(59, 59 + ECR_CONSTANTS.FIELD_LENGTHS.HOST_NO).trim(),
      terminalId: message.substring(61, 61 + ECR_CONSTANTS.FIELD_LENGTHS.TERMINAL_ID).trim(),
      merchantId: message.substring(69, 69 + ECR_CONSTANTS.FIELD_LENGTHS.MERCHANT_ID).trim(),
      cardholderName: message.substring(114, 114 + ECR_CONSTANTS.FIELD_LENGTHS.CARDHOLDER_NAME).trim(),
      cardType: message.substring(140, 140 + ECR_CONSTANTS.FIELD_LENGTHS.CARD_TYPE).trim()
    };
    r.cardTypeDescription = this.getCardTypeDescription(r.cardType);
    return r;
  }

  parseWalletTransactionResponse(message, responseCode, transactionType) {
    const r = {
      transactionType,
      responseCode,
      statusCode: message.substring(4, 4 + ECR_CONSTANTS.FIELD_LENGTHS.STATUS_CODE).trim(),
      approvalCode: message.substring(6, 6 + ECR_CONSTANTS.FIELD_LENGTHS.APPROVAL_CODE).trim(),
      transactionTrace: message.substring(12, 12 + ECR_CONSTANTS.FIELD_LENGTHS.TRANSACTION_TRACE).trim(),
      batchNumber: message.substring(18, 18 + ECR_CONSTANTS.FIELD_LENGTHS.BATCH_NUMBER).trim(),
      hostNo: message.substring(24, 24 + ECR_CONSTANTS.FIELD_LENGTHS.HOST_NO).trim(),
      terminalId: message.substring(26, 26 + ECR_CONSTANTS.FIELD_LENGTHS.TERMINAL_ID).trim(),
      merchantId: message.substring(34, 34 + ECR_CONSTANTS.FIELD_LENGTHS.MERCHANT_ID).trim(),
      partnerTrxId: message.substring(49, 49 + ECR_CONSTANTS.FIELD_LENGTHS.EWALLET_TXN_ID).trim(),
      alipayTrxId: message.substring(81, 81 + 64).trim()
    };
    if (message.length > 145) {
      r.customerId = message.substring(145, 145 + 32).trim();
    }
    return r;
  }


  getTransactionType(code) {
    const normalized = code.trim();
    const map = {};
    for (const [k, v] of Object.entries(ECR_CONSTANTS.RESPONSES)) {
      (Array.isArray(v) ? v : [v]).forEach(c => {
        map[c.trim()] = k;
      });
    }
    return map[normalized] || null;
  }

  getHostType(code) {
    const prefix = code.charAt(0);
    const hostTypes = { R: 'Standard/Other' };
    return hostTypes[prefix] || 'Unknown';
  }

  /**
   * Enhanced status code approval check with comprehensive response code support
   * @param {string} statusCode - Status code from response
   * @param {string} hostType - Host type identifier
   * @param {string} transactionType - Type of transaction
   * @returns {boolean} True if status indicates approval/success
   */
  isStatusCodeApproved(statusCode, hostType, transactionType) {
    if (!statusCode) return false;
    
    const code = statusCode.trim().toUpperCase();
    const walletCodes = ['R290', 'R292'];
    
    // ISO standard approved codes
    const isoApprovedCodes = [
      '00', // APPROVED
      '10', // APPROVED PARTIAL
      '11', // APPROVED VIP
      'Y1', // EMV APPROVED
      'Y3'  // EMV APPROVED
    ];
    
    // Special host-specific approved codes
    const hostSpecificCodes = {};
    
    // Check wallet transactions
    if (walletCodes.includes(transactionType)) {
      return [...isoApprovedCodes, ...hostSpecificCodes[hostType] || []].includes(code);
    }
    
    // Check settlement transactions
    if (transactionType === 'SETTLEMENT') {
      return [...isoApprovedCodes, ...hostSpecificCodes[hostType] || []].includes(code);
    }
    
    
    // Check ISO standard codes
    if (isoApprovedCodes.includes(code)) return true;
    
    // Check host-specific codes
    if (hostSpecificCodes[hostType]?.includes(code)) return true;
    
    // Echo test is always approved if we get a valid response
    if (transactionType === 'ECHO_TEST' && code) return true;
    
    return false;
  }

  /**
   * Determine if a status code represents a terminal error that should fail the transaction
   * @param {string} statusCode - The status code to check
   * @returns {boolean} True if this is a terminal error that should cause transaction failure
   */
  isTerminalError(statusCode) {
    if (!statusCode) return false;
    
    const code = statusCode.trim().toUpperCase();
    
    // Terminal/System error codes that should cause transaction failure
    const terminalErrorCodes = [
      // Protocol error codes
      'TA', // Transaction Aborted
      'TD', // Transaction Disabled  
      'HE', // Host Number Error
      'AO', // Amount Out of Range
      'AE', // Amount Mismatch
      'SE', // System Error
      'EC', // ECR Communication Error
      'IC', // Invalid Configuration
      'PE', // Protocol Error
      'FE', // Format Error
      'RE', // Response Error
      'WC', // Wrong Command
      'ZE', // Zone Error
      'BU', // Backup/Restore Error
      'CE', // Configuration Error
      'LE', // License Error
      
      // ISO codes that represent system/terminal errors (not card declines)
      '96', // System Malfunction
      '91', // Issuer or Switch Inoperative
      '94', // Duplicate Transmission
      '95', // Reconcile Error
      '89', // MAC Error
    ];
    
    return terminalErrorCodes.includes(code);
  }

  getCardTypeDescription(cardType) {
    const types = {
      [ECR_CONSTANTS.CARD_TYPES.UPI]: 'UPI',
      [ECR_CONSTANTS.CARD_TYPES.VISA]: 'Visa',
      [ECR_CONSTANTS.CARD_TYPES.MASTERCARD]: 'Mastercard',
      [ECR_CONSTANTS.CARD_TYPES.DINERS]: 'Diners Club',
      [ECR_CONSTANTS.CARD_TYPES.AMEX]: 'American Express',
      [ECR_CONSTANTS.CARD_TYPES.DEBIT]: 'Debit Card',
      [ECR_CONSTANTS.CARD_TYPES.GENTING_CARD]: 'Genting Card',
      [ECR_CONSTANTS.CARD_TYPES.JCB]: 'JCB',
      [ECR_CONSTANTS.CARD_TYPES.UPI_ALT]: 'UPI Alternative'
    };
    return types[cardType] || `Unknown card type: ${cardType}`;
  }

  /**
   * Get comprehensive status code description based on type and host
   * @param {string} statusCode - The status code from response
   * @param {string} hostType - The host type (E-Wallet, Standard, etc.)
   * @param {string} transactionType - The transaction type
   * @returns {string} Human readable description
   */
  getStatusCodeDescription(statusCode, _hostType, _transactionType) {
    if (!statusCode) return 'No status code';
    
    const code = statusCode.trim().toUpperCase();
    
    // GTX codes removed - no longer supported
    
    // Priority 2: PROTOCOL specific codes (2-letter codes)  
    // Covers all 21 protocol codes: 'UC', 'UI', 'UK', 'TD', 'TA', 'HE', 'AO', 'AE', 'SE', 'EC', 'IC', 'IQ', 'PE', 'FE', 'RE', 'VB', 'WC', 'ZE', 'BU', 'CE', 'LE'
    if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
      const protocolDescription = ECR_CONSTANTS.RESPONSE_CODES.PROTOCOL[code];
      if (protocolDescription) {
        return protocolDescription;
      }
    }
    
    // Priority 3: ISO standard codes (numeric and alphanumeric)
    // Covers all 32 ISO codes: '00', '01', '02', '03', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '19', '25', '30', '31', '41', '43', '51', '54', '55', '58', '76', '77', '78', '80', '89', '91', '94', '95', '96', 'Y1', 'Y3', 'Z1', 'Z3'
    const isoDescription = ECR_CONSTANTS.RESPONSE_CODES.ISO[code];
    if (isoDescription) {
      return isoDescription;
    }
    
    // Return original code if no description found
    return `Unknown status: ${statusCode}`;
  }

  /**
   * Determine the category of status code (ISO, Protocol, GTX)
   * @param {string} statusCode - The status code
   * @returns {string} Category name
   */
  getStatusCodeCategory(statusCode) {
    if (!statusCode) return 'Unknown';
    
    const code = statusCode.trim().toUpperCase();
    
    // GTX codes removed
    
    // Protocol codes are 2-letter combinations
    if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
      if (ECR_CONSTANTS.RESPONSE_CODES.PROTOCOL[code]) {
        return 'Protocol';
      }
    }
    
    // ISO codes are typically numeric or alphanumeric
    if (ECR_CONSTANTS.RESPONSE_CODES.ISO[code]) {
      return 'ISO';
    }
    
    return 'Unknown';
  }

  /**
   * Get response code description
   * @param {string} responseCode - Response code (e.g., R200, G290)
   * @returns {string} Human readable description
   */
  getResponseCodeDescription(responseCode) {
    if (!responseCode) return 'Unknown response';
    
    const code = responseCode.trim().toUpperCase();
    
    const descriptions = {
      // Standard responses
      'R100': 'Pre-Authorization Response',
      'R200': 'Sale Response',
      'R201': 'Void Response',
      'R203': 'Refund Response',
      'R204': 'Cash Advance Response',
      'R205': 'Sale with Cash Response',
      'R208': 'Transaction Status Response',
      'R220': 'Adjustment Response',
      'R230': 'Offline Sale Response',
      'R290': 'Wallet Sale Response',
      'R292': 'Wallet Refund Response',
      'R500': 'Settlement Response',
      'R902': 'Echo Test Response',
      'R906': 'Scan QR Response',
      'R910': 'Read Card Response',
      
    };
    
    return descriptions[code] || `${this.getHostType(code)} Response`;
  }

  /**
   * Parse void transaction response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed void response
   */
  parseVoidResponse(message, responseCode) {
    return {
      transactionType: 'VOID',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      approvalCode: message.substring(6, 12).trim(),
      transactionTrace: message.substring(12, 18).trim(),
      batchNumber: message.substring(18, 24).trim(),
      hostNo: message.substring(24, 26).trim(),
      terminalId: message.substring(26, 34).trim(),
      merchantId: message.substring(34, 49).trim()
    };
  }

  /**
   * Parse settlement response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed settlement response
   */
  parseSettlementResponse(message, responseCode) {
    const r = {
      transactionType: 'SETTLEMENT',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      batchNumber: message.substring(6, 12).trim(),
      hostNo: message.substring(12, 14).trim(),
      terminalId: message.substring(14, 22).trim(),
      merchantId: message.substring(22, 37).trim()
    };
    
    // Parse settlement totals if available
    if (message.length > 37) {
      r.totalSalesCount = message.substring(37, 43).trim();
      r.totalSalesAmount = message.substring(43, 55).trim();
      r.totalRefundsCount = message.substring(55, 61).trim();
      r.totalRefundsAmount = message.substring(61, 73).trim();
      r.netAmount = message.substring(73, 85).trim();
    }
    
    return r;
  }

  /**
   * Parse read card response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed read card response
   */
  parseReadCardResponse(message, responseCode) {
    return {
      transactionType: 'READ_CARD',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      cardNumber: message.substring(6, 25).trim(),
      expiryDate: message.substring(25, 29).trim(),
      cardholderName: message.substring(29, 55).trim(),
      cardType: message.substring(55, 57).trim()
    };
  }

  /**
   * Parse scan QR response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed scan QR response
   */
  parseScanQRResponse(message, responseCode) {
    const r = {
      transactionType: 'SCAN_QR',
      responseCode,
      statusCode: message.substring(4, 6).trim()
    };
    
    if (message.length > 6) {
      const qrLengthIndicator = message.substring(6, 10).trim();
      const qrLength = parseInt(qrLengthIndicator, 10);
      
      if (!isNaN(qrLength) && message.length >= 10 + qrLength) {
        r.qrData = message.substring(10, 10 + qrLength).trim();
        r.qrCodeId = message.substring(10 + qrLength, 12 + qrLength).trim();
      }
    }
    
    return r;
  }

  /**
   * Parse transaction status response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed transaction status response
   */
  parseTransactionStatusResponse(message, responseCode) {
    return {
      transactionType: 'TRANSACTION_STATUS',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      uniqueId: message.substring(6, 30).trim(),
      originalAmount: message.substring(30, 42).trim(),
      transactionTrace: message.substring(42, 48).trim(),
      approvalCode: message.substring(48, 54).trim(),
      rrn: message.substring(54, 66).trim()
    };
  }

  /**
   * Parse echo test response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed echo test response
   */
  parseEchoTestResponse(message, responseCode) {
    return {
      transactionType: 'ECHO_TEST',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      terminalId: message.length > 6 ? message.substring(6, 14).trim() : '',
      merchantId: message.length > 14 ? message.substring(14, 29).trim() : ''
    };
  }

  /**
   * Comprehensive validation method to ensure all response codes from Constants.js are implemented
   * @returns {object} Validation report showing coverage of all response code categories
   */
  validateResponseCodeCoverage() {
    const report = {
      iso: { total: 0, implemented: 0, missing: [] },
      protocol: { total: 0, implemented: 0, missing: [] },
      gtx: { total: 0, implemented: 0, missing: [] }
    };

    // Check ISO codes
    for (const [code, description] of Object.entries(ECR_CONSTANTS.RESPONSE_CODES.ISO)) {
      report.iso.total++;
      const implementedDesc = this.getStatusCodeDescription(code, 'Standard', 'SALE');
      if (implementedDesc === description) {
        report.iso.implemented++;
      } else {
        report.iso.missing.push({ code, expected: description, actual: implementedDesc });
      }
    }

    // Check PROTOCOL codes
    for (const [code, description] of Object.entries(ECR_CONSTANTS.RESPONSE_CODES.PROTOCOL)) {
      report.protocol.total++;
      const implementedDesc = this.getStatusCodeDescription(code, 'Standard', 'SALE');
      if (implementedDesc === description) {
        report.protocol.implemented++;
      } else {
        report.protocol.missing.push({ code, expected: description, actual: implementedDesc });
      }
    }

    // GTX codes removed - no validation needed

    report.summary = {
      totalCodes: report.iso.total + report.protocol.total + report.gtx.total,
      implementedCodes: report.iso.implemented + report.protocol.implemented + report.gtx.implemented,
      coveragePercentage: Math.round(((report.iso.implemented + report.protocol.implemented + report.gtx.implemented) / (report.iso.total + report.protocol.total + report.gtx.total)) * 100)
    };

    return report;
  }

  // ===== Missing Response Parsers from C# Implementation =====

  /**
   * Parse Pre-Authorization Parking response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parsePreAuthParkingResponse(message, responseCode) {
    return this.parseCardTransactionResponse(message, responseCode, 'PREAUTH_PARKING');
  }

  /**
   * Parse Cash Back response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseCashBackResponse(message, responseCode) {
    return this.parseCardTransactionResponse(message, responseCode, 'CASH_BACK');
  }

  /**
   * Parse Sale Completion response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseSaleCompletionResponse(message, responseCode) {
    return {
      transactionType: 'SALE_COMPLETION',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      approvalCode: message.substring(6, 12).trim(),
      transactionTrace: message.substring(12, 18).trim(),
      batchNumber: message.substring(18, 24).trim(),
      hostNo: message.substring(24, 26).trim(),
      terminalId: message.substring(26, 34).trim(),
      merchantId: message.substring(34, 49).trim()
    };
  }

  /**
   * Parse Point Enquiry response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parsePointEnquiryResponse(message, responseCode) {
    const r = {
      transactionType: 'POINT_ENQUIRY',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      cardNumber: message.substring(6, 25).trim(),
      expiryDate: message.substring(25, 29).trim(),
      availablePoints: message.substring(29, 41).trim(),
      cardholderName: message.substring(41, 67).trim()
    };
    
    if (message.length > 67) {
      r.membershipLevel = message.substring(67, 69).trim();
      r.expiryDate = message.substring(69, 77).trim();
    }
    
    return r;
  }

  /**
   * Parse Instant Reward response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseInstantRewardResponse(message, responseCode) {
    return {
      transactionType: 'INSTANT_REWARD',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      rewardAmount: message.substring(6, 18).trim(),
      transactionTrace: message.substring(18, 24).trim(),
      approvalCode: message.substring(24, 30).trim(),
      terminalId: message.substring(30, 38).trim(),
      merchantId: message.substring(38, 53).trim()
    };
  }

  /**
   * Parse Point Redemption response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parsePointRedemptionResponse(message, responseCode) {
    return {
      transactionType: 'POINT_REDEMPTION',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      pointsRedeemed: message.substring(6, 18).trim(),
      cashValue: message.substring(18, 30).trim(),
      remainingPoints: message.substring(30, 42).trim(),
      transactionTrace: message.substring(42, 48).trim(),
      approvalCode: message.substring(48, 54).trim(),
      terminalId: message.substring(54, 62).trim(),
      merchantId: message.substring(62, 77).trim()
    };
  }

  /**
   * Parse Value Redemption response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseValueRedemptionResponse(message, responseCode) {
    return {
      transactionType: 'VALUE_REDEMPTION',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      redeemedAmount: message.substring(6, 18).trim(),
      remainingValue: message.substring(18, 30).trim(),
      transactionTrace: message.substring(30, 36).trim(),
      approvalCode: message.substring(36, 42).trim(),
      terminalId: message.substring(42, 50).trim(),
      merchantId: message.substring(50, 65).trim()
    };
  }

  /**
   * Parse Gift Redemption response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseGiftRedemptionResponse(message, responseCode) {
    return {
      transactionType: 'GIFT_REDEMPTION',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      giftCode: message.substring(6, 18).trim(),
      quantity: message.substring(18, 30).trim(),
      giftDescription: message.substring(30, 70).trim(),
      transactionTrace: message.substring(70, 76).trim(),
      approvalCode: message.substring(76, 82).trim(),
      terminalId: message.substring(82, 90).trim(),
      merchantId: message.substring(90, 105).trim()
    };
  }

  /**
   * Parse Hot Deal response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseHotDealResponse(message, responseCode) {
    return {
      transactionType: 'HOT_DEAL',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      dealCode: message.substring(6, 18).trim(),
      quantity: message.substring(18, 30).trim(),
      dealDescription: message.substring(30, 70).trim(),
      discountAmount: message.substring(70, 82).trim(),
      transactionTrace: message.substring(82, 88).trim(),
      approvalCode: message.substring(88, 94).trim(),
      terminalId: message.substring(94, 102).trim(),
      merchantId: message.substring(102, 117).trim()
    };
  }

  /**
   * Parse OTSR Redemption response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseOTSRRedemptionResponse(message, responseCode) {
    return {
      transactionType: 'OTSR_REDEMPTION',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      redeemedAmount: message.substring(6, 18).trim(),
      remainingBalance: message.substring(18, 30).trim(),
      transactionTrace: message.substring(30, 36).trim(),
      approvalCode: message.substring(36, 42).trim(),
      terminalId: message.substring(42, 50).trim(),
      merchantId: message.substring(50, 65).trim()
    };
  }

  /**
   * Parse OTSR Enquiry response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseOTSREnquiryResponse(message, responseCode) {
    return {
      transactionType: 'OTSR_ENQUIRY',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      cardNumber: message.substring(6, 25).trim(),
      availableBalance: message.substring(25, 37).trim(),
      cardholderName: message.substring(37, 63).trim(),
      expiryDate: message.substring(63, 67).trim()
    };
  }

  /**
   * Parse Read MyKad response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseReadMyKadResponse(message, responseCode) {
    return {
      transactionType: 'READ_MYKAD',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      icNumber: message.substring(6, 18).trim(),
      name: message.substring(18, 68).trim(),
      address: message.substring(68, 168).trim(),
      dateOfBirth: message.substring(168, 176).trim(),
      gender: message.substring(176, 177).trim(),
      religion: message.substring(177, 178).trim(),
      race: message.substring(178, 179).trim(),
      citizenship: message.substring(179, 180).trim()
    };
  }

  /**
   * Parse PIN Entry response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parsePINEntryResponse(message, responseCode) {
    return {
      transactionType: 'PIN_ENTRY',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      encryptedPIN: message.substring(6, 22).trim(),
      sessionKey: message.substring(22, 54).trim(),
      terminalId: message.substring(54, 62).trim(),
      merchantId: message.substring(62, 77).trim()
    };
  }

  /**
   * Parse Genting Card response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseGentingCardResponse(message, responseCode) {
    return {
      transactionType: 'GENTING_CARD',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      cardNumber: message.substring(6, 25).trim(),
      cardholderName: message.substring(25, 51).trim(),
      membershipLevel: message.substring(51, 53).trim(),
      pointsBalance: message.substring(53, 65).trim(),
      expiryDate: message.substring(65, 69).trim()
    };
  }

  /**
   * Parse Get TID/MID response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseGetTIDMIDResponse(message, responseCode) {
    return {
      transactionType: 'GET_TID_MID',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      terminalId: message.substring(6, 14).trim(),
      merchantId: message.substring(14, 29).trim(),
      merchantName: message.substring(29, 69).trim(),
      terminalType: message.substring(69, 71).trim(),
      softwareVersion: message.substring(71, 81).trim()
    };
  }

  /**
   * Parse Get Token response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseGetTokenResponse(message, responseCode) {
    return {
      transactionType: 'GET_TOKEN',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      token: message.substring(6, 70).trim(),
      expiryTime: message.substring(70, 84).trim(),
      terminalId: message.substring(84, 92).trim(),
      merchantId: message.substring(92, 107).trim()
    };
  }

  /**
   * Parse MiFare response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseMiFareResponse(message, responseCode) {
    return {
      transactionType: 'MIFARE',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      cardUID: message.substring(6, 22).trim(),
      cardType: message.substring(22, 24).trim(),
      dataRead: message.substring(24, 88).trim(),
      terminalId: message.substring(88, 96).trim(),
      merchantId: message.substring(96, 111).trim()
    };
  }

  /**
   * Parse Loyalty Void response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseLoyaltyVoidResponse(message, responseCode) {
    return {
      transactionType: 'LOYALTY_VOID',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      voidedTraceNumber: message.substring(6, 12).trim(),
      approvalCode: message.substring(12, 18).trim(),
      batchNumber: message.substring(18, 24).trim(),
      hostNo: message.substring(24, 26).trim(),
      terminalId: message.substring(26, 34).trim(),
      merchantId: message.substring(34, 49).trim()
    };
  }

  /**
   * Parse Set Time response
   * @param {string} message - Message content
   * @param {string} responseCode - Response code
   * @returns {object} Parsed response
   */
  parseSetTimeResponse(message, responseCode) {
    return {
      transactionType: 'SET_TIME',
      responseCode,
      statusCode: message.substring(4, 6).trim(),
      currentDateTime: message.substring(6, 20).trim(),
      terminalId: message.substring(20, 28).trim(),
      merchantId: message.substring(28, 43).trim()
    };
  }

  /**
   * Get all supported response codes by category
   * @returns {object} All response codes organized by category
   */
  getAllSupportedResponseCodes() {
    return {
      iso: {
        description: 'ISO 8583 Standard Response Codes',
        codes: ECR_CONSTANTS.RESPONSE_CODES.ISO,
        count: Object.keys(ECR_CONSTANTS.RESPONSE_CODES.ISO).length
      },
      protocol: {
        description: 'ECR Protocol Specific Response Codes', 
        codes: ECR_CONSTANTS.RESPONSE_CODES.PROTOCOL,
        count: Object.keys(ECR_CONSTANTS.RESPONSE_CODES.PROTOCOL).length
      },
      // GTX codes removed
      summary: {
        totalCategories: 3,
        totalCodes: Object.keys(ECR_CONSTANTS.RESPONSE_CODES.ISO).length + 
                   Object.keys(ECR_CONSTANTS.RESPONSE_CODES.PROTOCOL).length
      }
    };
  }
}
