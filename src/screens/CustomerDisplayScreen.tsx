import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';

const { PresentationDisplay } = NativeModules;

const CustomerDisplayScreen = () => {
  const [data, setData] = useState<any>({
    cart: [
      {
        id: '1',
        name: 'Premium Cotton Business Shirt',
        sku: 'APRL-SHT-001',
        price: 89.99,
        quantity: 2,
      },
      {
        id: '2',
        name: 'Executive Leather Briefcase',
        sku: 'ACC-BRF-205',
        price: 249.99,
        quantity: 1,
      },
    ],
    subtotal: 429.97,
    tax: 36.55,
    total: 466.52,
    storeName: 'ENTERPRISE STORE',
  });
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    console.log('[CustomerDisplay] Component mounted!');

    let eventEmitter: NativeEventEmitter | null = null;
    let subscription: any = null;

    if (PresentationDisplay) {
      console.log('[CustomerDisplay] Setting up event listener');
      eventEmitter = new NativeEventEmitter(PresentationDisplay);
      subscription = eventEmitter.addListener('CustomerDisplayUpdate', (dataString: string) => {
        console.log('[CustomerDisplay] Received update:', dataString);
        setUpdateCount(prev => prev + 1);
        try {
          const parsed = JSON.parse(dataString);
          setData(parsed);
        } catch (error) {
          console.error('[CustomerDisplay] Parse error:', error);
          setData({ error: String(error), raw: dataString });
        }
      });
    } else {
      console.log('[CustomerDisplay] PresentationDisplay module not found!');
    }

    return () => {
      console.log('[CustomerDisplay] Unmounting');
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.storeName}>{data.storeName || 'STORE'}</Text>
        <Text style={styles.subtitle}>Customer Display</Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.statusText}>Status: ACTIVE ✓</Text>
        <Text style={styles.statusText}>Updates: {updateCount}</Text>
      </View>

      {data.cart && data.cart.length > 0 && (
        <View style={styles.cartBox}>
          <Text style={styles.cartTitle}>Your Items ({data.cart.length})</Text>
          {data.cart.map((item: any, index: number) => (
            <View key={item.id || index} style={styles.cartItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSku}>SKU: {item.sku}</Text>
              </View>
              <View style={styles.itemPricing}>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                <Text style={styles.itemPrice}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>${data.subtotal?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax:</Text>
          <Text style={styles.totalValue}>${data.tax?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>TOTAL:</Text>
          <Text style={styles.grandTotalValue}>${data.total?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>

      <Text style={styles.footer}>Thank you for shopping with us!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 40,
  },
  header: {
    backgroundColor: '#1F2937',
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  storeName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  statusBox: {
    backgroundColor: '#10B981',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cartBox: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cartTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  itemSku: {
    fontSize: 16,
    color: '#6B7280',
  },
  itemPricing: {
    alignItems: 'flex-end',
  },
  itemQty: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalBox: {
    backgroundColor: '#1F2937',
    padding: 32,
    borderRadius: 16,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  grandTotalRow: {
    marginTop: 16,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#374151',
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  grandTotalValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10B981',
  },
  footer: {
    fontSize: 24,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CustomerDisplayScreen;
