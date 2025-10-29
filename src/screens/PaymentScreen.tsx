import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import {
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  CheckCircle,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

type PaymentMethod = 'card' | 'cash' | 'digital' | null;

const PaymentScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentRouteProp>();
  const { cart, subtotal, tax, total } = route.params;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [amountTendered, setAmountTendered] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const change = amountTendered
    ? Math.max(0, parseFloat(amountTendered) - total)
    : 0;

  const handleQuickAmount = (amount: number) => {
    setAmountTendered(amount.toString());
  };

  const handleProcessPayment = async () => {
    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    if (paymentMethod === 'cash') {
      const tendered = parseFloat(amountTendered);
      if (isNaN(tendered) || tendered < total) {
        Alert.alert('Insufficient Amount', 'Tendered amount is less than total');
        return;
      }
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);

      // Navigate to receipt screen
      navigation.navigate('Receipt', {
        transaction: {
          transactionId: `TXN${Date.now().toString().slice(-10)}`,
          timestamp: new Date(),
          cart,
          subtotal,
          tax,
          total,
          paymentMethod,
          amountTendered: paymentMethod === 'cash' ? parseFloat(amountTendered) : total,
          change: paymentMethod === 'cash' ? change : 0,
        },
      });
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Transaction Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Transaction Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Total</Text>
            <Text style={styles.summaryValueTotal}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'card' && styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <CreditCard
                size={32}
                color={paymentMethod === 'card' ? '#2563EB' : '#737373'}
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'card' && styles.paymentMethodTextActive,
                ]}
              >
                Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'cash' && styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Banknote
                size={32}
                color={paymentMethod === 'cash' ? '#2563EB' : '#737373'}
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'cash' && styles.paymentMethodTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                paymentMethod === 'digital' && styles.paymentMethodCardActive,
              ]}
              onPress={() => setPaymentMethod('digital')}
            >
              <Smartphone
                size={32}
                color={paymentMethod === 'digital' ? '#2563EB' : '#737373'}
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'digital' && styles.paymentMethodTextActive,
                ]}
              >
                Digital
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cash Tendering */}
        {paymentMethod === 'cash' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount Tendered</Text>
            <View style={styles.inputContainer}>
              <DollarSign size={24} color="#737373" style={styles.inputIcon} />
              <TextInput
                style={styles.cashInput}
                placeholder="0.00"
                value={amountTendered}
                onChangeText={setAmountTendered}
                keyboardType="decimal-pad"
                placeholderTextColor="#A3A3A3"
              />
            </View>

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {[total, 20, 50, 100].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => handleQuickAmount(amount)}
                >
                  <Text style={styles.quickAmountText}>
                    ${amount === total ? total.toFixed(2) : amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Change Display */}
            {amountTendered && (
              <View style={styles.changeCard}>
                <Text style={styles.changeLabel}>Change</Text>
                <Text
                  style={[
                    styles.changeValue,
                    change < 0 && styles.changeValueNegative,
                  ]}
                >
                  ${change.toFixed(2)}
                </Text>
                {change < 0 && (
                  <Text style={styles.changeWarning}>Insufficient amount</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Card/Digital Payment Info */}
        {(paymentMethod === 'card' || paymentMethod === 'digital') && (
          <View style={styles.infoCard}>
            <CheckCircle size={20} color="#059669" />
            <Text style={styles.infoText}>
              {paymentMethod === 'card'
                ? 'Insert, tap, or swipe card to proceed'
                : 'Present digital wallet to terminal'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Process Payment Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.processButton,
            (!paymentMethod || isProcessing) && styles.processButtonDisabled,
          ]}
          onPress={handleProcessPayment}
          disabled={!paymentMethod || isProcessing}
        >
          <Text style={styles.processButtonText}>
            {isProcessing ? 'Processing...' : 'Process Payment'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#171717',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#A3A3A3',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#D4D4D4',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#404040',
    marginVertical: 12,
  },
  summaryLabelBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryValueTotal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#10B981',
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  paymentMethodCardActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
  },
  paymentMethodTextActive: {
    color: '#2563EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  cashInput: {
    flex: 1,
    height: 72,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#171717',
    fontFamily: 'monospace',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  changeCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  changeLabel: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 8,
  },
  changeValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#059669',
    fontFamily: 'monospace',
  },
  changeValueNegative: {
    color: '#DC2626',
  },
  changeWarning: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#525252',
  },
  processButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  processButtonDisabled: {
    opacity: 0.4,
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PaymentScreen;
