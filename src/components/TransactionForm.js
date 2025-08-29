import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal
} from 'react-native';
import { Card, Button, Divider } from 'react-native-paper';
import NumberPadInput from './NumberPad/NumberPadInput';

// Import your constants - assuming ECR_CONSTANTS is available
import { ECR_CONSTANTS } from '../utils/Constants';

// Updated transaction types with categories
const TRANSACTION_CATEGORIES = {
  CARD: {
    name: 'Card',
    types: {
      SALE: 'CARD_SALE',
      VOID: 'CARD_VOID',
      REFUND: 'CARD_REFUND',
      PREAUTH: 'CARD_PREAUTH'
    }
  },
  E_WALLET: {
    name: 'E-Wallet',
    types: {
      SALE: 'EWALLET_SALE',
      VOID: 'EWALLET_VOID',
      REFUND: 'EWALLET_REFUND'
    }
  },
  DUITNOW: {
    name: 'DuitNow',
    types: {
      SALE: 'DUITNOW_SALE',
      VOID: 'DUITNOW_VOID',
      REFUND: 'DUITNOW_REFUND',
      PREAUTH: 'DUITNOW_PREAUTH'
    }
  },
  SYSTEM: {
    name: 'System',
    types: {
      SETTLEMENT: 'SETTLEMENT',
      ECHO_TEST: 'ECHO_TEST'
    }
  }
};

// E-Wallet QR Code ID - using generic E-Wallet provider
const EWALLET_QR_ID = ECR_CONSTANTS?.QR_CODE_IDS?.EWALLET || '03';

