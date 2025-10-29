import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  Dimensions
} from 'react-native';
import { Card, Button, Chip } from 'react-native-paper';
import NumberPadInput from './NumberPad/NumberPadInput';
import ResponsiveGrid from './UI/ResponsiveGrid';
import DashboardCard from './UI/DashboardCard';
// Removed unused imports

// Updated transaction types with categories
const TRANSACTION_CATEGORIES = {
  CARD: {
    name: 'Card',
    color: '#2196F3',
    types: {
      SALE: 'CARD_SALE',
      VOID: 'CARD_VOID',
      REFUND: 'CARD_REFUND',
      PREAUTH: 'CARD_PREAUTH'
    }
  },
  E_WALLET: {
    name: 'E-Wallet',
    color: '#4CAF50',
    types: {
      SALE: 'EWALLET_SALE',
      VOID: 'EWALLET_VOID',
      REFUND: 'EWALLET_REFUND'
    }
  },
  // DUITNOW: {  // DISABLED - Feature not usable
  //   name: 'DuitNow',
  //   color: '#FF9800',
  //   types: {
  //     SALE: 'DUITNOW_SALE',
  //     VOID: 'DUITNOW_VOID',
  //     REFUND: 'DUITNOW_REFUND',
  //     PREAUTH: 'DUITNOW_PREAUTH'
  //   }
  // },
  SYSTEM: {
    name: 'System',
    color: '#9C27B0',
    types: {
      SETTLEMENT: 'SETTLEMENT',
      ECHO_TEST: 'ECHO_TEST'
    }
  }
};

