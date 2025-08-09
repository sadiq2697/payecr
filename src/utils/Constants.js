// ECR Communication Constants
export const ECR_CONSTANTS = {
  // Control Characters
  STX: '\x02',
  ETX: '\x03',
  ENQ: '\x05',
  ACK: '\x06',
  NAK: '\x15',
  EOT: '\x04',
  
  // Communication settings
  BAUD_RATE: 9600,
  SERIAL_DATA_BITS: 8,
  SERIAL_PARITY: 'none',
  SERIAL_STOP_BITS: 1,
  TCP_PORT: 88,
  
  // Timeouts (milliseconds)
  ENQ_TIMEOUT: 3000,
  COMMAND_TIMEOUT: 5000,
  RESPONSE_TIMEOUT: 120000,
  ACK_TIMEOUT: 2000,
  
  // Retry Counts
  ENQ_RETRY_COUNT: 3,
  COMMAND_RETRY_COUNT: 3,
  
  // Commands
  COMMANDS: {
    PREAUTH: 'C100',
    SALE: 'C200',
    VOID: 'C201',
    REFUND: 'C203',
    CASH_ADVANCE: 'C204',
    SALE_WITH_CASH: 'C205',
    TRANSACTION_STATUS: 'C208',
    ADJUST: 'C220',
    OFFLINE_SALE: 'C230',
    WALLET_SALE: 'C290',
    WALLET_REFUND: 'C292',
    SETTLEMENT: 'C500',
    ECHO_TEST: 'C902',
    SCAN_QR: 'C906',
    READ_CARD: 'C910'
  },
  
  // Response Codes
  RESPONSES: {
    PREAUTH: 'R100',
    SALE: 'R200',
    VOID: 'R201',
    REFUND: 'R203',
    CASH_ADVANCE: 'R204',
    SALE_WITH_CASH: 'R205',
    TRANSACTION_STATUS: 'R208',
    ADJUST: 'R220',
    OFFLINE_SALE: 'R230',
    WALLET_SALE: 'R290',
    WALLET_REFUND: 'R292',
    SETTLEMENT: 'R500',
    ECHO_TEST: 'R902',
    SCAN_QR: 'R906',
    READ_CARD: 'R910'
  },
  
  // Status Codes
  STATUS_CODES: {
    SUCCESS: '00',
    REFER_TO_CARD_ISSUER: '01',
    REFER_TO_CARD_ISSUER_SPECIAL: '02',
    INVALID_MERCHANT: '03',
    PICK_UP_CARD: '04',
    DO_NOT_HONOR: '05',
    ERROR: '06',
    PICK_UP_CARD_SPECIAL: '07',
    HONOR_WITH_ID: '08',
    REQUEST_IN_PROGRESS: '09',
    APPROVED_PARTIAL: '10',
    APPROVED_VIP: '11',
    INVALID_TRANSACTION: '12',
    INVALID_AMOUNT: '13',
    INVALID_CARD_NUMBER: '14',
    NO_SUCH_ISSUER: '15'
  },
  
  // Host Numbers
  HOST_NUMBERS: {
    AUTO_SELECT: '00',
    CARD_ONLY: 'CP',
    QR_ONLY: 'QR',
    DUITNOW_QR: 'DN'
  },
  
  // Card Types
  CARD_TYPES: {
    VISA: '01',
    MASTERCARD: '02',
    AMEX: '03',
    DINERS: '04',
    JCB: '05',
    UNIONPAY: '06',
    MYDEBIT: '07',
    UPI: '08'
  },
  
  // Field Lengths
  FIELD_LENGTHS: {
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
    CARD_TYPE: 2
  }
};

export const CONNECTION_TYPES = {
  SERIAL: 'serial',
  TCP: 'tcp'
};

export const TRANSACTION_TYPES = {
  SALE: 'sale',
  VOID: 'void',
  REFUND: 'refund',
  SETTLEMENT: 'settlement',
  PREAUTH: 'preauth',
  ECHO_TEST: 'echo_test'
};