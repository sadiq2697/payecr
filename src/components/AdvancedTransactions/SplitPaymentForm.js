import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, Divider, Chip, IconButton } from 'react-native-paper';
import NumberPadInput from '../NumberPad/NumberPadInput';
import useAlert from '../../hooks/useAlert';

const SplitPaymentForm = ({ ecrService, onTransactionResult, advancedTransactionService }) => {
  const [totalAmount, setTotalAmount] = useState('');
  const [payments, setPayments] = useState([
    { id: 1, method: 'card', amount: '', hostNo: '', qrCode: '' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reference, setReference] = useState('');

  const { showSuccess, showError, showWarning } = useAlert();

  const paymentMethods = [
    { value: 'card', label: 'Card Payment', icon: '💳', hostNo: 'CP' },
    { value: 'ewallet', label: 'E-Wallet', icon: '📱', hostNo: '00' },
    { value: 'duitnow', label: 'DuitNow', icon: '🏦', hostNo: 'DN' },
  ];

  const addPayment = useCallback(() => {
    if (payments.length >= 5) {
      showWarning('Limit Reached', 'Maximum 5 payment methods allowed');
      return;
    }

    const newPayment = {
      id: Date.now(),
      method: 'card',
      amount: '',
      hostNo: '',
      qrCode: '',
    };

    setPayments(prev => [...prev, newPayment]);
  }, [payments.length, showWarning]);

  const removePayment = useCallback((paymentId) => {
    if (payments.length <= 2) {
      showWarning('Minimum Required', 'At least 2 payment methods required for split payment');
      return;
    }

    setPayments(prev => prev.filter(p => p.id !== paymentId));
  }, [payments.length, showWarning]);

  const updatePayment = useCallback((paymentId, field, value) => {
    setPayments(prev => prev.map(payment => 
      payment.id === paymentId 
        ? { ...payment, [field]: value }
        : payment
    ));
  }, []);

  const calculateRemainingAmount = useCallback(() => {
    const total = parseFloat(totalAmount) || 0;
    const allocated = payments.reduce((sum, payment) => 
      sum + (parseFloat(payment.amount) || 0), 0
    );
    return Math.max(0, total - allocated);
  }, [totalAmount, payments]);

  const autoDistributeRemaining = useCallback(() => {
    const remaining = calculateRemainingAmount();
    if (remaining <= 0) return;

    const emptyPayments = payments.filter(p => !p.amount || parseFloat(p.amount) === 0);
    if (emptyPayments.length === 0) return;

    const amountPerPayment = (remaining / emptyPayments.length).toFixed(2);
    
    setPayments(prev => prev.map(payment => {
      if (emptyPayments.some(ep => ep.id === payment.id)) {
        return { ...payment, amount: amountPerPayment };
      }
      return payment;
    }));
  }, [payments, calculateRemainingAmount]);

  const validateSplitPayment = useCallback(() => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      showError('Validation Error', 'Total amount must be greater than 0');
      return false;
    }

    if (payments.length < 2) {
      showError('Validation Error', 'At least 2 payment methods required');
      return false;
    }

    const total = parseFloat(totalAmount);
    const paymentSum = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);

    if (Math.abs(paymentSum - total) > 0.01) {
      showError('Validation Error', `Payment amounts (RM ${paymentSum.toFixed(2)}) don't match total amount (RM ${total.toFixed(2)})`);
      return false;
    }

    // Validate each payment
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      
      if (!payment.amount || parseFloat(payment.amount) <= 0) {
        showError('Validation Error', `Payment ${i + 1}: Amount is required and must be greater than 0`);
        return false;
      }

      if (payment.method === 'ewallet' && !payment.qrCode.trim()) {
        showError('Validation Error', `Payment ${i + 1}: QR code is required for E-Wallet`);
        return false;
      }
    }

    return true;
  }, [totalAmount, payments, showError]);

  const processSplitPayment = useCallback(async () => {
    if (!validateSplitPayment()) return;

    setIsProcessing(true);

    try {
      const splitConfig = {
        totalAmount: Math.round(parseFloat(totalAmount) * 100), // Convert to cents
        payments: payments.map(payment => ({
          method: payment.method,
          amount: Math.round(parseFloat(payment.amount) * 100),
          hostNo: payment.hostNo || paymentMethods.find(m => m.value === payment.method)?.hostNo,
          qrCode: payment.qrCode,
          additionalData: reference,
        })),
        reference,
        additionalData: `Split payment: ${payments.length} methods`,
      };

      const result = await advancedTransactionService.processSplitPayment(splitConfig);

      if (result.success) {
        showSuccess(
          'Split Payment Completed',
          `Transaction ${result.transactionId} processed successfully!\nTotal: RM ${(result.totalAmount / 100).toFixed(2)}`
        );

        // Reset form
        setTotalAmount('');
        setPayments([{ id: 1, method: 'card', amount: '', hostNo: '', qrCode: '' }]);
        setReference('');

        onTransactionResult?.(result);
      } else {
        showError('Split Payment Failed', result.error || 'Unknown error occurred');
        onTransactionResult?.(result);
      }

    } catch (error) {
      showError('Transaction Error', error.message || 'Failed to process split payment');
      onTransactionResult?.({ success: false, error: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [validateSplitPayment, totalAmount, payments, reference, advancedTransactionService, showSuccess, showError, onTransactionResult, paymentMethods]);

  const getMethodConfig = (method) => paymentMethods.find(m => m.value === method);

  const renderPaymentMethod = (payment, index) => {
    const methodConfig = getMethodConfig(payment.method);

    return (
      <Card key={payment.id} style={styles.paymentCard}>
        <Card.Content>
          <View style={styles.paymentHeader}>
            <View style={styles.paymentTitleContainer}>
              <Text style={styles.paymentIcon}>{methodConfig?.icon}</Text>
              <Text style={styles.paymentTitle}>Payment {index + 1}</Text>
            </View>
            
            {payments.length > 2 && (
              <IconButton
                icon="delete"
                size={20}
                iconColor="#f44336"
                onPress={() => removePayment(payment.id)}
              />
            )}
          </View>

          {/* Payment Method Selection */}
          <Text style={styles.fieldLabel}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodSelector}>
            {paymentMethods.map(method => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.methodOption,
                  payment.method === method.value && styles.methodOptionSelected
                ]}
                onPress={() => updatePayment(payment.id, 'method', method.value)}
              >
                <Text style={styles.methodIcon}>{method.icon}</Text>
                <Text style={[
                  styles.methodText,
                  payment.method === method.value && styles.methodTextSelected
                ]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Amount Input */}
          <NumberPadInput
            label={`Amount (RM) - Payment ${index + 1}`}
            value={payment.amount}
            onChangeText={(value) => updatePayment(payment.id, 'amount', value)}
            placeholder="0.00"
            allowDecimal={true}
            decimalPlaces={2}
            disabled={isProcessing}
            maxLength={8}
            theme="light"
            style={styles.amountInput}
          />

          {/* E-Wallet QR Code Input */}
          {payment.method === 'ewallet' && (
            <View style={styles.qrInputContainer}>
              <Text style={styles.fieldLabel}>E-Wallet QR Code *</Text>
              <TouchableOpacity
                style={styles.qrInput}
                onPress={() => {
                  // Focus QR input for barcode scanner
                  Alert.alert(
                    'QR Code Scanner',
                    'Use your barcode scanner to scan the QR code. The scanned data will be automatically filled.',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Text style={payment.qrCode ? styles.qrInputTextFilled : styles.qrInputTextEmpty}>
                  {payment.qrCode || 'Tap to scan QR code with barcode scanner'}
                </Text>
              </TouchableOpacity>
              {payment.qrCode && (
                <TouchableOpacity
                  style={styles.clearQrButton}
                  onPress={() => updatePayment(payment.id, 'qrCode', '')}
                >
                  <Text style={styles.clearQrText}>Clear QR Code</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Host Number Display */}
          <View style={styles.hostIndicator}>
            <Text style={styles.hostLabel}>Host Number: </Text>
            <Chip mode="outlined" compact style={styles.hostChip}>
              {payment.hostNo || methodConfig?.hostNo || 'Auto'}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const remainingAmount = calculateRemainingAmount();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>💰 Split Payment</Text>
          
          {/* Total Amount */}
          <NumberPadInput
            label="Total Amount (RM)"
            value={totalAmount}
            onChangeText={setTotalAmount}
            placeholder="0.00"
            allowDecimal={true}
            decimalPlaces={2}
            disabled={isProcessing}
            maxLength={10}
            theme="light"
            style={styles.totalAmountInput}
          />

          {/* Reference (Optional) */}
          <View style={styles.referenceContainer}>
            <Text style={styles.fieldLabel}>Reference (Optional)</Text>
            <TouchableOpacity
              style={styles.referenceInput}
              onPress={() => {
                Alert.prompt(
                  'Transaction Reference',
                  'Enter a reference for this split payment:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'OK', onPress: (text) => setReference(text || '') }
                  ],
                  'plain-text',
                  reference
                );
              }}
            >
              <Text style={reference ? styles.referenceTextFilled : styles.referenceTextEmpty}>
                {reference || 'Tap to add reference'}
              </Text>
            </TouchableOpacity>
          </View>

          <Divider style={styles.divider} />

          {/* Payment Methods */}
          <View style={styles.paymentsHeader}>
            <Text style={styles.paymentsTitle}>Payment Methods</Text>
            <Button
              mode="outlined"
              icon="plus"
              onPress={addPayment}
              disabled={payments.length >= 5 || isProcessing}
              compact
            >
              Add Payment
            </Button>
          </View>

          {payments.map((payment, index) => renderPaymentMethod(payment, index))}

          {/* Summary */}
          {totalAmount && (
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text style={styles.summaryTitle}>Summary</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount:</Text>
                  <Text style={styles.summaryValue}>RM {parseFloat(totalAmount || 0).toFixed(2)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Allocated:</Text>
                  <Text style={styles.summaryValue}>
                    RM {(parseFloat(totalAmount || 0) - remainingAmount).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, remainingAmount > 0 && styles.remainingAmount]}>
                    Remaining:
                  </Text>
                  <Text style={[styles.summaryValue, remainingAmount > 0 && styles.remainingAmount]}>
                    RM {remainingAmount.toFixed(2)}
                  </Text>
                </View>

                {remainingAmount > 0 && (
                  <Button
                    mode="outlined"
                    onPress={autoDistributeRemaining}
                    disabled={isProcessing}
                    style={styles.distributeButton}
                    compact
                  >
                    Auto-distribute remaining amount
                  </Button>
                )}
              </Card.Content>
            </Card>
          )}

          <Divider style={styles.divider} />

          {/* Process Button */}
          <Button
            mode="contained"
            onPress={processSplitPayment}
            loading={isProcessing}
            disabled={isProcessing || !totalAmount || remainingAmount !== 0}
            style={styles.processButton}
          >
            {isProcessing ? 'Processing Split Payment...' : 'Process Split Payment'}
          </Button>

          {remainingAmount !== 0 && totalAmount && (
            <Text style={styles.warningText}>
              {remainingAmount > 0 
                ? `RM ${remainingAmount.toFixed(2)} remaining to allocate`
                : `RM ${Math.abs(remainingAmount).toFixed(2)} over-allocated`
              }
            </Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  totalAmountInput: {
    marginBottom: 16,
  },
  referenceContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  referenceInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  referenceTextFilled: {
    fontSize: 14,
    color: '#333',
  },
  referenceTextEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 16,
  },
  paymentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentCard: {
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  methodSelector: {
    marginBottom: 12,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  methodOptionSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  methodIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  methodText: {
    fontSize: 12,
    color: '#333',
  },
  methodTextSelected: {
    color: '#fff',
  },
  amountInput: {
    marginBottom: 12,
  },
  qrInputContainer: {
    marginBottom: 12,
  },
  qrInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 60,
    justifyContent: 'center',
  },
  qrInputTextFilled: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  qrInputTextEmpty: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  clearQrButton: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  clearQrText: {
    fontSize: 12,
    color: '#f44336',
    textDecorationLine: 'underline',
  },
  hostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  hostLabel: {
    fontSize: 12,
    color: '#666',
  },
  hostChip: {
    height: 24,
  },
  summaryCard: {
    backgroundColor: '#e8f5e8',
    marginVertical: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  remainingAmount: {
    color: '#ff6b35',
    fontWeight: '600',
  },
  distributeButton: {
    marginTop: 8,
  },
  processButton: {
    paddingVertical: 8,
    backgroundColor: '#4CAF50',
  },
  warningText: {
    textAlign: 'center',
    color: '#f44336',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default SplitPaymentForm;