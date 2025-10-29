import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {
  CheckCircle,
  Printer,
  Mail,
  Home,
  Calendar,
  Hash,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Receipt'>;
type ReceiptRouteProp = RouteProp<RootStackParamList, 'Receipt'>;

const ReceiptScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReceiptRouteProp>();
  const { transaction } = route.params;

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getPaymentIcon = () => {
    switch (transaction.paymentMethod) {
      case 'card':
        return <CreditCard size={20} color="#2563EB" />;
      case 'cash':
        return <Banknote size={20} color="#059669" />;
      case 'digital':
        return <Smartphone size={20} color="#8B5CF6" />;
      default:
        return null;
    }
  };

  const getPaymentMethodLabel = () => {
    switch (transaction.paymentMethod) {
      case 'card':
        return 'Card Payment';
      case 'cash':
        return 'Cash Payment';
      case 'digital':
        return 'Digital Wallet';
      default:
        return 'Unknown';
    }
  };

  const handleNewTransaction = () => {
    // Navigate back to POS screen and reset
    navigation.navigate('POS');
  };

  const handlePrintReceipt = () => {
    console.log('Printing receipt:', transaction);
    // Implement print functionality
  };

  const handleEmailReceipt = () => {
    console.log('Emailing receipt:', transaction);
    // Implement email functionality
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successSubtitle}>
            Your transaction has been completed
          </Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          {/* Store Header */}
          <View style={styles.storeHeader}>
            <Text style={styles.storeName}>ENTERPRISE POS</Text>
            <Text style={styles.storeInfo}>Professional Edition</Text>
            <Text style={styles.storeInfo}>Store: HQ-001 • Register: POS-03</Text>
          </View>

          <View style={styles.divider} />

          {/* Transaction Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Hash size={14} color="#737373" />
              <Text style={styles.infoLabel}>Transaction ID</Text>
              <Text style={styles.infoValue}>{transaction.transactionId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={14} color="#737373" />
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(transaction.timestamp)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              {getPaymentIcon()}
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>{getPaymentMethodLabel()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Items List */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            {transaction.cart.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSku}>
                    SKU: {item.sku} • Qty: {item.quantity}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${transaction.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>${transaction.tax.toFixed(2)}</Text>
            </View>
            <View style={styles.dividerThin} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabelBold}>Total</Text>
              <Text style={styles.totalValueBold}>${transaction.total.toFixed(2)}</Text>
            </View>

            {transaction.paymentMethod === 'cash' && (
              <>
                <View style={styles.dividerThin} />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tendered</Text>
                  <Text style={styles.totalValue}>
                    ${transaction.amountTendered.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Change</Text>
                  <Text style={styles.changeValue}>
                    ${transaction.change.toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.divider} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Thank you for your business!</Text>
            <Text style={styles.footerSubtext}>
              For questions or returns, please visit our customer service desk
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handlePrintReceipt}>
            <Printer size={20} color="#2563EB" />
            <Text style={styles.actionButtonText}>Print Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleEmailReceipt}>
            <Mail size={20} color="#2563EB" />
            <Text style={styles.actionButtonText}>Email Receipt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* New Transaction Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.newTransactionButton} onPress={handleNewTransaction}>
          <Home size={20} color="#FFFFFF" />
          <Text style={styles.newTransactionButtonText}>New Transaction</Text>
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
  successHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#737373',
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  storeHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
    marginBottom: 4,
  },
  storeInfo: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 16,
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: '#737373',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#171717',
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  itemsSection: {
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 2,
  },
  itemSku: {
    fontSize: 11,
    color: '#737373',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    fontFamily: 'monospace',
  },
  totalsSection: {
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#525252',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    fontFamily: 'monospace',
  },
  totalLabelBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
  },
  totalValueBold: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    fontFamily: 'monospace',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    fontFamily: 'monospace',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#737373',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  bottomBar: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  newTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  newTransactionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ReceiptScreen;
