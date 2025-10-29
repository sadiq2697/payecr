import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  Store,
  Settings,
  LogOut,
  Hash,
  UserCircle,
  CheckCircle,
  Plus,
  Minus,
  X,
  Package,
  Percent,
  Tag,
  Trash2,
  Banknote,
  ShoppingCart,
  Search,
  FileText,
  Receipt,
  CreditCard,
  Calendar,
  RotateCcw,
  DollarSign,
  Split,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import DualScreenManager from '../services/DualScreenManager';

type NavigationProp = StackNavigationProp<RootStackParamList, 'POS'>;

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  barcode?: string;
  tax?: number;
  discount?: number;
  category?: string;
  department?: string;
}

const { width, height } = Dimensions.get('window');

// Memoized Clock Component to prevent unnecessary parent re-renders
const ClockDisplay = memo(({ time }: { time: Date }) => {
  const formattedTime = time.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return <Text style={styles.statusTime}>{formattedTime}</Text>;
});

// Memoized Cart Item Component for better performance
const CartItem = memo(({
  item,
  index,
  isSelected,
  onPress,
  onUpdateQuantity,
  onRemove,
  formatCurrency
}: {
  item: CartItem;
  index: number;
  isSelected: boolean;
  onPress: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  formatCurrency: (amount: number) => string;
}) => {
  const itemSubtotal = item.price * item.quantity;
  const discountAmount = item.discount ? (itemSubtotal * item.discount) / 100 : 0;
  const itemTotal = itemSubtotal - discountAmount;

  return (
    <TouchableOpacity
      style={[styles.itemRow, isSelected && styles.itemRowSelected]}
      onPress={onPress}
    >
      <Text style={[styles.itemText, { flex: 0.5 }]}>{index + 1}</Text>
      <View style={{ flex: 3 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSku}>
          SKU: {item.sku}
          {item.department && ` • ${item.department}`}
        </Text>
      </View>
      <View style={[styles.quantityContainer, { flex: 1.5 }]}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(index, -1)}
        >
          <Minus size={12} color="#525252" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(index, 1)}
        >
          <Plus size={12} color="#525252" />
        </TouchableOpacity>
      </View>
      <Text style={[styles.itemPrice, { flex: 1.5 }]}>
        {formatCurrency(item.price)}
      </Text>
      <Text style={[styles.itemTotal, { flex: 1.5 }]}>
        {formatCurrency(itemTotal)}
      </Text>
      <TouchableOpacity
        style={{ flex: 0.5 }}
        onPress={() => onRemove(index)}
      >
        <X size={16} color="#DC2626" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const POSScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: '1',
      name: 'Premium Cotton Business Shirt',
      sku: 'APRL-SHT-001',
      price: 89.99,
      quantity: 1,
      barcode: '1234567890123',
      tax: 8.5,
      category: 'Apparel',
      department: "Men's Wear",
    },
    {
      id: '2',
      name: 'Executive Leather Briefcase',
      sku: 'ACC-BRF-205',
      price: 249.99,
      quantity: 1,
      barcode: '0987654321098',
      tax: 8.5,
      category: 'Accessories',
      department: 'Business',
    },
  ]);

  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<'quantity' | 'discount' | 'price'>('quantity');
  const [transactionId] = useState(`TXN${Date.now().toString().slice(-10)}`);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [customer, setCustomer] = useState<string | null>(null);
  const [isReturnMode, setIsReturnMode] = useState(false);

  // Optimize clock update - only update seconds, not full re-render
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-show customer display on secondary screen
  useEffect(() => {
    const initCustomerDisplay = async () => {
      try {
        const displays = await DualScreenManager.getDisplays();
        console.log('[POSScreen] Available displays:', displays);

        // If we have more than 1 display, show customer display on display ID 1
        if (displays.length > 1) {
          const success = await DualScreenManager.showCustomerDisplay(1);
          console.log('[POSScreen] Customer display auto-shown:', success);
        }
      } catch (error) {
        console.error('[POSScreen] Failed to auto-show customer display:', error);
      }
    };

    initCustomerDisplay();
  }, []);

  // Memoize expensive calculations to prevent recalculation on every render
  const { subtotal, tax, total, itemCount } = useMemo(() => {
    const sub = cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const discountAmount = item.discount ? (itemTotal * item.discount) / 100 : 0;
      return sum + (itemTotal - discountAmount);
    }, 0);

    const taxRate = 0.085;
    const taxAmount = sub * taxRate;
    const totalAmount = sub + taxAmount;
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal: sub,
      tax: taxAmount,
      total: totalAmount,
      itemCount: count,
    };
  }, [cart]);

  // Debounced customer display update to reduce performance impact
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    // Debounce updates by 300ms
    updateTimerRef.current = setTimeout(async () => {
      try {
        if (cart.length > 0) {
          await DualScreenManager.updateCustomerDisplay({
            cart: cart.map((item) => ({
              id: item.id,
              name: item.name,
              sku: item.sku,
              price: item.price,
              quantity: item.quantity,
            })),
            subtotal,
            tax,
            total,
            storeName: 'ENTERPRISE POS',
          });
        }
      } catch (error) {
        // Silent fail - customer display might not be active
      }
    }, 300);

    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, [cart, subtotal, tax, total]);

  const handleNumberClick = (num: string) => {
    // Prevent multiple decimal points
    if (num === '.' && input.includes('.')) return;
    setInput((prev) => prev + num);
  };

  const handleClear = () => {
    setInput('');
    setInputMode('quantity');
  };

  const handleDelete = () => {
    setInput((prev) => prev.slice(0, -1));
  };

  const handleOperation = (op: string) => {
    if (!input) return;

    const value = parseFloat(input);
    if (isNaN(value)) return;

    // Simple calculator operations
    switch (op) {
      case '+':
      case '-':
      case '×':
      case '÷':
        // For now, just log - could implement full calculator later
        console.log('Operation:', op, 'Value:', value);
        break;
    }
  };

  const applyQuickEntry = () => {
    if (!input || input === '') return;

    const value = parseFloat(input);
    if (isNaN(value) || value <= 0) {
      setInput('');
      return;
    }

    if (selectedItem !== null) {
      // Apply to selected item based on mode
      switch (inputMode) {
        case 'quantity':
          updateQuantity(selectedItem, value, true);
          break;
        case 'discount':
          applyDiscount(selectedItem, value);
          break;
        case 'price':
          applyPriceOverride(selectedItem, value);
          break;
      }
      setInput('');
      setInputMode('quantity');
    }
  };

  const updateQuantity = useCallback((index: number, newQty: number, absolute: boolean = false) => {
    setCart(prevCart =>
      prevCart.map((item, i) => {
        if (i === index) {
          const quantity = absolute ? Math.max(1, Math.floor(newQty)) : Math.max(1, item.quantity + newQty);
          return { ...item, quantity };
        }
        return item;
      })
    );
  }, []);

  const applyDiscount = useCallback((index: number, discountPercent: number) => {
    setCart(prevCart =>
      prevCart.map((item, i) => {
        if (i === index) {
          return { ...item, discount: Math.min(100, Math.max(0, discountPercent)) };
        }
        return item;
      })
    );
  }, []);

  const applyPriceOverride = useCallback((index: number, newPrice: number) => {
    setCart(prevCart =>
      prevCart.map((item, i) => {
        if (i === index) {
          return { ...item, price: Math.max(0, newPrice) };
        }
        return item;
      })
    );
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart(prevCart => prevCart.filter((_, i) => i !== index));
    setSelectedItem(null);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `$${amount.toFixed(2)}`;
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  // Navigation handlers
  const handleCustomerSelect = () => {
    navigation.navigate('CustomerSelect');
  };

  const handleProductLookup = () => {
    navigation.navigate('ProductLookup');
  };

  const handleDiscountPress = () => {
    if (selectedItem !== null) {
      // Quick discount mode - use keypad instead of navigation
      setInputMode('discount');
      setInput('');
    }
  };

  const handlePriceOverride = () => {
    if (selectedItem !== null) {
      // Quick price override mode - use keypad instead of navigation
      setInputMode('price');
      setInput('');
    }
  };

  const handleHoldTransaction = () => {
    navigation.navigate('HoldTransaction');
  };

  const handleProcessPayment = () => {
    navigation.navigate('Payment', {
      cart,
      subtotal,
      tax,
      total,
    });
  };

  const handleReturnRefund = () => {
    setIsReturnMode(!isReturnMode);
    // When enabling return mode, convert all quantities to negative
    if (!isReturnMode) {
      setCart(cart.map(item => ({ ...item, quantity: -Math.abs(item.quantity) })));
    } else {
      // When disabling, convert back to positive
      setCart(cart.map(item => ({ ...item, quantity: Math.abs(item.quantity) })));
    }
  };

  const handleOpenCashDrawer = () => {
    // TODO: Integrate with cash drawer hardware
    console.log('Opening cash drawer...');
    // In a real system, this would send a command to the receipt printer
    // which typically controls the cash drawer via RJ11/RJ12 connection
    alert('Cash Drawer Opened');
  };

  const handleSplitPayment = () => {
    if (cart.length === 0) return;
    // TODO: Navigate to split payment screen or show modal
    console.log('Opening split payment...');
    alert('Split Payment feature - Coming soon');
  };

  const handleSignOut = () => {
    // Clear cart and reset state
    setCart([]);
    setSelectedItem(null);
    setInput('');
    setInputMode('quantity');
    setCustomer(null);
    setIsReturnMode(false);

    // Navigate to Login screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Left Side - Transaction Area */}
        <View style={styles.transactionArea}>
          {/* Left Header */}
          <View style={styles.leftHeader}>
            <View style={styles.logoContainer}>
              <Store size={20} color="#FFFFFF" />
            </View>
            <View style={styles.brandInfo}>
              <Text style={styles.brandTitle}>ENTERPRISE POS</Text>
              <Text style={styles.brandSubtitle}>Professional Edition</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Store</Text>
                <Text style={styles.infoValue}>HQ-001</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Register</Text>
                <Text style={styles.infoValue}>POS-03</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Cashier</Text>
                <Text style={styles.infoValue}>J. Anderson</Text>
              </View>
            </View>
            <View style={styles.leftHeaderActions}>
              <TouchableOpacity
                style={styles.topBarButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <Settings size={12} color="#525252" />
                <Text style={styles.topBarButtonText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.topBarButton, styles.signOutButton]}
                onPress={handleSignOut}
              >
                <LogOut size={12} color="#DC2626" />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transaction Info Bar */}
          <View style={styles.transactionInfoBar}>
            <View style={styles.transactionItem}>
              <Hash size={14} color="#737373" />
              <Text style={styles.transactionLabel}>Transaction ID:</Text>
              <Text style={styles.transactionValue}>{transactionId}</Text>
            </View>
            <View style={styles.transactionSeparator} />
            <View style={styles.transactionItem}>
              <UserCircle size={14} color="#737373" />
              <Text style={styles.transactionLabel}>Customer:</Text>
              {customer ? (
                <Text style={styles.transactionValue}>{customer}</Text>
              ) : (
                <TouchableOpacity onPress={handleCustomerSelect}>
                  <Text style={styles.assignCustomerText}>Assign Customer</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.statusBadge}>
              <CheckCircle size={12} color="#059669" />
              <Text style={styles.statusBadgeText}>Active</Text>
            </View>
          </View>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 0.5 }]}>#</Text>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>Item Description</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Price</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Total</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.5 }]}></Text>
          </View>

          {/* Items List - Using FlatList for better performance */}
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <CartItem
                item={item}
                index={index}
                isSelected={selectedItem === index}
                onPress={() => setSelectedItem(index)}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                formatCurrency={formatCurrency}
              />
            )}
            style={styles.itemsList}
            contentContainerStyle={cart.length === 0 ? styles.emptyCartContainer : undefined}
            ListEmptyComponent={
              <View style={styles.emptyCart}>
                <Package size={64} color="#E5E5E5" />
                <Text style={styles.emptyCartTitle}>No Items in Transaction</Text>
                <Text style={styles.emptyCartSubtitle}>
                  Scan barcode or search to add items
                </Text>
              </View>
            }
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={5}
          />

          {/* Action Buttons Row 1 */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // TODO: Implement custom sale
                console.log('Custom sale');
              }}
            >
              <Tag size={14} color="#525252" />
              <Text style={styles.actionButtonText}>Custom Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, selectedItem === null && styles.actionButtonDisabled]}
              disabled={selectedItem === null}
              onPress={handleDiscountPress}
            >
              <Percent size={14} color="#525252" />
              <Text style={styles.actionButtonText}>Discount</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, selectedItem === null && styles.actionButtonDisabled]}
              disabled={selectedItem === null}
              onPress={handlePriceOverride}
            >
              <Tag size={14} color="#525252" />
              <Text style={styles.actionButtonText}>Price</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleProductLookup}
            >
              <Search size={14} color="#525252" />
              <Text style={styles.actionButtonText}>Lookup</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, cart.length === 0 && styles.actionButtonDisabled]}
              disabled={cart.length === 0}
              onPress={handleHoldTransaction}
            >
              <FileText size={14} color="#525252" />
              <Text style={styles.actionButtonText}>Hold</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons Row 2 */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, isReturnMode && styles.returnButton]}
              onPress={handleReturnRefund}
            >
              <RotateCcw size={14} color={isReturnMode ? "#2563EB" : "#525252"} />
              <Text style={[styles.actionButtonText, isReturnMode && styles.returnButtonText]}>
                {isReturnMode ? 'Return Mode ON' : 'Return/Refund'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, cart.length === 0 && styles.actionButtonDisabled]}
              disabled={cart.length === 0}
              onPress={handleSplitPayment}
            >
              <Split size={14} color="#525252" />
              <Text style={styles.actionButtonText}>Split Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleOpenCashDrawer}
            >
              <DollarSign size={14} color="#525252" />
              <Text style={styles.actionButtonText}>Open Drawer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.voidButton, cart.length === 0 && styles.actionButtonDisabled]}
              disabled={cart.length === 0}
              onPress={() => {
                setCart([]);
                setSelectedItem(null);
                setIsReturnMode(false);
              }}
            >
              <Trash2 size={14} color="#DC2626" />
              <Text style={styles.voidButtonText}>Void All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Side - Totals and Keypad */}
        <View style={styles.rightPanel}>
          {/* Transaction Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Transaction Summary</Text>

            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (8.5%)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discounts</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>-$0.00</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            {/* Total Display */}
            <View style={styles.totalDisplay}>
              <View style={styles.totalLeft}>
                <Text style={styles.totalLabel}>Total Amount Due</Text>
                <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
              </View>
              <View style={styles.totalRight}>
                <View style={styles.itemCountBadge}>
                  <ShoppingCart size={14} color="#737373" />
                  <Text style={styles.itemCountText}>
                    {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Numeric Keypad */}
          <ScrollView style={styles.keypadContainer}>
            <View style={styles.keypadHeader}>
              <Text style={styles.keypadTitle}>Quick Entry</Text>
              <View style={styles.modeIndicator}>
                <Text style={styles.modeText}>
                  {inputMode === 'quantity' && 'QTY'}
                  {inputMode === 'discount' && 'DISC %'}
                  {inputMode === 'price' && 'PRICE $'}
                </Text>
              </View>
            </View>
            <View style={styles.keypadInputContainer}>
              <TextInput
                style={styles.keypadInput}
                value={input}
                editable={false}
                placeholder={inputMode === 'quantity' ? '0' : '0.00'}
                placeholderTextColor="#A3A3A3"
              />
            </View>

            <View style={styles.keypadGrid}>
              {[
                ['7', '8', '9', 'C'],
                ['4', '5', '6', '⌫'],
                ['1', '2', '3', 'ENTER'],
                ['0', '00', '.', 'ENTER'],
              ].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.keypadRow}>
                  {row.map((key, keyIndex) => {
                    const isEnter = key === 'ENTER';
                    const skipRender = isEnter && keyIndex === 2;

                    if (skipRender) return null;

                    return (
                      <TouchableOpacity
                        key={key + keyIndex}
                        style={[
                          styles.keypadButton,
                          key === 'C' && styles.keypadButtonClear,
                          key === '⌫' && styles.keypadButtonOperation,
                          isEnter && styles.keypadButtonEnter,
                          isEnter && keyIndex === 3 && styles.keypadButtonEnterDouble,
                        ]}
                        onPress={() => {
                          if (key === 'C') {
                            handleClear();
                          } else if (key === '⌫') {
                            handleDelete();
                          } else if (key === 'ENTER') {
                            applyQuickEntry();
                          } else {
                            handleNumberClick(key);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.keypadButtonText,
                            key === 'C' && styles.keypadButtonTextClear,
                            isEnter && styles.keypadButtonTextEnter,
                          ]}
                        >
                          {key}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Process Payment Button */}
          <View style={styles.processPaymentContainer}>
            <TouchableOpacity
              style={[
                styles.processPaymentButton,
                cart.length === 0 && styles.processPaymentButtonDisabled,
              ]}
              disabled={cart.length === 0}
              onPress={handleProcessPayment}
            >
              <Text style={styles.processPaymentText}>Process Payment</Text>
              <View style={styles.processPaymentRight}>
                <Text style={styles.processPaymentAmount}>{formatCurrency(total)}</Text>
                <ShoppingCart size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBarLeft}>
          <View style={styles.statusItem}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              System: <Text style={styles.statusTextBold}>Online</Text>
            </Text>
          </View>
          <View style={styles.statusSeparator} />
          <View style={styles.statusItem}>
            <Receipt size={12} color="#D4D4D4" />
            <Text style={styles.statusText}>
              Printer: <Text style={styles.statusTextBold}>Ready</Text>
            </Text>
          </View>
          <View style={styles.statusSeparator} />
          <View style={styles.statusItem}>
            <CreditCard size={12} color="#D4D4D4" />
            <Text style={styles.statusText}>
              Terminal: <Text style={styles.statusTextBold}>Connected</Text>
            </Text>
          </View>
          <View style={styles.statusSeparator} />
          <View style={styles.statusItem}>
            <Calendar size={12} color="#D4D4D4" />
            <Text style={styles.statusText}>
              Network: <Text style={styles.statusTextBoldGreen}>Optimal</Text>
            </Text>
          </View>
        </View>
        <View style={styles.statusBarRight}>
          <Text style={styles.statusVersion}>v2.0.1045-ENTERPRISE</Text>
          <View style={styles.statusSeparator} />
          <ClockDisplay time={currentTime} />
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  leftHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 'auto',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  summaryHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
    flex: 1,
  },
  summaryHeaderItem: {
    gap: 4,
  },
  summaryHeaderLabel: {
    fontSize: 11,
    color: '#737373',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  summaryHeaderValue: {
    fontSize: 18,
    color: '#171717',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  summaryHeaderValueTotal: {
    fontSize: 22,
    color: '#059669',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#2563EB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandInfo: {
    gap: 2,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#171717',
    lineHeight: 14,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#737373',
    lineHeight: 12,
  },
  separator: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E5E5',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#737373',
  },
  infoValue: {
    fontSize: 12,
    color: '#171717',
    fontWeight: '600',
  },
  transactionInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 28,
  },
  topBarButtonText: {
    fontSize: 12,
    color: '#525252',
  },
  signOutButton: {},
  signOutButtonText: {
    fontSize: 12,
    color: '#DC2626',
  },
  transactionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionLabel: {
    fontSize: 12,
    color: '#525252',
  },
  transactionValue: {
    fontSize: 12,
    color: '#171717',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  totalValueHeader: {
    fontSize: 14,
    color: '#059669',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  assignCustomerText: {
    fontSize: 12,
    color: '#2563EB',
  },
  transactionSeparator: {
    width: 1,
    height: 16,
    backgroundColor: '#E5E5E5',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  transactionArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  barcodeIcon: {
    position: 'absolute',
    left: 36,
    zIndex: 1,
  },
  barcodeInput: {
    flex: 1,
    height: 48,
    paddingLeft: 40,
    paddingRight: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
    fontSize: 16,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D4',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
  },
  itemsList: {
    flex: 1,
  },
  emptyCartContainer: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  itemRowSelected: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#2563EB',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525252',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 2,
  },
  itemSku: {
    fontSize: 12,
    color: '#737373',
    fontFamily: 'monospace',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#171717',
    width: 32,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  itemPrice: {
    fontSize: 14,
    color: '#171717',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#171717',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyCartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A3A3A3',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCartSubtitle: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D4D4D4',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#525252',
  },
  returnButton: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  returnButtonText: {
    color: '#2563EB',
  },
  voidButton: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  voidButtonText: {
    fontSize: 12,
    color: '#DC2626',
  },
  rightPanel: {
    width: 480,
    backgroundColor: '#FAFAFA',
  },
  summaryContainer: {
    margin: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#171717',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  summaryContent: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#525252',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#171717',
    fontFamily: 'monospace',
  },
  discountValue: {
    color: '#059669',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 12,
  },
  totalDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  totalLeft: {
    gap: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#737373',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#171717',
    fontFamily: 'monospace',
    lineHeight: 28,
  },
  totalRight: {
    alignItems: 'flex-end',
  },
  itemCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  itemCountText: {
    fontSize: 13,
    color: '#525252',
    fontWeight: '600',
  },
  paymentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#525252',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentButton: {
    width: '48.5%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 4,
  },
  paymentButtonPrimary: {
    backgroundColor: '#2563EB',
  },
  paymentButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  paymentButtonOutline: {
    borderWidth: 2,
    borderColor: '#D4D4D4',
    backgroundColor: '#FFFFFF',
  },
  paymentButtonTextOutline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#525252',
  },
  keypadContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  keypadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  keypadTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#171717',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modeIndicator: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  keypadInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  keypadInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  keypadGrid: {
    gap: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keypadButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  keypadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#171717',
  },
  keypadButtonClear: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  keypadButtonTextClear: {
    color: '#DC2626',
  },
  keypadButtonOperation: {
    backgroundColor: '#F7F7F7',
    borderColor: '#D4D4D4',
  },
  keypadButtonEnter: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  keypadButtonEnterDouble: {
    flex: 2,
  },
  keypadButtonTextEnter: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  processPaymentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  processPaymentButton: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#059669',
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  processPaymentButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  processPaymentText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  processPaymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  processPaymentAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderTopWidth: 1,
    borderTopColor: '#404040',
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  statusBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 12,
    color: '#D4D4D4',
  },
  statusTextBold: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusTextBoldGreen: {
    fontWeight: '600',
    color: '#34D399',
  },
  statusSeparator: {
    width: 1,
    height: 12,
    backgroundColor: '#525252',
  },
  statusBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusVersion: {
    fontSize: 12,
    color: '#A3A3A3',
  },
  statusTime: {
    fontSize: 12,
    color: '#A3A3A3',
    fontFamily: 'monospace',
  },
});

export default POSScreen;
