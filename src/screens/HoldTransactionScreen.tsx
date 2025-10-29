import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { FileText, Clock, DollarSign, Trash2, RotateCcw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList, 'HoldTransaction'>;

interface HeldTransaction {
  id: string;
  transactionId: string;
  timestamp: Date;
  itemCount: number;
  total: number;
  customer?: string;
}

// Mock held transactions
const MOCK_HELD_TRANSACTIONS: HeldTransaction[] = [
  {
    id: '1',
    transactionId: 'TXN1234567890',
    timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    itemCount: 3,
    total: 245.67,
    customer: 'John Anderson',
  },
  {
    id: '2',
    transactionId: 'TXN0987654321',
    timestamp: new Date(Date.now() - 900000), // 15 minutes ago
    itemCount: 5,
    total: 587.32,
  },
  {
    id: '3',
    transactionId: 'TXN1122334455',
    timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
    itemCount: 2,
    total: 129.99,
    customer: 'Sarah Mitchell',
  },
];

const HoldTransactionScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [heldTransactions, setHeldTransactions] = useState(MOCK_HELD_TRANSACTIONS);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
  };

  const handleRecallTransaction = (transaction: HeldTransaction) => {
    Alert.alert(
      'Recall Transaction',
      `Do you want to recall transaction ${transaction.transactionId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recall',
          onPress: () => {
            console.log('Recalling transaction:', transaction);
            // In a real app, restore the transaction and navigate back
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDeleteTransaction = (transaction: HeldTransaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete transaction ${transaction.transactionId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setHeldTransactions(
              heldTransactions.filter((t) => t.id !== transaction.id)
            );
          },
        },
      ]
    );
  };

  const renderTransactionItem = ({ item }: { item: HeldTransaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionIcon}>
          <FileText size={20} color="#2563EB" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionId}>{item.transactionId}</Text>
          <View style={styles.transactionMeta}>
            <Clock size={12} color="#737373" />
            <Text style={styles.transactionTime}>{formatTime(item.timestamp)}</Text>
          </View>
          {item.customer && (
            <Text style={styles.transactionCustomer}>Customer: {item.customer}</Text>
          )}
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Items</Text>
          <Text style={styles.detailValue}>{item.itemCount}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total</Text>
          <Text style={styles.detailValuePrice}>${item.total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.transactionActions}>
        <TouchableOpacity
          style={styles.recallButton}
          onPress={() => handleRecallTransaction(item)}
        >
          <RotateCcw size={16} color="#FFFFFF" />
          <Text style={styles.recallButtonText}>Recall</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteTransaction(item)}
        >
          <Trash2 size={16} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <FileText size={20} color="#2563EB" />
            <Text style={styles.statValue}>{heldTransactions.length}</Text>
            <Text style={styles.statLabel}>Held</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={20} color="#059669" />
            <Text style={styles.statValue}>
              ${heldTransactions.reduce((sum, t) => sum + t.total, 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>

        {/* Held Transactions List */}
        <FlatList
          data={heldTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText size={64} color="#E5E5E5" />
              <Text style={styles.emptyText}>No held transactions</Text>
              <Text style={styles.emptySubtext}>
                Held transactions will appear here
              </Text>
            </View>
          }
        />
      </View>

      {/* Hold Current Transaction Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.holdCurrentButton}
          onPress={() => {
            Alert.alert(
              'Hold Transaction',
              'Do you want to hold the current transaction?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Hold',
                  onPress: () => {
                    console.log('Holding current transaction');
                    navigation.goBack();
                  },
                },
              ]
            );
          }}
        >
          <FileText size={20} color="#FFFFFF" />
          <Text style={styles.holdCurrentButtonText}>Hold Current Transaction</Text>
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#171717',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
    gap: 4,
  },
  transactionId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#171717',
    fontFamily: 'monospace',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionTime: {
    fontSize: 12,
    color: '#737373',
  },
  transactionCustomer: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  transactionDetails: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#171717',
  },
  detailValuePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
    fontFamily: 'monospace',
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  recallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  recallButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A3A3A3',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A3A3A3',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  holdCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  holdCurrentButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default HoldTransactionScreen;