const TransactionForm = ({ ecrService, isConnected, onTransactionResult }) => {
  // State management
  const [transactionCategory, setTransactionCategory] = useState(TRANSACTION_CATEGORIES.CARD.name);
  const [transactionType, setTransactionType] = useState(TRANSACTION_CATEGORIES.CARD.types.SALE);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form fields
  const [amount, setAmount] = useState('100');
  const [additionalData, setAdditionalData] = useState('');
  const [traceNumber, setTraceNumber] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [qrData, setQrData] = useState('');
  // Removed qrProvider state - using default E-Wallet QR ID
  
  // Ref for QR data input to auto-focus for barcode scanner
  const qrInputRef = useRef(null);
  const [printReceipt, setPrintReceipt] = useState(false);
  
  // Custom Alert Modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  // Auto-focus QR input when E-Wallet Sale is selected for barcode scanner
  useEffect(() => {
    if (transactionType === TRANSACTION_CATEGORIES.E_WALLET.types.SALE && qrInputRef.current) {
      // Focus the input so barcode scanner can type into it
      setTimeout(() => {
        qrInputRef.current.focus();
      }, 100);
    }
  }, [transactionType]);

  // Handle QR input focus - keep focused for barcode scanner but prevent keyboard
  const handleQRInputFocus = () => {
    // Field stays focused for barcode scanner input
    // showSoftInputOnFocus={false} prevents keyboard from showing
  };
  
  // Host number is now determined by transaction category
  const getHostNumber = () => {
    switch(transactionCategory) {
      case TRANSACTION_CATEGORIES.CARD.name: return 'CP';
      case TRANSACTION_CATEGORIES.E_WALLET.name: return '00';
      case TRANSACTION_CATEGORIES.DUITNOW.name: return 'DN';
      default: return '00'; // For system transactions
    }
  };

  // Transaction type options by category
  const getTransactionTypesForCategory = (category) => {
    switch(category) {
      case TRANSACTION_CATEGORIES.CARD.name:
        return [
          { key: TRANSACTION_CATEGORIES.CARD.types.SALE, label: 'Sale', color: '#4CAF50' },
          { key: TRANSACTION_CATEGORIES.CARD.types.VOID, label: 'Void', color: '#FF9800' },
          { key: TRANSACTION_CATEGORIES.CARD.types.REFUND, label: 'Refund', color: '#2196F3' },
          { key: TRANSACTION_CATEGORIES.CARD.types.PREAUTH, label: 'Pre-Auth', color: '#607D8B' }
        ];
      case TRANSACTION_CATEGORIES.E_WALLET.name:
        return [
          { key: TRANSACTION_CATEGORIES.E_WALLET.types.SALE, label: 'Sale', color: '#FF5722' },
          { key: TRANSACTION_CATEGORIES.E_WALLET.types.VOID, label: 'Void', color: '#FF9800' },
          { key: TRANSACTION_CATEGORIES.E_WALLET.types.REFUND, label: 'Refund', color: '#2196F3' }
        ];
      case TRANSACTION_CATEGORIES.DUITNOW.name:
        return [
          { key: TRANSACTION_CATEGORIES.DUITNOW.types.SALE, label: 'Sale', color: '#9C27B0' },
          { key: TRANSACTION_CATEGORIES.DUITNOW.types.VOID, label: 'Void', color: '#FF9800' },
          { key: TRANSACTION_CATEGORIES.DUITNOW.types.REFUND, label: 'Refund', color: '#2196F3' },
          { key: TRANSACTION_CATEGORIES.DUITNOW.types.PREAUTH, label: 'Pre-Auth', color: '#607D8B' }
        ];
      case TRANSACTION_CATEGORIES.SYSTEM.name:
        return [
          { key: TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT, label: 'Settlement', color: '#795548' },
          { key: TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST, label: 'Echo Test', color: '#607D8B' }
        ];
      default:
        return [];
    }
  };

  // Handle transaction submission
  const handleTransaction = async () => {
    if (!isConnected) {
      showAlert('Not Connected', 'Please connect to ECR terminal first');
      return;
    }
    
    if (!validateInputs()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let result;
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const hostNo = getHostNumber();
      
      switch (transactionType) {
        // Card transactions
        case TRANSACTION_CATEGORIES.CARD.types.SALE:
          result = await ecrService.performSale({
            hostNo,
            amount: amountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        case TRANSACTION_CATEGORIES.CARD.types.PREAUTH:
          result = await ecrService.performPreAuth({
            hostNo,
            amount: amountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        case TRANSACTION_CATEGORIES.CARD.types.VOID:
          result = await ecrService.performVoid({
            hostNo,
            amount: amountInCents,
            traceNumber,
            additionalData
          });
          break;
          
        case TRANSACTION_CATEGORIES.CARD.types.REFUND:
          const cardOriginalAmountInCents = Math.round(parseFloat(originalAmount) * 100);
          result = await ecrService.performRefund({
            hostNo,
            amount: amountInCents,
            originalAmount: cardOriginalAmountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        // E-Wallet transactions - FIXED VERSION
        case TRANSACTION_CATEGORIES.E_WALLET.types.SALE:
          if (!qrData || qrData.trim() === '') {
            throw new Error('QR Data is required for E-Wallet Sale.');
          }
          
          result = await ecrService.performWalletSale({
            hostNo,
            amount: amountInCents,
            qrCodeId: EWALLET_QR_ID, // Use default E-Wallet QR ID
            qrCode: qrData.trim(),
            additionalData,
            printReceipt
          });
          break;
          
        case TRANSACTION_CATEGORIES.E_WALLET.types.VOID:
          result = await ecrService.performVoid({
            hostNo,
            amount: amountInCents,
            traceNumber,
            additionalData
          });
          break;
          
        case TRANSACTION_CATEGORIES.E_WALLET.types.REFUND:
          const ewalletOriginalAmountInCents = Math.round(parseFloat(originalAmount) * 100);
          result = await ecrService.performRefund({
            hostNo,
            amount: amountInCents,
            originalAmount: ewalletOriginalAmountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        // DuitNow transactions
        case TRANSACTION_CATEGORIES.DUITNOW.types.SALE:
          result = await ecrService.performSale({
            hostNo,
            amount: amountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        case TRANSACTION_CATEGORIES.DUITNOW.types.PREAUTH:
          result = await ecrService.performPreAuth({
            hostNo,
            amount: amountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        case TRANSACTION_CATEGORIES.DUITNOW.types.VOID:
          result = await ecrService.performVoid({
            hostNo,
            amount: amountInCents,
            traceNumber,
            additionalData
          });
          break;
          
        case TRANSACTION_CATEGORIES.DUITNOW.types.REFUND:
          const duitnowOriginalAmountInCents = Math.round(parseFloat(originalAmount) * 100);
          result = await ecrService.performRefund({
            hostNo,
            amount: amountInCents,
            originalAmount: duitnowOriginalAmountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        // System transactions
        case TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT:
          result = await ecrService.performSettlement({
            hostNo: '00'
          });
          break;
          
        case TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST:
          result = await ecrService.performEchoTest();
          break;
          
        default:
          throw new Error(`Unknown transaction type: ${transactionType}`);
      }
      
      onTransactionResult?.(result);
      
      if (result.success) {
        showAlert(
          'Transaction Result',
          `${transactionType.replace('_', ' ')}: ${result.isApproved ? 'APPROVED' : 'DECLINED'}\n` +
          `Status: ${result.statusDescription || result.statusCode}`
        );
      } else {
        showAlert('Transaction Failed', result.error || 'Unknown error');
      }
      
    } catch (error) {
      showAlert('Transaction Error', error.message);
      onTransactionResult?.({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Input validation
  const validateInputs = () => {
    // Common validations
    if ([
      TRANSACTION_CATEGORIES.CARD.types.VOID,
      TRANSACTION_CATEGORIES.E_WALLET.types.VOID,
      TRANSACTION_CATEGORIES.DUITNOW.types.VOID
    ].includes(transactionType)) {
      if (!traceNumber) {
        showAlert('Validation Error', 'Trace number is required for void transactions');
        return false;
      }
      if (!amount || parseFloat(amount) <= 0) {
        showAlert('Validation Error', 'Valid amount is required for void transactions');
        return false;
      }
    }
    
    if ([
      TRANSACTION_CATEGORIES.CARD.types.REFUND,
      TRANSACTION_CATEGORIES.E_WALLET.types.REFUND,
      TRANSACTION_CATEGORIES.DUITNOW.types.REFUND
    ].includes(transactionType)) {
      if (!amount || !originalAmount) {
        showAlert('Validation Error', 'Both amount and original amount are required for refund');
        return false;
      }
    }
    
    if ([
      TRANSACTION_CATEGORIES.CARD.types.SALE,
      TRANSACTION_CATEGORIES.CARD.types.PREAUTH,
      TRANSACTION_CATEGORIES.E_WALLET.types.SALE,
      TRANSACTION_CATEGORIES.DUITNOW.types.SALE,
      TRANSACTION_CATEGORIES.DUITNOW.types.PREAUTH
    ].includes(transactionType)) {
      if (!amount || parseFloat(amount) <= 0) {
        showAlert('Validation Error', 'Valid amount is required');
        return false;
      }
    }

    // E-Wallet specific validation
    if (transactionType === TRANSACTION_CATEGORIES.E_WALLET.types.SALE) {
      if (!qrData || qrData.trim() === '') {
        showAlert('Validation Error', 'QR Data is required for E-Wallet Sale transactions.');
        return false;
      }
    }
    
    return true;
  };
  
  // Helper functions
  const formatAmount = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    return cleaned;
  };

  // Render functions
  const renderCategorySelector = () => (
    <View style={styles.categoryContainer}>
      <Text style={styles.sectionTitle}>Transaction Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Object.values(TRANSACTION_CATEGORIES).map((category) => (
          <TouchableOpacity
            key={category.name}
            style={[
              styles.categoryOption,
              transactionCategory === category.name && styles.categoryOptionSelected
            ]}
            onPress={() => {
              setTransactionCategory(category.name);
              // Set default transaction type for the category
              const firstType = Object.keys(category.types)[0];
              setTransactionType(category.types[firstType]);
            }}
          >
            <Text style={[
              styles.categoryOptionText,
              transactionCategory === category.name && styles.categoryOptionTextSelected
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTransactionTypeSelector = () => (
    <View style={styles.typeContainer}>
      <Text style={styles.sectionTitle}>Transaction Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {getTransactionTypesForCategory(transactionCategory).map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[
              styles.typeOption,
              transactionType === type.key && { ...styles.typeOptionSelected, backgroundColor: type.color }
            ]}
            onPress={() => setTransactionType(type.key)}
          >
            <Text style={[
              styles.typeOptionText,
              transactionType === type.key && styles.typeOptionTextSelected
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderHostIndicator = () => (
    <View style={styles.hostIndicatorContainer}>
      <Text style={styles.hostIndicatorLabel}>Host Number</Text>
      <View style={styles.hostIndicator}>
        <Text style={styles.hostIndicatorText}>{getHostNumber()}</Text>
      </View>
    </View>
  );

  const renderAmountInput = () => (
    <View style={styles.inputContainer}>
      <NumberPadInput
        label="Amount (RM)"
        value={amount}
        onChangeText={(value) => setAmount(formatAmount(value))}
        placeholder="0.00"
        allowDecimal={true}
        decimalPlaces={2}
        disabled={isProcessing}
        maxLength={10}
        theme="light"
        style={styles.numberInput}
      />
    </View>
  );
  
  const renderVoidFields = () => (
    <View style={styles.inputContainer}>
      <NumberPadInput
        label="Trace Number *"
        value={traceNumber}
        onChangeText={setTraceNumber}
        placeholder="123456"
        allowDecimal={false}
        disabled={isProcessing}
        maxLength={6}
        theme="light"
        style={styles.numberInput}
      />
    </View>
  );
  
  const renderRefundFields = () => (
    <View style={styles.inputContainer}>
      <NumberPadInput
        label="Original Amount (RM)"
        value={originalAmount}
        onChangeText={(value) => setOriginalAmount(formatAmount(value))}
        placeholder="0.00"
        allowDecimal={true}
        decimalPlaces={2}
        disabled={isProcessing}
        maxLength={10}
        theme="light"
        style={styles.numberInput}
      />
    </View>
  );
  
  const renderQRDataInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Scanned QR Code *</Text>
      <TextInput
        ref={qrInputRef}
        style={[styles.textInput, styles.qrTextInput]}
        value={qrData}
        onChangeText={setQrData}
        placeholder="QR code data will auto-fill when scanned - keyboard disabled"
        multiline={true}
        numberOfLines={3}
        textAlignVertical="top"
        editable={!isProcessing}
        showSoftInputOnFocus={false}
        selectTextOnFocus={true}
        onFocus={handleQRInputFocus}
      />
      <Text style={styles.helperText}>Barcode scanner will automatically capture scanned QR code data</Text>
    </View>
  );


  const renderAdditionalDataInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Additional Data (Optional)</Text>
      <TextInput
        style={styles.textInput}
        value={additionalData}
        onChangeText={setAdditionalData}
        placeholder="Additional transaction data"
        maxLength={24}
        editable={!isProcessing}
      />
      <Text style={styles.helperText}>Max 24 characters</Text>
    </View>
  );

  const renderReceiptControl = () => (
    <View style={styles.receiptContainer}>
      <View style={styles.receiptLabelContainer}>
        <Text style={styles.inputLabel}>Print Receipt</Text>
        <Text style={styles.receiptHelperText}>
          {printReceipt ? 'Receipt will be printed' : 'No receipt will be printed'}
        </Text>
      </View>
      <Switch
        value={printReceipt}
        onValueChange={setPrintReceipt}
        trackColor={{ false: '#767577', true: '#6200EA' }}
        thumbColor={printReceipt ? '#FFFFFF' : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
        disabled={isProcessing}
      />
    </View>
  );

  // Main render
  return (
    <>
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.cardTitle}>Transaction Testing</Text>
        
        <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
          {renderCategorySelector()}
          {renderTransactionTypeSelector()}
          
          <Divider style={styles.divider} />
          
          {renderHostIndicator()}
          
          {/* Common fields */}
          {![TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT, TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST].includes(transactionType) && (
            <>
              {renderAmountInput()}
              
              {/* Void fields */}
              {[
                TRANSACTION_CATEGORIES.CARD.types.VOID,
                TRANSACTION_CATEGORIES.E_WALLET.types.VOID,
                TRANSACTION_CATEGORIES.DUITNOW.types.VOID
              ].includes(transactionType) && renderVoidFields()}
              
              {/* Refund fields */}
              {[
                TRANSACTION_CATEGORIES.CARD.types.REFUND,
                TRANSACTION_CATEGORIES.E_WALLET.types.REFUND,
                TRANSACTION_CATEGORIES.DUITNOW.types.REFUND
              ].includes(transactionType) && renderRefundFields()}
              
              {/* E-Wallet Sale fields */}
              {transactionType === TRANSACTION_CATEGORIES.E_WALLET.types.SALE && (
                <>
                  {renderQRDataInput()}
                </>
              )}
              
              {renderAdditionalDataInput()}
              {renderReceiptControl()}
            </>
          )}
          
          {/* System transaction info messages */}
          {transactionType === TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Settlement will close the current batch and print a settlement report.
              </Text>
            </View>
          )}
          
          {transactionType === TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Echo test verifies communication with the terminal.
              </Text>
            </View>
          )}
          
          
          <Divider style={styles.divider} />
          
          <Button
            mode="contained"
            onPress={handleTransaction}
            loading={isProcessing}
            disabled={!isConnected || isProcessing}
            style={styles.sendButton}
          >
            {isProcessing ? 'Processing...' : `Send ${transactionType.replace('_', ' ')}`}
          </Button>
          
          {!isConnected && (
            <Text style={styles.warningText}>
              Connect to ECR terminal to enable transactions
            </Text>
          )}
        </ScrollView>
      </Card.Content>
    </Card>
    
    {/* Custom Alert Modal */}
    <Modal
      visible={showAlertModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowAlertModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.alertModalContent}>
          <Text style={styles.modalTitle}>{alertTitle}</Text>
          <Text style={styles.modalSubtitle}>{alertMessage}</Text>
          
          <Button 
            mode="contained" 
            onPress={() => setShowAlertModal(false)}
            style={styles.alertButton}
          >
            OK
          </Button>
        </View>
      </View>
    </Modal>
    </>
  );
};

// Styles
const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  typeContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#333',
  },
  categoryOptionTextSelected: {
    color: '#fff',
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  typeOptionSelected: {
    borderColor: 'transparent',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  hostIndicatorContainer: {
    marginBottom: 16,
  },
  hostIndicatorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  hostIndicator: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  hostIndicatorText: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    marginVertical: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  qrTextInput: {
    minHeight: 80,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
  },
  sendButton: {
    paddingVertical: 8,
    marginTop: 16,
  },
  warningText: {
    textAlign: 'center',
    color: '#f44336',
    fontSize: 12,
    marginTop: 8,
  },
  receiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
  },
  receiptLabelContainer: {
    flex: 1,
  },
  receiptHelperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  alertButton: {
    marginTop: 16,
  },
  numberInput: {
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
});

export default TransactionForm; 