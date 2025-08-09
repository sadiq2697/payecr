import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Card, Title, Button, Divider, Chip } from 'react-native-paper';
import { TRANSACTION_TYPES, ECR_CONSTANTS } from '../utils/Constants';

const TransactionForm = ({ ecrService, isConnected, onTransactionResult }) => {
  const [transactionType, setTransactionType] = useState(TRANSACTION_TYPES.SALE);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Common fields
  const [hostNo, setHostNo] = useState('00');
  const [amount, setAmount] = useState('100');
  const [additionalData, setAdditionalData] = useState('');
  
  // Void specific
  const [traceNumber, setTraceNumber] = useState('');
  
  // Refund specific
  const [originalAmount, setOriginalAmount] = useState('');
  
  const transactionTypes = [
    { key: TRANSACTION_TYPES.SALE, label: 'Sale', color: '#4CAF50' },
    { key: TRANSACTION_TYPES.VOID, label: 'Void', color: '#FF9800' },
    { key: TRANSACTION_TYPES.REFUND, label: 'Refund', color: '#2196F3' },
    { key: TRANSACTION_TYPES.SETTLEMENT, label: 'Settlement', color: '#9C27B0' },
    { key: TRANSACTION_TYPES.PREAUTH, label: 'Pre-Auth', color: '#607D8B' },
    { key: TRANSACTION_TYPES.ECHO_TEST, label: 'Echo Test', color: '#795548' },
  ];
  
  const hostOptions = [
    { value: '00', label: 'Auto Select (00)' },
    { value: 'CP', label: 'Card Only (CP)' },
    { value: 'QR', label: 'QR Only (QR)' },
    { value: 'DN', label: 'DuitNow QR (DN)' },
    { value: '01', label: 'Host 01' },
    { value: '02', label: 'Host 02' },
    { value: '03', label: 'Host 03' },
  ];
  
  const handleTransaction = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to ECR terminal first');
      return;
    }
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let result;
      const amountInCents = Math.round(parseFloat(amount) * 100);
      
      switch (transactionType) {
        case TRANSACTION_TYPES.SALE:
          result = await ecrService.performSale({
            hostNo,
            amount: amountInCents,
            additionalData
          });
          break;
          
        case TRANSACTION_TYPES.VOID:
          result = await ecrService.performVoid({
            hostNo,
            traceNumber,
            additionalData
          });
          break;
          
        case TRANSACTION_TYPES.REFUND:
          const originalAmountInCents = Math.round(parseFloat(originalAmount) * 100);
          result = await ecrService.performRefund({
            hostNo,
            amount: amountInCents,
            originalAmount: originalAmountInCents,
            additionalData
          });
          break;
          
        case TRANSACTION_TYPES.SETTLEMENT:
          result = await ecrService.performSettlement({
            hostNo
          });
          break;
          
        case TRANSACTION_TYPES.PREAUTH:
          result = await ecrService.performSale({
            hostNo,
            amount: amountInCents,
            additionalData
          });
          break;
          
        case TRANSACTION_TYPES.ECHO_TEST:
          result = await ecrService.performEchoTest();
          break;
          
        default:
          throw new Error('Unknown transaction type');
      }
      
      onTransactionResult?.(result);
      
      if (result.success) {
        Alert.alert(
          'Transaction Result',
          `${transactionType.toUpperCase()}: ${result.isApproved ? 'APPROVED' : 'DECLINED'}\n` +
          `Status: ${result.statusDescription || result.statusCode}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Transaction Failed', result.error || 'Unknown error');
      }
      
    } catch (error) {
      Alert.alert('Transaction Error', error.message);
      onTransactionResult?.({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const validateInputs = () => {
    if (transactionType === TRANSACTION_TYPES.VOID && !traceNumber) {
      Alert.alert('Validation Error', 'Trace number is required for void transactions');
      return false;
    }
    
    if (transactionType === TRANSACTION_TYPES.REFUND) {
      if (!amount || !originalAmount) {
        Alert.alert('Validation Error', 'Both amount and original amount are required for refund');
        return false;
      }
    }
    
    if ([TRANSACTION_TYPES.SALE, TRANSACTION_TYPES.PREAUTH, TRANSACTION_TYPES.REFUND].includes(transactionType)) {
      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('Validation Error', 'Valid amount is required');
        return false;
      }
    }
    
    return true;
  };
  
  const formatAmount = (value) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleaned;
  };
  
  const renderTransactionTypeSelector = () => (
    <View style={styles.chipContainer}>
      <Text style={styles.sectionTitle}>Transaction Type</Text>
      <View style={styles.chipRow}>
        {transactionTypes.map((type) => (
          <Chip
            key={type.key}
            selected={transactionType === type.key}
            onPress={() => setTransactionType(type.key)}
            style={[
              styles.chip,
              transactionType === type.key && { backgroundColor: type.color }
            ]}
            textStyle={transactionType === type.key && { color: 'white' }}
          >
            {type.label}
          </Chip>
        ))}
      </View>
    </View>
  );
  
  const renderHostSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Host Number</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hostScrollView}>
        {hostOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.hostOption,
              hostNo === option.value && styles.hostOptionSelected
            ]}
            onPress={() => setHostNo(option.value)}
          >
            <Text style={[
              styles.hostOptionText,
              hostNo === option.value && styles.hostOptionTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
  const renderAmountInput = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Amount (RM)</Text>
      <TextInput
        style={styles.textInput}
        value={amount}
        onChangeText={(value) => setAmount(formatAmount(value))}
        placeholder="0.00"
        keyboardType="decimal-pad"
        editable={!isProcessing}
      />
    </View>
  );
  
  const renderVoidFields = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Trace Number</Text>
      <TextInput
        style={styles.textInput}
        value={traceNumber}
        onChangeText={setTraceNumber}
        placeholder="123456"
        keyboardType="numeric"
        maxLength={6}
        editable={!isProcessing}
      />
    </View>
  );
  
  const renderRefundFields = () => (
    <>
      {renderAmountInput()}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Original Amount (RM)</Text>
        <TextInput
          style={styles.textInput}
          value={originalAmount}
          onChangeText={(value) => setOriginalAmount(formatAmount(value))}
          placeholder="0.00"
          keyboardType="decimal-pad"
          editable={!isProcessing}
        />
      </View>
    </>
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
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Transaction Testing</Title>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderTransactionTypeSelector()}
          
          <Divider style={styles.divider} />
          
          {/* Host Selection - Not needed for Echo Test */}
          {transactionType !== TRANSACTION_TYPES.ECHO_TEST && renderHostSelector()}
          
          {/* Transaction-specific fields */}
          {transactionType === TRANSACTION_TYPES.SALE && (
            <>
              {renderAmountInput()}
              {renderAdditionalDataInput()}
            </>
          )}
          
          {transactionType === TRANSACTION_TYPES.VOID && (
            <>
              {renderVoidFields()}
              {renderAdditionalDataInput()}
            </>
          )}
          
          {transactionType === TRANSACTION_TYPES.REFUND && (
            <>
              {renderRefundFields()}
              {renderAdditionalDataInput()}
            </>
          )}
          
          {transactionType === TRANSACTION_TYPES.SETTLEMENT && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Settlement will close the current batch and print a settlement report.
              </Text>
            </View>
          )}
          
          {transactionType === TRANSACTION_TYPES.PREAUTH && (
            <>
              {renderAmountInput()}
              {renderAdditionalDataInput()}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Pre-authorization reserves the amount without capturing it.
                </Text>
              </View>
            </>
          )}
          
          {transactionType === TRANSACTION_TYPES.ECHO_TEST && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Echo test verifies communication with the terminal.
              </Text>
            </View>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Send Transaction Button */}
          <Button
            mode="contained"
            onPress={handleTransaction}
            loading={isProcessing}
            disabled={!isConnected || isProcessing}
            style={styles.sendButton}
          >
            {isProcessing ? 'Processing...' : `Send ${transactionType.replace('_', ' ').toUpperCase()}`}
          </Button>
          
          {!isConnected && (
            <Text style={styles.warningText}>
              Connect to ECR terminal to enable transactions
            </Text>
          )}
        </ScrollView>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  chipContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  hostScrollView: {
    marginTop: 8,
  },
  hostOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  hostOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  hostOptionText: {
    fontSize: 12,
    color: '#333',
  },
  hostOptionTextSelected: {
    color: '#fff',
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
});

export default TransactionForm;

