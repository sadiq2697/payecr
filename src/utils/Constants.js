/**
 * ECR Communication Constants
 * 
 * This file contains all constants used for ECR (Electronic Cash Register) 
 * communication including commands, responses, field lengths, and status codes.
 */
export const ECR_CONSTANTS = Object.freeze({

  /** ASCII control characters for ECR protocol */
  CONTROL_CHARS: Object.freeze({
    STX: '\x02', // Start of Text
    ETX: '\x03', // End of Text
    ENQ: '\x05', // Enquiry
    ACK: '\x06', // Acknowledge
    NAK: '\x15', // Negative Acknowledge
    EOT: '\x04'  // End of Transmission
  }),

  /** Serial port configuration */
  SERIAL_CONFIG: Object.freeze({
    BAUD_RATE: 9600,   // Communication speed
    DATA_BITS: 8,      // Number of data bits per character
    PARITY: 'none',    // No parity bit
    STOP_BITS: 1       // Number of stop bits
  }),

  /** TCP/IP connection settings */
  TCP_CONFIG: Object.freeze({
    PORT: 85 // Default ECR TCP listening port
  }),

  /** Communication timeouts (milliseconds) */
  TIMEOUTS: Object.freeze({
    ENQ: 3000,        // Wait time for ENQ acknowledgement
    COMMAND: 5000,    // Max wait after sending command
    RESPONSE: 120000, // Max wait for terminal response
    ACK: 2000         // Max wait for ACK
  }),

  /** Retry attempts */
  RETRIES: Object.freeze({
    ENQ: 3,      // Retry attempts for ENQ
    COMMAND: 3   // Retry attempts for sending commands
  }),

  /** ECR command codes */
  COMMANDS: Object.freeze({
    PREAUTH: 'C100',
    SALE: 'C200',
    VOID: 'C201',
    REFUND: 'C203',
    TRANSACTION_STATUS: 'C208',
    WALLET_SALE: 'C290',
    WALLET_REFUND: 'C292',
    SETTLEMENT: 'C500',
    ECHO_TEST: 'C902',
  }),

  /** Response codes from terminal */
  RESPONSES: Object.freeze({
    /** Standard transaction responses */
    PREAUTH: 'R100',
    SALE: 'R200',
    VOID: 'R201',
    REFUND: 'R203',
    TRANSACTION_STATUS: 'R208',
    SETTLEMENT: 'R500',
    ECHO_TEST: 'R902',

    // --- Wallet Transaction Responses (Prefix indicates the processing host) ---
    /** E-Wallet responses */
    EWALLET_SALE: 'G200',
    EWALLET_REFUND: 'G203', 
    EWALLET_WALLET_SALE: 'G290',
    EWALLET_WALLET_REFUND: 'G292'
  }),

  /** Status code descriptions */
  RESPONSE_CODES: Object.freeze({
    ISO: Object.freeze({
      '00': 'APPROVED',
      '01': 'REFER TO CARD ISSUER',
      '02': 'REFER TO CARD ISSUER\'S SPECIAL CONDITION',
      '03': 'INVALID MERCHANT',
      '05': 'DECLINED',
      '06': 'ERROR',
      '07': 'PICK UP CARD SPECIAL',
      '08': 'HONOR WITH ID',
      '09': 'REQUEST IN PROGRESS',
      '10': 'APPROVED PARTIAL',
      '11': 'APPROVED VIP',
      '12': 'INVALID TRANSACTION',
      '13': 'INVALID AMOUNT',
      '14': 'INVALID CARD NUMBER',
      '15': 'NO SUCH ISSUER',
      '19': 'RE-ENTER TRANSACTION',
      '25': 'UNABLE TO LOCATE RECORD',
      '30': 'FORMAT ERROR',
      '31': 'BANK NOT SUPPORTED',
      '41': 'LOST CARD',
      '43': 'STOLEN CARD',
      '51': 'INSUFFICIENT FUNDS',
      '54': 'EXPIRED CARD',
      '55': 'INCORRECT PIN',
      '58': 'TRANSACTION NOT PERMITTED',
      '76': 'INVALID PRODUCT CODE',
      '77': 'RECONCILE ERROR',
      '78': 'TRACE NOT FOUND',
      '80': 'BATCH NUMBER NOT FOUND',
      '89': 'BAD TERMINAL ID',
      '91': 'ISSUER SWITCH INOPERATIVE',
      '94': 'DUPLICATE TRANSMISSION',
      '95': 'BATCH UPLOAD',
      '96': 'SYSTEM MALFUNCTION',
      'Y1': 'EMV APPROVED',
      'Y3': 'EMV APPROVED',
      'Z1': 'EMV DECLINED',
      'Z3': 'EMV DECLINED'
    }),
    PROTOCOL: Object.freeze({
      'UC': 'Unknown ECR Command',
      'UI': 'Transaction Unique ID Error',
      'UK': 'Transaction Pending/Unknown',
      'TD': 'Transaction Disabled',
      'TA': 'Transaction Aborted',
      'HE': 'Host Number Error',
      'AO': 'Amount Out of Range',
      'AE': 'Amount Mismatch',
      'SE': 'Terminal Full',
      'EC': 'Card Expired',
      'IC': 'Invalid Card',
      'IQ': 'Invalid QR',
      'PE': 'Pin Entry Error',
      'FE': 'No Transactions To Void',
      'RE': 'Record Error',
      'VB': 'Already Voided',
      'WC': 'Card Number Mismatch',
      'ZE': 'Zero Amount Settlement',
      'BU': 'Batch Not Found',
      'CE': 'Communication Error',
      'LE': 'Line Error'
    }),
  }),

  /** Host number codes */
  HOST_NUMBERS: Object.freeze({
    AUTO_SELECT: '00',
    CARD_ONLY: 'CP',
    DUITNOW_QR: 'DN'
  }),

  /** Card type identifiers */
  CARD_TYPES: Object.freeze({
    UPI: '01',
    VISA: '04',
    MASTERCARD: '05',
    DINERS: '06',
    AMEX: '07',
    DEBIT: '08',
    GENTING_CARD: '10',
    JCB: '11',
    UPI_ALT: '12'
  }),

  /** ECR protocol field lengths */
  FIELD_LENGTHS: Object.freeze({
    COMMAND: 4,
    HOST_NO: 2,
    AMOUNT: 12,
    ADDITIONAL_DATA: 24,
    CARD_NUMBER: 19,
    EXPIRY_DATE: 4,
    STATUS_CODE: 2,
    APPROVAL_CODE: 6,
    RRN: 12,
    TRANSACTION_TRACE: 6,
    BATCH_NUMBER: 6,
    TERMINAL_ID: 8,
    MERCHANT_ID: 15,
    AID: 14,
    TC: 16,
    CARDHOLDER_NAME: 26,
    CARD_TYPE: 2,
    QR_DATA_LENGTH: 4,
    TLV_LENGTH: 3,
    EWALLET_TXN_ID: 40,
    WALLET_TYPE: 2,
    CUSTOMER_NAME_LENGTH_INDICATOR: 3
  }),

  /** QR code provider ID */
  QR_CODE_IDS: Object.freeze({
    EWALLET: '03'
  }),

  /** Receipt printing options */
  RECEIPT_OPTIONS: Object.freeze({
    NO_RECEIPT: '0',
    PRINT_RECEIPT: '1',
    CUSTOMER_ONLY: '2',
    MERCHANT_ONLY: '3'
  })
});

/** Connection types */
export const CONNECTION_TYPES = Object.freeze({
  SERIAL: 'serial',
  TCP: 'tcp'
});

/** Transaction type constants */
export const TRANSACTION_TYPES = Object.freeze({
  SALE: 'sale',
  VOID: 'void', 
  REFUND: 'refund',
  SETTLEMENT: 'settlement',
  PREAUTH: 'preauth',
  ECHO_TEST: 'echo_test',
  WALLET_SALE: 'wallet_sale',
  WALLET_REFUND: 'wallet_refund'
});