const TransactionForm = ({ ecrService, isConnected, onTransactionResult }) => {
  // State management
  const [transactionCategory, setTransactionCategory] = useState(TRANSACTION_CATEGORIES.CARD.name);
  const [transactionType, setTransactionType] = useState(TRANSACTION_CATEGORIES.CARD.types.SALE);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form data
  const [amount, setAmount] = useState('100');
  const [additionalData, setAdditionalData] = useState('');
  const [traceNumber, setTraceNumber] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [qrData, setQrData] = useState('');
  const [printReceipt, setPrintReceipt] = useState(false);
  
  // Modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  
  // Refs
  const qrInputRef = useRef(null);
  
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleQRInputFocus = () => {
    setQrData('');
    setTimeout(() => {
      qrInputRef.current?.focus();
    }, 100);
  };

  const getHostNumber = () => {
    const hostMappings = {
      [TRANSACTION_CATEGORIES.CARD.types.SALE]: 'CP',
      [TRANSACTION_CATEGORIES.CARD.types.VOID]: 'CP',
      [TRANSACTION_CATEGORIES.CARD.types.REFUND]: 'CP',
      [TRANSACTION_CATEGORIES.CARD.types.PREAUTH]: 'CP',
      [TRANSACTION_CATEGORIES.E_WALLET.types.SALE]: '00',
      [TRANSACTION_CATEGORIES.E_WALLET.types.VOID]: '00',
      [TRANSACTION_CATEGORIES.E_WALLET.types.REFUND]: '00',
      // [TRANSACTION_CATEGORIES.DUITNOW.types.SALE]: 'DN',  // DISABLED
      // [TRANSACTION_CATEGORIES.DUITNOW.types.VOID]: 'DN',  // DISABLED
      // [TRANSACTION_CATEGORIES.DUITNOW.types.REFUND]: 'DN',  // DISABLED
      // [TRANSACTION_CATEGORIES.DUITNOW.types.PREAUTH]: 'DN',  // DISABLED
      [TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT]: 'CP',
      [TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST]: 'CP'
    };
    return hostMappings[transactionType] || 'CP';
  };

  const getTransactionTypesForCategory = (category) => {
    return Object.values(TRANSACTION_CATEGORIES).find(cat => cat.name === category)?.types || {};
  };

  const handleTransaction = async () => {
    if (!validateInputs()) return;
    
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
          
        // E-Wallet transactions
        case TRANSACTION_CATEGORIES.E_WALLET.types.SALE:
          console.log('=== TRANSACTION FORM E-WALLET DEBUG START ===');
          console.log('E-wallet transaction type:', TRANSACTION_CATEGORIES.E_WALLET.types.SALE);
          console.log('QR Data:', qrData);
          console.log('Transaction params:', { hostNo, amountInCents, additionalData, printReceipt });
          
          if (!qrData || qrData.trim() === '') {
            throw new Error('QR Data is required for E-Wallet Sale.');
          }
          
          console.log('Calling performEWalletSale...');
          result = await ecrService.performEWalletSale({
            hostNo,
            amount: amountInCents,
            qrData: qrData.trim(),
            additionalData,
            printReceipt
          });
          
          console.log('E-wallet result received:', JSON.stringify(result, null, 2));
          console.log('=== TRANSACTION FORM E-WALLET DEBUG END ===');
          break;
          
        case TRANSACTION_CATEGORIES.E_WALLET.types.VOID:
          result = await ecrService.performEWalletVoid({
            hostNo,
            amount: amountInCents,
            traceNumber,
            additionalData
          });
          break;
          
        case TRANSACTION_CATEGORIES.E_WALLET.types.REFUND:
          const ewalletOriginalAmountInCents = Math.round(parseFloat(originalAmount) * 100);
          result = await ecrService.performEWalletRefund({
            hostNo,
            amount: amountInCents,
            originalAmount: ewalletOriginalAmountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        // DuitNow transactions - DISABLED (Feature not usable)
        /*
        case TRANSACTION_CATEGORIES.DUITNOW.types.SALE:
          result = await ecrService.performDuitNowSale({
            hostNo,
            amount: amountInCents,
            additionalData,
            printReceipt
          });
          break;
          
        case TRANSACTION_CATEGORIES.DUITNOW.types.VOID:
          result = await ecrService.performDuitNowVoid({
            hostNo,
            amount: amountInCents,
            traceNumber,
            additionalData
          });
          break;
          
        case TRANSACTION_CATEGORIES.DUITNOW.types.REFUND:
          const duitnowOriginalAmountInCents = Math.round(parseFloat(originalAmount) * 100);
          result = await ecrService.performDuitNowRefund({
            hostNo,
            amount: amountInCents,
            originalAmount: duitnowOriginalAmountInCents,
            additionalData,
            printReceipt
          });
          break;
        */
          
        // System transactions
        case TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT:
          result = await ecrService.performSettlement({ hostNo });
          break;
          
        case TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST:
          result = await ecrService.performEchoTest();
          break;
          
        default:
          throw new Error('Unsupported transaction type');
      }
      
      onTransactionResult?.(result);
      
      if (result.success) {
        showAlert('Success', `Transaction completed successfully!${result.message ? '\n' + result.message : ''}`);
      } else {
        showAlert('Transaction Failed', result.message || 'Transaction failed');
      }
      
    } catch (error) {
      console.error('Transaction error:', error);
      showAlert('Error', error.message || 'An error occurred during the transaction');
      onTransactionResult?.({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const validateInputs = () => {
    // System transactions don't need validation
    if ([TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT, TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST].includes(transactionType)) {
      return true;
    }
    
    // Amount validation
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Validation Error', 'Please enter a valid amount');
      return false;
    }
    
    // Void transaction validation
    if ([TRANSACTION_CATEGORIES.CARD.types.VOID, TRANSACTION_CATEGORIES.E_WALLET.types.VOID].includes(transactionType)) {
      if (!traceNumber) {
        showAlert('Validation Error', 'Trace number is required for void transactions');
        return false;
      }
    }
    
    // Refund transaction validation
    if ([TRANSACTION_CATEGORIES.CARD.types.REFUND, TRANSACTION_CATEGORIES.E_WALLET.types.REFUND].includes(transactionType)) {
      if (!originalAmount || parseFloat(originalAmount) <= 0) {
        showAlert('Validation Error', 'Please enter a valid original amount for refund');
        return false;
      }
    }
    
    // E-Wallet sale validation
    if (transactionType === TRANSACTION_CATEGORIES.E_WALLET.types.SALE) {
      if (!qrData || qrData.trim() === '') {
        showAlert('Validation Error', 'QR data is required for E-Wallet transactions');
        return false;
      }
    }
    
    return true;
  };

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

  // Render functions for compact layout
  const renderCategoryTabs = () => (
    <DashboardCard
      title="Transaction Category"
      subtitle="Select transaction type category"
      icon="view-grid"
      cardType="default"
    >
      <View style={styles.categoryTabs}>
        {Object.values(TRANSACTION_CATEGORIES).map(category => (
          <TouchableOpacity
            key={category.name}
            style={[
              styles.categoryTab,
              transactionCategory === category.name && [
                styles.categoryTabActive,
                { backgroundColor: category.color }
              ]
            ]}
            onPress={() => {
              setTransactionCategory(category.name);
              const firstType = Object.values(category.types)[0];
              setTransactionType(firstType);
            }}
          >
            <Text style={[
              styles.categoryTabText,
              transactionCategory === category.name && styles.categoryTabTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </DashboardCard>
  );

  const renderTransactionTypes = () => {
    const types = getTransactionTypesForCategory(transactionCategory);
    return (
      <DashboardCard
        title="Transaction Type"
        subtitle={`Available ${transactionCategory} transactions`}
        icon="card-multiple"
        cardType="default"
      >
        <View style={styles.transactionTypes}>
          {Object.entries(types).map(([key, value]) => (
            <Chip
              key={value}
              selected={transactionType === value}
              onPress={() => setTransactionType(value)}
              style={[
                styles.typeChip,
                transactionType === value && styles.typeChipSelected
              ]}
              textStyle={[
                styles.typeChipText,
                transactionType === value && styles.typeChipTextSelected
              ]}
              compact
            >
              {key}
            </Chip>
          ))}
        </View>
      </DashboardCard>
    );
  };

  const renderInputFields = () => {
    const isSystemTransaction = [
      TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT,
      TRANSACTION_CATEGORIES.SYSTEM.types.ECHO_TEST
    ].includes(transactionType);

    const isVoidTransaction = [
      TRANSACTION_CATEGORIES.CARD.types.VOID,
      TRANSACTION_CATEGORIES.E_WALLET.types.VOID
    ].includes(transactionType);

    const isRefundTransaction = [
      TRANSACTION_CATEGORIES.CARD.types.REFUND,
      TRANSACTION_CATEGORIES.E_WALLET.types.REFUND
    ].includes(transactionType);

    const isEWalletSale = transactionType === TRANSACTION_CATEGORIES.E_WALLET.types.SALE;

    if (isSystemTransaction) {
      return (
        <DashboardCard
          title="System Transaction"
          subtitle="System operations require no additional input"
          icon="cog"
          cardType="info"
        >
          <View style={styles.systemInfo}>
            <Text style={styles.systemInfoText}>
              {transactionType === TRANSACTION_CATEGORIES.SYSTEM.types.SETTLEMENT 
              ? 'Settlement will close the current batch and print a settlement report.'
              : 'Echo test verifies communication with the terminal.'
            }
          </Text>
        </View>
        </DashboardCard>
      );
    }

    return (
      <DashboardCard
        title="Transaction Details"
        subtitle="Enter transaction information"
        icon="form-textbox"
        cardType="default"
      >
        <View style={styles.inputGrid}>
        {/* Row 1: Amount and Additional Data */}
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <NumberPadInput
              label="Amount (RM)"
              value={amount}
              onChangeText={(value) => setAmount(formatAmount(value))}
              placeholder="0.00"
              currency="RM"
              allowDecimal={true}
              decimalPlaces={2}
              disabled={isProcessing}
              style={styles.compactInput}
            />
          </View>
          <View style={styles.inputHalf}>
            <TextInput
              style={styles.textInput}
              placeholder="Additional Data"
              value={additionalData}
              onChangeText={setAdditionalData}
              editable={!isProcessing}
              multiline={false}
            />
          </View>
        </View>

        {/* Row 2: Conditional fields based on transaction type */}
        <View style={styles.inputRow}>
          {isVoidTransaction && (
            <View style={styles.inputHalf}>
              <NumberPadInput
                label="Trace Number"
                value={traceNumber}
                onChangeText={setTraceNumber}
                placeholder="123456"
                allowDecimal={false}
                disabled={isProcessing}
                style={styles.compactInput}
              />
            </View>
          )}
          
          {isRefundTransaction && (
            <View style={styles.inputHalf}>
              <NumberPadInput
                label="Original Amount (RM)"
                value={originalAmount}
                onChangeText={(value) => setOriginalAmount(formatAmount(value))}
                placeholder="0.00"
                currency="RM"
                allowDecimal={true}
                decimalPlaces={2}
                disabled={isProcessing}
                style={styles.compactInput}
              />
            </View>
          )}

          {isEWalletSale && (
            <View style={styles.inputHalf}>
              <TextInput
                ref={qrInputRef}
                style={styles.textInput}
                placeholder="Scanned QR Code"
                value={qrData}
                onChangeText={setQrData}
                onFocus={handleQRInputFocus}
                editable={!isProcessing}
                autoCapitalize="none"
                showSoftInputOnFocus={false}
              />
            </View>
          )}

          {/* Receipt toggle */}
          <View style={styles.receiptToggle}>
            <Text style={styles.receiptLabel}>Print Receipt</Text>
            <Switch
              value={printReceipt}
              onValueChange={setPrintReceipt}
              trackColor={{ false: '#767577', true: '#6200EA' }}
              thumbColor={printReceipt ? '#FFFFFF' : '#f4f3f4'}
              disabled={isProcessing}
            />
          </View>
        </View>
        </View>
      </DashboardCard>
    );
  };

  return (
    <ResponsiveGrid scrollable={true}>
      <DashboardCard
        title="Transaction Form"
        subtitle="Process ECR transactions"
        icon="credit-card"
        cardType="action"
        fullWidth={true}
      >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Transaction Testing</Text>
            <View style={styles.hostIndicator}>
              <Text style={styles.hostText}>Host: {getHostNumber()}</Text>
              <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
            </View>
          </View>

          {/* Category Tabs */}
          {renderCategoryTabs()}

          {/* Transaction Types */}
          {renderTransactionTypes()}

          {/* Input Fields */}
          {renderInputFields()}
      </DashboardCard>

      {/* Action Button */}
      <DashboardCard
        title="Process Transaction"
        subtitle="Execute the selected transaction"
        icon="send"
        cardType="action"
      >
        <Button
          mode="contained"
          onPress={handleTransaction}
          loading={isProcessing}
          disabled={!isConnected || isProcessing}
          style={styles.actionButton}
          contentStyle={styles.actionButtonContent}
        >
          {isProcessing ? 'Processing...' : `Execute ${transactionType.replace('_', ' ')}`}
        </Button>

        {!isConnected && (
          <Text style={styles.warningText}>
            Connect to ECR terminal to enable transactions
          </Text>
        )}
      </DashboardCard>

      {/* Alert Modal */}
      <Modal
        visible={showAlertModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModal}>
            <Text style={styles.alertTitle}>{alertTitle}</Text>
            <Text style={styles.alertMessage}>{alertMessage}</Text>
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
    </ResponsiveGrid>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 8,
    flex: 1,
    elevation: 4,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  hostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hostText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#F44336',
  },
  
  // Category Tabs
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 4,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#2196F3',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  categoryTabTextActive: {
    color: '#fff',
  },

  // Transaction Types
  transactionTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  typeChip: {
    backgroundColor: '#f5f5f5',
    marginRight: 0,
  },
  typeChipSelected: {
    backgroundColor: '#e3f2fd',
  },
  typeChipText: {
    fontSize: 11,
    color: '#666',
  },
  typeChipTextSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },

  // Input Grid
  inputGrid: {
    flex: 1,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  inputHalf: {
    flex: 1,
  },
  compactInput: {
    marginVertical: 0,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    height: 40,
  },
  receiptToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // System Info
  systemInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
  },
  systemInfoText: {
    fontSize: 13,
    color: '#495057',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Action Button
  actionButton: {
    marginTop: 8,
  },
  actionButtonContent: {
    height: 48,
  },
  warningText: {
    color: '#f44336',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  alertButton: {
    marginTop: 8,
  },
});

export default TransactionForm;